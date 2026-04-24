import React, { useState, useEffect } from 'react';
import { User, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, onSnapshot, addDoc, deleteDoc, orderBy, or } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { User as UserIcon, Mail, Shield, Calendar, Camera, Save, Loader2, Camera as CameraIcon, ShoppingBag, Package, CheckCircle2, Clock, ExternalLink, ChevronRight, Info, Phone, Plus, Trash2, Link as LinkIcon, Video, Image as ImageIcon, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';
import ConfirmModal from './ConfirmModal';

interface ProfileProps {
  user: User;
  role: string | null;
}

const Profile: React.FC<ProfileProps> = ({ user, role }) => {
  const { uid } = useParams();
  const targetUid = uid || user.uid;
  const isViewingOther = !!uid && uid !== user.uid;
  const isAdmin = role === 'admin';

  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'samples'>('profile');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [samples, setSamples] = useState<any[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [showAddSample, setShowAddSample] = useState(false);
  const [newSample, setNewSample] = useState({
    title: '',
    description: '',
    type: 'image' as 'image' | 'video' | 'link',
    url: ''
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const targetRole = userData?.role || 'client';

  const staffSummary = React.useMemo(() => {
    if (targetRole === 'client') return null;
    return orders.reduce((acc, order) => {
      const payment = order.staffPayments?.[targetUid];
      if (payment) {
        acc.totalFee += (Number(payment.totalFee) || 0);
        acc.totalPaid += (Number(payment.paidAmount) || 0);
        acc.totalDue += ((Number(payment.totalFee) || 0) - (Number(payment.paidAmount) || 0));
      }
      return acc;
    }, { totalFee: 0, totalPaid: 0, totalDue: 0 });
  }, [orders, targetUid, targetRole]);

  useEffect(() => {
    const fetchUserData = async () => {
      const userDoc = await getDoc(doc(db, 'users', targetUid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        setDisplayName(data.displayName || '');
      }
    };
    fetchUserData();
  }, [targetUid]);

  useEffect(() => {
    if (activeTab === 'orders') {
      setOrdersLoading(true);
      const q = query(
        collection(db, 'bookings'),
        or(
          where('clientId', '==', targetUid),
          where('photographerId', '==', targetUid),
          where('editorId', '==', targetUid),
          where('otherId', '==', targetUid),
          where('photographerIds', 'array-contains', targetUid),
          where('editorIds', 'array-contains', targetUid),
          where('otherIds', 'array-contains', targetUid)
        )
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(ordersData);
        setOrdersLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'bookings');
        setOrdersLoading(false);
      });
      return () => unsubscribe();
    }
  }, [activeTab, targetUid]);

  useEffect(() => {
    if (activeTab === 'samples') {
      setSamplesLoading(true);
      const q = query(collection(db, 'sampleWorks'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const samplesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSamples(samplesData.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setSamplesLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'sampleWorks');
        setSamplesLoading(false);
      });
      return () => unsubscribe();
    }
  }, [activeTab, user.uid]);

  const handleDeleteSample = async (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'sampleWorks', itemToDelete));
      toast.success('Sample deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'sampleWorks');
    } finally {
      setItemToDelete(null);
    }
  };

  const handleAddSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSample.url) {
      toast.error('Please provide a URL');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'sampleWorks'), {
        ...newSample,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userRole: role,
        createdAt: new Date().toISOString()
      });
      toast.success('Sample work added successfully!');
      setNewSample({ title: '', description: '', type: 'image', url: '' });
      setShowAddSample(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sampleWorks');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(user, { displayName });
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        updatedAt: new Date().toISOString()
      });
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePayStaff = async (orderId: string, amount: number, method: string) => {
    if (amount <= 0) return;
    try {
      setLoading(true);
      const orderRef = doc(db, 'bookings', orderId);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        const currentStaffData = orderData.staffPayments?.[targetUid] || { totalFee: 0, paidAmount: 0, payments: [] };
        
        const date = new Date().toISOString();
        const newPayments = [...(currentStaffData.payments || []), { amount, date, method }];
        const newPaidAmount = newPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        
        const updatedStaffPayments = {
          ...orderData.staffPayments,
          [targetUid]: {
            ...currentStaffData,
            paidAmount: newPaidAmount,
            lastPaymentDate: date,
            payments: newPayments
          }
        };

        const updates = { staffPayments: updatedStaffPayments };
        await updateDoc(orderRef, updates);
        
        // Sync with orders collection
        const q = query(collection(db, 'orders'), where('bookingId', '==', orderId));
        const orderDocs = await getDocs(q);
        if (!orderDocs.empty) {
          await updateDoc(doc(db, 'orders', orderDocs.docs[0].id), updates);
        }

        toast.success(`₹${amount} paid to staff and recorded successfully.`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${orderId}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'text-green-600 bg-green-50 border-green-100';
      case 'review': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'pending': return 'text-gray-400 bg-gray-50 border-gray-100';
      default: return 'text-gray-400 bg-gray-50 border-gray-100';
    }
  };

  const TrackingItem = ({ label, status, link }: { label: string, status: string, link?: string }) => (
    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center space-x-3">
        <div className={`w-2 h-2 rounded-full ${status === 'delivered' ? 'bg-green-500' : status === 'review' ? 'bg-blue-500' : 'bg-gray-300'}`} />
        <span className="font-bold text-gray-700">{label}</span>
      </div>
      <div className="flex items-center space-x-3">
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(status)}`}>
          {status || 'pending'}
        </span>
        {link && status === 'delivered' && (
          <a 
            href={link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            title="View Item"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-2xl mb-8 w-fit overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'profile' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
        >
          {isViewingOther ? 'Member Profile' : 'My Profile'}
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'orders' ? 'bg-black text-white shadow-md scale-105' : 'text-gray-500 hover:text-black hover:bg-gray-200/50'}`}
        >
          {isViewingOther ? 'Client Orders' : 'My Orders'}
        </button>
        {(targetRole === 'photographer' || targetRole === 'editor' || targetRole === 'other' || targetRole === 'admin') && (
          <>
            <button
              onClick={() => setActiveTab('samples')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'samples' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
            >
              Sample Work
            </button>
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {/* Header/Cover */}
            <div className="h-32 bg-black relative">
              <div className="absolute -bottom-12 left-8">
                <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-white overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL || null} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            <div className="pt-16 pb-8 px-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{userData?.displayName || 'User Profile'}</h1>
                  <p className="text-gray-500 flex items-center mt-1">
                    <Mail className="w-4 h-4 mr-2" />
                    {userData?.email}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-bold uppercase tracking-wider flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    {targetRole}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Info Form */}
                <div className="lg:col-span-2">
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      <h2 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Display Name</label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            disabled={isViewingOther && !isAdmin}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="Enter name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                          <input
                            type="email"
                            value={userData?.email || ''}
                            disabled
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {!isViewingOther && (
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={loading}
                          className="bg-black text-white px-8 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-gray-800 transition-all disabled:opacity-50 shadow-lg shadow-black/20"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                          <span>Save Changes</span>
                        </button>
                      </div>
                    )}
                  </form>
                </div>

                {/* Sidebar Stats/Info */}
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Account Details</h2>
                    <div className="space-y-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          Joined
                        </span>
                        <span className="font-bold text-gray-900">
                          {userData?.createdAt ? format(new Date(userData.createdAt), 'MMM d, yyyy') : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center">
                          <Shield className="w-4 h-4 mr-2" />
                          Role
                        </span>
                        <span className="font-bold text-gray-900 capitalize">{targetRole}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'orders' ? (
          <motion.div
            key="orders"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Staff Payment Summary */}
            {staffSummary && (staffSummary.totalFee > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center space-x-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Earned</p>
                    <p className="text-2xl font-black text-gray-900">₹{staffSummary.totalFee.toLocaleString()}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center space-x-4">
                  <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Paid</p>
                    <p className="text-2xl font-black text-green-600">₹{staffSummary.totalPaid.toLocaleString()}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center space-x-4">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pending Dues</p>
                    <p className="text-2xl font-black text-orange-600">₹{staffSummary.totalDue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {ordersLoading ? (
              <div className="flex justify-center py-24">
                <Loader2 className="w-12 h-12 animate-spin text-black" />
              </div>
            ) : orders.length > 0 ? (
              <div className="grid grid-cols-1 gap-8">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8 md:p-12">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                              Order #{order.invoiceNumber || 'N/A'}
                            </span>
                            <span className="text-gray-400 text-sm font-medium">
                              {order.eventDate ? format(new Date(order.eventDate), 'MMMM d, yyyy') : 'Date N/A'}
                            </span>
                          </div>
                          <h2 className="text-4xl font-black text-gray-900">{order.eventType}</h2>
                          <p className="text-gray-500 font-medium mt-1">{order.eventPlace || 'Location N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Amount</p>
                          <p className="text-4xl font-black text-black">₹{order.totalPackageAmount?.toLocaleString()}</p>
                          {order.dueAmount > 0 && (
                            <p className="text-sm font-bold text-red-500 mt-1">Due: ₹{order.dueAmount?.toLocaleString()}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Order Details */}
                        <div className="lg:col-span-1 space-y-8">
                          <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                            <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center">
                              <Info className="w-5 h-5 mr-2" />
                              Order Details
                            </h3>
                            <div className="space-y-4">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500 font-bold">Package</span>
                                <span className="text-gray-900 font-black">{order.package}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500 font-bold">Client</span>
                                <span className="text-gray-900 font-black">{order.clientName}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500 font-bold">Mobile</span>
                                <span className="text-gray-900 font-black">{order.clientMobile}</span>
                              </div>
                              
                              {/* Staff Payment Info */}
                              {targetUid !== order.clientId && order.staffPayments?.[targetUid] && (
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                  <div className="flex items-center justify-between mb-4">
                                    <p className="text-xs font-black text-indigo-600 uppercase tracking-widest leading-none">Your Project Fees</p>
                                    {isAdmin && (
                                      <div className="flex items-center space-x-2">
                                        <input 
                                          type="number" 
                                          id={`pay-${order.id}`}
                                          placeholder="Amt"
                                          className="w-20 px-2 py-1.5 rounded-lg border border-gray-100 text-[10px] font-bold outline-none focus:border-green-500 bg-gray-50"
                                        />
                                        <button 
                                          onClick={() => {
                                            const input = document.getElementById(`pay-${order.id}`) as HTMLInputElement;
                                            if (input && input.value) {
                                              handlePayStaff(order.id, Number(input.value), 'Cash');
                                              input.value = '';
                                            }
                                          }}
                                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[9px] font-black hover:bg-green-700 transition-all uppercase tracking-widest"
                                        >
                                          Pay
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100">
                                      <p className="text-[8px] font-bold text-indigo-400 shadow-sm uppercase leading-none mb-1">Agreed Fee</p>
                                      <p className="text-sm font-black text-indigo-700">₹{order.staffPayments[targetUid].totalFee?.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-green-50/50 p-3 rounded-2xl border border-green-100">
                                      <p className="text-[8px] font-bold text-green-400 uppercase leading-none mb-1">Paid</p>
                                      <p className="text-sm font-black text-green-700">₹{order.staffPayments[targetUid].paidAmount?.toLocaleString() || 0}</p>
                                    </div>
                                    <div className={`p-3 rounded-2xl border ${
                                      (order.staffPayments[targetUid].totalFee - (order.staffPayments[targetUid].paidAmount || 0)) > 0 
                                      ? 'bg-orange-50/50 border-orange-100' : 'bg-gray-50/50 border-gray-100'
                                    }`}>
                                      <p className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-1">Due</p>
                                      <p className={`text-sm font-black ${(order.staffPayments[targetUid].totalFee - (order.staffPayments[targetUid].paidAmount || 0)) > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                        ₹{(order.staffPayments[targetUid].totalFee - (order.staffPayments[targetUid].paidAmount || 0)).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {order.staffPayments[targetUid].payments?.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                      <div className="flex border-b border-gray-100 pb-1 mb-2">
                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Transaction History</p>
                                      </div>
                                      {order.staffPayments[targetUid].payments.slice(-3).map((p: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center text-[9px] bg-white p-2 rounded-xl border border-gray-100 border-dashed text-gray-500 font-medium">
                                          <div className="flex items-center">
                                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2" />
                                            <span>{format(new Date(p.date), 'MMM d, yyyy')}</span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <span className="text-[8px] px-1.5 py-0.5 bg-gray-50 rounded italic">{p.method}</span>
                                            <span className="font-bold text-gray-900">₹{p.amount?.toLocaleString()}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="pt-4 border-t border-gray-200">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Requirements</p>
                                <p className="text-sm text-gray-600 leading-relaxed">{order.requirement || 'No specific requirements listed.'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-black text-white p-8 rounded-3xl shadow-lg">
                            <h3 className="font-black mb-4 flex items-center">
                              <ShoppingBag className="w-5 h-5 mr-2" />
                              Need Support?
                            </h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">
                              If you have any questions regarding your order or the delivery status, please contact our support team.
                            </p>
                            <button className="w-full py-3 bg-white text-black rounded-xl font-black hover:bg-gray-100 transition-all">
                              Contact Us
                            </button>
                          </div>
                        </div>

                        {/* Tracking Section */}
                        <div className="lg:col-span-2">
                          <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-black text-gray-900 flex items-center">
                              <Package className="w-6 h-6 mr-3" />
                              Track Your Order
                            </h3>
                            <div className="flex items-center space-x-2 text-xs font-bold text-gray-400">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span>Delivered</span>
                              <div className="w-2 h-2 rounded-full bg-blue-500 ml-2" />
                              <span>Review</span>
                              <div className="w-2 h-2 rounded-full bg-gray-300 ml-2" />
                              <span>Pending</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TrackingItem 
                              label="Album Design" 
                              status={order.albumDesignStatus} 
                              link={order.albumLink} 
                            />
                            <TrackingItem 
                              label="Full Video" 
                              status={order.fullVideoStatus} 
                              link={order.fullVideoLink} 
                            />
                            <TrackingItem 
                              label="Teaser" 
                              status={order.teaserStatus} 
                              link={order.teaserLink} 
                            />
                            <TrackingItem 
                              label="Reels" 
                              status={order.reelsStatus} 
                              link={order.reelsLink} 
                            />
                            <TrackingItem 
                              label="Edited Photos" 
                              status={order.editPhotoStatus} 
                              link={order.photoEditLink} 
                            />
                            <TrackingItem 
                              label="E-Invite" 
                              status={order.eInviteStatus} 
                              link={order.eInviteLink} 
                            />
                            <TrackingItem 
                              label="Pre-Wedding Photo" 
                              status={order.preWeddingPhotoStatus} 
                              link={order.preWeddingPhotoLink} 
                            />
                            <TrackingItem 
                              label="Pre-Wedding Video" 
                              status={order.preWeddingVideoStatus} 
                              link={order.preWeddingVideoLink} 
                            />
                          </div>

                          {order.outputLink && (
                            <div className="mt-8 p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm">
                                  <ExternalLink className="w-6 h-6 text-black" />
                                </div>
                                <div>
                                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Main Output Link</p>
                                  <p className="font-bold text-gray-900">Access all your final files</p>
                                </div>
                              </div>
                              <a 
                                href={order.outputLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-6 py-3 bg-black text-white rounded-xl font-black hover:bg-gray-800 transition-all flex items-center"
                              >
                                View All
                                <ChevronRight className="w-4 h-4 ml-2" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-white rounded-[2.5rem] shadow-xl border border-gray-100">
                <ShoppingBag className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                <h2 className="text-3xl font-black text-gray-900">No Orders Found</h2>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                  You don't have any photography bookings or assigned projects yet. Once an order is created or assigned to you, it will appear here.
                </p>
                <Link 
                  to="/packages" 
                  className="mt-8 inline-flex items-center space-x-2 bg-black text-white px-8 py-4 rounded-2xl font-black hover:bg-gray-800 transition-all shadow-lg"
                >
                  Explore Packages
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Link>
              </div>
            )}
          </motion.div>
        ) : activeTab === 'samples' ? (
          <motion.div
            key="samples"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-gray-900">Sample Work</h2>
                  <p className="text-gray-500 font-medium">Showcase your best work to the team and clients.</p>
                </div>
                <button
                  onClick={() => setShowAddSample(!showAddSample)}
                  className="flex items-center space-x-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Sample</span>
                </button>
              </div>

              {showAddSample && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mb-12 p-8 bg-gray-50 rounded-3xl border border-gray-100 space-y-6 overflow-hidden"
                  onSubmit={handleAddSample}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                      <input
                        type="text"
                        value={newSample.title}
                        onChange={(e) => setNewSample({ ...newSample, title: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none transition-all"
                        placeholder="e.g. Wedding Cinematic Teaser"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                      <select
                        value={newSample.type}
                        onChange={(e) => setNewSample({ ...newSample, type: e.target.value as any })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none transition-all"
                      >
                        <option value="image">Photo</option>
                        <option value="video">Video</option>
                        <option value="link">External Link</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL (Image/Video/Link)</label>
                      <input
                        type="url"
                        value={newSample.url}
                        onChange={(e) => setNewSample({ ...newSample, url: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none transition-all"
                        placeholder="https://..."
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                      <textarea
                        value={newSample.description}
                        onChange={(e) => setNewSample({ ...newSample, description: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none transition-all min-h-[100px]"
                        placeholder="Briefly describe this work..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowAddSample(false)}
                      className="px-6 py-2 text-gray-500 font-bold hover:text-black transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-black text-white px-8 py-2 rounded-xl font-bold flex items-center space-x-2 hover:bg-gray-800 transition-all disabled:opacity-50"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Save Sample</span>
                    </button>
                  </div>
                </motion.form>
              )}

              {samplesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-black" />
                </div>
              ) : samples.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {samples.map((sample) => (
                    <div key={sample.id} className="bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden group hover:shadow-xl transition-all">
                      <div className="aspect-video bg-gray-200 relative overflow-hidden">
                        {sample.type === 'image' ? (
                          <img src={sample.url || null} alt={sample.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                        ) : sample.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-black">
                            <Video className="w-12 h-12 text-white opacity-50" />
                            <a href={sample.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-8 h-8 text-white" />
                            </a>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <LinkIcon className="w-12 h-12 text-gray-300" />
                            <a href={sample.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-8 h-8 text-black" />
                            </a>
                          </div>
                        )}
                        <div className="absolute top-4 right-4 flex space-x-2">
                          <button
                            onClick={() => handleDeleteSample(sample.id)}
                            className="p-2 bg-white/90 backdrop-blur-sm text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute bottom-4 left-4">
                          <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest rounded-md flex items-center">
                            {sample.type === 'image' ? <ImageIcon className="w-3 h-3 mr-1" /> : sample.type === 'video' ? <Video className="w-3 h-3 mr-1" /> : <LinkIcon className="w-3 h-3 mr-1" />}
                            {sample.type}
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{sample.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{sample.description || 'No description provided.'}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {sample.createdAt && isValid(new Date(sample.createdAt)) ? format(new Date(sample.createdAt), 'MMM d, yyyy') : 'No Date'}
                          </span>
                          <a
                            href={sample.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-black hover:underline flex items-center"
                          >
                            View Work
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-24 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <CameraIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900">No Samples Added</h3>
                  <p className="text-gray-500 mt-2">Start showcasing your work by adding your first sample.</p>
                  <button
                    onClick={() => setShowAddSample(true)}
                    className="mt-6 text-black font-bold underline hover:text-gray-600"
                  >
                    Add Sample Now
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Sample Work"
        message="Are you sure you want to delete this sample? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default Profile;
