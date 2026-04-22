import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User } from 'firebase/auth';
import { collection, query, getDocs, addDoc, doc, getDoc, onSnapshot, orderBy, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Camera, Upload, Image as ImageIcon, Download, Share2, ArrowLeft, Trash2, Heart, Play, ExternalLink, Plus, X, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ConfirmModal from './ConfirmModal';

interface GalleryProps {
  user: User | null;
  role: string | null;
}

const Gallery: React.FC<GalleryProps> = ({ user, role }) => {
  const { galleryId } = useParams<{ galleryId: string }>();
  const [gallery, setGallery] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoType, setNewPhotoType] = useState<'image' | 'video'>('image');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    const checkDriveStatus = async () => {
      try {
        const response = await fetch('/api/auth/google/status');
        if (!response.ok) return;
        const data = await response.json();
        setIsDriveConnected(data.connected);
      } catch (error) {
        console.error('Error checking Drive status:', error);
      }
    };
    checkDriveStatus();

    // Listen for auth success message
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsDriveConnected(true);
        toast.success('Google Drive connected successfully!');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (!galleryId) return;

    const fetchGallery = async () => {
      try {
        const galleryDoc = await getDoc(doc(db, 'galleries', galleryId));
        if (galleryDoc.exists()) {
          setGallery({ id: galleryDoc.id, ...galleryDoc.data() as any });
        }
      } catch (error) {
        console.error('Error fetching gallery:', error);
      }
    };

    const q = query(collection(db, `galleries/${galleryId}/photos`), orderBy('uploadedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const photosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setPhotos(photosData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `galleries/${galleryId}/photos`);
    });

    fetchGallery();
    return () => unsubscribe();
  }, [galleryId]);

  const handleConnectDrive = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();
      
      // Open in a popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        url, 
        'google_auth', 
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
      );
    } catch (error) {
      toast.error('Failed to connect to Google Drive. Please check server configuration.');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: gallery?.name || 'Photography Gallery',
      text: `Check out this photography gallery: ${gallery?.name}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Gallery link copied to clipboard!');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast.error('Failed to share gallery');
      }
    }
  };

  const handleDownloadAll = async () => {
    if (photos.length === 0) {
      toast.error('No photos to download');
      return;
    }

    setDownloading(true);
    const zip = new JSZip();
    const toastId = toast.loading('Preparing your download...');

    try {
      const downloadPromises = photos.map(async (photo, index) => {
        try {
          // Use proxy to bypass CORS
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(photo.url)}`;
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error(`Proxy failed: ${response.statusText}`);
          const blob = await response.blob();
          const extension = photo.type === 'video' ? 'mp4' : 'jpg';
          zip.file(`photo-${index + 1}.${extension}`, blob);
        } catch (err) {
          console.error(`Failed to download photo ${index + 1}:`, err);
        }
      });

      await Promise.all(downloadPromises);
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${gallery.name.replace(/\s+/g, '_')}_Gallery.zip`);
      toast.success('Download started!', { id: toastId });
    } catch (error) {
      console.error('Error creating zip:', error);
      toast.error('Failed to download all photos', { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  const handleAddPhotoByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryId || !newPhotoUrl) return;

    try {
      await addDoc(collection(db, `galleries/${galleryId}/photos`), {
        galleryId,
        url: newPhotoUrl,
        thumbnailUrl: newPhotoUrl,
        type: newPhotoType,
        uploadedAt: new Date().toISOString()
      });
      toast.success('Photo added successfully!');
      setShowAddPhotoModal(false);
      setNewPhotoUrl('');
    } catch (error) {
      toast.error('Failed to add photo');
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!galleryId || (role !== 'admin' && role !== 'team')) return;
    
    if (!isDriveConnected) {
      toast.error('Please connect to Google Drive first');
      return;
    }

    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload-to-drive', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        const type = file.type.startsWith('video/') ? 'video' : 'image';

        await addDoc(collection(db, `galleries/${galleryId}/photos`), {
          galleryId,
          url: data.url,
          thumbnailUrl: data.thumbnailUrl,
          driveFileId: data.id,
          type,
          uploadedAt: new Date().toISOString()
        });
      }
      toast.success('Files uploaded to Google Drive successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  }, [galleryId, role, isDriveConnected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 
      'image/*': [],
      'video/*': [] 
    } 
  });

  const handleDelete = async (photoId: string) => {
    setItemToDelete(photoId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !galleryId) return;
    
    // Find the photo to check for driveFileId before deleting from Firestore
    const photoToDelete = photos.find(p => p.id === itemToDelete);
    
    try {
      // 1. Delete from Firestore
      await deleteDoc(doc(db, `galleries/${galleryId}/photos`, itemToDelete));
      
      // 2. If it is a Drive file, delete from Drive too
      if (photoToDelete?.driveFileId) {
        try {
          await fetch(`/api/drive/file/${photoToDelete.driveFileId}`, {
            method: 'DELETE',
            credentials: 'include',
          });
        } catch (driveErr) {
          console.warn('Failed to delete associated Drive file:', driveErr);
        }
      }
      
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    } finally {
      setItemToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Gallery Not Found</h2>
        <p className="text-gray-500 mt-2">The gallery you're looking for doesn't exist or you don't have permission to view it.</p>
        <Link to="/dashboard" className="mt-6 inline-flex items-center text-black font-bold hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/orders" className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Orders
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight whitespace-normal break-words">{gallery.name}</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Created on {gallery.createdAt && isValid(new Date(gallery.createdAt)) ? format(new Date(gallery.createdAt), 'MMMM d, yyyy') : 'No Date'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {(role === 'admin' || role === 'team') && (
            <button 
              onClick={() => setShowAddPhotoModal(true)}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg bg-black text-white text-[10px] sm:text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Add Photo</span>
            </button>
          )}
          {!isDriveConnected && (role === 'admin' || role === 'team') && (
            <button 
              onClick={handleConnectDrive}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg bg-blue-600 text-white text-[10px] sm:text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Connect Drive</span>
            </button>
          )}
          <button 
            onClick={handleShare}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg border border-gray-200 text-[10px] sm:text-sm font-medium hover:bg-white transition-colors"
          >
            <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Share</span>
          </button>
          <button 
            onClick={handleDownloadAll}
            disabled={downloading}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg bg-black text-white text-[10px] sm:text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <Download className="w-3 h-3 sm:w-4 sm:h-4" />}
            <span className="whitespace-nowrap">{downloading ? 'Zipping...' : 'Download'}</span>
          </button>
        </div>
      </header>

      {(role === 'admin' || role === 'team') && (
        <section className="mb-12">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
              isDragActive ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'
            } ${!isDriveConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} disabled={!isDriveConnected} />
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Upload Photos & Videos</h3>
            <p className="text-gray-500 mt-1">
              {isDriveConnected 
                ? 'Drag and drop files here, or click to select files' 
                : 'Connect Google Drive to start uploading'}
            </p>
            {uploading && <p className="text-black font-bold mt-4 animate-pulse">Uploading to Google Drive...</p>}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-xl transition-all">
            {photo.type === 'video' ? (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <Play className="w-12 h-12 text-white opacity-50" />
                <div className="absolute bottom-4 left-4 bg-black/60 px-2 py-1 rounded text-[10px] text-white font-bold uppercase tracking-wider">
                  Video
                </div>
              </div>
            ) : (
              <img
                src={photo.url}
                alt="Gallery photo"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
            )}
            {(role === 'admin' || role === 'team') && (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(photo.id); }}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg z-20 md:hidden flex items-center justify-center border border-white/20"
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
              <button className="p-3 bg-white rounded-full text-black hover:bg-gray-100 transition-colors shadow-lg">
                <Heart className="w-5 h-5" />
              </button>
              <a 
                href={photo.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-white rounded-full text-black hover:bg-gray-100 transition-colors shadow-lg"
              >
                {photo.type === 'video' ? <Play className="w-5 h-5" /> : <Download className="w-5 h-5" />}
              </a>
              {(role === 'admin' || role === 'team') && (
                <button 
                  onClick={() => handleDelete(photo.id)}
                  className="p-3 bg-white rounded-full text-red-600 hover:bg-red-50 transition-colors shadow-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {photos.length === 0 && !uploading && (
          <div className="col-span-full py-24 text-center">
            <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">No photos or videos in this gallery yet.</p>
          </div>
        )}
      </section>

      {/* Add Photo Modal */}
      <AnimatePresence>
        {showAddPhotoModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add Photo by URL</h2>
                <button onClick={() => setShowAddPhotoModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddPhotoByUrl} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Photo/Video URL</label>
                  <input
                    type="url"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all"
                    placeholder="https://example.com/photo.jpg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                  <select
                    value={newPhotoType}
                    onChange={(e) => setNewPhotoType(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddPhotoModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-bold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-black text-white font-bold hover:bg-gray-800 transition-colors"
                  >
                    Add Photo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete File"
        message="Are you sure you want to delete this file? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default Gallery;
