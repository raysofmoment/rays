import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ImageIcon, ArrowRight, Camera, Filter, Search, Plus, X, Download, Play, Heart } from 'lucide-react';
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
  const FOLDER_ID = '14s9KpnT6uwVnN-lXrzF7ixn_qq-Wp7OI';

  useEffect(() => {
    const fetchDriveFiles = async () => {
      try {
        setError(null);
        const response = await fetch(`/api/drive/list/${FOLDER_ID}`);
        const data = await response.json();
        
        if (!response.ok) {
          let errorMsg = data.error || 'Failed to fetch Drive files';
          if (data.debug) {
            errorMsg += ` (Key: ${data.debug.keyPrefix}..., Length: ${data.debug.keyLength}, Code: ${data.debug.code})`;
          }
          throw new Error(errorMsg);
        }
        
        setDriveFiles(data);
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

  const filteredFiles = driveFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isImage = file.mimeType.startsWith('image/');
    const isVideo = file.mimeType.startsWith('video/');
    
    if (activeCategory === 'Photos') return isImage && matchesSearch;
    if (activeCategory === 'Videos') return isVideo && matchesSearch;
    return matchesSearch;
  });

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
                onClick={() => setShowAddModal(true)}
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
        <div className="flex justify-center gap-12 -mt-px">
          {['All', 'Photos', 'Videos'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-2 py-4 text-xs font-semibold tracking-widest uppercase transition-all border-t ${
                activeCategory === cat 
                  ? 'border-black text-black' 
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {cat === 'All' && <Filter className="w-3 h-3" />}
              {cat === 'Photos' && <ImageIcon className="w-3 h-3" />}
              {cat === 'Videos' && <Play className="w-3 h-3" />}
              {cat}
            </button>
          ))}
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
              {filteredFiles.map((file, i) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  layout
                  className="group relative aspect-square overflow-hidden bg-gray-200 cursor-pointer"
                  onClick={() => setSelectedFile(file)}
                >
                  {file.mimeType.startsWith('video/') ? (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                      <Play className="w-8 h-8 text-white opacity-50" />
                      <div className="absolute top-2 right-2">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={file.thumbnailLink?.replace('=s220', '=s800') || file.webViewLink}
                      alt={file.name}
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
              className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Post</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-6">
                <div className="p-6 border-2 border-dashed border-gray-200 rounded-xl text-center">
                  <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 mb-4">To add photos to this public gallery, please upload them to your linked Google Drive folder.</p>
                  <a 
                    href={`https://drive.google.com/drive/folders/${FOLDER_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-all"
                  >
                    Open Google Drive
                  </a>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">The gallery will automatically update once the files are uploaded and processed by Google Drive.</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="w-full py-3 bg-gray-100 text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
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
                {selectedFile.mimeType.startsWith('video/') ? (
                  <video 
                    src={selectedFile.webContentLink} 
                    controls 
                    autoPlay 
                    className="max-w-full max-h-full"
                  />
                ) : (
                  <img 
                    src={selectedFile.thumbnailLink?.replace('=s220', '=s1600') || selectedFile.webViewLink} 
                    alt={selectedFile.name}
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
                        {selectedFile.name}
                      </p>
                      <p className="text-gray-400 text-xs mt-2 uppercase tracking-wider">
                        {format(new Date(), 'MMMM d')}
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
