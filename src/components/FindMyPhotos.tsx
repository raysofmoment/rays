import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import * as faceapi from 'face-api.js';
import { Camera, Upload, Search, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, Plus, Trash2, LayoutGrid, UserCircle, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import BookingForm from './BookingForm';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

interface FindMyPhotosProps {
  user: User | null;
  role: string | null;
}

interface Booking {
  id: string;
  clientName: string;
  eventDate: string;
  clientMobile: string;
  eventType: string;
  faceRecognitionPhotos?: string[];
  googleDriveFolderId?: string;
  googleDriveFolderUrl?: string;
}

const extractDriveFolderId = (url: string) => {
  if (!url) return '';
  const match = url.match(/folders\/([a-zA-Z0-9-_]+)/) || url.match(/id=([a-zA-Z0-9-_]+)/);
  return match ? match[1] : url;
};

const FindMyPhotos: React.FC<FindMyPhotosProps> = ({ user, role }) => {
  const [isAdminView, setIsAdminView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [clientMobile, setClientMobile] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [matchedPhotos, setMatchedPhotos] = useState<string[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  
  // Admin states
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedBookingForPhotos, setSelectedBookingForPhotos] = useState<Booking | null>(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [isUpdatingDrive, setIsUpdatingDrive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        setLoading(false);
      } catch (error) {
        console.error('Error loading models:', error);
        toast.error('Failed to load face recognition models');
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (role === 'admin' || role === 'photographer' || role === 'editor') {
      fetchAllBookings();
    }
  }, [role]);

  const fetchAllBookings = async () => {
    try {
      const q = query(collection(db, 'bookings'));
      const snapshot = await getDocs(q);
      const bookingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setAllBookings(bookingsData);
    } catch (error) {
      console.error('Error fetching all bookings:', error);
    }
  };

  const handleFindBooking = async () => {
    if (!clientMobile) {
      toast.error('Please enter your mobile number');
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, 'bookings'), where('clientMobile', '==', clientMobile));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast.error('No booking found for this mobile number');
        setBooking(null);
      } else {
        const bookingData = querySnapshot.docs[0].data() as Booking;
        setBooking({ id: querySnapshot.docs[0].id, ...bookingData });
        toast.success('Booking found!');
      }
    } catch (error) {
      console.error('Error finding booking:', error);
      toast.error('Failed to search for booking');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setReferenceImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecognition = async () => {
    if (!referenceImage || !booking) {
      toast.error('Please upload your photo');
      return;
    }

    setSearching(true);
    setMatchedPhotos([]);
    setScanProgress(0);

    try {
      const refImg = await faceapi.fetchImage(referenceImage);
      const refDetection = await faceapi.detectSingleFace(refImg).withFaceLandmarks().withFaceDescriptor();
      
      if (!refDetection) {
        toast.error('No face detected in your photo. Please try another one.');
        setSearching(false);
        return;
      }

      const faceMatcher = new faceapi.FaceMatcher(refDetection);

      // Use uploaded photos or fetch from Google Drive if link exists
      let imageUrls = [...(booking.faceRecognitionPhotos || [])];
      
      if (booking.googleDriveFolderUrl || booking.googleDriveFolderId) {
        const folderId = booking.googleDriveFolderId || extractDriveFolderId(booking.googleDriveFolderUrl || '');
        
        if (folderId) {
          try {
            setScanProgress(5); // Initial progress for fetching Drive list
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(`${window.location.origin}/api/drive/list/${folderId}`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('Failed to fetch from Drive API');
            
            const files = await response.json();
            if (Array.isArray(files)) {
              const driveUrls = files.map((file: any) => `${window.location.origin}/api/drive/image/${file.id}`);
              imageUrls = [...imageUrls, ...driveUrls];
            }
          } catch (err) {
            console.error('Error fetching Drive files:', err);
            toast.error('Failed to access Google Drive folder. Ensure it is connected in Studio Hub.');
          }
        }
      }
      
      // Fallback to samples if nothing found (demo purposes)
      if (imageUrls.length === 0) {
        imageUrls = [
          'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800',
        ];
      }

      const matches: string[] = [];
      const totalImages = imageUrls.length;
      
      for (let i = 0; i < totalImages; i++) {
        setScanProgress(Math.round(((i + 1) / totalImages) * 100));
        
        try {
          let url = imageUrls[i];
          // Use proxy for all non-local/non-blob images to avoid CORS issues with face-api
          if (url.startsWith('http') && !url.includes(window.location.host)) {
            url = `${window.location.origin}/api/proxy-image?url=${encodeURIComponent(url)}`;
          }

          const img = await faceapi.fetchImage(url);
          const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
          
          for (const detection of detections) {
            const match = faceMatcher.findBestMatch(detection.descriptor);
            if (match.label !== 'unknown') {
              matches.push(imageUrls[i]);
              break;
            }
          }
        } catch (err) {
          console.warn(`Failed to process image ${i}:`, err);
        }
      }

      setMatchedPhotos(matches);
      if (matches.length === 0) {
        toast.info('No matching photos found.');
      } else {
        toast.success(`Found ${matches.length} photos!`);
      }
    } catch (error) {
      console.error('Recognition error:', error);
      toast.error('An error occurred during face recognition');
    } finally {
      setSearching(false);
    }
  };

  const handleUpdateDriveFolder = async (bookingId: string) => {
    if (!driveFolderUrl.trim()) return;
    
    setIsUpdatingDrive(true);
    try {
      const folderId = extractDriveFolderId(driveFolderUrl);
      if (!folderId) {
        toast.error('Invalid Google Drive folder link format.');
        setIsUpdatingDrive(false);
        return;
      }

      const checkToast = toast.loading('Verifying Google Drive connection...');
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const checkRes = await fetch(`/api/drive/list/${folderId}?limit=1`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!checkRes.ok) {
          toast.dismiss(checkToast);
          toast.error('Cannot connect to Drive folder. Please ensure the link is correct and accessible.');
          setIsUpdatingDrive(false);
          return;
        }
        
        toast.dismiss(checkToast);
        toast.success('Drive link verified and connected!');
      } catch (err) {
        toast.dismiss(checkToast);
        toast.error('Network error while checking Drive folder connection.');
        setIsUpdatingDrive(false);
        return;
      }

      await updateDoc(doc(db, 'bookings', bookingId), {
        googleDriveFolderUrl: driveFolderUrl.trim(),
        googleDriveFolderId: folderId
      });
      fetchAllBookings();
      if (selectedBookingForPhotos) {
        setSelectedBookingForPhotos(prev => ({ 
          ...prev!, 
          googleDriveFolderUrl: driveFolderUrl.trim(),
          googleDriveFolderId: folderId 
        }));
      }
    } catch (error) {
      console.error('Error updating drive folder:', error);
      toast.error('Failed to link Google Drive folder');
    } finally {
      setIsUpdatingDrive(false);
    }
  };

  const handleAddPhoto = async (bookingId: string) => {
    if (!newPhotoUrl.trim()) return;
    
    try {
      const urls = newPhotoUrl.split(',').map(u => u.trim()).filter(u => u.length > 0);
      if (urls.length === 0) return;

      await updateDoc(doc(db, 'bookings', bookingId), {
        faceRecognitionPhotos: arrayUnion(...urls)
      });
      toast.success(`${urls.length} photo(s) added successfully`);
      setNewPhotoUrl('');
      fetchAllBookings();
      if (selectedBookingForPhotos && selectedBookingForPhotos.id === bookingId) {
        setSelectedBookingForPhotos(prev => ({
          ...prev!,
          faceRecognitionPhotos: [...(prev?.faceRecognitionPhotos || []), ...urls]
        }));
      }
    } catch (error) {
      console.error('Error adding photo:', error);
      toast.error('Failed to add photo');
    }
  };

  const handleRemovePhoto = async (bookingId: string, photoUrl: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        faceRecognitionPhotos: arrayRemove(photoUrl)
      });
      toast.success('Photo removed successfully');
      fetchAllBookings();
      if (selectedBookingForPhotos && selectedBookingForPhotos.id === bookingId) {
        setSelectedBookingForPhotos(prev => ({
          ...prev!,
          faceRecognitionPhotos: (prev?.faceRecognitionPhotos || []).filter(p => p !== photoUrl)
        }));
      }
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Failed to remove photo');
    }
  };

  if (isAdminView && (role === 'admin' || role === 'photographer' || role === 'editor')) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Event Photos</h1>
              <p className="text-gray-500">Add events and upload photos for face recognition</p>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => setIsAdminView(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 font-bold hover:bg-white transition-colors flex items-center space-x-2"
              >
                <UserCircle className="w-5 h-5" />
                <span>Client View</span>
              </button>
              <button 
                onClick={() => setShowBookingForm(true)}
                className="px-4 py-2 rounded-xl bg-black text-white font-bold hover:bg-gray-800 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add New Event</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Events</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {allBookings.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No events found</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {allBookings.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setSelectedBookingForPhotos(b);
                          setDriveFolderUrl(b.googleDriveFolderUrl || '');
                        }}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedBookingForPhotos?.id === b.id ? 'bg-gray-50 border-l-4 border-black' : ''}`}
                      >
                        <div className="font-bold text-gray-900">{b.clientName}</div>
                        <div className="text-sm text-gray-500">{b.eventDate}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {b.faceRecognitionPhotos?.length || 0} photos uploaded
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              {selectedBookingForPhotos ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                      Photos for {selectedBookingForPhotos.clientName}
                    </h2>
                    <span className="text-sm text-gray-500">{selectedBookingForPhotos.eventDate}</span>
                  </div>

                    <div className="space-y-6">
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <label className="block text-xs font-bold text-blue-700 uppercase mb-2">Google Drive Folder Link</label>
                        <div className="flex space-x-2">
                          <input 
                            type="text"
                            value={driveFolderUrl}
                            onChange={(e) => setDriveFolderUrl(e.target.value)}
                            placeholder="https://drive.google.com/drive/folders/..."
                            className="flex-1 px-4 py-2 rounded-lg border border-blue-200 focus:border-blue-500 outline-none"
                          />
                          <button 
                            onClick={() => handleUpdateDriveFolder(selectedBookingForPhotos.id)}
                            disabled={isUpdatingDrive}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                          >
                            {isUpdatingDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Link'}
                          </button>
                        </div>
                        <p className="text-[10px] text-blue-500 mt-2 italic">
                          Ensure the folder is set to "Anyone with the link" and has viewer permissions. The system will verify the connection before linking.
                        </p>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-xl">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Manual Photo URL(s)</label>
                        <div className="flex space-x-2">
                          <textarea 
                            value={newPhotoUrl}
                            onChange={(e) => setNewPhotoUrl(e.target.value)}
                            placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none min-h-[80px]"
                          />
                          <button 
                            onClick={() => handleAddPhoto(selectedBookingForPhotos.id)}
                            className="px-4 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors self-end"
                          >
                            Add
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 italic">
                          Note: You can paste multiple URLs separated by commas.
                        </p>
                      </div>
                    </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {selectedBookingForPhotos.faceRecognitionPhotos?.map((url, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100">
                        <img src={url} alt={`Event ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => handleRemovePhoto(selectedBookingForPhotos.id, url)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(!selectedBookingForPhotos.faceRecognitionPhotos || selectedBookingForPhotos.faceRecognitionPhotos.length === 0) && (
                      <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                        No photos uploaded yet
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                  <LayoutGrid className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Select an Event</h2>
                  <p className="text-gray-500">Choose an event from the list to manage its photos</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {showBookingForm && user && (
          <BookingForm 
            user={user} 
            role={role} 
            onClose={() => {
              setShowBookingForm(false);
              fetchAllBookings();
            }} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2 md:mb-4">Find Your Photos</h1>
          <p className="text-sm sm:text-base text-gray-500">Upload your face and we'll find all your photos from the event.</p>
          {(role === 'admin' || role === 'photographer' || role === 'editor') && (
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              <button 
                onClick={() => setIsAdminView(true)}
                className="px-3 md:px-4 py-2 rounded-xl bg-white text-gray-600 text-xs md:text-sm font-bold hover:bg-gray-50 transition-colors flex items-center space-x-2 border border-gray-200"
              >
                <Settings className="w-3 h-3 md:w-4 md:h-4" />
                <span>Admin Panel</span>
              </button>
              <button 
                onClick={() => setShowBookingForm(true)}
                className="px-3 md:px-4 py-2 rounded-xl bg-black text-white text-xs md:text-sm font-bold hover:bg-gray-800 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-3 h-3 md:w-4 md:h-4" />
                <span>Add Event</span>
              </button>
            </div>
          )}
        </div>

        {!booking ? (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-6">Client Login</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Mobile Number</label>
                <input
                  type="text"
                  placeholder="Enter your registered mobile..."
                  value={clientMobile}
                  onChange={(e) => setClientMobile(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <button
                onClick={handleFindBooking}
                disabled={loading}
                className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center space-x-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                <span>Find My Booking</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Welcome, {booking.clientName}!</h2>
                <p className="text-gray-500">{booking.eventType} • {new Date(booking.eventDate).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => setBooking(null)}
                className="text-sm font-bold text-gray-400 hover:text-black transition-colors"
              >
                Change Booking
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
                  <Camera className="w-5 h-5" />
                  <span>Step 1: Your Reference Photo</span>
                </h3>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-black transition-all overflow-hidden relative group"
                >
                  {referenceImage ? (
                    <>
                      <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {searching && (
                        <motion.div 
                          initial={{ top: '0%' }}
                          animate={{ top: '100%' }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute left-0 right-0 h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-300 mb-4" />
                      <p className="text-gray-400 text-sm font-medium">Click to upload your photo</p>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  className="hidden" 
                  accept="image/*" 
                />
                
                <button
                  onClick={startRecognition}
                  disabled={searching || !referenceImage || !modelsLoaded}
                  className="w-full mt-6 bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center space-x-2 disabled:bg-gray-200 disabled:cursor-not-allowed"
                >
                  {searching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Scanning Photos ({scanProgress}%)</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      <span>Find My Photos</span>
                    </>
                  )}
                </button>
                {!modelsLoaded && (
                  <p className="text-xs text-center text-gray-400 mt-2 italic">Loading AI models...</p>
                )}
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
                  <ImageIcon className="w-5 h-5" />
                  <span>Step 2: Results</span>
                </h3>
                
                <div className="space-y-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {matchedPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {matchedPhotos.map((url, i) => (
                        <div key={i} className="aspect-square rounded-xl overflow-hidden shadow-sm border border-gray-100 relative group">
                          <img src={url} alt={`Match ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <a 
                            href={url} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-2 right-2 p-2 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                          >
                            <Upload className="w-4 h-4 text-black rotate-180" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                      {searching ? (
                        <div className="space-y-4">
                          <Loader2 className="w-10 h-10 animate-spin mx-auto" />
                          <p>Analyzing event photos...</p>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                          <p>Your matched photos will appear here.</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start space-x-4">
              <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-blue-900">How it works</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Our AI scans the event gallery and matches faces with your reference photo. 
                  Make sure your reference photo is clear and well-lit for best results.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FindMyPhotos;
