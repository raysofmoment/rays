import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Search, ExternalLink, CheckCircle2, Clock, AlertCircle, Filter, ChevronDown, ChevronUp, Upload, File as FileIcon, Image as ImageIcon, Video, Link as LinkIcon, Trash2, Loader2, X, Plus, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const WIP_FOLDER_ID = '1udT9Ir2gQ1dYHPho_ovOjrUPKZ_8Oe_J';

interface Booking {
  id: string;
  clientName: string;
  eventDate: string;
  eventType: string;
  package: string;
  teaserStatus: string;
  teaserLink?: string;
  fullVideoStatus: string;
  fullVideoLink?: string;
  albumDesignStatus: string;
  albumLink?: string;
  eInviteStatus: string;
  eInviteLink?: string;
  photoSelectionStatus: string;
  photoSelectionLink?: string;
  editPhotoStatus: string;
  photoEditLink?: string;
  preWeddingVideoStatus: string;
  preWeddingVideoLink?: string;
  preWeddingPhotoStatus: string;
  preWeddingPhotoLink?: string;
  otherStatus: string;
  otherLink?: string;
}

const WIPAssetLibrary = ({ onClose }: { onClose: () => void }) => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/drive/list/${WIP_FOLDER_ID}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setFiles(data);
      } else {
        console.error('Invalid files data:', data);
        toast.error('Failed to load assets');
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Error loading asset library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', WIP_FOLDER_ID);

    try {
      setUploadProgress(30);
      const response = await fetch('/api/upload-to-drive', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadProgress(100);
        toast.success('Asset uploaded successfully');
        fetchFiles();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
    } catch (error: any) {
      toast.error(`Upload error: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="fixed top-0 right-0 bottom-0 w-full sm:w-[450px] bg-white shadow-2xl z-[60] flex flex-col"
    >
      <div className="p-6 border-b flex items-center justify-between bg-black text-white">
        <div className="flex items-center space-x-3">
          <FolderOpen className="w-6 h-6" />
          <h2 className="text-xl font-bold">WIP Asset Library</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="p-6 border-b bg-gray-50">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          className="hidden"
          accept="image/*,video/*"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:border-black hover:bg-white transition-all group disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-black" />
              <div className="w-3/4 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-black h-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs font-bold uppercase text-gray-500">Uploading {uploadProgress}%</p>
            </>
          ) : (
            <>
              <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-gray-700">Upload Photo or Video</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Supports images and videos</p>
            </>
          )}
        </button>
      </div>

      <div className="flex-grow overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="text-sm font-medium">Synchronizing with Drive...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-300" />
            </div>
            <div>
              <p className="font-bold text-gray-900">No assets found</p>
              <p className="text-sm text-gray-500 mt-1">Upload files to get started with the workspace.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {files.map((file) => (
              <div key={file.id} className="group relative bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  {file.mimeType.startsWith('image/') ? (
                    <img 
                      src={file.thumbnailLink || file.webViewLink} 
                      alt={file.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : file.mimeType.startsWith('video/') ? (
                    <div className="flex flex-col items-center">
                      <Video className="w-10 h-10 text-gray-400" />
                      <span className="text-[8px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Video</span>
                    </div>
                  ) : (
                    <FileIcon className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-gray-900 truncate" title={file.name}>{file.name}</p>
                  <a 
                    href={file.webViewLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700"
                  >
                    View File <ExternalLink className="w-2.5 h-2.5 ml-1" />
                  </a>
                </div>
                <div className="absolute top-2 right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 bg-white/90 text-red-600 rounded-lg shadow-sm hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const STATUS_OPTIONS = ['pending', 'review', 'delivered'];

const WorkInProgress: React.FC<{ user: any; role: string | null }> = ({ user, role }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [showAssets, setShowAssets] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('eventDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    });
    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (bookingId: string, field: string, newStatus: string) => {
    if (role !== 'admin' && role !== 'photographer' && role !== 'editor') {
      toast.error('Unauthorized access');
      return;
    }

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        [field]: newStatus
      });
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleLinkChange = async (bookingId: string, field: string, newLink: string) => {
    if (role !== 'admin' && role !== 'photographer' && role !== 'editor') {
      toast.error('Unauthorized access');
      return;
    }

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        [field]: newLink
      });
      toast.success('Link updated');
    } catch (error) {
      toast.error('Failed to update link');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'review':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'review':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      default:
        return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  const filteredBookings = bookings.filter(b => 
    b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.eventType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDeliverablesByPackage = (pkg: string) => {
    const common = ['rawFileLink', 'editPhotoStatus', 'albumDesignStatus'];
    if (pkg === 'Silver') return common;
    if (pkg === 'Gold') return [...common, 'teaserStatus', 'fullVideoStatus'];
    if (pkg === 'Diamond') return [...common, 'teaserStatus', 'fullVideoStatus', 'reelsStatus', 'eInviteStatus', 'preWeddingPhotoStatus', 'preWeddingVideoStatus'];
    return [...common, 'teaserStatus', 'fullVideoStatus', 'reelsStatus', 'eInviteStatus', 'preWeddingPhotoStatus', 'preWeddingVideoStatus'];
  };

  const ProgressItem = ({ booking, label, statusField, linkField }: { booking: Booking; label: string; statusField: keyof Booking; linkField: keyof Booking }) => {
    const status = (booking[statusField] as string) || 'pending';
    const link = (booking[linkField] as string) || '';

    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
        <div className="flex items-center space-x-3 mb-3 sm:mb-0">
          {getStatusIcon(status)}
          <span className="font-semibold text-gray-700">{label}</span>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <select
            value={status}
            onChange={(e) => handleStatusChange(booking.id, statusField as string, e.target.value)}
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border outline-none transition-all ${getStatusClass(status)}`}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Add link..."
              value={link}
              onChange={(e) => handleLinkChange(booking.id, linkField as string, e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none w-full sm:w-48 transition-all"
            />
            {link && (
              <a
                href={link.startsWith('http') ? link : `https://${link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-gray-50 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center text-gray-400 font-bold">Synchronizing projects...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Work in Progress</h1>
          <p className="text-gray-500 mt-1 font-medium">Production pipeline and asset management.</p>
        </div>
        
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <div className="relative flex-grow md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => setShowAssets(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/20"
          >
            <FolderOpen className="w-5 h-5" />
            <span className="hidden sm:inline">Asset Library</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {filteredBookings.map((booking) => (
          <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-gray-300">
            <div 
              className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
              onClick={() => setExpandedBooking(expandedBooking === booking.id ? null : booking.id)}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shadow-black/10">
                  {booking.clientName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">{booking.clientName}</h3>
                  <div className="flex items-center space-x-3 text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                    <span>{booking.eventType}</span>
                    <span className="text-gray-200">•</span>
                    <span>{new Date(booking.eventDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex items-center space-x-2 pr-4 border-r border-gray-100">
                  {getStatusIcon(booking.teaserStatus)}
                  {getStatusIcon(booking.fullVideoStatus)}
                  {getStatusIcon(booking.albumDesignStatus)}
                </div>
                <div className={`p-2 rounded-lg transition-colors ${expandedBooking === booking.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {expandedBooking === booking.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedBooking === booking.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 pb-6 bg-gray-50/30 border-t border-gray-50 overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {getDeliverablesByPackage(booking.package).includes('teaserStatus') && (
                      <ProgressItem booking={booking} label="Cinematic Teaser" statusField="teaserStatus" linkField="teaserLink" />
                    )}
                    {getDeliverablesByPackage(booking.package).includes('fullVideoStatus') && (
                      <ProgressItem booking={booking} label="Full Wedding Film" statusField="fullVideoStatus" linkField="fullVideoLink" />
                    )}
                    {getDeliverablesByPackage(booking.package).includes('albumDesignStatus') && (
                      <ProgressItem booking={booking} label="Premium Album" statusField="albumDesignStatus" linkField="albumLink" />
                    )}
                    {getDeliverablesByPackage(booking.package).includes('eInviteStatus') && (
                      <ProgressItem booking={booking} label="Smart E-Invite" statusField="eInviteStatus" linkField="eInviteLink" />
                    )}
                    <ProgressItem booking={booking} label="Photo Selection" statusField="photoSelectionStatus" linkField="photoSelectionLink" />
                    {getDeliverablesByPackage(booking.package).includes('editPhotoStatus') && (
                      <ProgressItem booking={booking} label="Post-Processing" statusField="editPhotoStatus" linkField="photoEditLink" />
                    )}
                    {getDeliverablesByPackage(booking.package).includes('preWeddingVideoStatus') && (
                      <ProgressItem booking={booking} label="Pre-Wedding Film" statusField="preWeddingVideoStatus" linkField="preWeddingVideoLink" />
                    )}
                    {getDeliverablesByPackage(booking.package).includes('preWeddingPhotoStatus') && (
                      <ProgressItem booking={booking} label="Pre-Wedding Shoot" statusField="preWeddingPhotoStatus" linkField="preWeddingPhotoLink" />
                    )}
                    <ProgressItem booking={booking} label="Misc Deliverables" statusField="otherStatus" linkField="otherLink" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {filteredBookings.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <Filter className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No projects found matching your search.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAssets && <WIPAssetLibrary onClose={() => setShowAssets(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default WorkInProgress;
