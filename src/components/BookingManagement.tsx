import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, addDoc, where, getDocs, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Plus, Search, Filter, MoreVertical, Trash2, Edit2, ExternalLink, CheckCircle2, Clock, AlertCircle, TrendingUp, IndianRupee, Calendar as CalendarIcon, PieChart, Image as ImageIcon, ScanFace } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import BookingForm from './BookingForm';
import ConfirmModal from './ConfirmModal';

interface BookingManagementProps {
  user: User;
  role: string | null;
}

const BookingManagement: React.FC<BookingManagementProps> = ({ user, role }) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState<'bookings' | 'requests'>('bookings');
  const [requestFinalAmounts, setRequestFinalAmounts] = useState<Record<string, number>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleAcceptRequest = async (booking: any) => {
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const finalAmount = requestFinalAmounts[booking.id] || booking.finalAmount || booking.totalPackageAmount;
    const discount = booking.totalPackageAmount - finalAmount;
    
    try {
      const batch = writeBatch(db);
      
      const bookingRef = doc(db, 'bookings', booking.id);
      batch.update(bookingRef, {
        adminStatus: 'accepted',
        invoiceNumber,
        finalAmount,
        discount,
        status: 'pending', // Main status
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      });
      
      // Also create an order in the orders collection for the main order management
      const orderRef = doc(collection(db, 'orders'));
      batch.set(orderRef, {
        clientId: booking.clientId,
        clientName: booking.clientName,
        mobileNumber: booking.clientMobile,
        invoiceNumber,
        status: 'pending',
        date: booking.eventDate,
        location: booking.eventPlace,
        packageName: booking.package === 'Customize' ? booking.requirement : booking.package,
        totalAmount: booking.totalPackageAmount,
        discount,
        finalAmount,
        paidAmount: 0,
        dueAmount: finalAmount,
        eventType: booking.eventType,
        createdAt: new Date().toISOString(),
        bookingId: booking.id
      });

      // Notify the client
      if (booking.clientId) {
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, {
          userId: booking.clientId,
          title: 'Order Accepted',
          message: `Your order request has been accepted! Invoice: ${invoiceNumber}. Final Bill: ₹${finalAmount.toLocaleString()}`,
          type: 'success',
          link: '/orders',
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }

      await batch.commit();
      toast.success(`Request accepted! Invoice ${invoiceNumber} generated.`);
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      await updateDoc(doc(db, 'bookings', id), {
        adminStatus: 'rejected',
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      });
      toast.success('Request rejected');
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  useEffect(() => {
    let q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    
    // If team member, we need to fetch all where they are assigned
    // Note: Firestore doesn't support OR across multiple fields easily with onSnapshot without multiple queries
    // For simplicity, we'll fetch all and filter client-side if not admin
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let bookingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      if (role !== 'admin') {
        bookingsData = bookingsData.filter(b => 
          b.photographerId === user.uid || 
          b.editorId === user.uid || 
          b.otherId === user.uid
        );
      }
      
      setBookings(bookingsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'bookings', itemToDelete));
      toast.success('Information deleted successfully');
    } catch (error) {
      toast.error('Failed to delete information');
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const updateWorkStatus = async (id: string, field: string, status: string) => {
    try {
      await updateDoc(doc(db, 'bookings', id), { [field]: status });
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         b.eventType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || b.eventType === filterType;
    const matchesTab = activeTab === 'bookings' 
      ? (b.adminStatus === 'accepted' || !b.adminStatus) 
      : b.adminStatus === 'requested';
    return matchesSearch && matchesFilter && matchesTab;
  });

  // Analytics
  const totalRevenue = role === 'admin' 
    ? bookings.reduce((sum, b) => sum + (b.totalPackageAmount || 0), 0)
    : bookings.reduce((sum, b) => {
        if (b.photographerId === user.uid) return sum + (b.photographerPrice || 0);
        if (b.editorId === user.uid) return sum + (b.videographerPrice || 0);
        if (b.otherId === user.uid) return sum + (b.otherServicePrice || 0);
        return sum;
      }, 0);

  const totalDue = role === 'admin'
    ? bookings.reduce((sum, b) => sum + (b.dueAmount || 0), 0)
    : bookings.reduce((sum, b) => {
        let earned = 0;
        let paid = false;
        if (b.photographerId === user.uid) { earned = b.photographerPrice || 0; paid = b.photographerPaid; }
        else if (b.editorId === user.uid) { earned = b.videographerPrice || 0; paid = b.editorPaid; }
        else if (b.otherId === user.uid) { earned = b.otherServicePrice || 0; paid = b.otherPaid; }
        return sum + (paid ? 0 : earned);
      }, 0);
  const eventTypeStats = bookings.reduce((acc: any, b) => {
    acc[b.eventType] = (acc[b.eventType] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Information</h1>
          <p className="text-gray-500 mt-1">Detailed client tracking and data analysis.</p>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            to="/find-my-photos"
            className="bg-white text-black border border-gray-200 px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-gray-50 transition-all shadow-sm"
          >
            <ScanFace className="w-5 h-5" />
            <span>Face Recognition</span>
          </Link>
          {(role === 'admin' || role === 'photographer' || role === 'editor') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/20"
            >
              <Plus className="w-5 h-5" />
              <span>Add Information</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {role === 'admin' && (
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'bookings' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Bookings
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'requests' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Requests
            {bookings.filter(b => b.adminStatus === 'requested').length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {bookings.filter(b => b.adminStatus === 'requested').length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{role === 'admin' ? 'Total Revenue' : 'Total Earnings'}</span>
            <IndianRupee className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{role === 'admin' ? 'Pending Dues' : 'My Dues'}</span>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">₹{totalDue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{role === 'admin' ? 'Total Clients' : 'My Projects'}</span>
            <CalendarIcon className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Top Event</span>
            <PieChart className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {Object.entries(eventTypeStats).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 flex-grow">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by client or event..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm"
              />
            </div>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium outline-none"
            >
              <option value="all">All Events</option>
              <option value="WEDD BRIDESIDE">Wedding (Bride)</option>
              <option value="WEDD GROOM">Wedding (Groom)</option>
              <option value="BIRTHDAY">Birthday</option>
              <option value="MODEL SHOOT">Model Shoot</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Client & Event</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Package & Cost</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{role === 'admin' ? 'Client Payment' : 'My Payment'}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Work Progress</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">{booking.clientName}</span>
                      <span className="text-xs text-gray-500">{booking.eventType} • {format(new Date(booking.eventDate), 'MMM d, yyyy')}</span>
                      <span className="text-xs text-gray-400 mt-1">{booking.eventPlace}</span>
                      {booking.invoiceNumber && (
                        <span className="text-[10px] text-blue-600 font-bold mt-1">INV: {booking.invoiceNumber}</span>
                      )}
                      {booking.discountRequest && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-[10px] text-blue-700 border border-blue-100">
                          <span className="font-bold">Discount Request:</span> {booking.discountRequest}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">{booking.package}</span>
                      <span className="text-xs text-gray-500">Total: ₹{booking.totalPackageAmount}</span>
                      {booking.discount > 0 && (
                        <span className="text-xs text-blue-600 font-bold">Discount: -₹{booking.discount}</span>
                      )}
                      {booking.finalAmount && booking.finalAmount !== booking.totalPackageAmount && (
                        <span className="text-xs text-green-600 font-bold">Final: ₹{booking.finalAmount}</span>
                      )}
                      <span className={`text-xs font-bold ${booking.dueAmount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        Due: ₹{booking.dueAmount}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {activeTab === 'requests' ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Final Amount</label>
                          <input
                            type="number"
                            placeholder="Final Amount"
                            value={requestFinalAmounts[booking.id] ?? (booking.finalAmount || booking.totalPackageAmount)}
                            onChange={(e) => setRequestFinalAmounts(prev => ({ ...prev, [booking.id]: Number(e.target.value) }))}
                            className="text-xs border border-gray-200 rounded px-2 py-1 w-24 font-bold text-green-600"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptRequest(booking)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-green-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(booking.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      role === 'admin' ? (
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          booking.dueAmount <= 0 ? 'bg-green-100 text-green-700' : 
                          (booking.paidAmount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700')
                        }`}>
                          {booking.dueAmount <= 0 ? 'Fully Paid' : (booking.paidAmount > 0 ? 'Partially Paid' : 'Unpaid')}
                        </span>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          (booking.photographerId === user.uid && booking.photographerPaid) ||
                          (booking.editorId === user.uid && booking.editorPaid) ||
                          (booking.otherId === user.uid && booking.otherPaid)
                          ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {(booking.photographerId === user.uid && booking.photographerPaid) ||
                          (booking.editorId === user.uid && booking.editorPaid) ||
                          (booking.otherId === user.uid && booking.otherPaid)
                          ? 'Received' : 'Due'}
                        </span>
                      )
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <StatusBadge label="Teaser" field="teaserStatus" value={booking.teaserStatus} onUpdate={(s) => updateWorkStatus(booking.id, 'teaserStatus', s)} />
                      <StatusBadge label="Full Video" field="fullVideoStatus" value={booking.fullVideoStatus} onUpdate={(s) => updateWorkStatus(booking.id, 'fullVideoStatus', s)} />
                      <StatusBadge label="Album" field="albumDesignStatus" value={booking.albumDesignStatus} onUpdate={(s) => updateWorkStatus(booking.id, 'albumDesignStatus', s)} />
                      <StatusBadge label="Reels" field="reelsStatus" value={booking.reelsStatus} onUpdate={(s) => updateWorkStatus(booking.id, 'reelsStatus', s)} />
                      <StatusBadge label="Edit Photo" field="editPhotoStatus" value={booking.editPhotoStatus} onUpdate={(s) => updateWorkStatus(booking.id, 'editPhotoStatus', s)} />
                      <StatusBadge label="E-Invite" field="eInviteStatus" value={booking.eInviteStatus} onUpdate={(s) => updateWorkStatus(booking.id, 'eInviteStatus', s)} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {booking.outputLink && (
                        <a href={booking.outputLink} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      )}
                      {booking.faceRecognitionPhotos && booking.faceRecognitionPhotos.length > 0 && (
                        <div className="p-2 text-purple-600 bg-purple-50 rounded-lg" title={`${booking.faceRecognitionPhotos.length} Face Recognition Photos`}>
                          <ScanFace className="w-5 h-5" />
                        </div>
                      )}
                      {booking.googleDriveFolderId && (
                        <div className="p-2 text-green-600 bg-green-50 rounded-lg" title="Drive ID present">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                      <button onClick={() => handleDelete(booking.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <BookingForm user={user} role={role} onClose={() => setShowAddModal(false)} />
      )}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Booking"
        message="Are you sure you want to delete this booking? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

const StatusBadge = ({ label, value, onUpdate }: any) => {
  const colors: any = {
    'delivered': 'bg-green-100 text-green-700',
    'review': 'bg-yellow-100 text-yellow-700',
    'pending': 'bg-gray-100 text-gray-700'
  };

  return (
    <div className="flex items-center justify-between space-x-2">
      <span className="text-[10px] font-bold text-gray-400 uppercase">{label}:</span>
      <select 
        value={value} 
        onChange={(e) => onUpdate(e.target.value)}
        className={`text-[10px] font-bold px-2 py-0.5 rounded-full outline-none cursor-pointer ${colors[value] || colors['pending']}`}
      >
        <option value="pending">Pending</option>
        <option value="review">Review</option>
        <option value="delivered">Delivered</option>
      </select>
    </div>
  );
};

export default BookingManagement;
