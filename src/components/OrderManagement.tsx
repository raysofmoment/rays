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

const OrderManagement: React.FC<OrderManagementProps> = ({ user, role }) => {
  const { cart, clearCart, totalAmount } = useCart();
  const [orders, setOrders] = useState<any[]>([]);
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
      ordersQuery = query(collection(db, 'orders'), where('photographerId', '==', user.uid), orderBy('createdAt', 'desc'));
    } else if (role === 'editor') {
      ordersQuery = query(collection(db, 'orders'), where('editorId', '==', user.uid), orderBy('createdAt', 'desc'));
    } else if (role === 'other') {
      ordersQuery = query(collection(db, 'orders'), where('otherId', '==', user.uid), orderBy('createdAt', 'desc'));
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

    return () => unsubscribe();
  }, [user, role]);

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

  const handleAssignMember = async (orderId: string, memberId: string, field: 'photographerId' | 'editorId' | 'otherId') => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { [field]: memberId });
      toast.success('Assignment updated successfully');
    } catch (error) {
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
                      <div className="space-y-2">
                        <select
                          onChange={(e) => handleAssignMember(order.id, e.target.value, 'photographerId')}
                          value={order.photographerId || ''}
                          className="text-[10px] border border-gray-200 rounded p-1 w-full"
                        >
                          <option value="">Assign Photographer</option>
                          {teamMembers.filter(m => m.role === 'photographer').map(m => (
                            <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
                          ))}
                        </select>
                        <select
                          onChange={(e) => handleAssignMember(order.id, e.target.value, 'editorId')}
                          value={order.editorId || ''}
                          className="text-[10px] border border-gray-200 rounded p-1 w-full"
                        >
                          <option value="">Assign Editor</option>
                          {teamMembers.filter(m => m.role === 'editor').map(m => (
                            <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
                          ))}
                        </select>
                        <select
                          onChange={(e) => handleAssignMember(order.id, e.target.value, 'otherId')}
                          value={order.otherId || ''}
                          className="text-[10px] border border-gray-200 rounded p-1 w-full"
                        >
                          <option value="">Assign Other</option>
                          {teamMembers.filter(m => m.role === 'other').map(m => (
                            <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">₹{order.totalAmount}</div>
                    {role === 'client' && (
                      <div className="text-[10px] text-red-500 font-bold">Due: ₹{order.totalAmount - (order.paidAmount || 0)}</div>
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
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowBookingForm(true);
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Fill Event Details"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                      {(role === 'admin' || 
                        (role === 'photographer' && order.photographerId === user.uid) || 
                        (role === 'editor' && order.editorId === user.uid) || 
                        (role === 'other' && order.otherId === user.uid)) && (
                        <>
                          {(role === 'admin' || role === 'editor') && (
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
