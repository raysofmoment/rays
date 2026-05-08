import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy, onSnapshot, writeBatch, or } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { notifyAdmins, notifyUser } from '../services/notificationService';
import { Calendar, Plus, Search, Filter, MoreVertical, Trash2, Edit2, CreditCard, Image as ImageIcon, User as UserIcon, Eye, Bell, ShoppingCart, Download, X, Camera, Share2 } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import CRMModal from './CRMModal';
import BookingForm from './BookingForm';
import { useCart } from '../context/CartContext';
import { exportToExcel } from '../utils/excelExport';

const stripePublishableKey = ((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim();
if (stripePublishableKey && !stripePublishableKey.startsWith('pk_')) {
  console.warn('[Stripe] Warning: VITE_STRIPE_PUBLISHABLE_KEY does not appear to be a valid Stripe publishable key.');
}
const stripePromise = loadStripe(stripePublishableKey);

import { getFormattedOrderName } from '../utils/orderFormatting';

import ConfirmModal from './ConfirmModal';

interface OrderManagementProps {
  user: User;
  role: string | null;
}

import ProjectDetailsModal from './ProjectDetailsModal';
import EventCostForm from './EventCostForm';

const OrderManagement: React.FC<OrderManagementProps> = ({ user, role }) => {
  const { cart, clearCart, totalAmount } = useCart();
  
  const handleWhatsAppShare = (order: any) => {
    if (!order.mobileNumber && !order.clientMobile) {
      toast.error('No mobile number available for this client');
      return;
    }
    const baseUrl = window.location.origin;
    const items = [
      `Hi *${order.clientName}*, here are your project links from Rays of Moment:`,
      '',
      `🧾 *Invoice*: ${baseUrl}/invoice/${order.bookingId || order.id}`,
      `💰 *Total Amount*: ₹${(order.finalAmount || order.totalAmount).toLocaleString()}`,
      `💳 *Payment Link*: ${baseUrl}/orders`,
      `🖼️ *Photo Selection Link*: ${baseUrl}/photo-selection/${order.bookingId || order.id}`,
      `🔍 *Find My Photos*: ${baseUrl}/find-my-photos`
    ];
    
    let phoneStr = order.mobileNumber || order.clientMobile;
    phoneStr = phoneStr.replace(/\D/g, ''); // remove non-digits
    if (phoneStr.length === 10) {
      phoneStr = '91' + phoneStr;
    }
    const message = encodeURIComponent(items.join('\n'));
    window.open(`https://api.whatsapp.com/send?phone=${phoneStr}&text=${message}`, '_blank');
  };

  const [orders, setOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleDelete = (orderId: string) => {
    setItemToDelete(orderId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const order = orders.find(o => o.id === itemToDelete) || requests.find(r => r.id === itemToDelete);
      const batch = writeBatch(db);
      
      batch.delete(doc(db, 'orders', itemToDelete));
      
      if (order?.bookingId) {
        batch.delete(doc(db, 'bookings', order.bookingId));
      } else {
        // If it's a request, itemToDelete is the booking ID
        batch.delete(doc(db, 'bookings', itemToDelete));
      }
      
      // Delete associated payments
      const paymentsQuery = query(collection(db, 'payments'), where('orderId', '==', itemToDelete));
      const paymentsSnap = await getDocs(paymentsQuery);
      paymentsSnap.forEach(p => {
        batch.delete(doc(db, 'payments', p.id));
      });
      
      await batch.commit();
      toast.success('Deleted successfully');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete. Please check console.');
      handleFirestoreError(error, OperationType.DELETE, `orders/${itemToDelete}`);
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [requestFinalAmounts, setRequestFinalAmounts] = useState<Record<string, number>>({});
  const [newOrder, setNewOrder] = useState({
    packageName: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    location: '',
    totalAmount: 0,
    clientName: user.displayName || '',
    mobileNumber: '',
    clientEmail: '',
  });

  useEffect(() => {
    // Fetch team members for assignment
    if (role === 'admin') {
      const q = query(collection(db, 'users'), where('role', 'in', ['photographer', 'editor', 'other']));
      getDocs(q).then(snapshot => {
        setTeamMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    let ordersQuery;
    if (role === 'admin') {
      ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    } else if (role === 'photographer') {
      ordersQuery = query(collection(db, 'orders'), where('photographerIds', 'array-contains', user.uid), orderBy('createdAt', 'desc'));
    } else if (role === 'editor') {
      ordersQuery = query(collection(db, 'orders'), where('editorIds', 'array-contains', user.uid), orderBy('createdAt', 'desc'));
    } else if (role === 'other') {
      ordersQuery = query(collection(db, 'orders'), where('otherIds', 'array-contains', user.uid), orderBy('createdAt', 'desc'));
    } else {
      const conditions: any[] = [where('clientId', '==', user.uid)];
      if (user.phoneNumber) conditions.push(where('mobileNumber', '==', user.phoneNumber.replace('+91', '')));
      if (user.email) conditions.push(where('clientEmail', '==', user.email));
      ordersQuery = query(collection(db, 'orders'), or(...conditions));
    }

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      let ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      if (role === 'client') {
        ordersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      setOrders(ordersData);
      setLoading(false);

      // Check for pending projects for 1 month (Admin only)
      if (role === 'admin') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const pendingOldOrders = ordersData.filter(o => 
          o.status === 'pending' && 
          new Date(o.createdAt) < oneMonthAgo
        );

        if (pendingOldOrders.length > 0) {
          toast.warning(`${pendingOldOrders.length} projects have been pending for over a month!`, {
            duration: 5000,
          });
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    let requestsUnsubscribe = () => {};
    if (role === 'client') {
      const conditions: any[] = [where('clientId', '==', user.uid)];
      if (user.phoneNumber) conditions.push(where('clientMobile', '==', user.phoneNumber.replace('+91', '')));
      if (user.email) conditions.push(where('clientEmail', '==', user.email));
      const requestsQuery = query(collection(db, 'bookings'), or(...conditions));
      requestsUnsubscribe = onSnapshot(requestsQuery, (snapshot) => {
        let reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any })).filter(r => r.adminStatus === 'requested');
        reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRequests(reqs);
      });
    } else if (role === 'admin') {
      const requestsQuery = query(collection(db, 'bookings'), where('adminStatus', '==', 'requested'));
      requestsUnsubscribe = onSnapshot(requestsQuery, (snapshot) => {
        setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any })));
      });
    }

    return () => {
      unsubscribe();
      requestsUnsubscribe();
    };
  }, [user, role]);

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
        status: 'pending',
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      });
      
      const orderRef = doc(collection(db, 'orders'));
      batch.set(orderRef, {
        clientId: booking.clientId,
        clientName: booking.clientName,
        mobileNumber: booking.clientMobile,
        invoiceNumber,
        status: 'pending',
        date: booking.eventDate,
        location: booking.eventPlace,
        packageName: booking.package === 'Customize' ? booking.requirement : booking.package.split(' (')[0],
        totalAmount: booking.totalPackageAmount,
        discount,
        finalAmount: finalAmount,
        paidAmount: 0,
        dueAmount: finalAmount,
        eventType: booking.eventType,
        createdAt: new Date().toISOString(),
        bookingId: booking.id
      });

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
      handleWhatsAppShare({ ...booking, invoiceNumber, finalAmount });
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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      
      // If we have a cart, we might want to create multiple orders or one combined order
      // For simplicity, let's create one order with all items if cart is not empty
      const packageName = cart.length > 0 
        ? cart.map(item => item.name.split(' (')[0]).join(', ') 
        : newOrder.packageName;
      
      const finalAmount = cart.length > 0 ? totalAmount : newOrder.totalAmount;

      const orderData: any = {
        ...newOrder,
        packageName,
        totalAmount: finalAmount,
        status: 'pending',
        paidAmount: 0,
        createdAt: new Date().toISOString(),
        invoiceNumber,
      };
      
      // If client places order, bind their user id. Else bind strictly null or matching client fields.
      if (role === 'client') {
         orderData.clientId = user.uid;
      } else {
         orderData.clientId = null;
      }
      
      await addDoc(collection(db, 'orders'), orderData);

      if (cart.length > 0) {
        clearCart();
      }

      // Add notification for the user (only if client is creating)
      if (role === 'client') {
        await notifyUser(
          user.uid,
          'Order Placed!',
          `Your booking for ${newOrder.packageName} has been received. Invoice: ${invoiceNumber}. We will review it soon.`,
          'info',
          '/orders'
        );
      }

      // Notify admins
      await notifyAdmins(
        'New Order Received',
        `${orderData.clientName} placed a new order for ${orderData.packageName}. Invoice: ${invoiceNumber}`,
        'info',
        '/orders'
      );

      toast.success('Order created successfully! Your invoice number is ' + invoiceNumber);
      setShowAddModal(false);
      
      if (role === 'admin') {
        handleWhatsAppShare(orderData);
      }
      
      setNewOrder({
        packageName: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        location: '',
        totalAmount: 0,
        clientName: user.displayName || '',
        mobileNumber: '',
        clientEmail: '',
      });
    } catch (error) {
      toast.error('Failed to create order');
    }
  };

  const handlePayment = async (order: any) => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.totalAmount,
          clientName: order.clientName,
          invoiceNumber: order.invoiceNumber,
        }),
      });
      const session = await response.json();
      const stripe = await stripePromise;
      if (stripe) {
        await (stripe as any).redirectToCheckout({ sessionId: session.id });
      }
    } catch (error) {
      toast.error('Payment failed to initialize');
    }
  };

  const handleToggleAssignment = async (order: any, memberId: string, type: 'photographer' | 'editor' | 'other') => {
    try {
      const field = `${type}Ids`;
      const currentIds = order[field] || [];
      let newIds: string[];
      
      if (currentIds.includes(memberId)) {
        newIds = currentIds.filter((id: string) => id !== memberId);
      } else {
        newIds = [...currentIds, memberId];
      }

      const updates: any = { 
        [field]: newIds,
        // For backwards compatibility, keep the first one in the singular field
        [`${type}Id`]: newIds.length > 0 ? newIds[0] : '',
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      };
      
      await updateDoc(doc(db, 'orders', order.id), updates);
      
      // Update staff payments if added
      if (!currentIds.includes(memberId)) {
        const currentStaffPayments = order.staffPayments || {};
        if (!currentStaffPayments[memberId]) {
          const staffPayments = {
            ...currentStaffPayments,
            [memberId]: { totalFee: 0, paidAmount: 0, payments: [] }
          };
          updates.staffPayments = staffPayments;
          await updateDoc(doc(db, 'orders', order.id), { staffPayments });
        }
      } else {
        // If removed, optionally keep or remove payment record? 
        // User might want to keep it if they paid already. 
        // For now let's keep it to avoid data loss.
      }
      
      // Also update the corresponding booking if it exists
      if (order.bookingId) {
        await updateDoc(doc(db, 'bookings', order.bookingId), updates);
      }
      
      // Send email if newly assigned
      if (!currentIds.includes(memberId)) {
        const assignedMember = teamMembers.find(m => m.uid === memberId || m.id === memberId);
        if (assignedMember?.email) {
            import('../utils/emailHelper').then(({ sendEmail }) => {
                sendEmail({
                    to: assignedMember.email,
                    subject: `New Assignment: Invoice ${order.invoiceNumber}`,
                    text: `Hi ${assignedMember.displayName || assignedMember.name || 'Team Member'},\n\nYou have been newly assigned to an order (Invoice: ${order.invoiceNumber}) for client ${order.clientName}.\nPlease log in to your dashboard to check details about the event at ${order.location} on ${order.date}.\n\nBest regards,\nThe Rays of Moment Team`
                });
            });
        }
      }
      
      toast.success('Assignment updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
      toast.error('Failed to update assignment');
    }
  };

  const handleUpdateStaffFee = async (order: any, memberId: string, fee: number) => {
    try {
      const currentStaffPayments = order.staffPayments || {};
      const staffData = currentStaffPayments[memberId] || { totalFee: 0, paidAmount: 0, payments: [] };
      
      const newStaffPayments = {
        ...currentStaffPayments,
        [memberId]: {
          ...staffData,
          totalFee: fee
        }
      };

      const updates = { staffPayments: newStaffPayments };
      await updateDoc(doc(db, 'orders', order.id), updates);
      if (order.bookingId) {
        await updateDoc(doc(db, 'bookings', order.bookingId), updates);
      }
      toast.success('Fee updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
      toast.error('Failed to update fee');
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      // Generate invoice number if not exists when confirmed
      const order = orders.find(o => o.id === orderId);
      let invoiceNumber = order.invoiceNumber;
      if (newStatus === 'confirmed' && !invoiceNumber) {
        invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
        updates.invoiceNumber = invoiceNumber;
      }
      await updateDoc(doc(db, 'orders', orderId), updates);
      
      // Send notification if confirmed
      if (newStatus === 'confirmed') {
        await addDoc(collection(db, 'notifications'), {
          userId: order.clientId,
          title: 'Order Confirmed!',
          message: `Your order for ${order.packageName} has been confirmed. Your invoice number is ${invoiceNumber || updates.invoiceNumber}. You can now proceed to payment.`,
          type: 'success',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }

      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-500 mt-1">Manage your bookings and track project status.</p>
        </div>
        <div className="flex space-x-4">
          {role === 'admin' && (
            <button
              onClick={() => {
                const exportData = orders.map(o => ({
                  'Invoice Number': o.invoiceNumber || '-',
                  'Client Name': o.clientName,
                  'Mobile': o.mobileNumber,
                  'Package': getFormattedOrderName(o),
                  'Date': o.date && isValid(new Date(o.date)) ? format(new Date(o.date), 'yyyy-MM-dd') : '-',
                  'Location': o.location || '-',
                  'Status': o.status,
                  'Total Amount': o.totalAmount,
                  'Final Amount': o.finalAmount || o.totalAmount,
                  'Paid Amount': o.paidAmount || 0,
                  'Due Amount': (o.finalAmount || o.totalAmount) - (o.paidAmount || 0),
                  'Created At': o.createdAt ? format(new Date(o.createdAt), 'yyyy-MM-dd') : '-'
                }));
                exportToExcel(exportData, 'Orders_List');
              }}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:bg-purple-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>Export Excel</span>
            </button>
          )}
          {role === 'client' && (
            <>
              {cart.length > 0 && (
                <button
                  onClick={() => {
                    setNewOrder({
                      ...newOrder,
                      packageName: cart.map(item => item.name).join(', '),
                      totalAmount: totalAmount
                    });
                    setShowAddModal(true);
                  }}
                  className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:bg-green-700 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Checkout Cart (₹{totalAmount.toLocaleString()})</span>
                </button>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-black text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Book a Session</span>
              </button>
            </>
          )}
        </div>
      </div>

      {(role === 'client' || role === 'admin') && requests.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            {role === 'admin' ? 'New Order Requests' : 'My Pending Requests'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((req) => (
              <div key={req.id} className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110" />
                <div className="relative">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{req.eventType}</h3>
                      <p className="text-xs text-gray-500">
                        {req.eventDate && isValid(new Date(req.eventDate)) ? format(new Date(req.eventDate), 'MMM d, yyyy') : 'No Date'}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase">
                      Requested
                    </span>
                  </div>
                  <div className="space-y-2 mb-4">
                    {role === 'admin' && (
                      <p className="text-sm font-bold text-black mb-1">Client: {req.clientName}</p>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-2">{req.requirement}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900">Package: ₹{req.totalPackageAmount.toLocaleString()}</p>
                      {role === 'admin' && (
                        <div className="flex flex-col items-end">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Final Amount</label>
                          <input 
                            type="number" 
                            placeholder="Final ₹"
                            value={requestFinalAmounts[req.id] ?? (req.finalAmount || req.totalPackageAmount)}
                            onChange={(e) => setRequestFinalAmounts(prev => ({ ...prev, [req.id]: Number(e.target.value) }))}
                            className="w-24 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:border-black outline-none font-bold text-green-600"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  {req.discountRequest && (
                    <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 italic mb-4">
                      " {req.discountRequest} "
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-[10px] text-gray-400">
                      Submitted on {req.createdAt && isValid(new Date(req.createdAt)) ? format(new Date(req.createdAt), 'MMM d, h:mm a') : 'N/A'}
                    </p>
                    {role === 'admin' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAcceptRequest(req)}
                          className="px-3 py-1 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Reject
                        </button>
                        <button 
                          onClick={() => handleDelete(req.id)}
                          className="px-2 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Project Orders</h3>
          {role === 'admin' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-gray-400 uppercase">Total Revenue:</span>
              <span className="text-lg font-bold text-green-600">₹{orders.reduce((sum, o) => sum + (o.finalAmount || o.totalAmount || 0), 0).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order Details</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Client Info</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                {(role === 'admin' || role === 'client') && (
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment</th>
                )}
                {role === 'admin' && (
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Assignments</th>
                )}
                {(role === 'admin' || role === 'client') && (
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                )}
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDetailsModal(true);
                      }}
                      className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors text-left capitalize"
                    >
                      {getFormattedOrderName(order)}
                    </button>
                    <p className="text-xs text-gray-500">{order.location}</p>
                    <p className="text-xs text-gray-400">
                      {order.date && isValid(new Date(order.date)) ? format(new Date(order.date), 'MMM d, yyyy') : 'No Date'}
                    </p>
                    {order.invoiceNumber && (
                      <p className="text-[10px] text-blue-600 font-bold mt-1">INV: {order.invoiceNumber}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium">{order.clientName}</div>
                    <div className="text-xs text-gray-500">{order.mobileNumber}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  {(role === 'admin' || role === 'client') && (
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      (order.totalAmount - (order.paidAmount || 0)) <= 0 ? 'bg-green-100 text-green-700' : 
                      ((order.paidAmount || 0) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700')
                    }`}>
                      {(order.totalAmount - (order.paidAmount || 0)) <= 0 ? 'Paid' : ((order.paidAmount || 0) > 0 ? 'Partial' : 'Unpaid')}
                    </span>
                  </td>
                  )}
                  {role === 'admin' && (
                    <td className="px-6 py-4">
                      <div className="space-y-4 min-w-[200px]">
                        {/* Photographer Assignment */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Camera className="w-3 h-3" /> Photographers
                          </p>
                          <div className="flex flex-col gap-2 mb-2">
                            {(order.photographerIds || []).map((id: string) => {
                              const member = teamMembers.find(m => m.uid === id);
                              const fee = order.staffPayments?.[id]?.totalFee || 0;
                              return (
                                <div key={id} className="flex flex-col gap-1 p-2 bg-blue-50 rounded-lg border border-blue-100">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-blue-700 truncate mr-1">
                                      {member?.displayName || member?.email?.split('@')[0]}
                                    </span>
                                    <button onClick={() => handleToggleAssignment(order, id, 'photographer')} className="text-red-400 hover:text-red-600">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[8px] font-bold text-blue-400 uppercase">Fee:</span>
                                    <input 
                                      type="number"
                                      defaultValue={fee}
                                      onBlur={(e) => handleUpdateStaffFee(order, id, Number(e.target.value))}
                                      placeholder="₹"
                                      className="w-16 px-1 py-0.5 text-[9px] font-bold border border-blue-100 rounded bg-white outline-none focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) handleToggleAssignment(order, e.target.value, 'photographer');
                            }}
                            className="text-[10px] border border-gray-200 rounded-lg p-1.5 w-full bg-white font-bold focus:border-black outline-none transition-all"
                          >
                            <option value="">Add Photographer</option>
                            {teamMembers.filter(m => (m.role === 'photographer' || m.role === 'admin') && !(order.photographerIds || []).includes(m.uid)).map(m => (
                              <option key={m.uid} value={m.uid}>{m.displayName || m.email}</option>
                            ))}
                          </select>
                        </div>

                        {/* Editor Assignment */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Edit2 className="w-3 h-3" /> Editors
                          </p>
                          <div className="flex flex-col gap-2 mb-2">
                            {(order.editorIds || []).map((id: string) => {
                              const member = teamMembers.find(m => m.uid === id);
                              const fee = order.staffPayments?.[id]?.totalFee || 0;
                              return (
                                <div key={id} className="flex flex-col gap-1 p-2 bg-purple-50 rounded-lg border border-purple-100">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-purple-700 truncate mr-1">
                                      {member?.displayName || member?.email?.split('@')[0]}
                                    </span>
                                    <button onClick={() => handleToggleAssignment(order, id, 'editor')} className="text-red-400 hover:text-red-600">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[8px] font-bold text-purple-400 uppercase">Fee:</span>
                                    <input 
                                      type="number"
                                      defaultValue={fee}
                                      onBlur={(e) => handleUpdateStaffFee(order, id, Number(e.target.value))}
                                      placeholder="₹"
                                      className="w-16 px-1 py-0.5 text-[9px] font-bold border border-purple-100 rounded bg-white outline-none focus:border-purple-500"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) handleToggleAssignment(order, e.target.value, 'editor');
                            }}
                            className="text-[10px] border border-gray-200 rounded-lg p-1.5 w-full bg-white font-bold focus:border-black outline-none transition-all"
                          >
                            <option value="">Add Editor</option>
                            {teamMembers.filter(m => (m.role === 'editor' || m.role === 'admin') && !(order.editorIds || []).includes(m.uid)).map(m => (
                              <option key={m.uid} value={m.uid}>{m.displayName || m.email}</option>
                            ))}
                          </select>
                        </div>

                        {/* Other Assignment */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <UserIcon className="w-3 h-3" /> Other Staff
                          </p>
                          <div className="flex flex-col gap-2 mb-2">
                            {(order.otherIds || []).map((id: string) => {
                              const member = teamMembers.find(m => m.uid === id);
                              const fee = order.staffPayments?.[id]?.totalFee || 0;
                              return (
                                <div key={id} className="flex flex-col gap-1 p-2 bg-green-50 rounded-lg border border-green-100">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-green-700 truncate mr-1">
                                      {member?.displayName || member?.email?.split('@')[0]}
                                    </span>
                                    <button onClick={() => handleToggleAssignment(order, id, 'other')} className="text-red-400 hover:text-red-600">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[8px] font-bold text-green-400 uppercase">Fee:</span>
                                    <input 
                                      type="number"
                                      defaultValue={fee}
                                      onBlur={(e) => handleUpdateStaffFee(order, id, Number(e.target.value))}
                                      placeholder="₹"
                                      className="w-16 px-1 py-0.5 text-[9px] font-bold border border-green-100 rounded bg-white outline-none focus:border-green-500"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) handleToggleAssignment(order, e.target.value, 'other');
                            }}
                            className="text-[10px] border border-gray-200 rounded-lg p-1.5 w-full bg-white font-bold focus:border-black outline-none transition-all"
                          >
                            <option value="">Add Other Staff</option>
                            {teamMembers.filter(m => (m.role === 'other' || m.role === 'admin') && !(order.otherIds || []).includes(m.uid)).map(m => (
                              <option key={m.uid} value={m.uid}>{m.displayName || m.email}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </td>
                  )}
                  {(role === 'admin' || role === 'client') && (
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">₹{(order.finalAmount || order.totalAmount).toLocaleString()}</div>
                    {order.finalAmount && order.finalAmount !== order.totalAmount && (
                      <div className="text-[10px] text-green-600 font-bold line-through opacity-50">₹{order.totalAmount.toLocaleString()}</div>
                    )}
                    {role === 'client' && (
                      <div className="text-[10px] text-red-500 font-bold">Due: ₹{(order.finalAmount || order.totalAmount) - (order.paidAmount || 0)}</div>
                    )}
                  </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowDetailsModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Project Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {role === 'client' && order.status === 'pending' && (
                        <button
                          onClick={() => handlePayment(order)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Pay Now"
                        >
                          <CreditCard className="w-5 h-5" />
                        </button>
                      )}
                      {role === 'client' && order.status === 'confirmed' && (
                        <div className="flex items-center space-x-2">
                          {['WEDD BRIDESIDE', 'WEDD GROOM', 'WEDD BOTH', 'BIRTHDAY', 'ANNOPRASAN', 'UPANAYAN'].includes(order.eventType) && (
                            <span className="animate-pulse flex h-2 w-2 rounded-full bg-red-500"></span>
                          )}
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowBookingForm(true);
                            }}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                              ['WEDD BRIDESIDE', 'WEDD GROOM', 'WEDD BOTH', 'BIRTHDAY', 'ANNOPRASAN', 'UPANAYAN'].includes(order.eventType)
                                ? 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-black/20'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title="Fill Event Details"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span>{['WEDD BRIDESIDE', 'WEDD GROOM', 'WEDD BOTH'].includes(order.eventType) ? 'Fill Wedding Details' : 'Fill Event Details'}</span>
                          </button>
                        </div>
                      )}
                      {(role === 'admin' || 
                        (order.photographerIds || []).includes(user.uid) || 
                        (order.editorIds || []).includes(user.uid) || 
                        (order.otherIds || []).includes(user.uid)) && (
                        <>
                          {role === 'admin' && (
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowBookingForm(true);
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Update Project Info"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                          )}
                          {role === 'admin' && (
                            <button
                              onClick={() => setSelectedClientId(order.clientId)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="View Client CRM"
                            >
                              <UserIcon className="w-5 h-5" />
                            </button>
                          )}
                          <select
                            onChange={(e) => updateStatus(order.id, e.target.value)}
                            value={order.status}
                            className="text-xs border border-gray-200 rounded p-1"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </>
                      )}
                      {role === 'admin' && (
                        <>
                          <button
                            onClick={() => handleWhatsAppShare(order)}
                            className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                            title="Share on WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(order.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClientId && (
        <CRMModal
          clientId={selectedClientId}
          onClose={() => setSelectedClientId(null)}
          currentUser={user}
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Book a Session</h2>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                <input
                  type="text"
                  value={newOrder.clientName}
                  onChange={(e) => setNewOrder({ ...newOrder, clientName: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={newOrder.mobileNumber}
                  onChange={(e) => setNewOrder({ ...newOrder, mobileNumber: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={newOrder.clientEmail}
                  onChange={(e) => setNewOrder({ ...newOrder, clientEmail: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Package Name</label>
                <select
                  value={newOrder.packageName}
                  onChange={(e) => setNewOrder({ ...newOrder, packageName: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none"
                  required
                >
                  <option value="">Select a package</option>
                  <option value="Portrait Session">Portrait Session (₹15,000)</option>
                  <option value="Wedding Package">Wedding Package (₹1,50,000)</option>
                  <option value="Event Coverage">Event Coverage (₹40,000)</option>
                  <option value="Commercial Shoot">Commercial Shoot (₹60,000)</option>
                  <option value="Full Event Management">Full Event Management (₹5,00,000)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newOrder.date}
                  onChange={(e) => setNewOrder({ ...newOrder, date: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="Studio or Outdoor address"
                  value={newOrder.location}
                  onChange={(e) => setNewOrder({ ...newOrder, location: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                <input
                  type="number"
                  value={newOrder.totalAmount}
                  onChange={(e) => setNewOrder({ ...newOrder, totalAmount: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black outline-none"
                  required
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-800 transition-colors"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && selectedOrder && (
        <ProjectDetailsModal
          order={selectedOrder}
          role={role}
          user={user}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {showBookingForm && selectedOrder && (
        <BookingForm
          invoiceNumber={selectedOrder.invoiceNumber}
          clientId={selectedOrder.clientId}
          role={role}
          onClose={() => {
            setShowBookingForm(false);
            setSelectedOrder(null);
          }}
          user={user}
        />
      )}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Order"
        message="Are you sure you want to delete this order? This will also permanently remove the associated booking and payment records."
        confirmLabel="Delete Permanently"
        variant="danger"
      />
    </div>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'confirmed': return 'bg-blue-100 text-blue-800';
    case 'in-progress': return 'bg-purple-100 text-purple-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default OrderManagement;
