import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { notifyAdmins } from '../services/notificationService';
import { toast } from 'sonner';
import { X, Save, Plus, Trash2, Music, Users, CreditCard, Truck, Home, Book, Gift, HardDrive, Package, Info, CheckCircle2, Clock, AlertCircle, Heart, Star, Camera, Edit2 } from 'lucide-react';

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
  const [verifyingDrive, setVerifyingDrive] = useState(false);
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);

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
    groomName: '',
    groomNumber: '',
    groomAddress: '',
    childName: '',
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
    partialPayments: [] as { amount: number; date: string; method: string }[],
    dueAmount: 0,
    emiCount: 0,
    emiAmounts: {} as Record<string, number>,
    emi1Date: '',
    emi2Date: '',
    emi3Date: '',
    emi4Date: '',
    emi5Date: '',
    paymentMode: '',
    photographerId: '',
    photographerIds: [] as string[],
    editorId: '',
    editorIds: [] as string[],
    otherId: '',
    otherIds: [] as string[],
    staffPayments: {} as Record<string, { totalFee: number; paidAmount: number; lastPaymentDate?: string; payments: { amount: number; date: string; method: string }[] }>,
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
        let conditions: any[] = [where('invoiceNumber', '==', invoiceNumber)];
        const isPrivileged = role === 'admin' || role === 'photographer' || role === 'editor' || role === 'other';
        if (!isPrivileged) conditions.push(where('clientId', '==', user.uid));
        
        const q = query(collection(db, 'bookings'), ...conditions);
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
      try {
        const isPrivileged = role === 'admin' || role === 'photographer' || role === 'editor' || role === 'other';
        if (!isPrivileged) return;
        
        const q = query(collection(db, 'users'), where('role', 'in', ['photographer', 'editor', 'other', 'admin']));
        const snapshot = await getDocs(q);
        const members = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        setTeamMembers(members);
      } catch (error) {
        console.error('Error fetching team members:', error);
      }
    };
    fetchTeamMembers();
  }, [role]);

  useEffect(() => {
    const total = Number(formData.totalPackageAmount) || 0;
    const disc = Number(formData.discount) || 0;
    const paid = Number(formData.paidAmount) || 0;
    const calculatedDue = total - disc - paid;
    if (formData.dueAmount !== calculatedDue) {
      setFormData(prev => ({ ...prev, dueAmount: calculatedDue }));
    }
  }, [formData.totalPackageAmount, formData.discount, formData.paidAmount]);

  const verifyDriveLink = async () => {
    if (!formData.googleDriveFolderId) {
      toast.error('No Folder ID found. Please extract it from a link first.');
      return;
    }
    setVerifyingDrive(true);
    setDriveConnected(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`/api/drive/list/${formData.googleDriveFolderId}?limit=1`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        toast.success('Connected to Google Drive successfully!');
        setDriveConnected(true);
      } else {
        toast.error('Cannot connect to Drive folder. Ensure the link is shared/public.');
        setDriveConnected(false);
      }
    } catch {
      toast.error('Network error verifying Drive folder.');
      setDriveConnected(false);
    } finally {
      setVerifyingDrive(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const batch = writeBatch(db);
      const isPrivileged = role === 'admin' || role === 'photographer' || role === 'editor' || role === 'other';
      
      if (bookingId) {
        const bookingRef = doc(db, 'bookings', bookingId);
        batch.update(bookingRef, {
          ...formData,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        });
        
        // Also update the order if it exists
        let orderConditions: any[] = [where('invoiceNumber', '==', invoiceNumber)];
        if (!isPrivileged) orderConditions.push(where('clientId', '==', user.uid));
        const q = query(collection(db, 'orders'), ...orderConditions);
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
            photographerIds: formData.photographerIds || [],
            editorIds: formData.editorIds || [],
            otherIds: formData.otherIds || [],
            staffPayments: formData.staffPayments || {},
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
        let newOrderConditions: any[] = [where('invoiceNumber', '==', newInvoiceNumber)];
        if (!isPrivileged) newOrderConditions.push(where('clientId', '==', user.uid));
        const q2 = query(collection(db, 'orders'), ...newOrderConditions);
        const snap2 = await getDocs(q2);
        
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
          photographerIds: formData.photographerIds || [],
          editorIds: formData.editorIds || [],
          otherIds: formData.otherIds || [],
          staffPayments: formData.staffPayments || {},
          createdAt: new Date().toISOString(),
          bookingId: newBookingRef.id
        };

        if (!snap2.empty) {
          const orderRef = doc(db, 'orders', snap2.docs[0].id);
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

    // Auto extract Drive Folder ID
    if (name === 'googleDriveFolderUrl') {
      const match = value.match(/folders\/([a-zA-Z0-9-_]+)/) || value.match(/id=([a-zA-Z0-9-_]+)/);
      const extractedId = match ? match[1] : '';
      setFormData(prev => ({ 
        ...prev, 
        googleDriveFolderUrl: value,
        googleDriveFolderId: extractedId 
      }));
      setDriveConnected(null);
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

  const updateEmiAmount = (index: number, value: number) => {
    setFormData(prev => ({
      ...prev,
      emiAmounts: {
        ...(prev.emiAmounts || {}),
        [`emi${index + 1}`]: value
      }
    }));
  };

  const addPartialPayment = () => {
    setFormData(prev => ({
      ...prev,
      partialPayments: [...(prev.partialPayments || []), { amount: 0, date: new Date().toISOString().split('T')[0], method: 'Cash' }]
    }));
  };

  const removePartialPayment = (index: number) => {
    setFormData(prev => {
      const newPayments = (prev.partialPayments || []).filter((_, i) => i !== index);
      const newPaidAmount = newPayments.reduce((sum, p) => sum + p.amount, 0);
      return { 
        ...prev, 
        partialPayments: newPayments,
        paidAmount: newPaidAmount
      };
    });
  };

  const updatePartialPayment = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newPayments = [...(prev.partialPayments || [])];
      newPayments[index] = { ...newPayments[index], [field]: value };
      const newPaidAmount = newPayments.reduce((sum, p) => sum + p.amount, 0);
      return { 
        ...prev, 
        partialPayments: newPayments,
        paidAmount: newPaidAmount
      };
    });
  };

  const toggleStaffMember = (uid: string, type: 'photographer' | 'editor' | 'other') => {
    const field = `${type}Ids` as 'photographerIds' | 'editorIds' | 'otherIds';
    setFormData(prev => {
      const currentIds = prev[field] || [];
      const isAlreadyAssigned = currentIds.includes(uid);
      const newIds = isAlreadyAssigned 
        ? currentIds.filter(id => id !== uid)
        : [...currentIds, uid];
      
      return {
        ...prev,
        [field]: newIds,
        [`${type}Id`]: newIds.length > 0 ? newIds[0] : '' // Keep singular for compat
      };
    });
  };

  const updateStaffFee = (uid: string, fee: number) => {
    setFormData(prev => ({
      ...prev,
      staffPayments: {
        ...prev.staffPayments,
        [uid]: {
          ...(prev.staffPayments?.[uid] || { totalFee: 0, paidAmount: 0, payments: [] }),
          totalFee: fee
        }
      }
    }));
  };

  const recordStaffPayment = (uid: string, amount: number, method: string) => {
    if (amount <= 0) return;
    const date = new Date().toISOString();
    setFormData(prev => {
      const currentStaffData = prev.staffPayments?.[uid] || { totalFee: 0, paidAmount: 0, payments: [] };
      const newPayments = [...(currentStaffData.payments || []), { amount, date, method }];
      const newPaidAmount = newPayments.reduce((sum, p) => sum + p.amount, 0);
      
      return {
        ...prev,
        staffPayments: {
          ...prev.staffPayments,
          [uid]: {
            ...currentStaffData,
            paidAmount: newPaidAmount,
            lastPaymentDate: date,
            payments: newPayments
          }
        }
      };
    });
    toast.success('Staff payment recorded locally. Save the form to persist.');
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
                  <input type="text" name="clientName" value={formData.clientName || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" required />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mobile Number</label>
                  <input type="text" name="clientMobile" value={formData.clientMobile || ''} onChange={handleChange} maxLength={10} placeholder="10-digit mobile number" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                  <input type="email" name="clientEmail" value={formData.clientEmail || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Event Date</label>
                  <input type="date" name="eventDate" value={formData.eventDate || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" required />
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
                {role !== 'client' && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Priority Level</label>
                  <select disabled={role !== 'admin'} name="priority" value={formData.priority} onChange={handleChange} className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-bold ${role !== 'admin' ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}>
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent Priority</option>
                  </select>
                </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Event Venue/Place</label>
                  <input type="text" name="eventPlace" value={formData.eventPlace || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Address</label>
                  <input type="text" name="address" value={formData.address || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">General Requirements</label>
                  <textarea name="requirement" value={formData.requirement || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" rows={3} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Special Requirements</label>
                  <textarea name="specialRequirement" value={formData.specialRequirement || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" rows={3} placeholder="Any specific requests or notes..." />
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
                    <input type="text" name="brideName" placeholder="Full Name" value={formData.brideName || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                    <input type="text" name="brideNumber" placeholder="10-digit mobile number" value={formData.brideNumber || ''} onChange={handleChange} maxLength={10} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                    <textarea name="brideAddress" placeholder="Current Address" value={formData.brideAddress || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" rows={2} />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 border-b border-gray-200 pb-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Groom Information</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <input type="text" name="groomName" placeholder="Full Name" value={formData.groomName || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                    <input type="text" name="groomNumber" placeholder="10-digit mobile number" value={formData.groomNumber || ''} onChange={handleChange} maxLength={10} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                    <textarea name="groomAddress" placeholder="Current Address" value={formData.groomAddress || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" rows={2} />
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
                      <input type="text" name="childName" placeholder="Full Name" value={formData.childName || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                    )}
                    {formData.eventType === 'MODEL SHOOT' && (
                      <>
                        <input type="text" name="modelName" placeholder="Model Name" value={formData.modelName || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                        <input type="text" name="modelIdLink" placeholder="Portfolio/ID Link" value={formData.modelIdLink || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
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
                        <input type="text" name="makeupArtist" placeholder="Makeup Artist Name" value={formData.makeupArtist || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                        <input type="text" name="makeupArtistIdLink" placeholder="Makeup Artist Portfolio Link" value={formData.makeupArtistIdLink || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                      </>
                    )}
                    <input type="text" name="channel" placeholder="Social Media/Channel Handle" value={formData.channel || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
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
                <input type="text" name="ourWeddingSong" value={formData.ourWeddingSong || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all" placeholder="Song name or link" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Event Song</label>
                <input type="text" name="eventSong" value={formData.eventSong || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all" placeholder="Song name or link" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reels Song</label>
                <input type="text" name="reelsSong" value={formData.reelsSong || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all" placeholder="Song name or link" />
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
          {role === 'admin' && (
            <section>
              <div className="flex items-center space-x-2 mb-6">
                <CreditCard className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">Payment & EMI Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Package (₹)</label>
                <input type="number" name="totalPackageAmount" value={formData.totalPackageAmount || 0} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none font-bold text-lg" required />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Discount (₹)</label>
                <input type="number" name="discount" value={formData.discount || 0} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none font-bold text-lg text-red-600" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Paid Amount (₹)</label>
                <input 
                  type="number" 
                  name="paidAmount" 
                  value={formData.paidAmount || 0} 
                  onChange={handleChange} 
                  className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none font-bold text-lg text-green-600 ${formData.partialPayments?.length > 0 ? 'bg-gray-50' : ''}`} 
                  readOnly={formData.partialPayments?.length > 0}
                />
                {formData.partialPayments?.length > 0 && (
                  <p className="text-[8px] text-gray-400 mt-1 italic">* Total of partial payments below</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Due Amount (₹)</label>
                <div className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 font-bold text-lg text-orange-600">
                  ₹{formData.dueAmount?.toLocaleString() || 0}
                </div>
              </div>
            </div>

            {/* Partial Payments History */}
            <div className="mt-8 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-green-600" />
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Partial Payments Record</h4>
                </div>
                <button 
                  type="button" 
                  onClick={addPartialPayment}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors text-[10px] font-bold shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record Payment</span>
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {formData.partialPayments?.map((payment, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm items-end">
                    <div className="space-y-1">
                      <label className="block text-[8px] font-bold text-gray-400 uppercase">Payment Date</label>
                      <input 
                        type="date" 
                        value={payment.date} 
                        onChange={(e) => updatePartialPayment(idx, 'date', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-black"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] font-bold text-gray-400 uppercase">Amount (₹)</label>
                      <input 
                        type="number" 
                        value={payment.amount} 
                        onChange={(e) => updatePartialPayment(idx, 'amount', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold outline-none focus:border-black"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] font-bold text-gray-400 uppercase">Method</label>
                      <select 
                        value={payment.method} 
                        onChange={(e) => updatePartialPayment(idx, 'method', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-black font-semibold"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Online">Online Transfer</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                        <option value="Mobile Banking">Mobile Banking</option>
                      </select>
                    </div>
                    <div className="flex justify-end">
                      <button 
                        type="button" 
                        onClick={() => removePartialPayment(idx)}
                        className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!formData.partialPayments || formData.partialPayments.length === 0) && (
                  <div className="text-center py-8 bg-white/50 rounded-xl border border-dashed border-gray-200">
                    <CreditCard className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-[10px] text-gray-400 font-medium">No partial payments recorded yet.</p>
                    <p className="text-[9px] text-gray-300">Click "Record Payment" to add transaction details.</p>
                  </div>
                )}
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
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Google Drive Folder Link</label>
                  {driveConnected !== null && (
                    <span className={`text-[10px] font-bold ${driveConnected ? 'text-green-500' : 'text-red-500'}`}>
                      {driveConnected ? 'Connected' : 'Invalid Link'}
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    name="googleDriveFolderUrl" 
                    value={formData.googleDriveFolderUrl || ''} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none" 
                    placeholder="https://drive.google.com/..." 
                  />
                  <button
                    type="button"
                    onClick={verifyDriveLink}
                    disabled={verifyingDrive || !formData.googleDriveFolderId}
                    className="px-4 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-bold whitespace-nowrap transition-colors"
                  >
                    {verifyingDrive ? '...' : 'Verify'}
                  </button>
                </div>
              </div>
              <div className="md:col-span-1 space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Google Drive Folder ID</label>
                <input type="text" name="googleDriveFolderId" value={formData.googleDriveFolderId} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:border-black outline-none" placeholder="Auto-fills from link" readOnly />
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
          </section>
          )}

          {/* Staffing & Staff Payments */}
          {role === 'admin' && (
            <section className="p-8 bg-gray-50 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 leading-none">Staff Assignments & Payments</h3>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-1.5">Manage team assignments and project fees</p>
                  </div>
                </div>
              </div>

              <div className="space-y-10">
                {(['photographer', 'editor', 'other'] as const).map((type) => (
                  <div key={type} className="space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-1.5 rounded-lg ${
                          type === 'photographer' ? 'bg-amber-100 text-amber-600' : 
                          type === 'editor' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                        }`}>
                          {type === 'photographer' ? <Camera className="w-4 h-4" /> : 
                           type === 'editor' ? <Edit2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        </div>
                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-widest">{type}s</h4>
                      </div>
                      
                      <select 
                        className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 focus:border-black outline-none bg-white shadow-sm"
                        onChange={(e) => e.target.value && toggleStaffMember(e.target.value, type)}
                        value=""
                      >
                        <option value="">+ Add {type}</option>
                        {teamMembers
                          .filter(m => m.role === type || m.role === 'admin')
                          .filter(m => !((formData[`${type}Ids`] as string[]) || []).includes(m.uid))
                          .map(m => (
                            <option key={m.uid} value={m.uid}>{m.displayName || m.email}</option>
                          ))
                        }
                      </select>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {((formData[`${type}Ids`] as string[]) || []).map((uid) => {
                        const member = teamMembers.find(m => m.uid === uid);
                        const paymentInfo = formData.staffPayments?.[uid] || { totalFee: 0, paidAmount: 0, payments: [] };
                        const dueAmount = paymentInfo.totalFee - paymentInfo.paidAmount;

                        return (
                          <div key={uid} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-6">
                            {/* Member Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500 border border-gray-200">
                                  {(member?.displayName || member?.email || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-gray-900 truncate">{member?.displayName || member?.email}</p>
                                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{member?.role || type}</p>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => toggleStaffMember(uid, type)}
                                  className="ml-auto md:ml-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Payment Logic */}
                            <div className="flex flex-wrap items-end gap-x-6 gap-y-4 pt-4 md:pt-0 border-t md:border-t-0 border-gray-50">
                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Agreed Fee (₹)</label>
                                <input 
                                  type="number" 
                                  value={paymentInfo.totalFee} 
                                  onChange={(e) => updateStaffFee(uid, Number(e.target.value))}
                                  className="w-28 px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-black outline-none font-bold text-xs"
                                  placeholder="Fee"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1 text-green-600">Paid (₹)</label>
                                <div className="w-28 px-3 py-2 rounded-xl border border-transparent bg-green-50/50 font-bold text-xs text-green-600">
                                  ₹{paymentInfo.paidAmount || 0}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1 text-orange-600">Due (₹)</label>
                                <div className={`w-28 px-3 py-2 rounded-xl border border-transparent font-bold text-xs ${dueAmount > 0 ? 'bg-orange-50/50 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                                  ₹{dueAmount}
                                </div>
                              </div>

                              <div className="flex items-center self-end">
                                <div className="flex items-center space-x-2">
                                  <input 
                                    type="number" 
                                    id={`pay-${uid}`}
                                    placeholder="Amount"
                                    className="w-24 px-3 py-2 rounded-xl border border-gray-100 text-xs font-medium outline-none focus:border-green-500"
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById(`pay-${uid}`) as HTMLInputElement;
                                      if (input) {
                                        recordStaffPayment(uid, Number(input.value), 'Cash');
                                        input.value = '';
                                      }
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-bold hover:bg-green-700 transition-all shadow-sm shadow-green-100 active:scale-95"
                                  >
                                    PAY
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {((formData[`${type}Ids`] as string[]) || []).length === 0 && (
                        <div className="py-6 px-4 border-2 border-dashed border-gray-100 rounded-2xl text-center">
                          <p className="text-[10px] text-gray-400 font-medium">No {type}s assigned yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

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
                      <input type="text" name="rawFileLink" value={formData.rawFileLink || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" placeholder="Google Drive/Dropbox link" />
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
                        <input type="text" name="teaserLink" value={formData.teaserLink || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
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
                        <input type="text" name="fullVideoLink" value={formData.fullVideoLink || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
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
                        <input type="text" name="reelsLink" value={formData.reelsLink || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
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
                        <input type="text" name="photoEditLink" value={formData.photoEditLink || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
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
                        <input type="text" name="albumLink" value={formData.albumLink || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
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
                        <input type="text" name="eInviteLink" value={formData.eInviteLink || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
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
                        <input type="text" name="preWeddingPhotoLink" value={formData.preWeddingPhotoLink || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Main Output Link</label>
                    <input type="text" name="outputLink" value={formData.outputLink || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white" placeholder="Link to all final files" />
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
