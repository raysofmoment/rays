import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { X, ExternalLink, Download, FileText, CheckCircle2, Clock, Eye, IndianRupee, Plus, Receipt, Trash2, Edit2, Save, Heart, Music, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { User } from 'firebase/auth';
import EventCostForm from './EventCostForm';
import Invoice from './Invoice';
import ConfirmModal from './ConfirmModal';
import { generateInvoicePDF } from '../services/invoiceService';

interface ProjectDetailsModalProps {
  order: any;
  role: string | null;
  user: User;
  onClose: () => void;
}

const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({ order, role, user, onClose }) => {
  const [booking, setBooking] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'financials' | 'invoice'>('details');
  const [payments, setPayments] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [showAddCost, setShowAddCost] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editFormData, setEditFormData] = useState({
    brideName: '',
    brideBengaliName: '',
    brideFatherName: '',
    brideNumber: '',
    brideAddress: '',
    groomName: '',
    groomBengaliName: '',
    groomFatherName: '',
    groomNumber: '',
    groomAddress: '',
    childName: '',
    modelName: '',
    makeupArtist: '',
    songSelection: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch booking
        if (order.invoiceNumber) {
          let conditions: any[] = [where('invoiceNumber', '==', order.invoiceNumber)];
          if (user && role === 'client') conditions.push(where('clientId', '==', user.uid));
          
          const q = query(collection(db, 'bookings'), ...conditions);
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const bookingData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
            setBooking(bookingData);
            setEditFormData({
              brideName: bookingData.brideName || '',
              brideBengaliName: bookingData.brideBengaliName || '',
              brideFatherName: bookingData.brideFatherName || '',
              brideNumber: bookingData.brideNumber || '',
              brideAddress: bookingData.brideAddress || '',
              groomName: bookingData.groomName || '',
              groomBengaliName: bookingData.groomBengaliName || '',
              groomFatherName: bookingData.groomFatherName || '',
              groomNumber: bookingData.groomNumber || '',
              groomAddress: bookingData.groomAddress || '',
              childName: bookingData.childName || '',
              modelName: bookingData.modelName || '',
              makeupArtist: bookingData.makeupArtist || '',
              songSelection: bookingData.songSelection || ''
            });
          }
        }

        // Fetch team members for names (Admins and Staff only)
        const isPrivileged = role === 'admin' || role === 'photographer' || role === 'editor' || role === 'other';
        if (isPrivileged) {
          const teamQ = query(collection(db, 'users'), where('role', 'in', ['photographer', 'editor', 'other', 'admin']));
          const teamSnap = await getDocs(teamQ);
          setTeamMembers(teamSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [order.invoiceNumber]);

  useEffect(() => {
    if (activeTab === 'financials' && order.id) {
      // Fetch payments for this project
      const paymentsQuery = query(collection(db, 'payments'), where('orderId', '==', order.id));
      const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
        setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'payments');
      });

      // Fetch costs for this project (using invoice number as link)
      const costsQuery = query(collection(db, 'eventCosts'), where('invoice', '==', order.invoiceNumber));
      const unsubscribeCosts = onSnapshot(costsQuery, (snapshot) => {
        setCosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'eventCosts');
      });

      return () => {
        unsubscribePayments();
        unsubscribeCosts();
      };
    }
  }, [activeTab, order.id, order.invoiceNumber]);

  const handleDeleteCost = async (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'eventCosts', itemToDelete));
      toast.success('Cost record deleted');
    } catch (error) {
      toast.error('Failed to delete cost record');
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const handleSaveInfo = async () => {
    if (!booking?.id) return;
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        ...editFormData,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      });
      setBooking({ ...booking, ...editFormData });
      setIsEditingInfo(false);
      toast.success('Event details saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
      toast.error('Failed to save event details');
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalCost = costs.reduce((sum, c) => {
    return sum + (
      Number(c.travelExtra || 0) +
      Number(c.caligraphy || 0) +
      Number(c.weddingVideo || 0) +
      Number(c.weddingTeaser || 0) +
      Number(c.weddingPhoto || 0) +
      Number(c.box || 0) +
      Number(c.other || 0) +
      Number(c.albumDesign || 0) +
      Number(c.albumPrint || 0) +
      Number(c.prePhoto || 0) +
      Number(c.preVideo || 0) +
      Number(c.lidGenerate || 0) +
      Number(c.gift || 0) +
      Number(c.pendrive || 0) +
      Number(c.tvLedProjector || 0)
    );
  }, 0);

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
        <p className="text-sm text-gray-500">Loading project details...</p>
      </div>
    </div>
  );

  const getMemberNames = (ids: string[] = []) => {
    return ids.map(id => teamMembers.find(m => m.id === id)?.displayName || 'Unknown').join(', ');
  };

  const renderPhotographerOtherView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
          <div className="p-2 bg-white rounded-xl shadow-sm text-blue-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client Name</h4>
            <p className="text-sm font-bold text-gray-900">{order.clientName}</p>
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
          <div className="p-2 bg-white rounded-xl shadow-sm text-green-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone</h4>
            <p className="text-sm font-bold text-gray-900">{order.mobileNumber}</p>
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
          <div className="p-2 bg-white rounded-xl shadow-sm text-purple-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Event</h4>
            <p className="text-sm font-bold text-gray-900">{order.eventType}</p>
          </div>
        </div>
      </div>

      {/* Assignment Summary (Admins and Staff only) */}
      {(role === 'admin' || role === 'photographer' || role === 'editor' || role === 'other') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Camera className="w-3 h-3" /> Photographers
            </h4>
            <div className="flex flex-wrap gap-2 text-sm font-bold text-gray-900">
              {getMemberNames(order.photographerIds) || 'None Assigned'}
            </div>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Edit2 className="w-3 h-3" /> Editors
            </h4>
            <div className="flex flex-wrap gap-2 text-sm font-bold text-gray-900">
              {getMemberNames(order.editorIds) || 'None Assigned'}
            </div>
          </div>
        </div>
      )}

      {booking?.eventType?.includes('WEDD') && (
        <div className="relative overflow-hidden p-6 bg-gradient-to-br from-pink-50 to-white rounded-2xl border border-pink-100 shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Heart className="w-32 h-32" />
          </div>
          <h4 className="text-[10px] font-bold text-pink-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Heart className="w-3 h-3 fill-pink-600" /> Couple Identity
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold">B</div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Bride</p>
                  <p className="text-base font-bold text-gray-900">{booking.brideName || 'N/A'}</p>
                  {booking.brideBengaliName && <p className="text-sm text-pink-700 font-medium">{booking.brideBengaliName}</p>}
                </div>
              </div>
              <div className="pl-13 space-y-2">
                <p className="text-[10px] text-gray-500 uppercase"><span className="font-bold">Father:</span> {booking.brideFatherName || 'N/A'}</p>
                <p className="text-[10px] text-gray-500 uppercase"><span className="font-bold">Contact:</span> {booking.brideNumber || 'N/A'}</p>
                <p className="text-[10px] text-gray-500 uppercase leading-relaxed"><span className="font-bold">Address:</span> {booking.brideAddress || 'N/A'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">G</div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Groom</p>
                  <p className="text-base font-bold text-gray-900">{booking.groomName || 'N/A'}</p>
                  {booking.groomBengaliName && <p className="text-sm text-blue-700 font-medium">{booking.groomBengaliName}</p>}
                </div>
              </div>
              <div className="pl-13 space-y-2">
                <p className="text-[10px] text-gray-500 uppercase"><span className="font-bold">Father:</span> {booking.groomFatherName || 'N/A'}</p>
                <p className="text-[10px] text-gray-500 uppercase"><span className="font-bold">Contact:</span> {booking.groomNumber || 'N/A'}</p>
                <p className="text-[10px] text-gray-500 uppercase leading-relaxed"><span className="font-bold">Address:</span> {booking.groomAddress || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <FileText className="w-3 h-3" /> Event Requirements
          </h4>
          <div className="space-y-3">
            <div className="text-sm text-gray-700 leading-relaxed italic bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
              <span className="block text-[10px] font-bold text-yellow-600 uppercase mb-1">General</span>
              "{booking?.requirement || 'No general instructions'}"
            </div>
            {booking?.specialRequirement && (
              <div className="text-sm text-gray-700 leading-relaxed italic bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <span className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Special Requirement</span>
                "{booking.specialRequirement}"
              </div>
            )}
          </div>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Receipt className="w-3 h-3" /> Event Place / Venue
          </h4>
          <div className="text-sm font-bold text-gray-900 bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-start gap-2">
            <ExternalLink className="w-4 h-4 text-gray-400 mt-0.5" />
            {booking?.address || 'Venue address not provided'}
          </div>
        </div>
      </div>

      {renderPackageDetails()}
      
      {(booking?.songSelection || (booking?.songLinks && booking.songLinks.length > 0)) && (
        <div className="p-6 bg-black text-white rounded-3xl shadow-xl space-y-4">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Plus className="w-3 h-3 text-white" /> Additional Song Links / Names
          </h4>
          <div className="space-y-4">
            {booking.songSelection && (
              <div className="text-sm font-medium opacity-90 whitespace-pre-wrap leading-relaxed border-b border-white/10 pb-4 mb-4">
                {booking.songSelection}
              </div>
            )}
            {booking.songLinks && booking.songLinks.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {booking.songLinks.map((s: any, i: number) => (
                  <div key={i} className="p-3 bg-white/10 rounded-xl border border-white/5 flex items-center justify-between group">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{s.title || 'Untitled Track'}</span>
                      <span className="text-xs font-medium truncate max-w-[200px]">{s.link || 'No link'}</span>
                    </div>
                    {s.link && (
                      <a href={s.link} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderEditorView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Client Identifier</h4>
          <p className="text-base font-bold text-gray-900">{order.clientName}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Event Reference</h4>
          <p className="text-base font-bold text-gray-900">{order.eventType}</p>
        </div>
      </div>

      {booking?.eventType?.includes('WEDD') && (
        <div className="p-6 bg-pink-50/30 rounded-3xl border border-pink-100 space-y-4">
          <h4 className="text-[10px] font-bold text-pink-600 uppercase tracking-widest flex items-center gap-2">
            <Heart className="w-3 h-3 fill-pink-600" /> Identity for Titles (Copy-Ready)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-pink-100 shadow-sm transition-all hover:border-pink-300 group">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-pink-400 uppercase tracking-tighter">Bride Details</span>
                <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">English Name</p>
                  <p className="text-lg font-black text-gray-900 select-all">{booking.brideName || 'N/A'}</p>
                </div>
                <div className="pt-2 border-t border-pink-50">
                  <p className="text-[9px] text-pink-400 font-bold uppercase">Bengali Name</p>
                  <p className="text-2xl font-bold text-pink-700 select-all Bengali-font">{booking.brideBengaliName || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-blue-100 shadow-sm transition-all hover:border-blue-300 group">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">Groom Details</span>
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">English Name</p>
                  <p className="text-lg font-black text-gray-900 select-all">{booking.groomName || 'N/A'}</p>
                </div>
                <div className="pt-2 border-t border-blue-50">
                  <p className="text-[9px] text-blue-400 font-bold uppercase">Bengali Name</p>
                  <p className="text-2xl font-bold text-blue-700 select-all Bengali-font">{booking.groomBengaliName || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
            <ExternalLink className="w-3 h-3" /> Cloud Storage
          </h4>
          {booking?.rawFileLink ? (
            <a href={booking.rawFileLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-blue-50 text-blue-700 rounded-2xl hover:bg-blue-100 transition-all border border-blue-100 group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm shadow-blue-200">
                  <Download className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm">Access RAW Project Files</span>
              </div>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-1 duration-300" />
            </a>
          ) : (
            <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-400 italic">
              Google Drive link not yet provisioned
            </div>
          )}
        </div>
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <h4 className="text-[10px] font-bold text-purple-600 uppercase tracking-widest flex items-center gap-2">
            <FileText className="w-3 h-3" /> Main Tracks
          </h4>
          <div className="text-[11px] space-y-2">
            {[
              { label: 'Wedding', track: booking?.ourWeddingSong },
              { label: 'Event', track: booking?.eventSong },
              { label: 'Reels', track: booking?.reelsSong },
            ].map((s) => (
              <div key={s.label} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                <span className="text-gray-500 font-bold">{s.label}</span>
                <span className="font-bold text-gray-900 max-w-[120px] truncate">{s.track || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 bg-white rounded-2xl border border-gray-100 space-y-4">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Project Requirements</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">General Instructions</span>
            <p className="text-sm font-medium text-gray-900 leading-relaxed italic">
              "{booking?.requirement || 'None specified'}"
            </p>
          </div>
          {booking?.specialRequirement && (
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <span className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Special Request</span>
              <p className="text-sm font-medium text-gray-900 leading-relaxed italic">
                "{booking.specialRequirement}"
              </p>
            </div>
          )}
        </div>
      </div>
      
      {renderPackageDetails()}
      
      {(booking?.songSelection || (booking?.songLinks && booking.songLinks.length > 0)) && (
        <div className="p-6 bg-blue-900 text-white rounded-3xl shadow-xl shadow-blue-900/10 space-y-4">
          <h4 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest flex items-center gap-2">
            <Plus className="w-3 h-3" /> Additional Song Links / Names
          </h4>
          <div className="space-y-4">
            {booking.songSelection && (
              <div className="text-sm font-medium opacity-90 whitespace-pre-wrap leading-relaxed font-mono border-b border-white/10 pb-4 mb-4">
                {booking.songSelection}
              </div>
            )}
            {booking.songLinks && booking.songLinks.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {booking.songLinks.map((s: any, i: number) => (
                  <div key={i} className="p-3 bg-white/10 rounded-xl border border-white/5 flex items-center justify-between group">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-blue-200 font-bold uppercase">{s.title || 'Untitled Track'}</span>
                      <span className="text-xs font-medium truncate max-w-[200px]">{s.link || 'No link'}</span>
                    </div>
                    {s.link && (
                      <a href={s.link} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const handleDownloadInvoice = () => {
    try {
      generateInvoicePDF({
        invoiceNumber: order.invoiceNumber,
        clientName: order.clientName,
        clientMobile: order.mobileNumber,
        clientEmail: booking?.clientEmail,
        clientAddress: booking?.address,
        date: order.date,
        invoiceDate: booking?.createdAt,
        paymentMethod: booking?.paymentMode || 'CASH',
        eventType: order.eventType,
        packageName: order.packageName,
        totalAmount: order.totalAmount || order.finalAmount,
        discount: order.discount || 0,
        paidAmount: order.paidAmount || 0,
        dueAmount: (order.finalAmount || order.totalAmount) - (order.paidAmount || 0),
        location: order.location,
        packageDetails: booking?.requirement ? [booking.requirement] : undefined,
        items: booking?.extraCosts?.map((c: any) => ({ name: c.label, price: c.amount }))
      });
      toast.success('Invoice generated successfully!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    }
  };

  const renderPackageDetails = () => (
    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4 text-blue-600" />
        Package Inclusions
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold">Package Name</p>
            <p className="text-sm font-bold text-gray-900">{order.packageName}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold">Event Type</p>
            <p className="text-sm font-medium text-gray-900">{order.eventType}</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] text-gray-500 uppercase font-bold">What's Included</p>
          <ul className="space-y-1">
            {booking?.requirement ? (
              <li className="flex items-start gap-2 text-xs text-gray-600">
                <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5" />
                <span>{booking.requirement}</span>
              </li>
            ) : (
              <li className="text-xs text-gray-400 italic">No specific inclusions listed.</li>
            )}
            {/* Common inclusions based on event type if not explicitly listed */}
            {order.eventType.includes('WEDD') && (
              <>
                <li className="flex items-start gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5" />
                  <span>Candid & Traditional Photography</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5" />
                  <span>Cinematic Wedding Film & Teaser</span>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );

  const renderClientView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {renderPackageDetails()}
      
      {/* Client Edit Info Section */}
      <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-[4rem] -mr-16 -mt-16 z-0" />
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black rounded-xl text-white">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Event Specification</h3>
            </div>
            {!isEditingInfo && (
              <button
                onClick={() => setIsEditingInfo(true)}
                className="flex items-center space-x-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-all hover:scale-105"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Information</span>
              </button>
            )}
          </div>
          
          {isEditingInfo ? (
            <div className="space-y-8">
              {order.eventType?.includes('WEDD') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4 p-6 bg-pink-50/30 rounded-3xl border border-pink-100">
                    <h4 className="text-xs font-bold text-pink-600 uppercase tracking-widest flex items-center gap-2">
                       <Heart className="w-4 h-4" /> Bride Details
                    </h4>
                  <input type="text" placeholder="Bride Name" value={editFormData.brideName || ''} onChange={(e) => setEditFormData({ ...editFormData, brideName: e.target.value })} className="w-full bg-white border border-pink-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none shadow-sm" />
                    <input type="text" placeholder="Bengali Name (Optional)" value={editFormData.brideBengaliName || ''} onChange={(e) => setEditFormData({ ...editFormData, brideBengaliName: e.target.value })} className="w-full bg-white border border-pink-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none shadow-sm" />
                    <input type="text" placeholder="Father's Name" value={editFormData.brideFatherName || ''} onChange={(e) => setEditFormData({ ...editFormData, brideFatherName: e.target.value })} className="w-full bg-white border border-pink-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none shadow-sm" />
                    <input type="tel" placeholder="Mobile Number" value={editFormData.brideNumber || ''} onChange={(e) => setEditFormData({ ...editFormData, brideNumber: e.target.value })} className="w-full bg-white border border-pink-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none shadow-sm" />
                    <textarea placeholder="Current Address" rows={2} value={editFormData.brideAddress || ''} onChange={(e) => setEditFormData({ ...editFormData, brideAddress: e.target.value })} className="w-full bg-white border border-pink-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none resize-none shadow-sm" />
                  </div>
                  <div className="space-y-4 p-6 bg-blue-50/30 rounded-3xl border border-blue-100">
                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                       <Heart className="w-4 h-4" /> Groom Details
                    </h4>
                    <input type="text" placeholder="Groom Name" value={editFormData.groomName || ''} onChange={(e) => setEditFormData({ ...editFormData, groomName: e.target.value })} className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
                    <input type="text" placeholder="Bengali Name (Optional)" value={editFormData.groomBengaliName || ''} onChange={(e) => setEditFormData({ ...editFormData, groomBengaliName: e.target.value })} className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
                    <input type="text" placeholder="Father's Name" value={editFormData.groomFatherName || ''} onChange={(e) => setEditFormData({ ...editFormData, groomFatherName: e.target.value })} className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
                    <input type="tel" placeholder="Mobile Number" value={editFormData.groomNumber || ''} onChange={(e) => setEditFormData({ ...editFormData, groomNumber: e.target.value })} className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
                    <textarea placeholder="Current Address" rows={2} value={editFormData.groomAddress || ''} onChange={(e) => setEditFormData({ ...editFormData, groomAddress: e.target.value })} className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-sm" />
                  </div>
                </div>
              )}
              
              {['BIRTHDAY', 'ANNOPRASAN', 'UPANAYAN'].includes(order.eventType) && (
                <div className="space-y-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Event Subject</h4>
                  <input type="text" placeholder="Name of Child / Subject" value={editFormData.childName || ''} onChange={(e) => setEditFormData({ ...editFormData, childName: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black shadow-sm" />
                </div>
              )}
              
              {order.eventType === 'MODEL SHOOT' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Model Identity</label>
                    <input type="text" value={editFormData.modelName || ''} onChange={(e) => setEditFormData({ ...editFormData, modelName: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Makeup Professional</label>
                    <input type="text" value={editFormData.makeupArtist || ''} onChange={(e) => setEditFormData({ ...editFormData, makeupArtist: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black" />
                  </div>
                </div>
              )}
              
              <div className="pt-8 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-gray-900 tracking-tight">Musical Preferences & Links</h4>
                </div>
                <textarea
                  placeholder="Paste YouTube links, Spotify playlists, or name your favorite tracks here..."
                  rows={4}
                  value={editFormData.songSelection || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, songSelection: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-3xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-black resize-none shadow-inner"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button onClick={() => setIsEditingInfo(false)} className="px-6 py-2.5 font-bold text-gray-500 hover:text-black transition-colors">Discard</button>
                <button onClick={handleSaveInfo} className="px-8 py-2.5 bg-black text-white font-bold rounded-xl flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/20">
                  <Save className="w-4 h-4" /> Update Information
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {booking?.brideName || booking?.groomName ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 bg-pink-50/20 rounded-3xl border border-pink-50">
                    <p className="text-[10px] uppercase font-bold text-pink-400 tracking-widest mb-2">Bride</p>
                    <p className="text-lg font-bold text-gray-900">{booking?.brideName || '—'}</p>
                    {booking?.brideBengaliName && <p className="text-sm text-pink-600 font-medium">{booking.brideBengaliName}</p>}
                    <div className="mt-4 pt-4 border-t border-pink-50 text-[10px] space-y-1">
                      <p><span className="font-bold text-gray-400">Father:</span> <span className="text-gray-700">{booking.brideFatherName || 'N/A'}</span></p>
                    </div>
                  </div>
                  <div className="p-6 bg-blue-50/20 rounded-3xl border border-blue-50">
                    <p className="text-[10px] uppercase font-bold text-blue-400 tracking-widest mb-2">Groom</p>
                    <p className="text-lg font-bold text-gray-900">{booking?.groomName || '—'}</p>
                    {booking?.groomBengaliName && <p className="text-sm text-blue-600 font-medium">{booking.groomBengaliName}</p>}
                    <div className="mt-4 pt-4 border-t border-blue-50 text-[10px] space-y-1">
                      <p><span className="font-bold text-gray-400">Father:</span> <span className="text-gray-700">{booking.groomFatherName || 'N/A'}</span></p>
                    </div>
                  </div>
                </div>
              ) : null}
              
              {booking?.childName && (
                <div className="p-6 bg-gray-50 rounded-3xl">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Subject</p>
                  <p className="text-lg font-bold text-gray-900">{booking.childName}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest ml-1 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Event Requirements
                  </p>
                  <div className="space-y-3">
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-700 leading-relaxed italic">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">General</span>
                      "{booking?.requirement || 'No common requirements.'}"
                    </div>
                    {booking?.specialRequirement && (
                      <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 text-sm text-blue-900 leading-relaxed italic">
                        <span className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Special Request</span>
                        "{booking.specialRequirement}"
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest ml-1 flex items-center gap-2">
                    <Music className="w-3 h-3" /> Music Preferences
                  </p>
                  <div className="space-y-3">
                    {booking?.songSelection && (
                      <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-sm text-indigo-900 leading-relaxed whitespace-pre-wrap italic">
                        "{booking.songSelection}"
                      </div>
                    )}
                    {booking?.songLinks && booking.songLinks.length > 0 && (
                      <div className="grid grid-cols-1 gap-2">
                        {booking.songLinks.map((s: any, i: number) => (
                          <div key={i} className="p-3 bg-white border border-gray-100 rounded-xl flex items-center justify-between shadow-sm">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-bold uppercase">{s.title || 'Track'}</span>
                              <span className="text-xs font-medium truncate max-w-[150px]">{s.link || '—'}</span>
                            </div>
                            {s.link && (
                              <a href={s.link} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-gray-50 text-gray-400 hover:text-black rounded-lg transition-all">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {!booking?.songSelection && (!booking?.songLinks || booking.songLinks.length === 0) && (
                      <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-400 italic">
                        No music choices provided yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <IndianRupee className="w-24 h-24" />
        </div>
        <div className="relative z-10">
          <h3 className="text-lg font-bold mb-8 flex items-center gap-2 opacity-80">
            <Receipt className="w-5 h-5" /> Financial Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Contract</p>
              <p className="text-xl font-bold">₹{(order.totalAmount || 0).toLocaleString()}</p>
            </div>
            {order.discount > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest">Adjustment</p>
                <p className="text-xl font-bold text-blue-400">-₹{(order.discount || 0).toLocaleString()}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Final Bill</p>
              <p className="text-xl font-bold">₹{(order.finalAmount || order.totalAmount).toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-green-400 uppercase font-bold tracking-widest">Payment</p>
              <p className="text-xl font-bold text-green-400">₹{(order.paidAmount || 0).toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest">Balance</p>
              <p className="text-xl font-bold text-red-500">₹{((order.finalAmount || order.totalAmount) - (order.paidAmount || 0)).toLocaleString()}</p>
            </div>
          </div>
          <button 
            onClick={handleDownloadInvoice}
            className="mt-10 w-full flex items-center justify-center space-x-3 py-4 bg-white text-black rounded-2xl text-sm font-bold hover:bg-gray-100 transition-all hover:scale-[1.02] shadow-xl"
          >
            <Download className="w-5 h-5" />
            <span>Generate & Download Official Invoice</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight ml-1">Production Milestones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Teaser Edit', status: booking?.teaserStatus, link: booking?.teaserLink, color: 'blue' },
            { label: 'Full Length Film', status: booking?.fullVideoStatus, link: booking?.fullVideoLink, color: 'purple' },
            { label: 'Color Grading (Photo)', status: booking?.editPhotoStatus, link: booking?.photoEditLink, color: 'indigo' },
            { label: 'Digital Album', status: booking?.albumDesignStatus, link: booking?.albumLink, color: 'pink' },
          ].map((item) => (
            <div key={item.label} className="group p-5 bg-white border border-gray-100 rounded-3xl hover:shadow-xl hover:shadow-gray-200/50 transition-all flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-2xl ${item.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {item.status === 'done' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6 animate-pulse" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{item.label}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${item.status === 'done' ? 'text-green-600' : 'text-gray-400'}`}>
                    {item.status || 'In Queue'}
                  </p>
                </div>
              </div>
              {item.link ? (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl transition-all">
                  <ExternalLink className="w-5 h-5" />
                </a>
              ) : (
                <div className="p-3 text-gray-200">
                   <Clock className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFinancialsView = () => (
    <div className="space-y-8">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-black text-white p-6 rounded-2xl shadow-xl shadow-black/10">
          <p className="text-gray-400 text-xs font-bold uppercase mb-1">Total Project Value</p>
          <p className="text-2xl font-bold">₹{(order.totalAmount || 0).toLocaleString()}</p>
          {order.discount > 0 && (
            <p className="text-xs text-blue-400 font-bold mt-1">Discount: -₹{order.discount.toLocaleString()}</p>
          )}
          <p className="text-sm font-bold mt-2 pt-2 border-t border-white/10">Final: ₹{(order.finalAmount || order.totalAmount || 0).toLocaleString()}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
          <p className="text-green-600 text-xs font-bold uppercase mb-1">Total Received</p>
          <p className="text-2xl font-bold text-green-700">₹{totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
          <p className="text-red-600 text-xs font-bold uppercase mb-1">Total Cost Incurred</p>
          <p className="text-2xl font-bold text-red-700">₹{totalCost.toLocaleString()}</p>
        </div>
      </div>

      {/* Payments Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Payments Received</h3>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Date</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Method</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Amount</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.length > 0 ? payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {p.createdAt ? format(p.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">{p.paymentMethod}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{Number(p.amount).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">
                      {p.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm italic">No payments recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Costs Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Project Costs</h3>
          <button 
            onClick={() => setShowAddCost(true)}
            className="flex items-center space-x-2 text-sm font-bold text-black hover:text-gray-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Cost Record</span>
          </button>
        </div>
        <div className="space-y-3">
          {costs.length > 0 ? costs.map((c) => (
            <div key={c.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <Receipt className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{c.name || 'Cost Record'}</p>
                  <p className="text-xs text-gray-400">Invoice: {c.invoice}</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="font-bold text-red-600">
                    ₹{(
                      Number(c.travelExtra || 0) +
                      Number(c.caligraphy || 0) +
                      Number(c.weddingVideo || 0) +
                      Number(c.weddingTeaser || 0) +
                      Number(c.weddingPhoto || 0) +
                      Number(c.box || 0) +
                      Number(c.other || 0) +
                      Number(c.albumDesign || 0) +
                      Number(c.albumPrint || 0) +
                      Number(c.prePhoto || 0) +
                      Number(c.preVideo || 0) +
                      Number(c.lidGenerate || 0) +
                      Number(c.gift || 0) +
                      Number(c.pendrive || 0) +
                      Number(c.tvLedProjector || 0)
                    ).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Total Cost</p>
                </div>
                <button 
                  onClick={() => handleDeleteCost(c.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )) : (
            <div className="bg-gray-50 p-8 rounded-2xl border border-dashed border-gray-200 text-center">
              <p className="text-gray-400 text-sm italic">No cost records for this project.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Project Details</h2>
            <p className="text-xs text-gray-500 mt-1">Invoice: {order.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {role === 'admin' && (
          <div className="flex border-b border-gray-100 bg-white px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                activeTab === 'details' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Project Info
            </button>
            <button
              onClick={() => setActiveTab('financials')}
              className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                activeTab === 'financials' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Financials
            </button>
            <button
              onClick={() => setActiveTab('invoice')}
              className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                activeTab === 'invoice' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Invoice Preview
            </button>
          </div>
        )}

        <div className="flex-grow overflow-y-auto p-8">
          {activeTab === 'details' ? (
            <div className="space-y-8">
              {role === 'admin' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">On-Site Team Info</h3>
                    {renderPhotographerOtherView()}
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Post-Production Info</h3>
                    {renderEditorView()}
                  </div>
                </div>
              )}

              {role === 'admin' && (
                <div className="border-t pt-8">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Client View Preview</h3>
                  {renderClientView()}
                </div>
              )}

              {(role === 'photographer' || role === 'other') && renderPhotographerOtherView()}
              {role === 'editor' && renderEditorView()}
              {role === 'client' && renderClientView()}
            </div>
          ) : activeTab === 'financials' ? (
            renderFinancialsView()
          ) : (
            <div className="bg-gray-100 p-8 rounded-2xl">
              <div className="flex justify-end mb-4">
                <button 
                  onClick={handleDownloadInvoice}
                  className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
              <div className="shadow-2xl scale-90 origin-top">
                <Invoice 
                  data={{
                    invoiceNumber: order.invoiceNumber,
                    clientName: order.clientName,
                    clientMobile: order.mobileNumber,
                    clientEmail: booking?.clientEmail,
                    clientAddress: booking?.address,
                    date: order.date,
                    invoiceDate: booking?.createdAt,
                    paymentMethod: booking?.paymentMode || 'CASH',
                    eventType: order.eventType,
                    packageName: order.packageName,
                    totalAmount: order.totalAmount || order.finalAmount,
                    discount: order.discount || 0,
                    paidAmount: order.paidAmount || 0,
                    dueAmount: (order.finalAmount || order.totalAmount) - (order.paidAmount || 0),
                    location: order.location,
                    packageDetails: booking?.requirement ? [booking.requirement] : undefined,
                    items: booking?.extraCosts?.map((c: any) => ({ name: c.label, price: c.amount }))
                  }} 
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-xl bg-black text-white font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/20"
          >
            Close
          </button>
        </div>
      </div>

      {showAddCost && (
        <EventCostForm 
          onClose={() => setShowAddCost(false)} 
          user={user} 
          initialInvoice={order.invoiceNumber}
          initialName={order.clientName}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Cost Record"
        message="Are you sure you want to delete this cost record? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default ProjectDetailsModal;
