import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ImageIcon, ArrowRight, Camera, Filter, Search, Plus, X, Download, Play, Heart, ChevronLeft, ChevronRight, Youtube, Music, Baby, Calendar, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { toast } from 'sonner';

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
  
  const FOLDER_MAP: Record<string, string> = {
    'Wedding': '1sWUCrEJQHgZfzF0C3ZbqL5xbYGxYo4Qn',
    'Music': '1UIs_4grBIKa2aq7qGLxWIlTmBm8gsXBg',
    'Kids': '1tX7LLW8IuorWPEh4_GZWir79T4SkPMM3',
    'Event': '1RUcpnCc3NIV87PI4OEhsiTQHd13FBAa0',
    'Other': '1WkAnOgDEioFqAyvD5BzTGi2ybB6ohc0V'
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

  useEffect(() => {
    const checkDriveStatus = async () => {
      try {
        const response = await fetch('/api/auth/google/status');
        const data = await response.json();
        setIsDriveConnected(data.connected);
      } catch (err) {
        console.error('Error checking Drive status:', err);
      }
    };
    checkDriveStatus();

    const q = query(collection(db, 'sampleWorks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isYoutube: true
      }));
      setYoutubeVideos(videos);
    });
    return () => unsubscribe();
  }, []);

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
      await addDoc(collection(db, 'sampleWorks'), {
        userId: user.uid,
        userName: user.displayName || 'Admin',
        userRole: role || 'admin',
        type: 'link',
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    // Determine target folder based on active category
    const targetFolderId = FOLDER_MAP[activeCategory] || FOLDER_MAP['Other'];
    formData.append('folderId', targetFolderId);

    try {
      const response = await fetch('/api/upload-to-drive', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      toast.success('File uploaded to Drive successfully');
      // The gallery will refresh automatically because it fetches from Drive on mount or we can trigger a refresh
      window.location.reload(); 
    } catch (err) {
      console.error('Error uploading file:', err);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConnectDrive = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      window.open(url, '_blank', 'width=600,height=600');
    } catch (err) {
      console.error('Error getting auth URL:', err);
      toast.error('Failed to connect to Google Drive');
    }
  };

  const allItems = [
    ...driveFiles.map(f => ({ ...f, isDrive: true })),
    ...youtubeVideos
  ].sort((a, b) => {
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

  useEffect(() => {
    const fetchDriveFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const fetchPromises = Object.entries(FOLDER_MAP).map(async ([category, folderId]) => {
          try {
            const response = await fetch(`/api/drive/list/${folderId}`);
            if (!response.ok) return [];
            const data = await response.json();
            return data.map((file: any) => ({ ...file, driveCategory: category }));
          } catch (err) {
            console.error(`Error fetching folder ${category}:`, err);
            return [];
          }
        });

        const results = await Promise.all(fetchPromises);
        const allFiles = results.flat();
        setDriveFiles(allFiles);
      } catch (err: any) {
        console.error('Error fetching Drive files:', err);
        setError(err.message || 'An unknown error occurred');
        setDriveFiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDriveFiles();
  }, []);

  return (
    <div className="bg-[#fafafa] min-h-screen pb-12">
      {/* Instagram Profile Header */}
      <div className="max-w-4xl mx-auto pt-12 px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-16">
          {/* Avatar */}
          <div className="relative">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
              <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-gray-200">
                <img 
                  src="https://picsum.photos/seed/photographer/400/400" 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {role === 'admin' && (
              <button 
                onClick={() => {
                  if (activeCategory === 'Videos') setAddType('youtube');
                  else setAddType('drive');
                  setShowAddModal(true);
                }}
                className="absolute bottom-2 right-2 p-2 bg-blue-500 text-white rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-grow text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
              <h1 className="text-2xl font-light text-gray-900">rays_of_moment</h1>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <button className="px-4 py-1.5 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors">
                  Follow
                </button>
                <button className="px-4 py-1.5 bg-gray-100 text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                  Message
                </button>
                <button className="p-1.5 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors">
                  <Camera className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-8 mb-6">
              <div className="text-base"><span className="font-semibold">{driveFiles.length}</span> posts</div>
              <div className="text-base"><span className="font-semibold">12.4k</span> followers</div>
              <div className="text-base"><span className="font-semibold">842</span> following</div>
            </div>

            <div className="max-w-md">
              <h2 className="font-semibold text-gray-900 mb-1">Rays of Moment Photography</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                📸 Capturing moments that last forever<br />
                🌍 Travel | Wedding | Portrait<br />
                📍 Based in Murshidabad, West Bengal<br />
                ✨ Open for bookings worldwide
              </p>
              <a href="https://raysofmoment.com" className="text-blue-900 text-sm font-semibold mt-2 block hover:underline">
                raysofmoment.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto border-t border-gray-200">
        <div className="flex justify-center gap-4 md:gap-12 -mt-px overflow-x-auto no-scrollbar px-4">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`flex items-center gap-2 py-4 text-[10px] md:text-xs font-semibold tracking-widest uppercase transition-all border-t whitespace-nowrap ${
                activeCategory === cat.name 
                  ? 'border-black text-black' 
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <cat.icon className="w-3 h-3" />
              {cat.name}
            </button>
          ))}
          {role === 'admin' && activeCategory === 'Videos' && (
            <button 
              onClick={() => {
                setAddType('youtube');
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 py-4 text-[10px] md:text-xs font-semibold tracking-widest uppercase transition-all border-t border-transparent text-blue-600 hover:text-blue-800 whitespace-nowrap"
            >
              <Plus className="w-3 h-3" />
              Add Video
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-0 mt-4">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <X className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Gallery Error</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">{error}</p>
          </div>
        ) : filteredFiles.length > 0 ? (
          <div className="grid grid-cols-3 gap-1 md:gap-8">
            <AnimatePresence mode="popLayout">
              {filteredFiles.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  layout
                  className="group relative aspect-square overflow-hidden bg-gray-200 cursor-pointer"
                  onClick={() => setSelectedFile(item)}
                >
                  {item.isYoutube ? (
                    <div className="w-full h-full relative">
                      <img
                        src={`https://img.youtube.com/vi/${getYoutubeId(item.url)}/hqdefault.jpg`}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                          <Play className="w-6 h-6 text-white fill-white ml-1" />
                        </div>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Youtube className="w-5 h-5 text-white drop-shadow-md" />
                      </div>
                    </div>
                  ) : item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : item.type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                      <Play className="w-12 h-12 text-white opacity-50" />
                      <div className="absolute top-2 right-2">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </div>
                  ) : item.mimeType?.startsWith('video/') ? (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                      <Play className="w-8 h-8 text-white opacity-50" />
                      <div className="absolute top-2 right-2">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={item.thumbnailLink?.replace('=s220', '=s800') || item.webViewLink}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  
                  {/* Instagram Hover Overlay */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold">
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-6 h-6 fill-white" />
                      <span>{Math.floor(Math.random() * 500) + 50}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="w-6 h-6 fill-white" />
                      <span>{Math.floor(Math.random() * 50) + 5}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-24 bg-white border border-gray-200 rounded-lg">
            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No posts yet.</p>
          </div>
        )}
      </div>

      {/* Add Post Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[110] backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Content</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {activeCategory !== 'Videos' && (
                <div className="flex gap-4 mb-8 p-1 bg-gray-100 rounded-xl">
                  <button 
                    onClick={() => setAddType('drive')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${addType === 'drive' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Drive Upload
                  </button>
                  <button 
                    onClick={() => setAddType('youtube')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${addType === 'youtube' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    YouTube Link
                  </button>
                </div>
              )}

              {addType === 'drive' ? (
                <div className="space-y-6">
                  {!isDriveConnected ? (
                    <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center bg-gray-50">
                      <Camera className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Connect Google Drive</h3>
                      <p className="text-sm text-gray-500 mb-6">You need to authorize the app to upload files to your Google Drive.</p>
                      <button 
                        onClick={handleConnectDrive}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                      >
                        Connect Now
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="p-8 border-2 border-dashed border-blue-200 rounded-2xl text-center bg-blue-50/30 relative">
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                        <div className="pointer-events-none">
                          <Plus className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {isUploading ? 'Uploading...' : 'Click to Upload'}
                          </h3>
                          <p className="text-sm text-gray-500">Photos or Videos (Max 10MB)</p>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-xs text-gray-500 text-center">
                          Files will be uploaded to your linked Google Drive folder and appear in the gallery automatically.
                        </p>
                      </div>
                      <div className="text-center">
                        <a 
                          href={`https://drive.google.com/drive/folders/${FOLDER_MAP[activeCategory] || FOLDER_MAP['Other']}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-blue-600 hover:underline"
                        >
                          View Folder in Google Drive
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleAddYoutube} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">YouTube URL</label>
                    <input 
                      type="url" 
                      required
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                      value={youtubeForm.url}
                      onChange={e => setYoutubeForm({...youtubeForm, url: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                    <input 
                      type="text" 
                      placeholder="Enter video title"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                      value={youtubeForm.title}
                      onChange={e => setYoutubeForm({...youtubeForm, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                      value={youtubeForm.category}
                      onChange={e => setYoutubeForm({...youtubeForm, category: e.target.value})}
                    >
                      <option value="Videos">Videos</option>
                    </select>
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Adding...' : 'Add YouTube Video'}
                  </button>
                </form>
              )}
              
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-full py-3 mt-4 bg-gray-100 text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedFile && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-6xl w-full bg-white rounded-sm overflow-hidden flex flex-col md:flex-row h-full max-h-[90vh]"
            >
              {/* Image/Video Side */}
              <div className="flex-grow bg-black flex items-center justify-center relative min-h-[40vh]">
                {/* Navigation Arrows */}
                {filteredFiles.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                      className="absolute left-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors hidden md:block"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleNext(); }}
                      className="absolute right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors hidden md:block"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                  </>
                )}

                {selectedFile.isYoutube ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${getYoutubeId(selectedFile.url)}?autoplay=1`}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (selectedFile.type === 'video' || (selectedFile.mimeType && selectedFile.mimeType.startsWith('video/'))) ? (
                  <video 
                    src={selectedFile.type === 'video' ? selectedFile.url : selectedFile.webContentLink} 
                    controls 
                    autoPlay 
                    className="max-w-full max-h-full"
                  />
                ) : (
                  <img 
                    src={selectedFile.type === 'image' ? selectedFile.url : (selectedFile.thumbnailLink?.replace('=s220', '=s1600') || selectedFile.webViewLink)} 
                    alt={selectedFile.name || selectedFile.title}
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 md:hidden"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Sidebar Info Side */}
              <div className="w-full md:w-[400px] flex flex-col bg-white border-l border-gray-200">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                      <img src="https://picsum.photos/seed/photographer/100/100" alt="Avatar" />
                    </div>
                    <span className="font-semibold text-sm">rays_of_moment</span>
                    <span className="text-blue-500 font-semibold text-sm cursor-pointer hover:text-blue-700">• Follow</span>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="hidden md:block">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="flex-grow p-4 overflow-y-auto">
                  <div className="flex gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      <img src="https://picsum.photos/seed/photographer/100/100" alt="Avatar" />
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold mr-2">rays_of_moment</span>
                        {selectedFile.isYoutube ? selectedFile.title : selectedFile.name}
                      </p>
                      <p className="text-gray-400 text-xs mt-2 uppercase tracking-wider">
                        {format(new Date(selectedFile.createdAt || selectedFile.createdTime || new Date()), 'MMMM d')}
                      </p>
                    </div>
                  </div>

                  {/* Mock Comments */}
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" />
                      </div>
                      <div>
                        <p className="text-sm">
                          <span className="font-semibold mr-2">user_{i}</span>
                          This shot is absolutely incredible! Love the lighting.
                        </p>
                        <div className="flex gap-3 mt-1">
                          <span className="text-gray-400 text-xs">2h</span>
                          <span className="text-gray-500 text-xs font-semibold cursor-pointer">Reply</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-4">
                      <Heart className="w-6 h-6 cursor-pointer hover:text-gray-600" />
                      <ImageIcon className="w-6 h-6 cursor-pointer hover:text-gray-600" />
                      <Download className="w-6 h-6 cursor-pointer hover:text-gray-600" onClick={() => window.open(selectedFile.webContentLink)} />
                    </div>
                  </div>
                  <p className="font-semibold text-sm mb-1">{Math.floor(Math.random() * 500) + 50} likes</p>
                  <p className="text-gray-400 text-[10px] uppercase tracking-wider">{format(new Date(), 'MMMM d, yyyy')}</p>
                </div>

                <div className="p-4 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <input 
                      type="text" 
                      placeholder="Add a comment..." 
                      className="flex-grow text-sm outline-none"
                    />
                    <button className="text-blue-500 font-semibold text-sm opacity-50">Post</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicGallery;
