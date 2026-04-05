import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { notifyAdmins } from '../services/notificationService';
import { toast } from 'sonner';
import { X, Save } from 'lucide-react';

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
    brideAddress: '',
    brideNumber: '',
    brideName: '',
    brideBengaliName: '',
    groomAddress: '',
    groomNumber: '',
    groomName: '',
    groomBengaliName: '',
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
    totalPackageAmount: 0,
    dueAmount: 0,
    emi1Date: '',
    emi2Date: '',
    emi3Date: '',
    emi4Date: '',
    emi5Date: '',
    paymentMode: '',
    photographerName: '',
    photographerPrice: 0,
    photographerId: '',
    photographerPaid: false,
    videographerName: '',
    videographerPrice: 0,
    editorId: '',
    editorPaid: false,
    otherServiceName: '',
    otherServicePrice: 0,
    otherId: '',
    otherPaid: false,
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
    rawFileLink: '',
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
      if (bookingId) {
        await updateDoc(doc(db, 'bookings', bookingId), {
          ...formData,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        });
        
        await notifyAdmins(
          'Booking Updated',
          `Booking for ${formData.clientName} (Invoice: ${invoiceNumber}) was updated by ${user.displayName || user.email}.`,
          'info',
          '/bookings'
        );

        toast.success('Information updated successfully!');
      } else {
        const newInvoiceNumber = invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
        await addDoc(collection(db, 'bookings'), {
          ...formData,
          invoiceNumber: newInvoiceNumber,
          clientId: clientId || null,
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
        });

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
      console.error('Error saving information:', error);
      toast.error('Failed to save information');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70] overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add Client Information</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Client Information */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client Name</label>
                <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mobile</label>
                <input type="text" name="clientMobile" value={formData.clientMobile} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                <input type="email" name="clientEmail" value={formData.clientEmail} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Date</label>
                <input type="date" name="eventDate" value={formData.eventDate} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Package</label>
                <select name="package" value={formData.package} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none">
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Diamond">Diamond</option>
                  <option value="Customize">Customize</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Type</label>
                <select name="eventType" value={formData.eventType} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none">
                  <option value="WEDD BRIDESIDE">WEDD BRIDESIDE</option>
                  <option value="WEDD GROOM">WEDD GROOM</option>
                  <option value="ANNOPRASAN">ANNOPRASAN</option>
                  <option value="BIRTHDAY">BIRTHDAY</option>
                  <option value="MODEL SHOOT">MODEL SHOOT</option>
                  <option value="CINEMATIC">CINEMATIC</option>
                  <option value="EVENT">EVENT</option>
                  <option value="SHORT FILM">SHORT FILM</option>
                  <option value="MUSIC VIDEO">MUSIC VIDEO</option>
                  <option value="OUTDOOR">OUTDOOR</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Place</label>
                <input type="text" name="eventPlace" value={formData.eventPlace} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Requirement</label>
              <textarea name="requirement" value={formData.requirement} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" rows={2} />
            </div>
          </section>

          {/* Wedding Specifics */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Wedding Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Bride Side</h4>
                <div className="grid grid-cols-1 gap-4">
                  <input type="text" name="brideName" placeholder="Bride Name" value={formData.brideName} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                  <input type="text" name="brideBengaliName" placeholder="Bride Bengali Name" value={formData.brideBengaliName} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                  <input type="text" name="brideNumber" placeholder="Bride Number" value={formData.brideNumber} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                  <textarea name="brideAddress" placeholder="Bride Address" value={formData.brideAddress} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" rows={2} />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Groom Side</h4>
                <div className="grid grid-cols-1 gap-4">
                  <input type="text" name="groomName" placeholder="Groom Name" value={formData.groomName} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                  <input type="text" name="groomBengaliName" placeholder="Groom Bengali Name" value={formData.groomBengaliName} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                  <input type="text" name="groomNumber" placeholder="Groom Number" value={formData.groomNumber} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                  <textarea name="groomAddress" placeholder="Groom Address" value={formData.groomAddress} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" rows={2} />
                </div>
              </div>
            </div>
          </section>

          {/* Other Event Details */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Other Event Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Child / Model</h4>
                <div className="grid grid-cols-1 gap-4">
                  <input type="text" name="childName" placeholder="Child Name" value={formData.childName} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                  <input type="text" name="childBengaliName" placeholder="Child Bengali Name" value={formData.childBengaliName} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                  <input type="text" name="modelName" placeholder="Model Name" value={formData.modelName} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                  <input type="text" name="modelIdLink" placeholder="Model ID Link" value={formData.modelIdLink} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Makeup & Channel</h4>
                <div className="grid grid-cols-1 gap-4">
                  <input type="text" name="makeupArtist" placeholder="Makeup Artist Name" value={formData.makeupArtist} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                  <input type="text" name="makeupArtistIdLink" placeholder="Makeup Artist ID Link" value={formData.makeupArtistIdLink} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                  <input type="text" name="channel" placeholder="Channel" value={formData.channel} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                </div>
              </div>
            </div>
          </section>

          {/* Songs */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Songs Selection</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pre Wedding Song</label>
                <input type="text" name="ourWeddingSong" value={formData.ourWeddingSong} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Song</label>
                <input type="text" name="eventSong" value={formData.eventSong} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reels Song</label>
                <input type="text" name="reelsSong" value={formData.reelsSong} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
              </div>
            </div>
          </section>

          {/* Payment Information */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Package (₹)</label>
                <input type="number" name="totalPackageAmount" value={formData.totalPackageAmount} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Amount (₹)</label>
                <input type="number" name="dueAmount" value={formData.dueAmount} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Mode</label>
                <input type="text" name="paymentMode" value={formData.paymentMode} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" placeholder="Cash/Online/EMI" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Google Drive Folder ID</label>
                <input type="text" name="googleDriveFolderId" value={formData.googleDriveFolderId} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" placeholder="For Face Recognition" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
              {['emi1Date', 'emi2Date', 'emi3Date', 'emi4Date', 'emi5Date'].map((emi, idx) => (
                <div key={emi}>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">EMI {idx + 1} Date</label>
                  <input type="date" name={emi} value={(formData as any)[emi]} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                </div>
              ))}
            </div>
          </section>

          {/* Staffing */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Staffing & Costs</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="text-sm font-bold mb-3">Photographer</h4>
                <select 
                  name="photographerId" 
                  value={formData.photographerId} 
                  onChange={(e) => {
                    const member = teamMembers.find(m => m.uid === e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      photographerId: e.target.value,
                      photographerName: member ? member.displayName || member.email : ''
                    }));
                  }} 
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none mb-2"
                >
                  <option value="">Select Photographer</option>
                  {teamMembers.filter(m => m.role === 'photographer' || m.role === 'admin').map(m => (
                    <option key={m.uid} value={m.uid}>{m.displayName || m.email}</option>
                  ))}
                </select>
                <input type="number" name="photographerPrice" placeholder="Price (₹)/Day" value={formData.photographerPrice} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none mb-2" />
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    name="photographerPaid" 
                    id="photographerPaid"
                    checked={formData.photographerPaid} 
                    onChange={(e) => setFormData(prev => ({ ...prev, photographerPaid: e.target.checked }))} 
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <label htmlFor="photographerPaid" className="text-xs font-bold text-gray-600 uppercase">Paid to Photographer</label>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="text-sm font-bold mb-3">Editor</h4>
                <select 
                  name="editorId" 
                  value={formData.editorId} 
                  onChange={(e) => {
                    const member = teamMembers.find(m => m.uid === e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      editorId: e.target.value,
                      videographerName: member ? member.displayName || member.email : ''
                    }));
                  }} 
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none mb-2"
                >
                  <option value="">Select Editor</option>
                  {teamMembers.filter(m => m.role === 'editor' || m.role === 'admin').map(m => (
                    <option key={m.uid} value={m.uid}>{m.displayName || m.email}</option>
                  ))}
                </select>
                <input type="number" name="videographerPrice" placeholder="Price (₹)/Day" value={formData.videographerPrice} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none mb-2" />
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    name="editorPaid" 
                    id="editorPaid"
                    checked={formData.editorPaid} 
                    onChange={(e) => setFormData(prev => ({ ...prev, editorPaid: e.target.checked }))} 
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <label htmlFor="editorPaid" className="text-xs font-bold text-gray-600 uppercase">Paid to Editor</label>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="text-sm font-bold mb-3">Other Service</h4>
                <select 
                  name="otherId" 
                  value={formData.otherId} 
                  onChange={(e) => {
                    const member = teamMembers.find(m => m.uid === e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      otherId: e.target.value,
                      otherServiceName: member ? member.displayName || member.email : ''
                    }));
                  }} 
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none mb-2"
                >
                  <option value="">Select Member</option>
                  {teamMembers.filter(m => m.role === 'other' || m.role === 'admin').map(m => (
                    <option key={m.uid} value={m.uid}>{m.displayName || m.email}</option>
                  ))}
                </select>
                <input type="number" name="otherServicePrice" placeholder="Price (₹)" value={formData.otherServicePrice} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none mb-2" />
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    name="otherPaid" 
                    id="otherPaid"
                    checked={formData.otherPaid} 
                    onChange={(e) => setFormData(prev => ({ ...prev, otherPaid: e.target.checked }))} 
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <label htmlFor="otherPaid" className="text-xs font-bold text-gray-600 uppercase">Paid to Member</label>
                </div>
              </div>
            </div>
          </section>

          {/* Work Progress & Links (Admin/Editor only) */}
          {(role === 'admin' || role === 'editor') && (
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Work Progress & Deliverables</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Raw File Link</label>
                    <input type="text" name="rawFileLink" value={formData.rawFileLink} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" placeholder="Google Drive/Dropbox link" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teaser Status</label>
                      <select name="teaserStatus" value={formData.teaserStatus} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none">
                        <option value="pending">Pending</option>
                        <option value="review">Review</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teaser Link</label>
                      <input type="text" name="teaserLink" value={formData.teaserLink} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Video Status</label>
                      <select name="fullVideoStatus" value={formData.fullVideoStatus} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none">
                        <option value="pending">Pending</option>
                        <option value="review">Review</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Video Link</label>
                      <input type="text" name="fullVideoLink" value={formData.fullVideoLink} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reels Status</label>
                      <select name="reelsStatus" value={formData.reelsStatus} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none">
                        <option value="pending">Pending</option>
                        <option value="review">Review</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reels Link</label>
                      <input type="text" name="reelsLink" value={formData.reelsLink} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-Invite Status</label>
                      <select name="eInviteStatus" value={formData.eInviteStatus} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none">
                        <option value="pending">Pending</option>
                        <option value="review">Review</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-Invite Link</label>
                      <input type="text" name="eInviteLink" value={formData.eInviteLink} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Photo Edit Status</label>
                      <select name="editPhotoStatus" value={formData.editPhotoStatus} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none">
                        <option value="pending">Pending</option>
                        <option value="review">Review</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Photo Edit Link</label>
                      <input type="text" name="photoEditLink" value={formData.photoEditLink} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Album Design Status</label>
                      <select name="albumDesignStatus" value={formData.albumDesignStatus} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none">
                        <option value="pending">Pending</option>
                        <option value="review">Review</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Album Link</label>
                      <input type="text" name="albumLink" value={formData.albumLink} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pre-Wedding Photo Status</label>
                      <select name="preWeddingPhotoStatus" value={formData.preWeddingPhotoStatus} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none">
                        <option value="pending">Pending</option>
                        <option value="review">Review</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pre-Wedding Photo Link</label>
                      <input type="text" name="preWeddingPhotoLink" value={formData.preWeddingPhotoLink} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pre-Wedding Video Status</label>
                      <select name="preWeddingVideoStatus" value={formData.preWeddingVideoStatus} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none">
                        <option value="pending">Pending</option>
                        <option value="review">Review</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pre-Wedding Video Link</label>
                      <input type="text" name="preWeddingVideoLink" value={formData.preWeddingVideoLink} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Main Output Link</label>
                    <input type="text" name="outputLink" value={formData.outputLink} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none" placeholder="Link to all final files" />
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl border border-gray-200 font-bold hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className="px-8 py-2 rounded-xl bg-black text-white font-bold flex items-center space-x-2 hover:bg-gray-800 transition-colors shadow-lg shadow-black/20">
              <Save className="w-5 h-5" />
              <span>Save Information</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;
