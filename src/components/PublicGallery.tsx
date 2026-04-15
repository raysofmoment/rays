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
    <div className="py-24 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="text-left">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Photography Gallery</h1>
            <p className="text-xl text-gray-500 max-w-2xl">Explore our collection of high-quality moments captured across the globe.</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search photos & videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-black transition-all"
            />
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
            {['All', 'Photos', 'Videos'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  activeCategory === cat ? 'bg-black text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : error ? (
          <div className="text-center py-24 bg-red-50 rounded-3xl border border-red-100">
            <X className="w-16 h-16 text-red-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-red-900 mb-2">Gallery Error</h3>
            <p className="text-red-600 max-w-md mx-auto">{error}</p>
            <p className="text-sm text-red-500 mt-4">Please ensure your Google Drive API Key is correctly configured in Settings.</p>
          </div>
        ) : filteredFiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredFiles.map((file, i) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  layout
                  className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-xl transition-all"
                >
                  {file.mimeType.startsWith('video/') ? (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                      <Play className="w-12 h-12 text-white opacity-50" />
                      <div className="absolute bottom-4 left-4 bg-black/60 px-2 py-1 rounded text-[10px] text-white font-bold uppercase tracking-wider">
                        Video
                      </div>
                    </div>
                  ) : (
                    <img
                      src={file.thumbnailLink?.replace('=s220', '=s800') || file.webViewLink}
                      alt={file.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                    <button 
                      onClick={() => setSelectedFile(file)}
                      className="p-3 bg-white rounded-full text-black hover:bg-gray-100 transition-colors shadow-lg"
                    >
                      {file.mimeType.startsWith('video/') ? <Play className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                    </button>
                    <a 
                      href={file.webContentLink} 
                      download
                      className="p-3 bg-white rounded-full text-black hover:bg-gray-100 transition-colors shadow-lg"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-medium truncate">{file.name}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-24 bg-gray-50 rounded-3xl">
            <ImageIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">No files found in the Drive gallery.</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedFile && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
            >
              <button 
                onClick={() => setSelectedFile(null)}
                className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
              
              <div className="w-full h-full flex items-center justify-center">
                {selectedFile.mimeType.startsWith('video/') ? (
                  <video 
                    src={selectedFile.webContentLink} 
                    controls 
                    autoPlay 
                    className="max-w-full max-h-[75vh] rounded-xl shadow-2xl"
                  />
                ) : (
                  <img 
                    src={selectedFile.thumbnailLink?.replace('=s220', '=s1600') || selectedFile.webViewLink} 
                    alt={selectedFile.name}
                    className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              
              <div className="mt-8 text-center">
                <h3 className="text-2xl font-bold text-white mb-4">{selectedFile.name}</h3>
                <div className="flex items-center justify-center space-x-4">
                  <a 
                    href={selectedFile.webContentLink} 
                    download 
                    className="flex items-center space-x-2 px-8 py-3 bg-white text-black rounded-2xl font-bold hover:bg-gray-200 transition-all shadow-lg active:scale-95"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download High Res</span>
                  </a>
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="px-8 py-3 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-all backdrop-blur-md"
                  >
                    Close
                  </button>
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
