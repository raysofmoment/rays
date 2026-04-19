import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { notifyAdmins } from '../services/notificationService';
import { toast } from 'sonner';
import { X, Save, Plus, Trash2, Music, Users, CreditCard, Truck, Home, Book, Gift, HardDrive, Package, Info, CheckCircle2, Clock, AlertCircle, Heart, Star } from 'lucide-react';

interface BookingFormProps {
  user: User;
  role: string | null;
  invoiceNumber?: string;
  clientId?: string;
  onClose: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ user, role, invoiceNumber, clientId, onClose }) => {
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    clientName: '',
    clientMobile: '',
    clientEmail: '',
    eventDate: '',
    package: 'Silver',
    eventType: 'WEDD BRIDESIDE',
    eventPlace: '',
    address: '',
    requirement: '',
    specialRequirement: '',
    brideAddress: '',
    brideNumber: '',
    brideName: '',
    brideBengaliName: '',
    brideFatherName: '',
    groomAddress: '',
    groomNumber: '',
    groomName: '',
    groomBengaliName: '',
    groomFatherName: '',
    childName: '',
    childBengaliName: '',
    modelName: '',
    modelIdLink: '',
    makeupArtist: '',
    makeupArtistIdLink: '',
    channel: '',
    ourWeddingSong: '',
    eventSong: '',
    reelsSong: '',
    songLinks: [] as { title: string; link: string }[],
    totalPackageAmount: 0,
    discount: 0,
    paidAmount: 0,
    dueAmount: 0,
    emiCount: 0,
    emiAmounts: {} as Record<string, number>,
    emi1Date: '',
    emi2Date: '',
    emi3Date: '',
    emi4Date: '',
    emi5Date: '',
    paymentMode: '',
    staffDetails: {} as Record<string, { paymentAmount: number; workQuality: string; review: string; isPaid: boolean }>,
    travelCost: 0,
    accommodationCost: 0,
    albumCost: 0,
    katmaniCost: 0,
    pendriveCost: 0,
    boxCost: 0,
    otherCost: 0,
    extraCosts: [] as { label: string; amount: number }[],
    photographerIds: [] as string[],
    editorIds: [] as string[],
    otherIds: [] as string[],
    teaserStatus: 'pending',
    teaserLink: '',
    fullVideoStatus: 'pending',
    fullVideoLink: '',
    videoStatus: 'pending',
    editPhotoStatus: 'pending',
    photoEditLink: '',
    albumDesignStatus: 'pending',
    albumLink: '',
    eInviteStatus: 'pending',
    eInviteLink: '',
    reelsStatus: 'pending',
    reelsLink: '',
    preWeddingPhotoStatus: 'pending',
    preWeddingPhotoLink: '',
    preWeddingVideoStatus: 'pending',
    preWeddingVideoLink: '',
    vlogStatus: 'pending',
    outputLink: '',
    googleDriveFolderId: '',
    googleDriveFolderUrl: '',
    rawFileLink: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  useEffect(() => {
    const fetchExistingBooking = async () => {
      if (invoiceNumber) {
        const q = query(collection(db, 'bookings'), where('invoiceNumber', '==', invoiceNumber));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setBookingId(snapshot.docs[0].id);
          setFormData(prev => ({ ...prev, ...data }));
        }
      }
    };
    fetchExistingBooking();
  }, [invoiceNumber]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      const q = query(collection(db, 'users'), where('role', 'in', ['photographer', 'editor', 'other', 'admin']));
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setTeamMembers(members);
    };
    fetchTeamMembers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const batch = writeBatch(db);
      
      if (bookingId) {
        const bookingRef = doc(db, 'bookings', bookingId);
        batch.update(bookingRef, {
          ...formData,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        });
        
        // Also update the order if it exists
        const q = query(collection(db, 'orders'), where('invoiceNumber', '==', invoiceNumber));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const orderRef = doc(db, 'orders', snap.docs[0].id);
          batch.update(orderRef, {
            clientName: formData.clientName,
            mobileNumber: formData.clientMobile,
            date: formData.eventDate,
            location: formData.eventPlace,
            packageName: formData.package === 'Customize' ? formData.requirement : formData.package,
            totalAmount: formData.totalPackageAmount,
            discount: formData.discount || 0,
            finalAmount: formData.totalPackageAmount - (formData.discount || 0),
            paidAmount: formData.paidAmount || 0,
            dueAmount: formData.dueAmount || (formData.totalPackageAmount - (formData.discount || 0) - (formData.paidAmount || 0)),
            eventType: formData.eventType,
            updatedAt: new Date().toISOString(),
            updatedBy: user.uid
          });
        }

        await batch.commit();

        await notifyAdmins(
          'Booking Updated',
          `Booking for ${formData.clientName} (Invoice: ${invoiceNumber}) was updated by ${user.displayName || user.email}.`,
          'info',
          '/bookings'
        );

        toast.success('Information updated successfully!');
      } else {
        const newInvoiceNumber = invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
        const newBookingRef = doc(collection(db, 'bookings'));
        
        batch.set(newBookingRef, {
          ...formData,
          invoiceNumber: newInvoiceNumber,
          clientId: clientId || null,
          adminStatus: (role === 'admin' || role === 'photographer' || role === 'editor' || role === 'other') ? 'accepted' : 'requested',
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
        });

        // Also create or update the order
        const q = query(collection(db, 'orders'), where('invoiceNumber', '==', newInvoiceNumber));
        const snap = await getDocs(q);
        
        const orderData = {
          clientId: clientId || null,
          clientName: formData.clientName,
          mobileNumber: formData.clientMobile,
          invoiceNumber: newInvoiceNumber,
          status: 'pending',
          date: formData.eventDate,
          location: formData.eventPlace,
          packageName: formData.package === 'Customize' ? formData.requirement : formData.package,
          totalAmount: formData.totalPackageAmount,
          discount: formData.discount || 0,
          finalAmount: formData.totalPackageAmount - (formData.discount || 0),
          paidAmount: formData.paidAmount || 0,
          dueAmount: formData.dueAmount || (formData.totalPackageAmount - (formData.discount || 0) - (formData.paidAmount || 0)),
          eventType: formData.eventType,
          createdAt: new Date().toISOString(),
          bookingId: newBookingRef.id
        };

        if (!snap.empty) {
          const orderRef = doc(db, 'orders', snap.docs[0].id);
          batch.update(orderRef, {
            ...orderData,
            updatedAt: new Date().toISOString(),
            updatedBy: user.uid
          });
        } else {
          const newOrderRef = doc(collection(db, 'orders'));
          batch.set(newOrderRef, orderData);
        }

        await batch.commit();

        await notifyAdmins(
          'New Booking Created',
          `A new booking for ${formData.clientName} was created by ${user.displayName || user.email}. Invoice: ${newInvoiceNumber}`,
          'success',
          '/bookings'
        );

        toast.success(`Information saved successfully! Invoice: ${newInvoiceNumber}`);
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, bookingId ? `bookings/${bookingId}` : 'bookings');
      console.error('Error saving information:', error);
      toast.error('Failed to save information');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle phone number fields
    if (['clientMobile', 'brideNumber', 'groomNumber'].includes(name)) {
      const cleaned = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: cleaned }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const addSongLink = () => {
    setFormData(prev => ({
      ...prev,
      songLinks: [...(prev.songLinks || []), { title: '', link: '' }]
    }));
  };

  const removeSongLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      songLinks: (prev.songLinks || []).filter((_, i) => i !== index)
    }));
  };

  const updateSongLink = (index: number, field: 'title' | 'link', value: string) => {
    setFormData(prev => {
      const newLinks = [...(prev.songLinks || [])];
      newLinks[index] = { ...newLinks[index], [field]: value };
      return { ...prev, songLinks: newLinks };
    });
  };

  const addExtraCost = () => {
    setFormData(prev => ({
      ...prev,
      extraCosts: [...(prev.extraCosts || []), { label: '', amount: 0 }]
    }));
  };

  const removeExtraCost = (index: number) => {
    setFormData(prev => ({
      ...prev,
      extraCosts: (prev.extraCosts || []).filter((_, i) => i !== index)
    }));
  };

  const updateExtraCost = (index: number, field: 'label' | 'amount', value: any) => {
    setFormData(prev => {
      const newCosts = [...(prev.extraCosts || [])];
      newCosts[index] = { ...newCosts[index], [field]: field === 'amount' ? Number(value) : value };
      return { ...prev, extraCosts: newCosts };
    });
  };

  const updateEmiAmount = (index: number, value: number) => {
    setFormData(prev => ({
      ...prev,
      emiAmounts: {
        ...(prev.emiAmounts || {}),
        [`emi${index + 1}`]: value
      }
    }));
  };

  const updateStaffDetail = (userId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      staffDetails: {
        ...(prev.staffDetails || {}),
        [userId]: {
          ...((prev.staffDetails && prev.staffDetails[userId]) || { paymentAmount: 0, workQuality: 'good', review: '', isPaid: false }),
          [field]: value
        }
      }
    }));
  };

  const getDeliverablesByPackage = (pkg: string) => {
    const common = ['rawFileLink', 'editPhotoStatus', 'albumDesignStatus'];
    if (pkg === 'Silver') return common;
    if (pkg === 'Gold') return [...common, 'teaserStatus', 'fullVideoStatus'];
    if (pkg === 'Diamond') return [...common, 'teaserStatus', 'fullVideoStatus', 'reelsStatus', 'eInviteStatus', 'preWeddingPhotoStatus', 'preWeddingVideoStatus'];
    return [...common, 'teaserStatus', 'fullVideoStatus', 'reelsStatus', 'eInviteStatus', 'preWeddingPhotoStatus', 'preWeddingVideoStatus'];
  };

  const deliverables = getDeliverablesByPackage(formData.package);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[70] overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-black text-white rounded-2xl shadow-lg shadow-black/20">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Booking Information</h2>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Manage client data, payments, and staffing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-8">
          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Client Information */}
            <section>
              <div className="flex items-center space-x-2 mb-6">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Client Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client Name</label>
                  <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" required />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mobile Number</label>
                  <input type="text" name="clientMobile" value={formData.clientMobile} onChange={handleChange} maxLength={10} placeholder="10-digit mobile number" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                  <input type="email" name="clientEmail" value={formData.clientEmail} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Event Date</label>
                  <input type="date" name="eventDate" value={formData.eventDate} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" required />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Package</label>
                  <select name="package" value={formData.package} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-bold">
                    <option value="Silver">Silver Package</option>
                    <option value="Gold">Gold Package</option>
                    <option value="Diamond">Diamond Package</option>
                    <option value="Customize">Custom Package</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Event Type</label>
                  <select name="eventType" value={formData.eventType} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-bold">
                    <option value="WEDD BRIDESIDE">Wedding (Bride)</option>
                    <option value="WEDD GROOM">Wedding (Groom)</option>
                    <option value="WEDD BOTH">Wedding (Both)</option>
                    <option value="ANNOPRASAN">Annoprasan</option>
                    <option value="BIRTHDAY">Birthday</option>
                    <option value="UPANAYAN">Upanayan</option>
                    <option value="MODEL SHOOT">Model Shoot</option>
                    <option value="CINEMATIC">Cinematic</option>
                    <option value="EVENT">Corporate Event</option>
                    <option value="SHORT FILM">Short Film</option>
                    <option value="MUSIC VIDEO">Music Video</option>
                    <option value="OUTDOOR">Outdoor Shoot</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Priority Level</label>
                  <select name="priority" value={formData.priority} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-bold">
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent Priority</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Event Venue/Place</label>
                  <input type="text" name="eventPlace" value={formData.eventPlace} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Address</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">General Requirements</label>
                  <textarea name="requirement" value={formData.requirement} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" rows={3} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Special Requirements</label>
                  <textarea name="specialRequirement" value={formData.specialRequirement} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" rows={3} placeholder="Any specific requests or notes..." />
                </div>
              </div>
            </section>

          {/* Wedding Specifics */}
          {['WEDD BRIDESIDE', 'WEDD GROOM', 'WEDD BOTH'].includes(formData.eventType) && (
            <section className="p-8 bg-gray-50 rounded-3xl border border-gray-100 shadow-inner">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  <h3 className="text-lg font-bold text-gray-900">Wedding Details</h3>
                </div>
                <span className="px-4 py-1 bg-pink-100 text-pink-700 text-[10px] font-bold rounded-full uppercase tracking-widest">Wedding Mode Active</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 border-b border-gray-200 pb-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bride Information</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <input type="text" name="brideName" placeholder="Full Name" value={formData.brideName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                    <input type="text" name="brideBengaliName" placeholder="Bengali Name (Optional)" value={formData.brideBengaliName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                    <input type="text" name="brideFatherName" placeholder="Father's Name" value={formData.brideFatherName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                    <input type="text" name="brideNumber" placeholder="10-digit mobile number" value={formData.brideNumber} onChange={handleChange} maxLength={10} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                    <textarea name="brideAddress" placeholder="Current Address" value={formData.brideAddress} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" rows={2} />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 border-b border-gray-200 pb-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Groom Information</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <input type="text" name="groomName" placeholder="Full Name" value={formData.groomName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                    <input type="text" name="groomBengaliName" placeholder="Bengali Name (Optional)" value={formData.groomBengaliName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                    <input type="text" name="groomFatherName" placeholder="Father's Name" value={formData.groomFatherName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                    <input type="text" name="groomNumber" placeholder="10-digit mobile number" value={formData.groomNumber} onChange={handleChange} maxLength={10} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                    <textarea name="groomAddress" placeholder="Current Address" value={formData.groomAddress} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" rows={2} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Other Event Details */}
          {['BIRTHDAY', 'ANNOPRASAN', 'UPANAYAN', 'MODEL SHOOT'].includes(formData.eventType) && (
            <section className="p-8 bg-gray-50 rounded-3xl border border-gray-100 shadow-inner">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-lg font-bold text-gray-900">
                    {formData.eventType === 'MODEL SHOOT' ? 'Model Shoot Details' : 'Event Specifics'}
                  </h3>
                </div>
                <span className="px-4 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full uppercase tracking-widest">Special Event Mode</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 border-b border-gray-200 pb-2">
                    <Info className="w-4 h-4 text-gray-400" />
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {formData.eventType === 'MODEL SHOOT' ? 'Model Details' : 'Subject Information'}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {['BIRTHDAY', 'ANNOPRASAN', 'UPANAYAN'].includes(formData.eventType) && (
                      <>
                        <input type="text" name="childName" placeholder="Full Name" value={formData.childName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                        <input type="text" name="childBengaliName" placeholder="Bengali Name (Optional)" value={formData.childBengaliName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                      </>
                    )}
                    {formData.eventType === 'MODEL SHOOT' && (
                      <>
                        <input type="text" name="modelName" placeholder="Model Name" value={formData.modelName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                        <input type="text" name="modelIdLink" placeholder="Portfolio/ID Link" value={formData.modelIdLink} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 border-b border-gray-200 pb-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Additional Personnel</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {formData.eventType === 'MODEL SHOOT' && (
                      <>
                        <input type="text" name="makeupArtist" placeholder="Makeup Artist Name" value={formData.makeupArtist} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                        <input type="text" name="makeupArtistIdLink" placeholder="Makeup Artist Portfolio Link" value={formData.makeupArtistIdLink} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                      </>
                    )}
                    <input type="text" name="channel" placeholder="Social Media/Channel Handle" value={formData.channel} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Songs */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Music className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">Song Selection</h3>
              </div>
              <button type="button" onClick={addSongLink} className="flex items-center space-x-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors text-xs font-bold">
                <Plus className="w-4 h-4" />
                <span>Add Song Link</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pre Wedding Song</label>
                <input type="text" name="ourWeddingSong" value={formData.ourWeddingSong} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all" placeholder="Song name or link" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Event Song</label>
                <input type="text" name="eventSong" value={formData.eventSong} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all" placeholder="Song name or link" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reels Song</label>
                <input type="text" name="reelsSong" value={formData.reelsSong} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all" placeholder="Song name or link" />
              </div>
            </div>
            {formData.songLinks && formData.songLinks.length > 0 && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Additional Song Links</h4>
                {formData.songLinks.map((song, idx) => (
                  <div key={idx} className="flex items-center space-x-4">
                    <input type="text" placeholder="Song Title" value={song.title} onChange={(e) => updateSongLink(idx, 'title', e.target.value)} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none bg-white text-sm" />
                    <input type="text" placeholder="Link (YouTube/Spotify)" value={song.link} onChange={(e) => updateSongLink(idx, 'link', e.target.value)} className="flex-[2] px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none bg-white text-sm" />
                    <button type="button" onClick={() => removeSongLink(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Payment Information */}
          <section>
            <div className="flex items-center space-x-2 mb-6">
              <CreditCard className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">Payment & EMI Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Package (₹)</label>
                <input type="number" name="totalPackageAmount" value={formData.totalPackageAmount} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none font-bold text-lg" required />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Discount (₹)</label>
                <input type="number" name="discount" value={formData.discount} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none font-bold text-lg text-red-600" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Paid Amount (₹)</label>
                <input type="number" name="paidAmount" value={formData.paidAmount} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none font-bold text-lg text-green-600" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Due Amount (₹)</label>
                <div className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 font-bold text-lg text-orange-600">
                  ₹{formData.totalPackageAmount - (formData.discount || 0) - (formData.paidAmount || 0)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Mode</label>
                <select name="paymentMode" value={formData.paymentMode} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none font-bold">
                  <option value="">Select Mode</option>
                  <option value="Cash">Cash</option>
                  <option value="Online">Online Transfer</option>
                  <option value="EMI">EMI Plan</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">EMI Installments</label>
                <select name="emiCount" value={formData.emiCount} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none font-bold">
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n} Installments</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-1 space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Google Drive Folder Link</label>
                <input 
                  type="text" 
                  name="googleDriveFolderUrl" 
                  value={formData.googleDriveFolderUrl || ''} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none" 
                  placeholder="https://drive.google.com/..." 
                />
              </div>
              <div className="md:col-span-1 space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Google Drive Folder ID</label>
                <input type="text" name="googleDriveFolderId" value={formData.googleDriveFolderId} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none" placeholder="Auto-fills from link" />
              </div>
            </div>

            {formData.emiCount > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 p-6 bg-green-50 rounded-2xl border border-green-100">
                {Array.from({ length: formData.emiCount }).map((_, idx) => {
                  const dateField = `emi${idx + 1}Date`;
                  const amountKey = `emi${idx + 1}`;
                  return (
                    <div key={idx} className="space-y-3 p-4 bg-white rounded-xl border border-green-100 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Installment {idx + 1}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold text-gray-400 uppercase">Due Date</label>
                          <input type="date" name={dateField} value={(formData as any)[dateField]} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-100 focus:border-green-600 outline-none text-xs" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold text-gray-400 uppercase">Amount (₹)</label>
                          <input type="number" value={formData.emiAmounts?.[amountKey] || ''} onChange={(e) => updateEmiAmount(idx, Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-100 focus:border-green-600 outline-none text-xs font-bold" placeholder="0" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8 p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
                  <Truck className="w-4 h-4 mr-2" />
                  Additional Costs & Logistics
                </h4>
                <button type="button" onClick={addExtraCost} className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-[10px] font-bold shadow-sm">
                  <Plus className="w-3 h-3" />
                  <span>Add Other Cost</span>
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Travel</label>
                  <input type="number" name="travelCost" value={formData.travelCost} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Stay</label>
                  <input type="number" name="accommodationCost" value={formData.accommodationCost} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Album</label>
                  <input type="number" name="albumCost" value={formData.albumCost} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Katmani</label>
                  <input type="number" name="katmaniCost" value={formData.katmaniCost} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Pendrive</label>
                  <input type="number" name="pendriveCost" value={formData.pendriveCost} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Box</label>
                  <input type="number" name="boxCost" value={formData.boxCost} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Other</label>
                  <div className="flex items-center space-x-2">
                    <input type="number" name="otherCost" value={formData.otherCost} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-black outline-none text-sm" />
                    <button type="button" onClick={addExtraCost} className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm active:scale-95" title="Add Extra Cost Item">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {formData.extraCosts && formData.extraCosts.length > 0 && (
                <div className="mt-6 space-y-3 pt-6 border-t border-gray-200">
                  {formData.extraCosts.map((cost, idx) => (
                    <div key={idx} className="flex items-center space-x-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex-1">
                        <input type="text" placeholder="Cost Description (e.g. Food, Parking)" value={cost.label} onChange={(e) => updateExtraCost(idx, 'label', e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none bg-white text-sm" />
                      </div>
                      <div className="w-32">
                        <input type="number" placeholder="Amount" value={cost.amount} onChange={(e) => updateExtraCost(idx, 'amount', e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none bg-white text-sm font-bold" />
                      </div>
                      <button type="button" onClick={() => removeExtraCost(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Staffing */}
          <section>
            <div className="flex items-center space-x-2 mb-6">
              <Users className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-900">Staffing & Assignments</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Photographers */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Photographers</h4>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full">{formData.photographerIds?.length || 0} Assigned</span>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                  {teamMembers.filter(m => m.role === 'photographer' || m.role === 'admin').map(m => (
                    <div key={m.uid} className="space-y-2 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.photographerIds?.includes(m.uid)}
                          onChange={(e) => {
                            const ids = formData.photographerIds || [];
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, photographerIds: [...ids, m.uid] }));
                            } else {
                              setFormData(prev => ({ ...prev, photographerIds: ids.filter(id => id !== m.uid) }));
                            }
                          }}
                          className="w-5 h-5 rounded-lg border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-sm font-bold text-gray-700">{m.displayName || m.email}</span>
                      </label>
                      {formData.photographerIds?.includes(m.uid) && (
                        <div className="pl-8 space-y-2 pt-2 border-t border-gray-50">
                          <div className="flex items-center space-x-2">
                            <input type="number" placeholder="Pay (₹)" value={formData.staffDetails?.[m.uid]?.paymentAmount || ''} onChange={(e) => updateStaffDetail(m.uid, 'paymentAmount', Number(e.target.value))} className="w-full px-3 py-1.5 rounded-lg border border-gray-100 text-xs outline-none focus:border-black" />
                            <select value={formData.staffDetails?.[m.uid]?.workQuality || 'good'} onChange={(e) => updateStaffDetail(m.uid, 'workQuality', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-100 text-xs outline-none focus:border-black font-bold">
                              <option value="excellent">Excellent</option>
                              <option value="good">Good</option>
                              <option value="average">Average</option>
                              <option value="poor">Poor</option>
                            </select>
                          </div>
                          <textarea placeholder="Staff Review..." value={formData.staffDetails?.[m.uid]?.review || ''} onChange={(e) => updateStaffDetail(m.uid, 'review', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-100 text-xs outline-none focus:border-black" rows={1} />
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={formData.staffDetails?.[m.uid]?.isPaid || false} onChange={(e) => updateStaffDetail(m.uid, 'isPaid', e.target.checked)} className="w-3 h-3 rounded border-gray-300 text-green-600 focus:ring-green-600" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Mark as Paid</span>
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Editors */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Editors</h4>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full">{formData.editorIds?.length || 0} Assigned</span>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                  {teamMembers.filter(m => m.role === 'editor' || m.role === 'admin').map(m => (
                    <div key={m.uid} className="space-y-2 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.editorIds?.includes(m.uid)}
                          onChange={(e) => {
                            const ids = formData.editorIds || [];
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, editorIds: [...ids, m.uid] }));
                            } else {
                              setFormData(prev => ({ ...prev, editorIds: ids.filter(id => id !== m.uid) }));
                            }
                          }}
                          className="w-5 h-5 rounded-lg border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-sm font-bold text-gray-700">{m.displayName || m.email}</span>
                      </label>
                      {formData.editorIds?.includes(m.uid) && (
                        <div className="pl-8 space-y-2 pt-2 border-t border-gray-50">
                          <div className="flex items-center space-x-2">
                            <input type="number" placeholder="Pay (₹)" value={formData.staffDetails?.[m.uid]?.paymentAmount || ''} onChange={(e) => updateStaffDetail(m.uid, 'paymentAmount', Number(e.target.value))} className="w-full px-3 py-1.5 rounded-lg border border-gray-100 text-xs outline-none focus:border-black" />
                            <select value={formData.staffDetails?.[m.uid]?.workQuality || 'good'} onChange={(e) => updateStaffDetail(m.uid, 'workQuality', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-100 text-xs outline-none focus:border-black font-bold">
                              <option value="excellent">Excellent</option>
                              <option value="good">Good</option>
                              <option value="average">Average</option>
                              <option value="poor">Poor</option>
                            </select>
                          </div>
                          <textarea placeholder="Staff Review..." value={formData.staffDetails?.[m.uid]?.review || ''} onChange={(e) => updateStaffDetail(m.uid, 'review', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-100 text-xs outline-none focus:border-black" rows={1} />
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={formData.staffDetails?.[m.uid]?.isPaid || false} onChange={(e) => updateStaffDetail(m.uid, 'isPaid', e.target.checked)} className="w-3 h-3 rounded border-gray-300 text-green-600 focus:ring-green-600" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Mark as Paid</span>
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Others */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Other Staff</h4>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full">{formData.otherIds?.length || 0} Assigned</span>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                  {teamMembers.filter(m => m.role === 'other' || m.role === 'admin').map(m => (
                    <div key={m.uid} className="space-y-2 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.otherIds?.includes(m.uid)}
                          onChange={(e) => {
                            const ids = formData.otherIds || [];
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, otherIds: [...ids, m.uid] }));
                            } else {
                              setFormData(prev => ({ ...prev, otherIds: ids.filter(id => id !== m.uid) }));
                            }
                          }}
                          className="w-5 h-5 rounded-lg border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-sm font-bold text-gray-700">{m.displayName || m.email}</span>
                      </label>
                      {formData.otherIds?.includes(m.uid) && (
                        <div className="pl-8 space-y-2 pt-2 border-t border-gray-50">
                          <div className="flex items-center space-x-2">
                            <input type="number" placeholder="Pay (₹)" value={formData.staffDetails?.[m.uid]?.paymentAmount || ''} onChange={(e) => updateStaffDetail(m.uid, 'paymentAmount', Number(e.target.value))} className="w-full px-3 py-1.5 rounded-lg border border-gray-100 text-xs outline-none focus:border-black" />
                            <select value={formData.staffDetails?.[m.uid]?.workQuality || 'good'} onChange={(e) => updateStaffDetail(m.uid, 'workQuality', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-100 text-xs outline-none focus:border-black font-bold">
                              <option value="excellent">Excellent</option>
                              <option value="good">Good</option>
                              <option value="average">Average</option>
                              <option value="poor">Poor</option>
                            </select>
                          </div>
                          <textarea placeholder="Staff Review..." value={formData.staffDetails?.[m.uid]?.review || ''} onChange={(e) => updateStaffDetail(m.uid, 'review', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-100 text-xs outline-none focus:border-black" rows={1} />
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={formData.staffDetails?.[m.uid]?.isPaid || false} onChange={(e) => updateStaffDetail(m.uid, 'isPaid', e.target.checked)} className="w-3 h-3 rounded border-gray-300 text-green-600 focus:ring-green-600" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Mark as Paid</span>
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Work Progress & Links (Admin/Editor only) */}
          {(role === 'admin' || role === 'editor') && (
            <section className="p-8 bg-blue-50/30 rounded-3xl border border-blue-100">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Work Progress & Deliverables</h3>
                </div>
                <div className="flex items-center space-x-2 px-4 py-1.5 bg-white rounded-full border border-blue-100 shadow-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{formData.package} Deliverables</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {deliverables.includes('rawFileLink') && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Raw File Link</label>
                      <input type="text" name="rawFileLink" value={formData.rawFileLink} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" placeholder="Google Drive/Dropbox link" />
                    </div>
                  )}
                  
                  {deliverables.includes('teaserStatus') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Teaser Status</label>
                        <select name="teaserStatus" value={formData.teaserStatus} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white font-bold">
                          <option value="pending">Pending</option>
                          <option value="review">Review</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Teaser Link</label>
                        <input type="text" name="teaserLink" value={formData.teaserLink} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                      </div>
                    </div>
                  )}

                  {deliverables.includes('fullVideoStatus') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Video Status</label>
                        <select name="fullVideoStatus" value={formData.fullVideoStatus} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white font-bold">
                          <option value="pending">Pending</option>
                          <option value="review">Review</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Video Link</label>
                        <input type="text" name="fullVideoLink" value={formData.fullVideoLink} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                      </div>
                    </div>
                  )}

                  {deliverables.includes('reelsStatus') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reels Status</label>
                        <select name="reelsStatus" value={formData.reelsStatus} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white font-bold">
                          <option value="pending">Pending</option>
                          <option value="review">Review</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reels Link</label>
                        <input type="text" name="reelsLink" value={formData.reelsLink} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {deliverables.includes('editPhotoStatus') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Photo Edit Status</label>
                        <select name="editPhotoStatus" value={formData.editPhotoStatus} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white font-bold">
                          <option value="pending">Pending</option>
                          <option value="review">Review</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Photo Edit Link</label>
                        <input type="text" name="photoEditLink" value={formData.photoEditLink} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                      </div>
                    </div>
                  )}

                  {deliverables.includes('albumDesignStatus') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Album Status</label>
                        <select name="albumDesignStatus" value={formData.albumDesignStatus} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white font-bold">
                          <option value="pending">Pending</option>
                          <option value="review">Review</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Album Link</label>
                        <input type="text" name="albumLink" value={formData.albumLink} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                      </div>
                    </div>
                  )}

                  {deliverables.includes('eInviteStatus') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">E-Invite Status</label>
                        <select name="eInviteStatus" value={formData.eInviteStatus} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white font-bold">
                          <option value="pending">Pending</option>
                          <option value="review">Review</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">E-Invite Link</label>
                        <input type="text" name="eInviteLink" value={formData.eInviteLink} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                      </div>
                    </div>
                  )}

                  {deliverables.includes('preWeddingPhotoStatus') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pre-Wed Photo</label>
                        <select name="preWeddingPhotoStatus" value={formData.preWeddingPhotoStatus} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white font-bold">
                          <option value="pending">Pending</option>
                          <option value="review">Review</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Photo Link</label>
                        <input type="text" name="preWeddingPhotoLink" value={formData.preWeddingPhotoLink} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Main Output Link</label>
                    <input type="text" name="outputLink" value={formData.outputLink} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" placeholder="Link to all final files" />
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="flex justify-end space-x-4 pt-8 border-t sticky bottom-0 bg-white pb-4">
            <button type="button" onClick={onClose} className="px-8 py-3 rounded-2xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-95">Cancel</button>
            <button type="submit" className="px-12 py-3 rounded-2xl bg-black text-white font-bold flex items-center space-x-3 hover:bg-gray-800 transition-all shadow-xl shadow-black/20 active:scale-95">
              <Save className="w-5 h-5" />
              <span>Save Booking Data</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
};

export default BookingForm;
