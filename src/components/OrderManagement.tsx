import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { notifyAdmins, notifyUser } from '../services/notificationService';
import { Calendar, Plus, Search, Filter, MoreVertical, Trash2, Edit2, CreditCard, Image as ImageIcon, User as UserIcon, Eye, Bell, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import CRMModal from './CRMModal';
import BookingForm from './BookingForm';
import { useCart } from '../context/CartContext';

const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

interface OrderManagementProps {
  user: User;
  role: string | null;
}

import ProjectDetailsModal from './ProjectDetailsModal';
import EventCostForm from './EventCostForm';

const OrderManagement: React.FC<OrderManagementProps> = ({ user, role }) => {
  const { cart, clearCart, totalAmount } = useCart();
  const [orders, setOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [newOrder, setNewOrder] = useState({
    packageName: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    location: '',
    totalAmount: 0,
    clientName: user.displayName || '',
    mobileNumber: '',
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
      ordersQuery = query(collection(db, 'orders'), where('clientId', '==', user.uid), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
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
      const requestsQuery = query(collection(db, 'bookings'), where('clientId', '==', user.uid), where('adminStatus', '==', 'requested'));
      requestsUnsubscribe = onSnapshot(requestsQuery, (snapshot) => {
        setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any })));
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
    const finalAmount = booking.finalAmount || booking.totalPackageAmount;
    
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        adminStatus: 'accepted',
        invoiceNumber,
        finalAmount,
        status: 'pending',
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      });
      
      await addDoc(collection(db, 'orders'), {
        clientId: booking.clientId,
        clientName: booking.clientName,
        mobileNumber: booking.clientMobile,
        invoiceNumber,
        status: 'pending',
        date: booking.eventDate,
        location: booking.eventPlace,
        packageName: booking.package === 'Customize' ? booking.requirement : booking.package,
        totalAmount: finalAmount,
        paidAmount: 0,
        dueAmount: finalAmount,
        eventType: booking.eventType,
        createdAt: new Date().toISOString(),
        bookingId: booking.id
      });

      if (booking.clientId) {
        await addDoc(collection(db, 'notifications'), {
          userId: booking.clientId,
          title: 'Order Accepted',
          message: `Your order request has been accepted! Invoice: ${invoiceNumber}. Final Bill: ₹${finalAmount.toLocaleString()}`,
          type: 'success',
          link: '/orders',
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }

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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      
      // If we have a cart, we might want to create multiple orders or one combined order
      // For simplicity, let's create one order with all items if cart is not empty
      const packageName = cart.length > 0 
        ? cart.map(item => item.name).join(', ') 
        : newOrder.packageName;
      
      const finalAmount = cart.length > 0 ? totalAmount : newOrder.totalAmount;

      const orderData = {
        ...newOrder,
        packageName,
        totalAmount: finalAmount,
        clientId: user.uid,
        status: 'pending',
        paidAmount: 0,
        createdAt: new Date().toISOString(),
        invoiceNumber,
      };
      await addDoc(collection(db, 'orders'), orderData);

      if (cart.length > 0) {
        clearCart();
      }

      // Add notification for the user
      await notifyUser(
        user.uid,
        'Order Placed!',
        `Your booking for ${newOrder.packageName} has been received. Invoice: ${invoiceNumber}. We will review it soon.`,
        'info',
        '/orders'
      );

      // Notify admins
      await notifyAdmins(
        'New Order Received',
        `${orderData.clientName} placed a new order for ${orderData.packageName}. Invoice: ${invoiceNumber}`,
        'info',
        '/orders'
      );

      toast.success('Order created successfully! Your invoice number is ' + invoiceNumber);
      setShowAddModal(false);
      setNewOrder({
        packageName: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        location: '',
        totalAmount: 0,
        clientName: user.displayName || '',
        mobileNumber: '',
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

  const handleToggleAssignment = async (orderId: string, memberId: string, field: 'photographerIds' | 'editorIds' | 'otherIds', currentIds: string[] = []) => {
    try {
      let newIds = [...(currentIds || [])];
      if (newIds.includes(memberId)) {
        newIds = newIds.filter(id => id !== memberId);
      } else {
        newIds.push(memberId);
      }
      
      const updates: any = { 
        [field]: newIds,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      };
      
      // Update singular field for backward compatibility
      if (field === 'photographerIds') updates.photographerId = newIds[0] || '';
      if (field === 'editorIds') updates.editorId = newIds[0] || '';
      if (field === 'otherIds') updates.otherId = newIds[0] || '';
      
      await updateDoc(doc(db, 'orders', orderId), updates);
      
      toast.success('Assignment updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
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
        {role === 'client' && (
          <div className="flex space-x-4">
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
          </div>
        )}
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
                      <p className="text-xs text-gray-500">{format(new Date(req.eventDate), 'MMM d, yyyy')}</p>
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
                    <p className="text-sm font-bold text-gray-900">Estimated: ₹{req.totalPackageAmount.toLocaleString()}</p>
                  </div>
                  {req.discountRequest && (
                    <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 italic mb-4">
                      " {req.discountRequest} "
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-[10px] text-gray-400">
                      Submitted on {format(new Date(req.createdAt), 'MMM d, h:mm a')}
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
                          className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Reject
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
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm"
              />
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-white transition-colors">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order Details</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Client Info</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment</th>
                {role === 'admin' && (
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Assignments</th>
                )}
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900">{order.packageName}</p>
                    <p className="text-xs text-gray-500">{order.location}</p>
                    <p className="text-xs text-gray-400">{format(new Date(order.date), 'MMM d, yyyy')}</p>
                    {order.invoiceNumber && (
                      <p className="text-[10px] text-blue-600 font-bold mt-1">INV: {order.invoiceNumber}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium">{order.clientName}</div>
                    {(role === 'admin' || role === 'photographer' || role === 'other') && (
                      <div className="text-xs text-gray-500">{order.mobileNumber}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      (order.totalAmount - (order.paidAmount || 0)) <= 0 ? 'bg-green-100 text-green-700' : 
                      ((order.paidAmount || 0) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700')
                    }`}>
                      {(order.totalAmount - (order.paidAmount || 0)) <= 0 ? 'Paid' : ((order.paidAmount || 0) > 0 ? 'Partial' : 'Unpaid')}
                    </span>
                  </td>
                  {role === 'admin' && (
                    <td className="px-6 py-4">
                      <div className="space-y-3 min-w-[150px]">
                        {/* Photographers */}
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Photographers</p>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {(order.photographerIds || []).map((id: string) => {
                              const member = teamMembers.find(m => m.id === id);
                              return (
                                <span key={id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-medium flex items-center gap-1">
                                  {member?.displayName || 'User'}
                                  <button onClick={() => handleToggleAssignment(order.id, id, 'photographerIds', order.photographerIds)} className="hover:text-red-500 font-bold">×</button>
                                </span>
                              );
                            })}
                          </div>
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleToggleAssignment(order.id, e.target.value, 'photographerIds', order.photographerIds);
                              e.target.value = '';
                            }}
                            className="text-[10px] border border-gray-200 rounded p-1 w-full bg-white"
                          >
                            <option value="">+ Add Photographer</option>
                            {teamMembers.filter(m => m.role === 'photographer' && !(order.photographerIds || []).includes(m.id)).map(m => (
                              <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
                            ))}
                          </select>
                        </div>

                        {/* Editors */}
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Editors</p>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {(order.editorIds || []).map((id: string) => {
                              const member = teamMembers.find(m => m.id === id);
                              return (
                                <span key={id} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[9px] font-medium flex items-center gap-1">
                                  {member?.displayName || 'User'}
                                  <button onClick={() => handleToggleAssignment(order.id, id, 'editorIds', order.editorIds)} className="hover:text-red-500 font-bold">×</button>
                                </span>
                              );
                            })}
                          </div>
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleToggleAssignment(order.id, e.target.value, 'editorIds', order.editorIds);
                              e.target.value = '';
                            }}
                            className="text-[10px] border border-gray-200 rounded p-1 w-full bg-white"
                          >
                            <option value="">+ Add Editor</option>
                            {teamMembers.filter(m => m.role === 'editor' && !(order.editorIds || []).includes(m.id)).map(m => (
                              <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
                            ))}
                          </select>
                        </div>

                        {/* Others */}
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Others</p>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {(order.otherIds || []).map((id: string) => {
                              const member = teamMembers.find(m => m.id === id);
                              return (
                                <span key={id} className="px-2 py-0.5 bg-gray-50 text-gray-700 rounded text-[9px] font-medium flex items-center gap-1">
                                  {member?.displayName || 'User'}
                                  <button onClick={() => handleToggleAssignment(order.id, id, 'otherIds', order.otherIds)} className="hover:text-red-500 font-bold">×</button>
                                </span>
                              );
                            })}
                          </div>
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleToggleAssignment(order.id, e.target.value, 'otherIds', order.otherIds);
                              e.target.value = '';
                            }}
                            className="text-[10px] border border-gray-200 rounded p-1 w-full bg-white"
                          >
                            <option value="">+ Add Other</option>
                            {teamMembers.filter(m => m.role === 'other' && !(order.otherIds || []).includes(m.id)).map(m => (
                              <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">₹{(order.finalAmount || order.totalAmount).toLocaleString()}</div>
                    {order.finalAmount && order.finalAmount !== order.totalAmount && (
                      <div className="text-[10px] text-green-600 font-bold line-through opacity-50">₹{order.totalAmount.toLocaleString()}</div>
                    )}
                    {role === 'client' && (
                      <div className="text-[10px] text-red-500 font-bold">Due: ₹{(order.finalAmount || order.totalAmount) - (order.paidAmount || 0)}</div>
                    )}
                  </td>
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
                          {(role === 'admin' || role === 'editor' || (order.editorIds || []).includes(user.uid)) && (
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
                          <button
                            onClick={() => setSelectedClientId(order.clientId)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="View Client CRM"
                          >
                            <UserIcon className="w-5 h-5" />
                          </button>
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
                      <button className="p-2 text-gray-400 hover:text-black">
                        <MoreVertical className="w-5 h-5" />
                      </button>
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

      {showBookingForm && (
        <BookingForm
          user={user}
          role={role}
          invoiceNumber={selectedOrder?.invoiceNumber}
          clientId={selectedOrder?.clientId}
          onClose={() => {
            setShowBookingForm(false);
            setSelectedOrder(null);
          }}
        />
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
