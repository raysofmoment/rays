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

import Logo from './Logo';

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
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectionSet, setSelectionSet] = useState<SelectionSet | null>(null);
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpGenerated, setOtpGenerated] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [pendingBookingData, setPendingBookingData] = useState<{ id: string, data: any } | null>(null);
  
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
  
  const shortlistOpacity = useTransform(y, [-50, -150], [0, 1]);
  const skipOpacity = useTransform(y, [50, 150], [0, 1]);

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
      setPhotosLoaded(false);
      setErrorMsg(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const apiUrl = `/api/drive/list/${folderId}`;
      const response = await fetch(apiUrl, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load photos from Drive');
        } else {
          const text = await response.text();
          console.error('[PhotoSelection] Non-JSON error:', text.substring(0, 200));
          throw new Error(`Server error (${response.status}): Failed to load photos`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Unexpected server response format (expected JSON)');
      }

      const data = await response.json();
      setPhotos(data);
    } catch (err: any) {
      console.error('Error fetching photos:', err);
      toast.error('Error loading photos from Google Drive');
      setErrorMsg(err.message || 'Error loading photos');
    } finally {
      setPhotosLoaded(true);
    }
  };

  const handleStartOtpFlow = (bookingId: string, bookingData: any) => {
    if (isAdmin) {
      initializeSelection(bookingId, bookingData);
      return;
    }
    
    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setOtpGenerated(otp);
    setPendingBookingData({ id: bookingId, data: bookingData });
    setOtpRequired(true);
    
    // Simulate sending OTP (in a real app, this would be an SMS)
    toast.success(`OTP for testing has been sent to ${bookingData.clientMobile || 'your mobile number'}.`);
    // For demo/prototype purposes, log the OTP or show it directly
    toast(`Your OTP is: ${otp}`, { duration: 10000, position: 'top-center' });
  };

  const handleVerifyOtp = () => {
    if (otpInput === otpGenerated && pendingBookingData) {
      setOtpRequired(false);
      setOtpInput('');
      setOtpGenerated('');
      initializeSelection(pendingBookingData.id, pendingBookingData.data);
      toast.success('Successfully verified!');
    } else {
      toast.error('Invalid OTP. Please try again.');
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
      handleStartOtpFlow(id, snap.data());
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
      const conditions: any[] = [where('clientMobile', '==', mobile)];
      const isPrivileged = role === 'admin' || role === 'photographer' || role === 'editor' || role === 'other';
      if (user && !isPrivileged) conditions.push(where('clientId', '==', user.uid));
      const q = query(collection(db, 'bookings'), ...conditions);
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error('No booking found for this mobile number');
        setLoading(false);
        return;
      }
      
      const bookingId = snap.docs[0].id;
      handleStartOtpFlow(bookingId, snap.docs[0].data());
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
        setCurrentIndex(prev => prev + 1);
        toast.success('All photos reviewed! Please submit your selection.');
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

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errData = await response.json();
          throw new Error(errData.error || 'Export failed');
        } else {
          const text = await response.text();
          console.error('[PhotoSelection] Export error:', text.substring(0, 200));
          throw new Error(`Server error (${response.status}): Export failed`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Unexpected server response format (expected JSON)');
      }

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
      <div className="min-h-screen bg-white pt-32 pb-32 px-6 sm:px-10 lg:px-14">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12 mb-24">
            <div>
              <motion.div
                initial={{ opacity: 0, letterSpacing: "0.2em" }}
                animate={{ opacity: 1, letterSpacing: "0.8em" }}
                className="text-[10px] font-black uppercase text-primary mb-6"
              >
                Selection Control Panel
              </motion.div>
              <h1 className="text-6xl md:text-8xl font-sans font-black text-gray-900 tracking-tighter uppercase leading-none">
                Asset <br /> Control
              </h1>
            </div>
            <button 
              onClick={() => setIsAdminView(false)}
              className="btn-premium px-12 py-5 text-[10px] tracking-[0.4em]"
            >
              EXIT PROTOCOL
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {allSelections.map((set) => (
              <motion.div 
                key={set.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-gray-50 rounded-[3rem] p-12 border border-gray-100 hover:border-primary/20 hover:product-shadow transition-all duration-700 flex flex-col group"
              >
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h3 className="text-3xl font-sans font-black text-gray-900 tracking-tighter uppercase leading-none mb-3 text-pretty">
                       {set.clientName}
                    </h3>
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">NODE_{set.id.substring(0, 8)}</p>
                  </div>
                  <div className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    set.status === 'exported' ? 'bg-primary/10 text-primary' : 
                    set.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {set.status}
                  </div>
                </div>

                <div className="flex flex-col space-y-8 flex-grow">
                  <div className="grid grid-cols-2 gap-8 border-y border-gray-100 py-10">
                    <div>
                      <div className="text-4xl font-sans font-black text-primary tracking-tighter mb-1">{set.selectedIds?.length || 0}</div>
                      <div className="text-[9px] text-gray-300 uppercase font-black tracking-[0.3em]">Accepted</div>
                    </div>
                    <div>
                      <div className="text-4xl font-sans font-black text-gray-900/10 tracking-tighter mb-1">{set.rejectedIds?.length || 0}</div>
                      <div className="text-[9px] text-gray-300 uppercase font-black tracking-[0.3em]">Ignored</div>
                    </div>
                  </div>

                  <div className="mt-auto pt-6 flex gap-4">
                    <button 
                      onClick={() => handleExport(set)}
                      disabled={exporting || set.status === 'exported'}
                      className="flex-grow btn-premium py-6 text-[10px] tracking-[0.4em] disabled:opacity-50 flex items-center justify-center gap-4"
                    >
                      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span>{set.status === 'exported' ? 'SYNCED' : 'EXFILTRATE'}</span>
                    </button>
                    <a 
                      href={set.folderUrl}
                      target="_blank"
                      className="w-20 h-20 flex items-center justify-center bg-white border border-gray-100 rounded-full hover:bg-gray-50 transition-all group/link"
                      title="Open Source"
                    >
                      <Share2 className="w-6 h-6 text-gray-300 group-hover/link:text-primary transition-colors" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
            {allSelections.length === 0 && (
              <div className="col-span-full py-40 text-center bg-gray-50/50 rounded-[4rem] border border-dashed border-gray-200">
                <Logo className="w-20 h-20 opacity-10 mx-auto mb-10" />
                <p className="text-gray-300 font-black uppercase tracking-[0.6em] text-[10px]">No Data Nodes Active</p>
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
        <div className="min-h-screen bg-white pt-32 px-6 flex items-center justify-center">
          <div className="max-w-2xl w-full text-center">
            <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-12 shadow-2xl shadow-primary/20"
            >
              <CheckCircle2 className="w-16 h-16 text-primary" />
            </motion.div>
            <h2 className="text-6xl md:text-8xl font-sans font-black text-gray-900 tracking-tighter uppercase leading-[0.8] mb-10">Data <br /> Verified</h2>
            <p className="text-gray-400 text-lg font-medium mb-16 italic">"You have successfully authorized {selectionSet.selectedIds.length} assets for processing. Protocol sequence initiated."</p>
            <button 
              onClick={() => {
                setBooking(null);
                setSelectionSet(null);
                setSelectedMobile('');
              }}
              className="btn-premium px-16 py-6 text-[10px] tracking-[0.5em]"
            >
              TERMINATE SESSION
            </button>
          </div>
        </div>
      );
    }

    if (!photosLoaded) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-12">
           <Logo className="w-24 h-24 mb-16 animate-pulse" />
           <div className="w-64 h-[2px] bg-gray-100 mb-10 relative overflow-hidden">
              <motion.div 
                className="absolute inset-0 bg-primary"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
           </div>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.8em]">Ingesting Asset Map...</p>
        </div>
      );
    }

    if (photos.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-12">
          <div className="max-w-lg w-full p-20 text-center border border-gray-100 rounded-[4rem] bg-gray-50/50">
            <X className="w-20 h-20 text-gray-200 mx-auto mb-10" />
            <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-6">NULL_TARGET</h3>
            <p className="text-gray-400 font-medium mb-16 leading-relaxed">
              {errorMsg ? errorMsg : !booking.googleDriveFolderId 
                ? "The specified data node is not currently linked to an active cloud repository." 
                : "The targeted cloud repository contains no extractable image assets."}
            </p>
            <button
               onClick={() => {
                 setBooking(null);
                 setSelectionSet(null);
               }}
               className="btn-premium px-12 py-5 text-[10px] tracking-[0.4em]"
            >
              RE-INITIALIZE
            </button>
          </div>
        </div>
      );
    }

    const currentPhoto = photos[currentIndex];
    if (!currentPhoto && currentIndex >= photos.length && photos.length > 0) {
      return (
        <div className="fixed inset-0 bg-white flex flex-col lg:flex-row z-50">
          <div className="flex-1 flex flex-col items-center pt-32 p-10 text-center h-screen overflow-y-auto w-full max-w-6xl mx-auto pb-60">
            <div className="flex items-center gap-6 mb-16">
               <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Logo className="w-6 h-6" />
               </div>
               <h2 className="text-2xl font-sans font-black text-gray-900 tracking-tighter uppercase">Review Queue</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 w-full mb-32">
              <AnimatePresence mode="popLayout">
                {selectionSet.selectedIds.map(id => (
                   <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={id} 
                    className="relative aspect-square rounded-[2rem] overflow-hidden bg-gray-100 border border-gray-200 group"
                   >
                     <img 
                       src={`/api/drive/image/${id}`} 
                       className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                       alt="Accepted"
                       referrerPolicy="no-referrer"
                     />
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <button
                         onClick={() => {
                            const newIds = selectionSet.selectedIds.filter(x => x !== id);
                            updateDoc(doc(db, 'photoSelections', selectionSet.id), { selectedIds: newIds });
                         }}
                         className="w-12 h-12 bg-red-500 rounded-full text-white flex items-center justify-center hover:scale-110 transition-all shadow-xl"
                       >
                         <Trash2 className="w-5 h-5" />
                       </button>
                     </div>
                   </motion.div>
                ))}
              </AnimatePresence>
              {selectionSet.selectedIds.length === 0 && (
                <div className="col-span-full py-40 border border-dashed border-gray-100 rounded-[3rem] flex flex-col items-center text-center">
                   <p className="text-gray-300 font-black uppercase tracking-[0.8em] text-[10px]">Zero Selection Nodes Detected</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-3xl border-t border-gray-100 p-10 flex flex-col sm:flex-row gap-8 items-center justify-center z-50">
            <button
               onClick={() => setCurrentIndex(photos.length - 1)}
               className="w-full sm:w-auto px-12 py-5 bg-gray-50 border border-gray-100 text-gray-900 rounded-full text-[10px] font-black tracking-[0.4em] hover:bg-gray-100 transition-all"
            >
              RESUME CLASSIFICATION
            </button>
            <button 
              onClick={() => {
                toast.success('Sequence completed. System locked.');
                setTimeout(() => {
                  updateDoc(doc(db, 'photoSelections', selectionSet.id), { status: 'completed' });
                  setSelectionSet(prev => prev ? { ...prev, status: 'completed' } : null);
                }, 1000);
              }}
              disabled={selectionSet.selectedIds.length === 0}
              className="w-full sm:w-auto btn-premium px-16 py-6 text-[10px] tracking-[0.5em] disabled:opacity-50"
            >
              AUTHORIZE FINAL SELECTION
            </button>
          </div>
        </div>
      );
    }
 else if (!currentPhoto) {
       return null; // Safety fallback
    }
    
    // Prefer Google CDN thumbnail, fallback to our proxy
    let photoUrl = `/api/drive/image/${currentPhoto.id}`;
    if (currentPhoto.thumbnailLink) {
      photoUrl = currentPhoto.thumbnailLink.replace(/=s\d+/, '=s2048');
    }

    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col md:flex-row overflow-hidden">
        {/* Cinematic Progress */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 z-50 overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex) / photos.length) * 100}%` }}
            transition={{ duration: 0.8, ease: "circOut" }}
          />
        </div>

        {/* Tactical Header */}
        <div className="absolute top-10 left-10 z-50 flex items-center gap-8">
          <button 
            onClick={() => setBooking(null)}
            className="w-16 h-16 bg-white/5 backdrop-blur-3xl rounded-full flex items-center justify-center text-white border border-white/5 hover:bg-white/10 transition-all active:scale-90"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <div>
            <h3 className="text-white text-3xl font-sans font-black tracking-tighter uppercase leading-none mb-2 text-pretty">{booking.clientName}</h3>
            <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.5em]">MAP_INDEX_{currentIndex + 1}_OF_{photos.length}</p>
          </div>
        </div>

        {/* Counter Widget */}
        <div className="absolute top-10 right-10 z-50 flex flex-col items-end">
          <div className="px-8 py-3 bg-primary/10 border border-primary/20 backdrop-blur-3xl rounded-full">
            <span className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">{selectionSet.selectedIds.length} ACCEPTED</span>
          </div>
        </div>

        {/* Main Swipe Surface */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden touch-none p-6">
          <AnimatePresence mode="popLayout">
            <motion.div 
              key={currentPhoto.id}
              style={{ x, y, rotate, opacity }}
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              onDragEnd={handleDragEnd}
              className="relative w-full max-w-[500px] aspect-[4/5] md:aspect-[3/4.5] rounded-[4rem] overflow-hidden bg-gray-900 shadow-[0_40px_100px_rgba(0,0,0,0.8)] cursor-grab active:cursor-grabbing border-4 border-white/5"
            >
              <img 
                src={photoUrl} 
                alt="Selection Node" 
                className="w-full h-full object-cover pointer-events-none select-none filter brightness-95"
                referrerPolicy="no-referrer"
              />
              
              <motion.div 
                style={{ opacity: shortlistOpacity }}
                className="absolute inset-0 bg-primary/20 flex items-center justify-center pointer-events-none backdrop-blur-sm"
              >
                <div className="px-10 py-6 border-8 border-primary rounded-[3rem] text-primary font-black text-6xl uppercase -rotate-12 tracking-tighter">
                  ACCEPT
                </div>
              </motion.div>
              
              <motion.div 
                style={{ opacity: skipOpacity }}
                className="absolute inset-0 bg-red-500/20 flex items-center justify-center pointer-events-none backdrop-blur-sm"
              >
                <div className="px-10 py-6 border-8 border-red-500 rounded-[3rem] text-red-500 font-black text-6xl uppercase rotate-12 tracking-tighter">
                  REJECT
                </div>
              </motion.div>

              <div className="absolute bottom-0 left-0 right-0 p-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end">
                <div className="flex items-center gap-4 mb-4">
                   <div className="h-[1px] w-8 bg-primary" />
                   <span className="text-white/40 text-[9px] font-black uppercase tracking-[0.6em]">ASSET_METADATA</span>
                </div>
                <p className="text-white font-sans font-black text-2xl md:text-4xl tracking-tighter uppercase leading-tight line-clamp-2 mb-6">{currentPhoto.name}</p>
                <div className="flex gap-6">
                   <div className="flex items-center gap-3 text-white/40">
                      <LayoutGrid className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">SWIPE VERTICAL</span>
                   </div>
                   <div className="flex items-center gap-3 text-white/40">
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">SWIPE HORIZONTAL</span>
                   </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Tactical Control Bar */}
          <div className="absolute bottom-16 left-0 right-0 flex justify-center items-center gap-12 z-50">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleAction('reject')}
              className="w-24 h-24 bg-white/5 backdrop-blur-3xl rounded-full flex items-center justify-center text-red-500 border border-white/10 hover:bg-white/10 transition-all shadow-2xl"
            >
              <X className="w-10 h-10" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleAction('select')}
              className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-primary hover:product-shadow transition-all shadow-2xl"
            >
              <Check className="w-14 h-14" />
            </motion.button>
            <div className="flex flex-col items-center">
               <div className="flex gap-4">
                <button 
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                  className="w-16 h-16 bg-white/5 border border-white/5 rounded-2xl text-white/50 flex items-center justify-center hover:bg-white/10 disabled:opacity-10 transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  disabled={currentIndex >= photos.length}
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                  className="w-16 h-16 bg-white/5 border border-white/5 rounded-2xl text-white/50 flex items-center justify-center hover:bg-white/10 disabled:opacity-10 transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
               </div>
            </div>
          </div>
        </div>

        {/* Technical Sidebar */}
        <div className="hidden lg:flex w-[450px] bg-white/1 border-l border-white/5 backdrop-blur-3xl flex-col p-12 overflow-hidden relative">
          <div className="flex items-center gap-8 mb-16">
            <div className="w-16 h-16 bg-white/10 rounded-[2rem] flex items-center justify-center">
              <LayoutGrid className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-white text-3xl font-sans font-black tracking-tighter uppercase leading-none mb-2">Live Queue</h2>
              <p className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">{selectionSet.selectedIds.length} NODES_AUTHORIZED</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide pr-4">
            <AnimatePresence mode="popLayout">
              {selectionSet.selectedIds.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                  <Logo className="w-20 h-20 mb-8 grayscale filter invert" />
                  <p className="text-white text-[11px] font-black uppercase tracking-[0.6em]">Queue Empty</p>
                </div>
              ) : (
                selectionSet.selectedIds.map(id => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    key={id} 
                    className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-white/5 group border border-white/5"
                  >
                    <img 
                      src={`/api/drive/image/${id}`} 
                      className="w-full h-full object-cover filter brightness-90 group-hover:brightness-100 transition-all" 
                      alt="Shortlisted"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <button 
                        onClick={() => {
                          const newIds = selectionSet.selectedIds.filter(x => x !== id);
                          updateDoc(doc(db, 'photoSelections', selectionSet.id), { selectedIds: newIds });
                        }}
                        className="w-12 h-12 bg-red-500 rounded-full text-white flex items-center justify-center hover:scale-110 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {selectionSet.selectedIds.length > 0 && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mt-12"
            >
              <button 
                onClick={() => {
                  toast.success('Protocol finalized. System closing.');
                  setTimeout(() => {
                    updateDoc(doc(db, 'photoSelections', selectionSet.id), { status: 'completed' });
                    setSelectionSet(prev => prev ? { ...prev, status: 'completed' } : null);
                  }, 1000);
                }}
                className="w-full py-8 bg-white text-gray-900 rounded-[2.5rem] font-black text-[12px] uppercase tracking-[0.5em] hover:bg-gray-100 transition-all flex items-center justify-center gap-6"
              >
                <CheckCircle2 className="w-6 h-6 text-primary" />
                <span>COMPLETE_PROTOCOL</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // Registration Portal
  return (
    <div className="min-h-screen bg-white pt-32 px-6 flex items-center justify-center bg-floating-camera">
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white/80 backdrop-blur-3xl rounded-[4rem] border border-white p-16 md:p-24 shadow-[0_50px_100px_rgba(0,0,0,0.05)] text-center relative overflow-hidden"
      >
        <div className="mb-16">
          <div className="w-24 h-24 bg-gray-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-12 shadow-2xl">
            <Logo light className="w-12 h-12" />
          </div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-sans font-black text-gray-900 tracking-tighter uppercase leading-[0.8] mb-6"
          >
            Asset <br /> Portal
          </motion.h2>
          <p className="text-gray-400 text-sm font-medium tracking-tight px-10">Access your high-fidelity asset archive. <br /> Identification protocol required.</p>
        </div>

        {otpRequired ? (
          <div className="space-y-10">
            <div className="text-left">
              <label className="block text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] mb-6 ml-4">Verification Code (OTP)</label>
              <input 
                type="text" 
                placeholder="Enter 4-digit code" 
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleVerifyOtp()}
                className="w-full px-10 py-8 bg-gray-50 border border-gray-100 rounded-[2rem] focus:border-primary outline-none transition-all font-sans font-black text-3xl tracking-tighter text-center text-gray-900 tracking-[0.5em]"
                maxLength={4}
              />
              <p className="text-xs text-gray-400 mt-4 text-center">A verification code has been sent to your mobile number.</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setOtpRequired(false)}
                className="w-full py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] hover:text-gray-600 transition-colors"
               >
                BACK
              </button>
              <button 
                onClick={handleVerifyOtp}
                className="btn-premium w-full py-6 text-[11px] tracking-[0.5em]"
              >
                VERIFY
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="text-left">
              <label className="block text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] mb-6 ml-4">Terminal Access Code (Mobile)</label>
              <input 
                type="tel" 
                placeholder="000.000.0000" 
                value={selectedMobile}
                onChange={(e) => setSelectedMobile(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchBookingByMobile(selectedMobile)}
                className="w-full px-10 py-8 bg-gray-50 border border-gray-100 rounded-[2rem] focus:border-primary outline-none transition-all font-sans font-black text-3xl tracking-tighter text-gray-900"
              />
            </div>
            
            <button 
              onClick={() => fetchBookingByMobile(selectedMobile)}
              disabled={loading}
              className="btn-premium w-full py-8 text-[11px] tracking-[0.5em] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              ) : (
                'ENTER ARCHIVE'
              )}
            </button>

            {isAdmin && (
              <button 
                onClick={() => setIsAdminView(true)}
                className="w-full py-4 text-[9px] font-black text-gray-300 uppercase tracking-[0.4em] hover:text-primary transition-colors flex items-center justify-center gap-4"
              >
                <Settings className="w-3 h-3" />
                ADMIN_ACCESS_OVERRIDE
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PhotoSelection;
