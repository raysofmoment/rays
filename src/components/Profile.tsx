import React, { useState, useEffect } from 'react';
import { User, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { User as UserIcon, Mail, Shield, Calendar, Camera, Save, Loader2, Camera as CameraIcon, ShoppingBag, Package, CheckCircle2, Clock, ExternalLink, ChevronRight, Info, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ProfileProps {
  user: User;
  role: string | null;
}

const Profile: React.FC<ProfileProps> = ({ user, role }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'assignments'>('profile');
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    };
    fetchUserData();
  }, [user.uid]);

  useEffect(() => {
    if (activeTab === 'orders') {
      setOrdersLoading(true);
      const q = query(collection(db, 'bookings'), where('clientId', '==', user.uid));
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
  }, [activeTab, user.uid]);

  useEffect(() => {
    if (activeTab === 'assignments') {
      setAssignmentsLoading(true);
      let q;
      if (role === 'photographer') {
        q = query(collection(db, 'bookings'), where('photographerId', '==', user.uid));
      } else if (role === 'editor') {
        q = query(collection(db, 'bookings'), where('editorId', '==', user.uid));
      } else if (role === 'other') {
        q = query(collection(db, 'bookings'), where('otherId', '==', user.uid));
      } else {
        setAssignmentsLoading(false);
        return;
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const assignmentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAssignments(assignmentsData);
        setAssignmentsLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'bookings');
        setAssignmentsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [activeTab, user.uid, role]);

  const calculateTotalDue = () => {
    return assignments.reduce((acc, curr) => {
      if (role === 'photographer' && !curr.photographerPaid) {
        return acc + (Number(curr.photographerPrice) || 0);
      }
      if (role === 'editor' && !curr.editorPaid) {
        return acc + (Number(curr.editorPrice) || 0);
      }
      if (role === 'other' && !curr.otherPaid) {
        return acc + (Number(curr.otherServicePrice) || 0);
      }
      return acc;
    }, 0);
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
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-2xl mb-8 w-fit">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
        >
          My Profile
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
        >
          My Orders
        </button>
        {(role === 'photographer' || role === 'editor' || role === 'other') && (
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'assignments' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
          >
            My Assignments
          </button>
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
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            <div className="pt-16 pb-8 px-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{user.displayName || 'User Profile'}</h1>
                  <p className="text-gray-500 flex items-center mt-1">
                    <Mail className="w-4 h-4 mr-2" />
                    {user.email}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-bold uppercase tracking-wider flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    {role || 'Client'}
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
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none transition-all"
                            placeholder="Enter your name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                          <input
                            type="email"
                            value={user.email || ''}
                            disabled
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed outline-none"
                          />
                          <p className="text-[10px] text-gray-400 mt-1 italic">Email cannot be changed for security reasons.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-black text-white px-8 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-gray-800 transition-all disabled:opacity-50 shadow-lg shadow-black/20"
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Save className="w-5 h-5" />
                        )}
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Sidebar Stats/Info */}
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Account Details</h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          Joined
                        </span>
                        <span className="font-bold text-gray-900">
                          {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center">
                          <Camera className="w-4 h-4 mr-2" />
                          Role
                        </span>
                        <span className="font-bold text-gray-900 capitalize">{role || 'Client'}</span>
                      </div>
                      {(role === 'photographer' || role === 'editor' || role === 'other') && (
                        <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-200">
                          <span className="text-gray-500 font-bold">Total Due</span>
                          <span className="font-black text-red-500 text-lg">₹{calculateTotalDue().toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-black text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="font-bold mb-2">Need Help?</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        If you need to change your role or have issues with your account, please contact our support team.
                      </p>
                      <button className="mt-4 text-xs font-bold underline hover:text-gray-300 transition-colors">
                        Contact Support
                      </button>
                    </div>
                    <CameraIcon className="absolute -right-4 -bottom-4 w-20 h-20 opacity-10" />
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
                <h2 className="text-3xl font-black text-gray-900">No Orders Yet</h2>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                  You haven't placed any photography orders yet. Once you book a session, you'll be able to track its progress here.
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
        ) : (
          <motion.div
            key="assignments"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-gray-900">My Assignments</h2>
                  <p className="text-gray-500 font-medium">Manage your assigned photography and editing tasks.</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Due Amount</p>
                  <p className="text-4xl font-black text-red-500">₹{calculateTotalDue().toLocaleString()}</p>
                </div>
              </div>

              {assignmentsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-black" />
                </div>
              ) : assignments.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {assignments.map((assignment) => {
                    const isPaid = role === 'photographer' ? assignment.photographerPaid : role === 'editor' ? assignment.editorPaid : assignment.otherPaid;
                    const price = role === 'photographer' ? assignment.photographerPrice : role === 'editor' ? assignment.editorPrice : assignment.otherServicePrice;

                    return (
                      <div key={assignment.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-black transition-all group">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <span className="px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                                #{assignment.invoiceNumber || 'N/A'}
                              </span>
                              <span className="text-gray-400 text-sm font-bold">
                                {assignment.eventDate ? format(new Date(assignment.eventDate), 'MMM d, yyyy') : 'Date N/A'}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-gray-900">{assignment.eventType}</h3>
                              <p className="text-gray-500 text-sm font-medium">{assignment.eventPlace}</p>
                            </div>
                            <div className="flex flex-wrap gap-4 pt-2">
                              <div className="flex items-center text-xs font-bold text-gray-600">
                                <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                                {assignment.clientName}
                              </div>
                              <div className="flex items-center text-xs font-bold text-gray-600">
                                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                {assignment.clientMobile}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col justify-between items-end text-right">
                            <div className="space-y-2">
                              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Your Fee</p>
                              <p className="text-2xl font-black text-gray-900">₹{Number(price || 0).toLocaleString()}</p>
                              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isPaid ? 'text-green-600 bg-green-50 border-green-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
                                {isPaid ? 'Paid' : 'Unpaid'}
                              </span>
                            </div>
                            <Link 
                              to={`/work-in-progress`}
                              className="mt-4 flex items-center text-xs font-black text-black hover:underline group-hover:translate-x-1 transition-transform"
                            >
                              Update Progress
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold">No assignments found.</p>
                </div>
              )}
            </div>

            {/* Work History Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-50 rounded-2xl">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Assignments</p>
                    <p className="text-2xl font-black text-gray-900">{assignments.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-50 rounded-2xl">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Paid Tasks</p>
                    <p className="text-2xl font-black text-gray-900">
                      {assignments.filter(a => role === 'photographer' ? a.photographerPaid : role === 'editor' ? a.editorPaid : a.otherPaid).length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-red-50 rounded-2xl">
                    <Clock className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Unpaid Tasks</p>
                    <p className="text-2xl font-black text-gray-900">
                      {assignments.filter(a => !(role === 'photographer' ? a.photographerPaid : role === 'editor' ? a.editorPaid : a.otherPaid)).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
