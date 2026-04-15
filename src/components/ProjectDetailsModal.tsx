import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { X, ExternalLink, Download, FileText, CheckCircle2, Clock, Eye, IndianRupee, Plus, Receipt, Trash2 } from 'lucide-react';
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch booking
        if (order.invoiceNumber) {
          const q = query(collection(db, 'bookings'), where('invoiceNumber', '==', order.invoiceNumber));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            setBooking({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
          }
        }

        // Fetch team members for names
        const teamQ = query(collection(db, 'users'), where('role', 'in', ['photographer', 'editor', 'other', 'admin']));
        const teamSnap = await getDocs(teamQ);
        setTeamMembers(teamSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Client Name</h4>
          <p className="text-sm font-medium text-gray-900">{order.clientName}</p>
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mobile Number</h4>
          <p className="text-sm font-medium text-gray-900">{order.mobileNumber}</p>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Address</h4>
        <p className="text-sm font-medium text-gray-900">{booking?.address || 'Not provided'}</p>
      </div>

      {booking?.eventType?.includes('WEDD') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="space-y-3">
            <h5 className="text-[10px] font-bold text-gray-500 uppercase">Bride Side</h5>
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Name</p>
              <p className="text-xs font-bold text-gray-900">{booking.brideName} {booking.brideBengaliName && `(${booking.brideBengaliName})`}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Father's Name</p>
              <p className="text-xs font-medium text-gray-900">{booking.brideFatherName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Mobile</p>
              <p className="text-xs font-medium text-gray-900">{booking.brideNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Address</p>
              <p className="text-xs font-medium text-gray-900">{booking.brideAddress || 'N/A'}</p>
            </div>
          </div>
          <div className="space-y-3">
            <h5 className="text-[10px] font-bold text-gray-500 uppercase">Groom Side</h5>
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Name</p>
              <p className="text-xs font-bold text-gray-900">{booking.groomName} {booking.groomBengaliName && `(${booking.groomBengaliName})`}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Father's Name</p>
              <p className="text-xs font-medium text-gray-900">{booking.groomFatherName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Mobile</p>
              <p className="text-xs font-medium text-gray-900">{booking.groomNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Address</p>
              <p className="text-xs font-medium text-gray-900">{booking.groomAddress || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Package</h4>
        <p className="text-sm font-medium text-gray-900">{order.packageName}</p>
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Special Requirements</h4>
        <p className="text-sm font-medium text-gray-900">{booking?.requirement || 'None'}</p>
      </div>
      {renderPackageDetails()}
      <div className="pt-4 border-t border-gray-100">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Assigned Team</h4>
        <div className="space-y-2">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">Photographers:</span>
            <p className="text-sm font-medium text-gray-900">{getMemberNames(order.photographerIds) || 'None assigned'}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">Editors:</span>
            <p className="text-sm font-medium text-gray-900">{getMemberNames(order.editorIds) || 'None assigned'}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">Others:</span>
            <p className="text-sm font-medium text-gray-900">{getMemberNames(order.otherIds) || 'None assigned'}</p>
          </div>
        </div>
      </div>
      {booking?.discountRequest && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Discount Request</h4>
          <p className="text-xs text-blue-800 italic">"{booking.discountRequest}"</p>
        </div>
      )}
    </div>
  );

  const renderEditorView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Client Name</h4>
          <p className="text-sm font-medium text-gray-900">{order.clientName}</p>
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bengali Name</h4>
          <p className="text-sm font-medium text-gray-900">
            {booking?.brideBengaliName && `Bride: ${booking.brideBengaliName}`}
            {booking?.brideBengaliName && booking?.groomBengaliName && ' | '}
            {booking?.groomBengaliName && `Groom: ${booking.groomBengaliName}`}
            {!(booking?.brideBengaliName || booking?.groomBengaliName) && 'Not provided'}
          </p>
        </div>
      </div>

      {booking?.eventType?.includes('WEDD') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Bride Father</p>
            <p className="text-xs text-gray-900">{booking.brideFatherName || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Groom Father</p>
            <p className="text-xs text-gray-900">{booking.groomFatherName || 'N/A'}</p>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Raw File Link</h4>
        {booking?.rawFileLink ? (
          <a href={booking.rawFileLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center space-x-1">
            <span>View Files</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <p className="text-sm text-gray-500 italic">No link provided</p>
        )}
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Selected Songs</h4>
        <div className="text-sm space-y-1">
          <p><span className="font-bold">Wedding:</span> {booking?.ourWeddingSong || 'N/A'}</p>
          <p><span className="font-bold">Event:</span> {booking?.eventSong || 'N/A'}</p>
          <p><span className="font-bold">Reels:</span> {booking?.reelsSong || 'N/A'}</p>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Special Requirements</h4>
        <p className="text-sm font-medium text-gray-900">{booking?.requirement || 'None'}</p>
      </div>
      {renderPackageDetails()}
      <div className="pt-4 border-t border-gray-100">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Assigned Team</h4>
        <div className="space-y-2">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">Photographers:</span>
            <p className="text-sm font-medium text-gray-900">{getMemberNames(order.photographerIds) || 'None assigned'}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">Editors:</span>
            <p className="text-sm font-medium text-gray-900">{getMemberNames(order.editorIds) || 'None assigned'}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">Others:</span>
            <p className="text-sm font-medium text-gray-900">{getMemberNames(order.otherIds) || 'None assigned'}</p>
          </div>
        </div>
      </div>
      {booking?.discountRequest && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Discount Request</h4>
          <p className="text-xs text-blue-800 italic">"{booking.discountRequest}"</p>
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
    <div className="space-y-8">
      {renderPackageDetails()}
      <div className="bg-gray-50 p-4 rounded-xl">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Payment Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Total</p>
            <p className="text-lg font-bold text-gray-900">₹{(order.totalAmount || 0).toLocaleString()}</p>
          </div>
          {order.discount > 0 && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Discount</p>
              <p className="text-lg font-bold text-blue-600">-₹{(order.discount || 0).toLocaleString()}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Final Bill</p>
            <p className="text-lg font-bold text-gray-900">₹{(order.finalAmount || order.totalAmount).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Paid</p>
            <p className="text-lg font-bold text-green-600">₹{(order.paidAmount || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Due</p>
            <p className="text-lg font-bold text-red-600">₹{((order.finalAmount || order.totalAmount) - (order.paidAmount || 0)).toLocaleString()}</p>
          </div>
        </div>
        <button 
          onClick={handleDownloadInvoice}
          className="mt-4 w-full flex items-center justify-center space-x-2 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download Invoice</span>
        </button>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-4">Work in Progress</h3>
        <div className="space-y-4">
          {[
            { label: 'Teaser', status: booking?.teaserStatus, link: booking?.teaserLink },
            { label: 'Full Video', status: booking?.fullVideoStatus, link: booking?.fullVideoLink },
            { label: 'Photo Edit', status: booking?.editPhotoStatus, link: booking?.photoEditLink },
            { label: 'Album Design', status: booking?.albumDesignStatus, link: booking?.albumLink },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
              <div className="flex items-center space-x-3">
                {item.status === 'done' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Clock className="w-5 h-5 text-yellow-500" />
                )}
                <div>
                  <p className="text-sm font-bold text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500 capitalize">{item.status || 'Pending'}</p>
                </div>
              </div>
              {item.link && (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
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
