import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Settings, 
  Loader2, 
  Image as ImageIcon,
  LayoutGrid,
  CheckCircle2,
  Trash2,
  Share2,
  ArrowRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { toast } from 'sonner';

interface PhotoSelectionProps {
  user: User | null;
  role: string | null;
}

interface SelectionSet {
  id: string; // Typically bookingId
  clientId: string;
  clientName: string;
  folderId: string;
  folderUrl: string;
  selectedIds: string[];
  rejectedIds: string[];
  status: 'pending' | 'completed' | 'exported';
  exportedFolderId?: string;
  createdAt: string;
  updatedAt: string;
}

const extractDriveFolderId = (url: string) => {
  if (!url) return '';
  const match = url.match(/folders\/([a-zA-Z0-9-_]+)/) || url.match(/id=([a-zA-Z0-9-_]+)/);
  return match ? match[1] : url;
};

const PhotoSelection: React.FC<PhotoSelectionProps> = ({ user, role }) => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectionSet, setSelectionSet] = useState<SelectionSet | null>(null);
  const [exporting, setExporting] = useState(false);
  
  // Admin view states
  const [allSelections, setAllSelections] = useState<SelectionSet[]>([]);
  const [selectedMobile, setSelectedMobile] = useState('');

  // Swipe gesture hooks
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacity = useTransform(
    () => {
      const latestX = x.get();
      const latestY = y.get();
      const distance = Math.sqrt(latestX * latestX + latestY * latestY);
      return Math.max(1 - distance / 400, 0);
    }
  );

  const isAdmin = role === 'admin' || role === 'photographer' || role === 'editor';

  useEffect(() => {
    if (bookingId) {
      fetchBookingById(bookingId);
    }
  }, [bookingId]);

  useEffect(() => {
    if (isAdmin) {
      const q = query(collection(db, 'photoSelections'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as SelectionSet);
        setAllSelections(data);
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  const loadPhotos = async (folderId: string) => {
    try {
      const response = await fetch(`/api/drive/list/${folderId}`);
      if (!response.ok) throw new Error('Failed to load photos from Drive');
      const data = await response.json();
      setPhotos(data);
    } catch (err) {
      console.error(err);
      toast.error('Error loading photos from Google Drive');
    }
  };

  const fetchBookingById = async (id: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'bookings', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        toast.error('Booking not found');
        return;
      }
      await initializeSelection(id, snap.data());
    } catch (error) {
      console.error('Error fetching booking by ID:', error);
      toast.error('Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingByMobile = async (mobile: string) => {
    if (!mobile.trim()) {
      toast.error('Please enter a mobile number');
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, 'bookings'), where('clientMobile', '==', mobile));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error('No booking found for this mobile number');
        setLoading(false);
        return;
      }
      
      const bookingId = snap.docs[0].id;
      await initializeSelection(bookingId, snap.docs[0].data());
    } catch (err) {
      console.error(err);
      toast.error('Error fetching booking');
    } finally {
      setLoading(false);
    }
  };

  const initializeSelection = async (bookingId: string, bookingData: any) => {
    const fullBookingData = { id: bookingId, ...bookingData };
    setBooking(fullBookingData);
    
    const folderId = fullBookingData.googleDriveFolderId || extractDriveFolderId(fullBookingData.googleDriveFolderUrl || '');
    
    if (!folderId) {
      toast.error('No Google Drive folder linked to this booking');
      return;
    }

    // Initialize or fetch selection set
    const selDoc = await getDoc(doc(db, 'photoSelections', bookingId));
    if (selDoc.exists()) {
      setSelectionSet(selDoc.data() as SelectionSet);
    } else {
      const newSet: SelectionSet = {
        id: bookingId,
        clientId: user?.uid || 'anonymous',
        clientName: fullBookingData.clientName,
        folderId: folderId,
        folderUrl: fullBookingData.googleDriveFolderUrl || '',
        selectedIds: [],
        rejectedIds: [],
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'photoSelections', bookingId), newSet);
      setSelectionSet(newSet);
    }

    await loadPhotos(folderId);
  };

  const handleAction = async (action: 'select' | 'reject') => {
    if (!selectionSet || !photos[currentIndex]) return;
    
    const photoId = photos[currentIndex].id;
    const update: any = {
      updatedAt: new Date().toISOString()
    };
    
    if (action === 'select') {
      update.selectedIds = arrayUnion(photoId);
      update.rejectedIds = arrayRemove(photoId);
      toast.success('Photo Shortlisted', { duration: 1000 });
    } else {
      update.rejectedIds = arrayUnion(photoId);
      update.selectedIds = arrayRemove(photoId);
    }

    // Optimistically update UI
    setSelectionSet(prev => {
      if (!prev) return null;
      const newSelected = action === 'select' 
        ? [...prev.selectedIds.filter(id => id !== photoId), photoId]
        : prev.selectedIds.filter(id => id !== photoId);
      const newRejected = action === 'reject'
        ? [...prev.rejectedIds.filter(id => id !== photoId), photoId]
        : prev.rejectedIds.filter(id => id !== photoId);
      
      return {
        ...prev,
        selectedIds: newSelected,
        rejectedIds: newRejected
      };
    });

    try {
      await updateDoc(doc(db, 'photoSelections', selectionSet.id), update);
      if (currentIndex < photos.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Finished
        await updateDoc(doc(db, 'photoSelections', selectionSet.id), { status: 'completed' });
        setSelectionSet(prev => prev ? { ...prev, status: 'completed' } : null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save selection');
    }
  };

  const handleExport = async (set: SelectionSet) => {
    if (set.selectedIds.length === 0) {
      toast.error('No photos selected to export');
      return;
    }

    setExporting(true);
    const toastId = toast.loading('Exporting selected photos to Google Drive...');
    
    try {
      const response = await fetch('/api/drive/export-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: set.folderId,
          selectedFileIds: set.selectedIds,
          selectionName: `Selected for ${set.clientName}`
        })
      });

      const data = await response.json();
      if (data.success) {
        await updateDoc(doc(db, 'photoSelections', set.id), { 
          status: 'exported',
          exportedFolderId: data.targetFolderId
        });
        toast.success('Photos exported to new Drive folder!', { id: toastId });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Export failed: ' + err.message, { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 100;
    
    // Prioritize vertical swipes for Select/Reject
    if (info.offset.y < -threshold && Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
      handleAction('select');
    } else if (info.offset.y > threshold && Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
      handleAction('reject');
    } 
    // Horizontal swipes for navigation
    else if (info.offset.x < -threshold) {
      if (currentIndex < photos.length - 1) setCurrentIndex(prev => prev + 1);
    } else if (info.offset.x > threshold) {
      if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    }
    
    x.set(0);
    y.set(0);
  };

  if (isAdminView && isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Photo Selections</h1>
              <p className="text-gray-500">Monitor and export client photo choices</p>
            </div>
            <button 
              onClick={() => setIsAdminView(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 font-bold hover:bg-white transition-colors"
            >
              Exit Admin
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allSelections.map((set) => (
              <div key={set.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{set.clientName}</h3>
                    <p className="text-xs text-gray-400">{new Date(set.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                    set.status === 'exported' ? 'bg-green-100 text-green-700' : 
                    set.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {set.status}
                  </div>
                </div>

                <div className="flex flex-col space-y-4 flex-grow">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-xl text-center">
                      <div className="text-lg font-bold text-green-600">{set.selectedIds?.length || 0}</div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold">Selected</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl text-center">
                      <div className="text-lg font-bold text-red-600">{set.rejectedIds?.length || 0}</div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold">Rejected</div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 flex space-x-2">
                    <button 
                      onClick={() => handleExport(set)}
                      disabled={exporting || set.status === 'exported'}
                      className="flex-1 bg-black text-white py-2 rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span>{set.status === 'exported' ? 'Exported' : 'Export to Drive'}</span>
                    </button>
                    <a 
                      href={set.folderUrl}
                      target="_blank"
                      className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                      title="Open Original Folder"
                    >
                      <Share2 className="w-4 h-4 text-gray-400" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
            {allSelections.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-gray-100">
                <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No photo selection sets found yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (booking && selectionSet) {
    if (selectionSet.status === 'completed' || selectionSet.status === 'exported') {
      return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-sm border border-gray-100 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Selection Complete!</h2>
            <p className="text-gray-500 mb-8 italic">You have shortlisted {selectionSet.selectedIds.length} photos. Our team will proceed with your choices.</p>
            <button 
              onClick={() => {
                setBooking(null);
                setSelectionSet(null);
                setSelectedMobile('');
              }}
              className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
            >
              Back to Start
            </button>
          </div>
        </div>
      );
    }

    if (photos.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Loading your photos from Google Drive...</p>
          </div>
        </div>
      );
    }

    const currentPhoto = photos[currentIndex];
    const proxyUrl = `/api/drive/image/${currentPhoto.id}`;

    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col md:flex-row">
        {/* Horizontal Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-50">
          <motion.div 
            className="h-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex) / photos.length) * 100}%` }}
          />
        </div>

        {/* Info Header */}
        <div className="absolute top-4 left-4 z-50 flex items-center space-x-3">
          <button 
            onClick={() => setBooking(null)}
            className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h3 className="text-white font-bold text-sm">{booking.clientName}</h3>
            <p className="text-gray-400 text-[10px] uppercase tracking-wider">{currentIndex + 1} of {photos.length}</p>
          </div>
        </div>

        {/* Counter */}
        <div className="absolute top-4 right-4 z-50 flex flex-col items-end space-y-1">
          <div className="px-3 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-full border border-green-500/30">
            {selectionSet.selectedIds.length} Selected
          </div>
        </div>

        {/* Canvas / Main Swipe Area */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden touch-none">
          <AnimatePresence mode="popLayout">
            <motion.div 
              key={currentPhoto.id}
              style={{ x, y, rotate, opacity }}
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              onDragEnd={handleDragEnd}
              className="relative w-[90%] h-[70vh] md:w-[450px] md:h-[650px] rounded-3xl overflow-hidden bg-gray-900 shadow-2xl cursor-grab active:cursor-grabbing border border-white/5"
            >
              <img 
                src={proxyUrl} 
                alt="Selection" 
                className="w-full h-full object-cover pointer-events-none select-none"
                referrerPolicy="no-referrer"
              />
              
              {/* Swipe Feedback Overlays */}
              <motion.div 
                style={{ opacity: useTransform(y, [-50, -150], [0, 1]) }}
                className="absolute inset-0 bg-green-500/20 flex items-center justify-center pointer-events-none"
              >
                <div className="px-6 py-3 border-4 border-green-500 rounded-2xl text-green-500 font-black text-4xl uppercase -rotate-12">
                  SHORTLIST
                </div>
              </motion.div>
              
              <motion.div 
                style={{ opacity: useTransform(y, [50, 150], [0, 1]) }}
                className="absolute inset-0 bg-red-500/20 flex items-center justify-center pointer-events-none"
              >
                <div className="px-6 py-3 border-4 border-red-500 rounded-2xl text-red-500 font-black text-4xl uppercase rotate-12">
                  SKIP
                </div>
              </motion.div>

              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end">
                <p className="text-white font-medium text-lg truncate mb-2">{currentPhoto.name}</p>
                <div className="flex flex-col gap-1 text-gray-300 text-xs mt-1 bg-black/40 p-3 rounded-xl backdrop-blur-md">
                  <div className="flex items-center space-x-2">
                    <Info className="w-3 h-3 flex-shrink-0" />
                    <span>Swipe UP to Select, DOWN to Skip</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <LayoutGrid className="w-3 h-3 flex-shrink-0" />
                    <span>Swipe LEFT/RIGHT to navigate</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Swipe UI Indicators (Desktop or Mobile) */}
          <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8 md:gap-12 z-50">
            <button 
              onClick={() => handleAction('reject')}
              className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-red-500 border border-white/10 hover:bg-white/20 hover:scale-110 active:scale-95 transition-all shadow-xl"
            >
              <X className="w-8 h-8" />
            </button>
            <button 
              onClick={() => handleAction('select')}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-green-500 hover:scale-110 active:scale-95 transition-all shadow-2xl"
            >
              <Check className="w-10 h-10" />
            </button>
            <div className="flex flex-col items-center">
               <div className="flex gap-2">
                <button 
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                  className="p-3 bg-white/5 rounded-xl text-white/50 hover:bg-white/10 disabled:opacity-20 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                  className="p-3 bg-white/5 rounded-xl text-white/50 hover:bg-white/10 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
               </div>
               <span className="text-[9px] text-white/30 uppercase font-black tracking-widest mt-2">Navigation</span>
            </div>
          </div>
        </div>

        {/* Selection Sidebar (Large screens) */}
        <div className="hidden lg:flex w-[350px] bg-black/40 backdrop-blur-3xl border-l border-white/5 flex-col p-8 overflow-hidden">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <LayoutGrid className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold">Your Shortlist</h2>
              <p className="text-white/40 text-xs">{selectionSet.selectedIds.length} items</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {selectionSet.selectedIds.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <ImageIcon className="w-10 h-10 text-white/10 mb-4" />
                <p className="text-white/30 text-sm italic">Shortlisted photos will appear here as you swipe.</p>
              </div>
            ) : (
              selectionSet.selectedIds.map(id => (
                <div key={id} className="relative aspect-video rounded-xl overflow-hidden bg-white/5 group">
                  <img 
                    src={`/api/drive/image/${id}`} 
                    className="w-full h-full object-cover" 
                    alt="Shortlisted"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <button 
                      onClick={() => {
                        const newIds = selectionSet.selectedIds.filter(x => x !== id);
                        updateDoc(doc(db, 'photoSelections', selectionSet.id), { selectedIds: newIds });
                      }}
                      className="p-2 bg-red-500 rounded-lg text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {selectionSet.selectedIds.length > 0 && (
            <div className="mt-8">
              <button 
                onClick={() => {
                  toast.success('Selection finalized! Notifying admin.');
                  setTimeout(() => {
                    updateDoc(doc(db, 'photoSelections', selectionSet.id), { status: 'completed' });
                    setSelectionSet(prev => prev ? { ...prev, status: 'completed' } : null);
                  }, 1000);
                }}
                className="w-full py-4 bg-white text-black rounded-2xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Submit Selection</span>
              </button>
              <p className="text-[10px] text-white/30 text-center mt-3 uppercase tracking-tighter">Submit when you are ready to finalize</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Login Form (default catch-all)
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 md:p-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-black/10">
            <LayoutGrid className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Photo Selection</h2>
          <p className="text-gray-500 text-sm mt-2">Enter your registered mobile number to start shortlisting your gallery.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Registered Mobile</label>
            <div className="relative">
              <input 
                type="tel" 
                placeholder="e.g. 9876543210" 
                value={selectedMobile}
                onChange={(e) => setSelectedMobile(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchBookingByMobile(selectedMobile)}
                className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all text-lg tracking-tight"
              />
            </div>
          </div>
          
          <button 
            onClick={() => fetchBookingByMobile(selectedMobile)}
            disabled={loading}
            className="w-full bg-black text-white py-5 rounded-2xl font-bold hover:bg-gray-800 transition-all transform active:scale-[0.98] flex items-center justify-center space-x-3 shadow-xl shadow-black/20"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <ArrowRight className="w-5 h-5" />
                <span>Access Gallery</span>
              </>
            )}
          </button>
          
          {isAdmin && (
            <button 
              onClick={() => setIsAdminView(true)}
              className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center space-x-2"
            >
              <Settings className="w-5 h-5" />
              <span>Admin Dashboard</span>
            </button>
          )}
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-50 text-center">
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Powered by Rays of Moment</p>
        </div>
      </div>
    </div>
  );
};

export default PhotoSelection;
