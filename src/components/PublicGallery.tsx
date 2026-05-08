import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { ImageIcon, ArrowRight, Camera, Filter, Search, Plus, X, Download, Play, Heart, ChevronLeft, ChevronRight, Youtube, Music, Baby, Calendar, MoreHorizontal, Trash2, Pin, PinOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { setDoc } from 'firebase/firestore';
import ConfirmModal from './ConfirmModal';

import Logo from './Logo';

interface PublicGalleryProps {
  user: any;
  role: string | null;
}

const PublicGallery: React.FC<PublicGalleryProps> = ({ user, role }) => {
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'drive' | 'youtube'>('drive');
  const [youtubeForm, setYoutubeForm] = useState({ url: '', title: '', category: 'Videos' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [youtubeVideos, setYoutubeVideos] = useState<any[]>([]);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('Other');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  
  const FOLDER_MAP: Record<string, string> = {
    'Wedding': '1MyprAhR1qLeye5TC832J9XvmFw2Afjra',
    'Music': '1YgviutdlsMvMrZxDmEBvle3n0ssB2eWk',
    'Kids': '1vWObut98zYGgkvAnctVu1wInJVDKOIbV',
    'Event': '15nzoF4PdtZkSE33r_3AO_jya6jIWXFR-',
    'Other': '1wEaZxNFrhTRglcS5JV96XZL_66wPPIVC'
  };

  const categories = [
    { name: 'All', icon: Filter },
    { name: 'Videos', icon: Play },
    { name: 'Wedding', icon: Heart },
    { name: 'Music', icon: Music },
    { name: 'Kids', icon: Baby },
    { name: 'Event', icon: Calendar },
    { name: 'Other', icon: MoreHorizontal }
  ];

  const fetchDriveFiles = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      
      const fetchPromises = Object.entries(FOLDER_MAP).map(async ([category, folderId]) => {
        try {
          const fetchUrl = `/api/drive/list/${folderId}`;
          console.log(`[PublicGallery] Attempting fetch: ${fetchUrl}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
          
          const response = await fetch(fetchUrl, { 
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
          });
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.warn(`[PublicGallery] Folder ${category} error (${response.status}): ${folderId}`);
            if (response.status === 401) {
              setError("Google Drive access required. Please link your Drive in the Admin Hub.");
            }
            return [];
          }
          
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error(`[PublicGallery] Non-JSON response for ${category}`);
            return [];
          }
          
          const data = await response.json();
          return Array.isArray(data) ? data.map((file: any) => ({ ...file, driveCategory: category })) : [];
        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.warn(`[PublicGallery] Fetch timeout for folder ${category}`);
          } else {
            console.error(`Error fetching folder ${category}:`, err.message || err);
          }
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      const allFiles = results.flat();
      setDriveFiles(allFiles);
    } catch (err: any) {
      console.error('Critical error in fetchDriveFiles:', err);
      if (!driveFiles.length) {
        setError(err.message || 'Failed to establish Drive connection');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkDriveStatus = async () => {
      try {
        const response = await fetch('/api/auth/google/status');
        if (!response.ok) return;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setIsDriveConnected(data.connected);
        }
      } catch (err) {
        console.error('Error checking Drive status:', err);
      }
    };
    checkDriveStatus();

    const q = query(collection(db, 'galleryItems'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isYoutube: (doc.data() as any).type === 'youtube' || (doc.data() as any).type === 'link'
      }));
      setYoutubeVideos(videos);
    });

    // Listen for pins
    const pinsUnsubscribe = onSnapshot(collection(db, 'pinnedAssets'), (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.id);
      setPinnedIds(ids);
    });

    fetchDriveFiles();

    return () => {
      unsubscribe();
      pinsUnsubscribe();
    };
  }, [fetchDriveFiles]);

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleAddYoutube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const videoId = getYoutubeId(youtubeForm.url);
    if (!videoId) {
      toast.error('Invalid YouTube URL');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'galleryItems'), {
        userId: user.uid,
        userName: user.displayName || 'Admin',
        userRole: role || 'admin',
        type: 'youtube',
        category: youtubeForm.category,
        url: youtubeForm.url,
        title: youtubeForm.title || 'YouTube Video',
        description: '',
        createdAt: new Date().toISOString()
      });
      toast.success('YouTube video added successfully');
      setShowAddModal(false);
      setYoutubeForm({ url: '', title: '', category: 'Videos' });
    } catch (err) {
      console.error('Error adding YouTube video:', err);
      toast.error('Failed to add YouTube video');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: any) => {
    console.log('[Gallery] Preparing to delete item:', item);
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    const item = itemToDelete;
    if (!item) return;

    if (item.isYoutube && item.id) {
      try {
        console.log('[Gallery] Deleting item from Firestore:', item.id);
        await deleteDoc(doc(db, 'galleryItems', item.id));
        toast.success('Gallery item deleted successfully');
      } catch (err) {
        console.error('Error deleting item:', err);
        toast.error('Failed to delete item');
      }
    } else if (item.isDrive && item.id) {
        try {
          console.log('[Gallery] Deleting Drive item via API:', item.id);
          const response = await fetch(`/api/drive/file/${item.id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              throw new Error(data.error || 'Failed to delete file from Drive');
            } else {
              throw new Error(`Server error (${response.status}): Failed to delete from Drive`);
            }
          }
          toast.success('File deleted from Drive successfully');
          setDriveFiles(prev => prev.filter(f => f.id !== item.id));
        } catch (err: any) {
          console.error('Error deleting Drive file:', err);
          toast.error(err.message || 'Failed to delete file');
        }
    } else {
      console.warn('[Gallery] Item missing ID or type for deletion:', item);
    }
    
    setItemToDelete(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${file.name} to Drive...`);
    const formData = new FormData();
    formData.append('file', file);
    
    const targetFolderId = FOLDER_MAP[uploadCategory] || FOLDER_MAP['Other'];
    formData.append('folderId', targetFolderId);

    try {
      const response = await fetch('/api/upload-to-drive', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        } else {
          const text = await response.text();
          console.error('[PublicGallery Upload] Server error:', text.substring(0, 200));
          throw new Error(`Server error (${response.status}): Failed to upload to Drive`);
        }
      }

      toast.success('File uploaded to Drive successfully', { id: toastId });
      setShowAddModal(false);
      // Refresh only the drive files instead of reloading the page
      fetchDriveFiles(true);
    } catch (err: any) {
      console.error('Error uploading file:', err);
      toast.error(err.message || 'Failed to upload file', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleConnectDrive = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const data = await response.json();
      window.open(data.url, '_blank', 'width=600,height=600');
    } catch (err) {
      console.error('Error getting auth URL:', err);
      toast.error('Failed to connect to Google Drive');
    }
  };

  const handleTogglePin = async (item: any) => {
    if (role !== 'admin') return;
    
    const isPinned = pinnedIds.includes(item.id);
    const pinDocRef = doc(db, 'pinnedAssets', item.id);
    
    try {
      if (isPinned) {
        await deleteDoc(pinDocRef);
        toast.success('Asset unpinned from top');
      } else {
        await setDoc(pinDocRef, {
          pinnedAt: new Date().toISOString(),
          type: item.isDrive ? 'drive' : 'youtube',
          category: item.driveCategory || item.category || 'Other'
        });
        toast.success('Asset pinned to top');
      }
    } catch (err) {
      console.error('Error toggling pin:', err);
      toast.error('Failed to update pin status');
    }
  };

  const allItems = [
    ...driveFiles.map(f => ({ ...f, isDrive: true })),
    ...youtubeVideos
  ].sort((a, b) => {
    const isPinnedA = pinnedIds.includes(a.id);
    const isPinnedB = pinnedIds.includes(b.id);
    
    if (isPinnedA && !isPinnedB) return -1;
    if (!isPinnedA && isPinnedB) return 1;
    
    const dateA = a.createdAt || a.createdTime || '';
    const dateB = b.createdAt || b.createdTime || '';
    return dateB.localeCompare(dateA);
  });

  const filteredFiles = allItems.filter(item => {
    const matchesSearch = (item.name || item.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeCategory === 'All') return matchesSearch;
    
    if (activeCategory === 'Videos') {
      return (item.isYoutube || item.type === 'video' || item.mimeType?.startsWith('video/')) && matchesSearch;
    }
    
    if (item.isYoutube) {
      return item.category === activeCategory && matchesSearch;
    }
    
    return item.driveCategory === activeCategory && matchesSearch;
  });

  const handleNext = useCallback(() => {
    if (!selectedFile || filteredFiles.length <= 1) return;
    const currentIndex = filteredFiles.findIndex(f => f.id === selectedFile.id);
    const nextIndex = (currentIndex + 1) % filteredFiles.length;
    setSelectedFile(filteredFiles[nextIndex]);
  }, [selectedFile, filteredFiles]);

  const handlePrev = useCallback(() => {
    if (!selectedFile || filteredFiles.length <= 1) return;
    const currentIndex = filteredFiles.findIndex(f => f.id === selectedFile.id);
    const prevIndex = (currentIndex - 1 + filteredFiles.length) % filteredFiles.length;
    setSelectedFile(filteredFiles[prevIndex]);
  }, [selectedFile, filteredFiles]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedFile) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setSelectedFile(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, handleNext, handlePrev]);

  return (
    <div className="bg-white min-h-screen pb-32">
      {/* Product Header */}
      <div className="max-w-7xl mx-auto pt-32 px-6 sm:px-10 lg:px-14 mb-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, letterSpacing: "0.2em" }}
          animate={{ opacity: 1, letterSpacing: "0.8em" }}
          transition={{ duration: 1.5 }}
          className="text-[10px] font-black uppercase text-primary mb-12"
        >
          STUDIO.ARCHIVE.PRO
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-7xl md:text-[10rem] font-sans font-black text-gray-900 leading-[0.8] tracking-tighter uppercase mb-20"
        >
          Visual <br /> Assets
        </motion.h1>
        
        <div className="flex flex-col md:flex-row items-center gap-12 w-full max-w-4xl">
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-400 text-sm font-medium leading-relaxed flex-grow text-center md:text-left"
          >
            A technical repository of high-fidelity visual documentation. Engineered for precision, preserved for permanence. Authorized studio access only for specific protocols.
          </motion.p>
          
          {role === 'admin' && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => {
                if (activeCategory === 'Videos') {
                  setAddType('youtube');
                  setYoutubeForm(prev => ({ ...prev, category: 'Videos' }));
                } else {
                  setAddType('drive');
                  setUploadCategory(activeCategory === 'All' ? 'Other' : activeCategory);
                }
                setShowAddModal(true);
              }}
              className="btn-premium whitespace-nowrap px-10 py-5 text-[10px] tracking-[0.4em]"
            >
              <Plus className="w-4 h-4 mr-2" />
              ADD ASSET
            </motion.button>
          )}
        </div>
      </div>

      {/* Minimal Category Tab Bar */}
      <div className="sticky top-20 z-40 bg-white/60 backdrop-blur-3xl border-y border-gray-100/50 mb-20">
        <div className="max-w-7xl mx-auto px-6 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex justify-start md:justify-center items-center py-8 gap-12">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-4 transition-all relative group whitespace-nowrap px-6 py-2`}
              >
                <cat.icon className={`w-4 h-4 transition-all duration-500 ${activeCategory === cat.name ? 'text-primary scale-125' : 'text-gray-300 group-hover:text-primary'}`} />
                <span className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 ${activeCategory === cat.name ? 'text-gray-900 border-b-2 border-primary pb-1' : 'text-gray-300 group-hover:text-primary'}`}>
                  {cat.name}
                </span>
                {activeCategory === cat.name && (
                  <motion.div layoutId="catGlow" className="absolute inset-0 bg-primary/5 blur-xl rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* High-Fidelity Asset Grid */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-gray-50 aspect-[4/5] animate-pulse rounded-[3rem]" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-40 border border-red-50/50 rounded-[4rem] bg-red-50/10">
            <X className="w-16 h-16 text-red-200 mx-auto mb-10" />
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Connection Terminated</h3>
            <p className="text-gray-400 text-sm font-medium mb-10">{error}</p>
            <button 
              onClick={() => fetchDriveFiles()}
              className="px-12 py-5 bg-gray-900 text-white rounded-full text-[10px] font-black tracking-[0.4em] hover:bg-black transition-all"
            >
              RE-ESTABLISH HANDSHAKE
            </button>
          </div>
        ) : filteredFiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
            <AnimatePresence mode="popLayout">
              {filteredFiles.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="relative aspect-[4/5] overflow-hidden rounded-[3rem] bg-gray-50 group border border-gray-100 hover:border-primary/20 hover:product-shadow transition-all duration-1000 cursor-none"
                  onClick={() => setSelectedFile(item)}
                >
                  {/* Media Content */}
                  <div className="relative w-full h-full overflow-hidden">
                    {pinnedIds.includes(item.id) && (
                      <div className="absolute top-6 right-6 z-30 bg-primary text-white p-2 rounded-full shadow-lg">
                        <Pin className="w-3 h-3 fill-current" />
                      </div>
                    )}
                    {item.isYoutube ? (
                      <div className="relative w-full h-full">
                        <img
                          src={`https://img.youtube.com/vi/${getYoutubeId(item.url)}/hqdefault.jpg`}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                           <Play className="w-16 h-16 text-white bg-white/20 backdrop-blur-2xl p-5 rounded-full border border-white/20" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={item.thumbnailLink ? item.thumbnailLink.replace('=s220', '=s2048') : `/api/drive/image/${item.id}`}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-110 filter brightness-95 group-hover:brightness-100"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                  
                  {/* Admin Direct Access */}
                  {role === 'admin' && (
                    <div className="absolute top-8 left-8 flex flex-col gap-2 z-20">
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(item); }}
                        className="w-10 h-10 bg-red-500/80 backdrop-blur-xl text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 hover:bg-red-600 scale-50 group-hover:scale-100"
                        title="Delete asset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleTogglePin(item); }}
                        className={`w-10 h-10 backdrop-blur-xl rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-50 group-hover:scale-100 ${
                          pinnedIds.includes(item.id) ? 'bg-primary text-white' : 'bg-white/80 text-gray-900 hover:bg-white'
                        }`}
                        title={pinnedIds.includes(item.id) ? "Unpin from top" : "Pin to top"}
                      >
                        {pinnedIds.includes(item.id) ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-60 border border-gray-50 rounded-[4rem]">
            <Logo className="w-20 h-20 text-gray-100 mx-auto mb-10 animate-pulse" />
            <p className="text-gray-200 font-sans font-black uppercase tracking-[0.8em] text-[10px]">Data Stream Inactive</p>
          </div>
        )}
      </div>

      {/* Add Asset Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-[110] backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] max-w-2xl w-full p-8 md:p-12 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar relative"
            >
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="text-4xl font-sans font-black text-gray-900 tracking-tighter uppercase leading-none mb-2">Deploy <br /> Asset</h2>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.4em]">Protocol Authorization Required</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="w-12 h-12 bg-gray-50 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {activeCategory !== 'Videos' && (
                <div className="flex gap-4 mb-12 p-2 bg-gray-50 rounded-[2rem]">
                  <button 
                    onClick={() => setAddType('drive')}
                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.3em] rounded-full transition-all duration-500 ${addType === 'drive' ? 'bg-white text-primary shadow-xl' : 'text-gray-400 hover:text-gray-700'}`}
                  >
                    Drive Stream
                  </button>
                  <button 
                    onClick={() => setAddType('youtube')}
                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.3em] rounded-full transition-all duration-500 ${addType === 'youtube' ? 'bg-white text-primary shadow-xl' : 'text-gray-400 hover:text-gray-700'}`}
                  >
                    External Link
                  </button>
                </div>
              )}

              {addType === 'drive' ? (
                <div className="space-y-10">
                  {!isDriveConnected ? (
                    <div className="p-16 border border-dashed border-gray-200 rounded-[3rem] text-center bg-gray-50/50">
                      <Camera className="w-16 h-16 text-gray-100 mx-auto mb-10" />
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-4">DRIVE_HANDSHAKE_REQUIRED</h3>
                      <p className="text-gray-400 text-sm font-medium mb-12">Authorization is mandatory to facilitate cloud-based asset ingestion.</p>
                      <button 
                        onClick={handleConnectDrive}
                        className="btn-premium px-12 py-5 text-[10px] tracking-[0.4em]"
                      >
                        AUTHORIZE NOW
                      </button>
                    </div>
                  ) : (
                      <div className="space-y-12">
                        <div>
                          <label className="block text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] mb-6">Security Clearance (Category)</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {Object.keys(FOLDER_MAP).map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setUploadCategory(cat)}
                                className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border-2 transition-all duration-500 ${uploadCategory === cat ? 'border-primary bg-primary text-white shadow-xl shadow-primary/20 scale-105' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-16 border border-dashed border-primary/20 rounded-[3rem] text-center bg-primary/5 relative group transition-all duration-1000">
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                            onChange={handleFileUpload}
                            disabled={isUploading}
                          />
                          <div className="relative z-0 group-hover:scale-110 transition-transform duration-700">
                            <Plus className="w-16 h-16 text-primary mx-auto mb-8" />
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-4">
                              {isUploading ? 'Injesting Data...' : 'Submit Media Asset'}
                            </h3>
                            <p className="text-xs font-medium text-gray-400">Target Protocol: <span className="text-primary font-black uppercase tracking-widest">{uploadCategory}</span></p>
                            <p className="text-[9px] text-gray-300 font-black uppercase tracking-[0.4em] mt-6">Maximum payload: 10MB</p>
                          </div>
                        </div>
                      </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleAddYoutube} className="space-y-8">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">Asset Endpoint (URL)</label>
                    <input 
                      type="url" 
                      required
                      placeholder="https://protocol-link.com/sequence"
                      className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:border-primary outline-none transition-all font-medium"
                      value={youtubeForm.url}
                      onChange={e => setYoutubeForm({...youtubeForm, url: e.target.value})}
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">Asset Title</label>
                    <input 
                      type="text" 
                      placeholder="Sequence Label..."
                      className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:border-primary outline-none transition-all font-medium"
                      value={youtubeForm.title}
                      onChange={e => setYoutubeForm({...youtubeForm, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">Classification</label>
                    <select 
                      className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:border-primary outline-none transition-all font-medium uppercase"
                      value={youtubeForm.category}
                      onChange={e => setYoutubeForm({...youtubeForm, category: e.target.value})}
                    >
                      <option value="Videos">Videos Only</option>
                      {Object.keys(FOLDER_MAP).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-premium w-full py-6 text-[10px] tracking-[0.5em] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Injesting...' : 'REGISTER MODULE'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Asset Inspection Modal */}
      <AnimatePresence>
        {selectedFile && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-0 md:p-12 z-[110] backdrop-blur-3xl">
            <motion.div
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="relative max-w-[100vw] md:max-w-7xl w-full bg-transparent overflow-hidden flex flex-col lg:flex-row h-full max-h-[100vh] md:max-h-[85vh] md:rounded-[4rem]"
            >
              <button 
                onClick={() => setSelectedFile(null)}
                className="absolute top-10 right-10 z-50 w-14 h-14 bg-white/10 backdrop-blur-3xl flex items-center justify-center rounded-full text-white hover:bg-white/20 transition-all active:scale-95"
              >
                <X className="w-8 h-8" />
              </button>

              {/* High-Fidelity Preview Side */}
              <div className="flex-grow bg-black flex items-center justify-center relative min-h-[50vh]">
                {/* Admin/User Overlay Actions */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4">
                  {role === 'admin' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(selectedFile);
                        setSelectedFile(null);
                      }}
                      className="w-14 h-14 bg-red-500/80 backdrop-blur-3xl flex items-center justify-center rounded-full text-white hover:bg-red-600 transition-all active:scale-95"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}
                </div>

                {/* Navigation Controls */}
                {filteredFiles.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                      className="absolute left-10 z-20 w-16 h-16 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all duration-500 backdrop-blur-xl border border-white/5 hidden md:flex"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleNext(); }}
                      className="absolute right-10 z-20 w-16 h-16 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all duration-500 backdrop-blur-xl border border-white/5 hidden md:flex"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                  </>
                )}

                <div className="w-full h-full flex items-center justify-center p-12">
                  {selectedFile.isYoutube ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYoutubeId(selectedFile.url)}?autoplay=1&modestbranding=1&rel=0`}
                      className="w-full aspect-video md:h-full border-0 rounded-3xl shadow-2xl"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (selectedFile.type === 'video' || (selectedFile.mimeType && selectedFile.mimeType.startsWith('video/'))) ? (
                    <video 
                      src={selectedFile.type === 'video' ? selectedFile.url : selectedFile.webContentLink} 
                      controls 
                      autoPlay 
                      className="max-w-full max-h-full rounded-3xl"
                    />
                  ) : (
                    <img 
                      src={selectedFile.thumbnailLink ? selectedFile.thumbnailLink.replace('=s220', '=s2048') : `/api/drive/image/${selectedFile.id}`} 
                      alt={selectedFile.name || selectedFile.title}
                      className="max-w-full max-h-full object-contain md:rounded-[3rem] product-shadow"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
                </div>
              </motion.div>
            </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Item"
        message="Are you sure you want to delete this item? If it's a file, it will be permanently removed from Google Drive. Links will be removed from the gallery."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default PublicGallery;
