import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  Video, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  ExternalLink, 
  Search, 
  Filter, 
  User as UserIcon, 
  Camera, 
  Plus, 
  X, 
  Save, 
  Trash2, 
  Globe,
  Home,
  Briefcase,
  MapPin,
  Clock,
  Info,
  MoreHorizontal,
  ThumbsUp,
  MessageCircle,
  Share2,
  Edit2,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isValid } from 'date-fns';
import { toast } from 'sonner';

interface TeamPortfolioProps {
  user: any;
  role: string | null;
}

const TeamPortfolio: React.FC<TeamPortfolioProps> = ({ user, role }) => {
  const [samples, setSamples] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video' | 'link' | 'about'>('all');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  
  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'link'>('file');
  const [uploadFormData, setUploadFormData] = useState({
    title: '',
    description: '',
    url: '',
    driveFileId: '',
    type: 'image' as 'image' | 'video' | 'link'
  });

  const coverPhoto = "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2071&auto=format&fit=crop";
  const studioProfile = "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2070&auto=format&fit=crop";

  useEffect(() => {
    const q = query(collection(db, 'sampleWorks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const samplesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSamples(samplesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sampleWorks');
      setLoading(false);
    });

    // Fetch Team Members for "Friends" widget
    const membersQ = query(collection(db, 'users'));
    const unsubscribeMembers = onSnapshot(membersQ, (snapshot) => {
      const members = snapshot.docs
        .map(doc => doc.data())
        .filter((m: any) => ['admin', 'photographer', 'editor', 'other'].includes(m.role));
      setTeamMembers(members);
    });

    return () => {
      unsubscribe();
      unsubscribeMembers();
    };
  }, []);

  const filteredSamples = samples.filter(sample => {
    const matchesSearch = 
      sample.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = activeTab === 'all' || sample.type === activeTab;

    return matchesSearch && matchesType;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // Create local preview
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', '1udT9Ir2gQ1dYHPho_ovOjrUPKZ_8Oe_J');

    try {
      const response = await fetch('/api/upload-to-drive', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadFormData(prev => ({
          ...prev,
          url: data.url,
          driveFileId: data.id,
          type: file.type.startsWith('video/') ? 'video' : 'image'
        }));
        toast.success('File uploaded successfully to Drive!');
      } else {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          toast.error(errorData.error || 'Failed to upload to Drive');
        } else {
          const text = await response.text();
          console.error('Server error (non-JSON):', text);
          toast.error(`Server error (${response.status}): Failed to upload to Drive`);
        }
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'sampleWorks'), {
        ...uploadFormData,
        userId: user.uid,
        userName: user.displayName || 'Team Member',
        userRole: role,
        userEmail: user.email,
        createdAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      });
      
      toast.success('Work uploaded successfully!');
      setIsUploadModalOpen(false);
      setPreviewUrl(null);
      setUploadFormData({ title: '', description: '', url: '', driveFileId: '', type: 'image' });
    } catch (error) {
      console.error('Upload error:', error);
      handleFirestoreError(error, OperationType.CREATE, 'sampleWorks');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, userId: string) => {
    if (role !== 'admin' && user?.uid !== userId) {
      toast.error('You do not have permission to delete this item');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this work?')) return;

    try {
      await deleteDoc(doc(db, 'sampleWorks', id));
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleLike = async (id: string, likes: string[] = []) => {
    if (!user) {
      toast.error('Please sign in to like');
      return;
    }

    const newLikes = likes.includes(user.uid)
      ? likes.filter(uid => uid !== user.uid)
      : [...likes, user.uid];

    try {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'sampleWorks', id), {
        likes: newLikes
      });
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
    setOpenMenuId(null);
  };

  const handleNextImage = () => {
    const images = samples.filter(s => s.type === 'image');
    const currentIndex = images.findIndex(s => s.id === selectedImage?.id);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % images.length;
    setSelectedImage(images[nextIndex]);
  };

  const handlePrevImage = () => {
    const images = samples.filter(s => s.type === 'image');
    const currentIndex = images.findIndex(s => s.id === selectedImage?.id);
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    setSelectedImage(images[prevIndex]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      if (e.key === 'ArrowRight') handleNextImage();
      if (e.key === 'ArrowLeft') handlePrevImage();
      if (e.key === 'Escape') setSelectedImage(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, samples]);

  return (
    <div className="bg-[#f0f2f5] min-h-screen pb-12">
      {/* FB Header Container */}
      <div className="bg-white shadow-sm mb-6">
        <div className="max-w-5xl mx-auto">
          {/* Cover Photo */}
          <div className="relative h-[200px] md:h-[350px] overflow-hidden rounded-b-xl group">
            <img 
              src={coverPhoto} 
              alt="Cover" 
              className="w-full h-full object-cover"
            />
            <button className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center space-x-2 shadow-md transition-all">
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Edit Cover Photo</span>
            </button>
          </div>

          {/* Profile Basic Info */}
          <div className="px-4 md:px-8 -mt-6 md:-mt-12 pb-6 relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
              <div className="relative group">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-md">
                  <img src={studioProfile} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <button className="absolute bottom-2 right-2 bg-[#e4e6eb] hover:bg-[#d8dadf] p-2 rounded-full shadow-md transition-all">
                  <Camera className="w-5 h-5 text-black" />
                </button>
              </div>
              <div className="flex-grow mb-2">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900">Creative Team Portfolio</h1>
                <p className="text-[#65676b] font-bold text-lg mt-1">{samples.length} Works • Showcase of Excellence</p>
                <div className="flex justify-center md:justify-start -space-x-2 mt-4 overflow-hidden">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 overflow-hidden">
                      <img src={`https://i.pravatar.cc/150?u=${i}`} alt="Avatar" />
                    </div>
                  ))}
                  <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-[#e4e6eb] flex items-center justify-center text-[10px] font-bold text-gray-600">
                    +12
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mb-2 w-full md:w-auto">
                {(role === 'photographer' || role === 'editor' || role === 'admin' || role === 'other') && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex-grow md:flex-none flex items-center justify-center space-x-2 bg-[#1877f2] hover:bg-[#166fe5] text-white px-6 py-2.5 rounded-lg font-bold transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add to Portfolio</span>
                  </button>
                )}
                <button className="flex-grow md:flex-none flex items-center justify-center space-x-2 bg-[#e4e6eb] hover:bg-[#d8dadf] text-black px-6 py-2.5 rounded-lg font-bold transition-all">
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs (FB Style) */}
            <div className="mt-6 border-t border-gray-200">
              <div className="flex items-center space-x-1 py-1">
                <button 
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-4 font-bold text-sm transition-all border-b-4 ${activeTab === 'all' ? 'border-[#1877f2] text-[#1877f2]' : 'border-transparent text-[#65676b] hover:bg-gray-100 rounded-lg'}`}
                >
                  Gallery
                </button>
                <button 
                  onClick={() => setActiveTab('image')}
                  className={`px-4 py-4 font-bold text-sm transition-all border-b-4 ${activeTab === 'image' ? 'border-[#1877f2] text-[#1877f2]' : 'border-transparent text-[#65676b] hover:bg-gray-100 rounded-lg'}`}
                >
                  Photos
                </button>
                <button 
                  onClick={() => setActiveTab('video')}
                  className={`px-4 py-4 font-bold text-sm transition-all border-b-4 ${activeTab === 'video' ? 'border-[#1877f2] text-[#1877f2]' : 'border-transparent text-[#65676b] hover:bg-gray-100 rounded-lg'}`}
                >
                  Videos
                </button>
                <button 
                  onClick={() => setActiveTab('link')}
                  className={`px-4 py-4 font-bold text-sm transition-all border-b-4 ${activeTab === 'link' ? 'border-[#1877f2] text-[#1877f2]' : 'border-transparent text-[#65676b] hover:bg-gray-100 rounded-lg'}`}
                >
                  Project Links
                </button>
                <div className="flex items-center">
                   <button 
                    onClick={() => setActiveTab('about')}
                    className={`px-4 py-4 font-bold text-sm transition-all border-b-4 ${activeTab === 'about' ? 'border-[#1877f2] text-[#1877f2]' : 'border-transparent text-[#65676b] hover:bg-gray-100 rounded-lg'}`}
                   >
                    About
                  </button>
                   <button className="hidden md:block px-4 py-4 font-bold text-sm text-[#65676b] hover:bg-gray-100 rounded-lg">More</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Sidebar (Intro) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Intro</h2>
              <div className="space-y-4">
                <p className="text-sm text-center text-gray-700 font-medium pb-2 border-b border-gray-100">
                  Sharing the rays of creative moments with the world through photography and visual storytelling.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm text-[#1c1e21]">
                    <Briefcase className="w-5 h-5 text-gray-400" />
                    <span>Works as <strong>Creative Studio</strong></span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-[#1c1e21]">
                    <Home className="w-5 h-5 text-gray-400" />
                    <span>Based in <strong>San Francisco, CA</strong></span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-[#1c1e21]">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <span>Joined <strong>April 2024</strong></span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-[#1c1e21]">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <span className="text-[#1877f2] hover:underline cursor-pointer">raysofmoment.com</span>
                  </div>
                </div>
                <button className="w-full bg-[#e4e6eb] hover:bg-[#d8dadf] text-black py-2 rounded-lg font-bold transition-all text-sm">
                  Edit Details
                </button>
              </div>
            </div>

            {/* Featured Photos Widget */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Photos</h2>
                <button 
                  onClick={() => setActiveTab('image')}
                  className="text-[#1877f2] font-semibold text-sm hover:bg-blue-50 p-1 px-2 rounded"
                >
                  See all photos
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
                {samples.filter(s => s.type === 'image').slice(0, 9).map((sample, idx) => (
                  <div 
                    key={idx} 
                    className="aspect-square bg-gray-50 group relative flex items-center justify-center border border-gray-100 overflow-hidden cursor-pointer"
                    onClick={() => setSelectedImage(sample)}
                  >
                    <img 
                      src={sample.driveFileId ? `${window.location.origin}/api/drive/image/${sample.driveFileId}` : (sample.url || null)} 
                      alt={sample.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-4 h-4 text-white drop-shadow-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Members Widget (Friends) */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-gray-900">Team Members</h2>
                  <span className="text-sm text-gray-500 font-normal">{teamMembers.length} members</span>
                </div>
                <button className="text-[#1877f2] font-semibold text-sm hover:bg-blue-50 p-1 px-2 rounded">See all members</button>
              </div>
              <div className="grid grid-cols-3 gap-x-2 gap-y-4">
                {teamMembers.slice(0, 9).map((member, idx) => (
                  <div key={idx} className="flex flex-col space-y-1">
                    <div className="aspect-square rounded-lg bg-gray-100 overflow-hidden relative group">
                      <img 
                        src={`https://i.pravatar.cc/150?u=${member.uid || idx}`} 
                        alt={member.displayName} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-gray-900 leading-tight truncate">
                      {member.displayName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="lg:col-span-8 space-y-4">
            {/* Search and Upload Widget */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  <img src={studioProfile} alt="Avatar" />
                </div>
                <div 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex-grow bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#65676b] px-4 py-2.5 rounded-full cursor-pointer transition-all"
                >
                  What's on your creative mind?
                </div>
              </div>
              <div className="flex items-center justify-around border-t border-gray-100 pt-3">
                <button className="flex items-center space-x-2 hover:bg-gray-100 flex-grow justify-center py-2 rounded-lg transition-all text-[#65676b] font-bold text-sm">
                  <Search className="w-5 h-5 text-gray-400" />
                  <span>Search</span>
                </button>
                <button 
                  onClick={() => {
                    setIsUploadModalOpen(true);
                    setUploadFormData(prev => ({ ...prev, type: 'image' }));
                  }}
                  className="flex items-center space-x-2 hover:bg-gray-100 flex-grow justify-center py-2 rounded-lg transition-all text-[#65676b] font-bold text-sm"
                >
                  <Camera className="w-5 h-5 text-[#45bd62]" />
                  <span>Post Work</span>
                </button>
                <div className="relative flex-grow">
                   <div className="absolute right-0 top-0">
                     <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <MoreHorizontal className="w-5 h-5 text-gray-400" />
                     </button>
                   </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-24">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1877f2]"></div>
              </div>
            ) : activeTab === 'about' ? (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">About</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Overview</h3>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3 text-gray-700">
                          <Briefcase className="w-5 h-5 text-gray-400" />
                          <span>Creative Production & Visual Storytelling</span>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-700">
                          <MapPin className="w-5 h-5 text-gray-400" />
                          <span>Main Studio in San Francisco</span>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-700">
                          <Info className="w-5 h-5 text-gray-400" />
                          <span>Specializing in Cinematic Photography</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Studio Values</h3>
                    <p className="text-sm text-gray-600 leading-relaxed italic">
                      "We believe every moment has its own ray of light that deserves to be captured with precision and soul."
                    </p>
                  </div>
                </div>
              </div>
            ) : (activeTab === 'image' || activeTab === 'video') ? (
              <div className="bg-white rounded-xl shadow-sm p-4">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}s</h2>
                    <div className="flex items-center space-x-2">
                       <button className="bg-[#e4e6eb] hover:bg-[#d8dadf] text-black px-4 py-2 rounded-lg font-bold text-sm">Add {activeTab}</button>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {filteredSamples.map((sample) => (
                      <div key={sample.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group cursor-pointer shadow-sm">
                        <img 
                          src={sample.url || null} 
                          alt={sample.title} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                        />
                        {sample.type === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Video className="w-8 h-8 text-white drop-shadow-lg" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                           <p className="text-white text-xs font-bold truncate">{sample.title}</p>
                           <p className="text-white/80 text-[10px] truncate">{sample.userName}</p>
                        </div>
                        {(role === 'admin' || user?.uid === sample.userId) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(sample.id, sample.userId);
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                 </div>
                 {filteredSamples.length === 0 && (
                   <div className="text-center py-20">
                      <Camera className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No {activeTab}s shared yet.</p>
                   </div>
                 )}
              </div>
            ) : filteredSamples.length > 0 ? (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredSamples.map((sample) => (
                    <motion.div
                      key={sample.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                    >
                      {/* Post Header */}
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-[#f0f2f5] rounded-full flex items-center justify-center font-bold text-gray-500 overflow-hidden">
                            {sample.userName?.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1">
                               <p className="text-sm font-bold text-gray-900 leading-none">{sample.userName}</p>
                               <span className="text-xs text-gray-500">•</span>
                               <p className="text-[10px] font-bold text-[#1877f2] uppercase tracking-wide">{sample.userRole}</p>
                            </div>
                            <p className="text-[11px] text-gray-500 flex items-center mt-0.5">
                              {sample.createdAt && isValid(new Date(sample.createdAt)) ? format(new Date(sample.createdAt), 'MMM d, yyyy') : 'No Date'}
                              <span className="mx-1">•</span>
                              <Globe className="w-3 h-3" />
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 relative">
                          {(role === 'admin' || user?.uid === sample.userId) && (
                            <button
                              onClick={() => handleDelete(sample.id, sample.userId)}
                              className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <div className="relative">
                            <button 
                              onClick={() => setOpenMenuId(openMenuId === sample.id ? null : sample.id)}
                              className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all"
                            >
                              <MoreHorizontal className="w-5 h-5" />
                            </button>

                            <AnimatePresence>
                              {openMenuId === sample.id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setOpenMenuId(null)}
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden"
                                  >
                                    <button
                                      onClick={() => handleCopyLink(sample.url)}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                                    >
                                      <Share2 className="w-4 h-4" />
                                      <span>Copy Link</span>
                                    </button>
                                    
                                    {(role === 'admin' || user?.uid === sample.userId) && (
                                      <button
                                        onClick={() => {
                                          handleDelete(sample.id, sample.userId);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Delete Post</span>
                                      </button>
                                    )}
                                    
                                    <button
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                                      onClick={() => setOpenMenuId(null)}
                                    >
                                      <X className="w-4 h-4" />
                                      <span>Cancel</span>
                                    </button>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      {/* Post Content */}
                      <div className="px-4 pb-3">
                        <h3 className="font-bold text-gray-900 mb-1">{sample.title}</h3>
                        <p className="text-sm text-gray-800 leading-relaxed">{sample.description}</p>
                      </div>

                      {/* Post Media */}
                      <div className="bg-black/5 relative aspect-video flex items-center justify-center overflow-hidden border-y border-gray-100">
                        {sample.type === 'image' ? (
                          <img 
                            src={sample.driveFileId ? `${window.location.origin}/api/drive/image/${sample.driveFileId}` : (sample.url || null)} 
                            alt={sample.title} 
                            className="w-full h-full object-contain cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => setSelectedImage(sample)}
                          />
                        ) : sample.type === 'video' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-black relative">
                            {playingVideoId === sample.id && sample.driveFileId ? (
                              <iframe 
                                src={`https://drive.google.com/file/d/${sample.driveFileId}/preview`} 
                                className="w-full h-full border-none"
                                allow="autoplay"
                                title={sample.title}
                              />
                            ) : (
                              <>
                                <Video className="w-16 h-16 text-white opacity-40" />
                                <button 
                                  onClick={() => setPlayingVideoId(sample.id)}
                                  className="absolute inset-0 flex items-center justify-center group"
                                >
                                  <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-all">
                                    <Video className="w-8 h-8 text-white fill-white" />
                                  </div>
                                </button>
                                {sample.url && !sample.driveFileId && (
                                  <a 
                                    href={sample.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="absolute bottom-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all flex items-center space-x-1 text-xs font-bold"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Watch Externally</span>
                                  </a>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-[#f0f2f5] p-12">
                            <LinkIcon className="w-16 h-16 text-gray-300 mb-4" />
                            <h4 className="text-xl font-bold text-gray-900 text-center">{sample.title}</h4>
                            <p className="text-sm text-gray-500 truncate w-full text-center mt-1">{sample.url}</p>
                            <a 
                              href={sample.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="mt-6 px-8 py-2 bg-white border border-gray-200 rounded-lg font-bold text-sm hover:bg-gray-50 flex items-center"
                            >
                              Open Project
                              <ExternalLink className="w-3 h-3 ml-2" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Post Interactivity (FB Style) */}
                      <div className="p-1 px-4">
                         <div className="py-3 flex items-center justify-between border-b border-gray-100">
                            <div className="flex items-center -space-x-1">
                               <div className="h-4 w-4 bg-[#1877f2] rounded-full flex items-center justify-center ring-1 ring-white">
                                  <ThumbsUp className="w-2 h-2 text-white fill-white" />
                               </div>
                               <span className="pl-3 text-[13px] text-[#65676b]">
                                  {sample.likes?.length ? `${sample.likes.length} ${sample.likes.length === 1 ? 'person' : 'people'} liked this` : 'Be the first to like this'}
                               </span>
                            </div>
                            <span className="text-[13px] text-[#65676b] hover:underline cursor-pointer">0 shares</span>
                         </div>
                         <div className="flex items-center py-1">
                            <button 
                              onClick={() => handleLike(sample.id, sample.likes)}
                              className={`flex-grow flex items-center justify-center space-x-2 py-2 hover:bg-gray-100 rounded-lg transition-all font-bold text-sm ${sample.likes?.includes(user?.uid) ? 'text-[#1877f2]' : 'text-[#65676b]'}`}
                            >
                               <ThumbsUp className={`w-5 h-5 ${sample.likes?.includes(user?.uid) ? 'fill-[#1877f2]' : ''}`} />
                               <span>Like</span>
                            </button>
                            <button className="flex-grow flex items-center justify-center space-x-2 py-2 hover:bg-gray-100 rounded-lg transition-all text-[#65676b] font-bold text-sm">
                               <MessageCircle className="w-5 h-5" />
                               <span>Comment</span>
                            </button>
                            <button className="flex-grow flex items-center justify-center space-x-2 py-2 hover:bg-gray-100 rounded-lg transition-all text-[#65676b] font-bold text-sm">
                               <Share2 className="w-5 h-5" />
                               <span>Share</span>
                            </button>
                         </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-24 bg-white rounded-xl shadow-sm">
                <Camera className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900">No projects yet</h2>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                  Start by adding your first project to the portfolio feed.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                   <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                      <Plus className="w-4 h-4 text-white" />
                   </div>
                   <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">Create New Portfolio Post</h2>
                </div>
                <button 
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setPreviewUrl(null);
                  }} 
                  className="p-2 hover:bg-gray-100 rounded-full transition-all"
                >
                   <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleUpload} className="p-0 flex flex-col max-h-[85vh] overflow-hidden">
                <div className="overflow-y-auto p-6 md:p-8 space-y-6">
                  {/* User Profile Info */}
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-100">
                      <img src={user?.photoURL || studioProfile} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-none">{user?.displayName}</p>
                      <p className="text-[10px] font-bold text-[#1877f2] uppercase tracking-wide mt-1">{role}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <input
                      required
                      type="text"
                      id="post-title"
                      value={uploadFormData.title}
                      onChange={(e) => setUploadFormData({ ...uploadFormData, title: e.target.value })}
                      className="w-full text-xl font-bold bg-transparent outline-none placeholder:text-gray-300 border-none px-0"
                      placeholder="Give your work a title..."
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex bg-[#f0f2f5] p-1 rounded-xl">
                      <button 
                        type="button"
                        onClick={() => {
                          setUploadMethod('file');
                          setUploadFormData(prev => ({ ...prev, url: '' }));
                          setPreviewUrl(null);
                        }} 
                        className={`flex-1 py-2 rounded-lg text-[11px] font-black transition-all ${uploadMethod === 'file' ? 'bg-white shadow-sm text-black' : 'text-[#65676b] hover:bg-gray-200'}`}
                      >
                        Upload Local File
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setUploadMethod('link');
                          setUploadFormData(prev => ({ ...prev, url: '' }));
                          setPreviewUrl(null);
                        }} 
                        className={`flex-1 py-2 rounded-lg text-[11px] font-black transition-all ${uploadMethod === 'link' ? 'bg-white shadow-sm text-black' : 'text-[#65676b] hover:bg-gray-200'}`}
                      >
                        External Link / URL
                      </button>
                    </div>

                    <div className="space-y-4">
                      {uploadMethod === 'file' ? (
                        <div className="space-y-4">
                          <label
                            htmlFor="portfolio-file"
                            className={`group relative flex flex-col items-center justify-center aspect-video w-full border-2 border-dashed border-gray-100 rounded-3xl transition-all cursor-pointer overflow-hidden bg-gray-50/50 hover:bg-white hover:border-[#1877f2] ${isUploading && !previewUrl ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            {previewUrl ? (
                              <>
                                {uploadFormData.type === 'video' ? (
                                  <video src={previewUrl} className="w-full h-full object-cover" muted autoPlay loop />
                                ) : (
                                  <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                  <p className="text-white font-bold text-sm bg-white/20 px-4 py-2 rounded-full border border-white/30">Replace File</p>
                                </div>
                                {isUploading && (
                                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                                     <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 border-4 border-[#1877f2] border-t-transparent rounded-full animate-spin mb-3"></div>
                                        <p className="text-[10px] font-black text-[#1877f2] uppercase tracking-widest">Optimizing & Uploading...</p>
                                     </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex flex-col items-center p-12">
                                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 group-hover:bg-blue-50 transition-colors">
                                  <Camera className="w-8 h-8 text-gray-400 group-hover:text-[#1877f2]" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Add Photos/Videos</h3>
                                <p className="text-[11px] font-bold text-gray-400 mt-2 text-center uppercase tracking-widest">Supports images & videos</p>
                              </div>
                            )}
                            <input
                              type="file"
                              onChange={handleFileUpload}
                              className="hidden"
                              id="portfolio-file"
                              accept="image/*,video/*"
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-3">
                            {(['image', 'video', 'link'] as const).map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setUploadFormData({ ...uploadFormData, type })}
                                className={`py-4 rounded-2xl border flex flex-col items-center justify-center transition-all ${uploadFormData.type === type ? 'bg-[#1877f2]/5 border-[#1877f2] font-bold text-[#1877f2]' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'}`}
                              >
                                {type === 'image' ? <Camera className="w-6 h-6 mb-2" /> : type === 'video' ? <Video className="w-6 h-6 mb-2" /> : <LinkIcon className="w-6 h-6 mb-2" />}
                                <span className="text-[10px] font-black uppercase tracking-widest">{type}</span>
                              </button>
                            ))}
                          </div>
                          <div className="relative">
                            <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                            <input
                              required
                              type="url"
                              value={uploadFormData.url}
                              onChange={(e) => setUploadFormData({ ...uploadFormData, url: e.target.value })}
                              className="w-full pl-16 pr-6 py-5 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-[#1877f2] outline-none transition-all placeholder:text-gray-300 font-bold"
                              placeholder="Paste your project URL here..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={uploadFormData.description}
                      onChange={(e) => setUploadFormData({ ...uploadFormData, description: e.target.value })}
                      className="w-full px-0 bg-transparent outline-none placeholder:text-gray-300 text-sm h-32 resize-none leading-relaxed"
                      placeholder={`Hey ${user?.displayName?.split(' ')[0]}, what's special about this project?`}
                    />
                  </div>
                </div>

                <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={isSubmitting || (uploadMethod === 'file' && !uploadFormData.url)}
                    className="w-full bg-[#1877f2] text-white py-5 rounded-2xl font-black flex items-center justify-center space-x-2 hover:bg-[#1771e6] transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:grayscale active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Post to Portfolio</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          >
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                  {selectedImage.userName?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-white font-bold">{selectedImage.title}</h3>
                  <p className="text-white/60 text-xs">{selectedImage.userName}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {(role === 'admin' || user?.uid === selectedImage.userId) && (
                  <button 
                    onClick={() => {
                      handleDelete(selectedImage.id, selectedImage.userId);
                      setSelectedImage(null);
                    }}
                    className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-full text-red-500 transition-all"
                    title="Delete Post"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                )}
                <a 
                  href={selectedImage.driveFileId ? `${window.location.origin}/api/drive/image/${selectedImage.driveFileId}` : (selectedImage.url || null)}
                  download
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="w-6 h-6" />
                </a>
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-[95vw] max-h-[85vh] relative flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Navigation Buttons */}
              <button 
                onClick={handlePrevImage}
                className="absolute -left-20 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hidden md:block"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>

              <div className="relative group">
                <img 
                  src={selectedImage.driveFileId ? `${window.location.origin}/api/drive/image/${selectedImage.driveFileId}` : (selectedImage.url || null)} 
                  alt={selectedImage.title}
                  className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                />
                
                {/* Mobile/Overlay Navigation */}
                <div className="absolute inset-y-0 left-0 w-1/4 flex items-center justify-start pl-4 opacity-0 group-hover:opacity-100 transition-opacity md:hidden">
                   <button onClick={handlePrevImage} className="p-2 bg-black/50 rounded-full text-white"><ChevronLeft /></button>
                </div>
                <div className="absolute inset-y-0 right-0 w-1/4 flex items-center justify-end pr-4 opacity-0 group-hover:opacity-100 transition-opacity md:hidden">
                   <button onClick={handleNextImage} className="p-2 bg-black/50 rounded-full text-white"><ChevronRight /></button>
                </div>

                {selectedImage.description && (
                  <div className="mt-4 p-4 bg-white/5 backdrop-blur-md rounded-xl text-white text-center">
                    <p className="text-sm leading-relaxed">{selectedImage.description}</p>
                  </div>
                )}
              </div>

              <button 
                onClick={handleNextImage}
                className="absolute -right-20 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hidden md:block"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeamPortfolio;
