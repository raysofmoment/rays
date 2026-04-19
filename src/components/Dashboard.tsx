import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Calendar, Clock, CheckCircle, AlertCircle, TrendingUp, Users, Camera, Image as ImageIcon, MessageSquare, User as UserIcon } from 'lucide-react';
import Logo from './Logo';
import { Link } from 'react-router-dom';
import { format, isValid } from 'date-fns';

interface DashboardProps {
  user: User;
  role: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ user, role }) => {
  const [stats, setStats] = useState({
    pending: 0,
    confirmed: 0,
    completed: 0,
    totalOrders: 0,
    totalEarnings: 0,
    receivedAmount: 0,
    dueAmount: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [assignedBookings, setAssignedBookings] = useState<any[]>([]);
  const [pendingInfoBookings, setPendingInfoBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        let ordersQuery;
        if (role === 'admin') {
          ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5));
        } else if (role === 'photographer') {
          ordersQuery = query(collection(db, 'orders'), where('photographerIds', 'array-contains', user.uid), orderBy('createdAt', 'desc'), limit(5));
        } else if (role === 'editor') {
          ordersQuery = query(collection(db, 'orders'), where('editorIds', 'array-contains', user.uid), orderBy('createdAt', 'desc'), limit(5));
        } else if (role === 'other') {
          ordersQuery = query(collection(db, 'orders'), where('otherIds', 'array-contains', user.uid), orderBy('createdAt', 'desc'), limit(5));
        } else {
          ordersQuery = query(collection(db, 'orders'), where('clientId', '==', user.uid), orderBy('createdAt', 'desc'), limit(5));
          
          // Fetch confirmed bookings for client to check for missing info
          const bookingsQuery = query(
            collection(db, 'bookings'), 
            where('clientId', '==', user.uid),
            where('status', '==', 'confirmed')
          );
          const bookingsSnap = await getDocs(bookingsQuery);
          const missingInfo = bookingsSnap.docs.filter(doc => {
            const data = doc.data();
            const isWedding = ['WEDD BRIDESIDE', 'WEDD GROOM', 'WEDD BOTH'].includes(data.eventType);
            const isChildEvent = ['BIRTHDAY', 'ANNOPRASAN', 'UPANAYAN'].includes(data.eventType);
            
            if (isWedding) {
              return !data.brideName || !data.groomName;
            }
            if (isChildEvent) {
              return !data.childName;
            }
            return false;
          }).map(doc => ({ id: doc.id, ...doc.data() }));
          setPendingInfoBookings(missingInfo);
        }

        const snapshot = await getDocs(ordersQuery);
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        setRecentOrders(orders);

        // Fetch stats (simplified for demo)
        if (role === 'admin') {
          const allOrders = await getDocs(collection(db, 'orders'));
          const counts = allOrders.docs.reduce((acc: any, doc: any) => {
            const status = doc.data().status;
            acc[status] = (acc[status] || 0) + 1;
            acc.total += 1;
            return acc;
          }, { pending: 0, confirmed: 0, completed: 0, total: 0 });
          
          setStats(prev => ({
            ...prev,
            pending: counts.pending,
            confirmed: counts.confirmed,
            completed: counts.completed,
            totalOrders: counts.total
          }));
        } else if (role === 'photographer' || role === 'editor' || role === 'other') {
          // Fetch assigned bookings
          const bookingsRef = collection(db, 'bookings');
          const qPhotographer = query(bookingsRef, where('photographerIds', 'array-contains', user.uid));
          const qEditor = query(bookingsRef, where('editorIds', 'array-contains', user.uid));
          const qOther = query(bookingsRef, where('otherIds', 'array-contains', user.uid));

          const [snapP, snapE, snapO] = await Promise.all([
            getDocs(qPhotographer),
            getDocs(qEditor),
            getDocs(qOther)
          ]);

          const allBookings = [...snapP.docs, ...snapE.docs, ...snapO.docs].map(doc => ({ id: doc.id, ...doc.data() }));
          // Unique bookings
          const uniqueBookings = Array.from(new Map(allBookings.map(item => [item.id, item])).values());
          setAssignedBookings(uniqueBookings);

          let totalEarnings = 0;
          let receivedAmount = 0;

          uniqueBookings.forEach((booking: any) => {
            if ((booking.photographerIds || []).includes(user.uid)) {
              totalEarnings += Number(booking.photographerPrice || 0);
              if (booking.photographerPaid) receivedAmount += Number(booking.photographerPrice || 0);
            }
            if ((booking.editorIds || []).includes(user.uid)) {
              totalEarnings += Number(booking.videographerPrice || 0); // Using videographerPrice as editor price per current schema
              if (booking.editorPaid) receivedAmount += Number(booking.videographerPrice || 0);
            }
            if ((booking.otherIds || []).includes(user.uid)) {
              totalEarnings += Number(booking.otherServicePrice || 0);
              if (booking.otherPaid) receivedAmount += Number(booking.otherServicePrice || 0);
            }
          });

          setStats(prev => ({
            ...prev,
            totalEarnings,
            receivedAmount,
            dueAmount: totalEarnings - receivedAmount
          }));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, role]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome back, {user.displayName || 'Creator'}</h1>
        <p className="text-sm text-gray-500 mt-1">Here's what's happening with your photography business today.</p>
      </header>

      {role === 'client' && pendingInfoBookings.length > 0 && (
        <div className="mb-8 bg-black text-white p-6 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110" />
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-2">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-bold">Action Required: Complete Event Details</h2>
            </div>
            <p className="text-gray-400 text-sm mb-4">You have {pendingInfoBookings.length} confirmed booking(s) that need additional details (Bride/Groom or Child information). Please complete these to help us prepare for your event.</p>
            <Link 
              to="/orders" 
              className="inline-flex items-center space-x-2 bg-white text-black px-6 py-2 rounded-xl font-bold hover:bg-gray-100 transition-colors"
            >
              <span>Complete Now</span>
              <Camera className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Orders" value={stats.totalOrders} icon={<TrendingUp className="w-6 h-6 text-blue-600" />} color="bg-blue-50" />
          <StatCard title="Pending" value={stats.pending} icon={<Clock className="w-6 h-6 text-yellow-600" />} color="bg-yellow-50" />
          <StatCard title="Confirmed" value={stats.confirmed} icon={<CheckCircle className="w-6 h-6 text-green-600" />} color="bg-green-50" />
          <StatCard title="Completed" value={stats.completed} icon={<AlertCircle className="w-6 h-6 text-purple-600" />} color="bg-purple-50" />
        </div>
      )}

      {(role === 'photographer' || role === 'editor' || role === 'other') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Total Earnings" value={`₹${stats.totalEarnings}`} icon={<TrendingUp className="w-6 h-6 text-blue-600" />} color="bg-blue-50" />
          <StatCard title="Received" value={`₹${stats.receivedAmount}`} icon={<CheckCircle className="w-6 h-6 text-green-600" />} color="bg-green-50" />
          <StatCard title="Due Amount" value={`₹${stats.dueAmount}`} icon={<AlertCircle className="w-6 h-6 text-red-600" />} color="bg-red-50" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {(role === 'admin' || role === 'client') ? (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
                <Link to="/orders" className="text-sm font-medium text-black hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-gray-200">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <div key={order.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <Camera className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{order.packageName}</p>
                            <p className="text-xs text-gray-500">
                              {order.clientName} • {order.date && isValid(new Date(order.date)) ? format(new Date(order.date), 'MMM d, yyyy') : 'No Date'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                          <p className="text-sm font-bold text-gray-900">₹{order.totalAmount}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center">
                    <p className="text-gray-500">No recent orders found.</p>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Assigned Projects</h2>
                <Link to="/bookings" className="text-sm font-medium text-black hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-gray-200">
                {assignedBookings.length > 0 ? (
                  assignedBookings.map((booking) => (
                    <div key={booking.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <Camera className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{booking.clientName} - {booking.eventType}</p>
                            <p className="text-xs text-gray-500">
                              {booking.location} • {booking.date && isValid(new Date(booking.date)) ? format(new Date(booking.date), 'MMM d, yyyy') : 'No Date'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-right">
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              ₹{(booking.photographerIds || []).includes(user.uid) ? booking.photographerPrice : 
                                (booking.editorIds || []).includes(user.uid) ? booking.videographerPrice : 
                                booking.otherServicePrice}
                            </p>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              ((booking.photographerIds || []).includes(user.uid) && booking.photographerPaid) ||
                              ((booking.editorIds || []).includes(user.uid) && booking.editorPaid) ||
                              ((booking.otherIds || []).includes(user.uid) && booking.otherPaid)
                              ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {((booking.photographerIds || []).includes(user.uid) && booking.photographerPaid) ||
                              ((booking.editorIds || []).includes(user.uid) && booking.editorPaid) ||
                              ((booking.otherIds || []).includes(user.uid) && booking.otherPaid)
                              ? 'Paid' : 'Due'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center">
                    <p className="text-gray-500">No assigned projects found.</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-8">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <QuickAction icon={<UserIcon className="w-5 h-5" />} label="My Profile" to="/profile" />
              <QuickAction icon={<Calendar className="w-5 h-5" />} label="New Order" to="/orders" />
              <QuickAction icon={<ImageIcon className="w-5 h-5" />} label="Galleries" to="/gallery" />
              <QuickAction icon={<Users className="w-5 h-5" />} label="Team" to="/team" />
              {role === 'admin' && (
                <QuickAction icon={<MessageSquare className="w-5 h-5" />} label="Inquiries" to="/inquiries" />
              )}
              <QuickAction icon={<TrendingUp className="w-5 h-5" />} label="Financials" to="/financial-overview" />
            </div>
          </section>

          <section className="bg-black text-white rounded-2xl shadow-lg p-6 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-lg font-bold mb-2">Pro Tip</h2>
              <p className="text-gray-400 text-sm">Keep your portfolio updated to attract more high-value clients. High-quality galleries lead to 40% more referrals.</p>
            </div>
            <Logo className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10" light />
          </section>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-center space-x-4 hover:shadow-md hover:border-gray-300 transition-all group">
    <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-black text-gray-900 mt-0.5">{value}</p>
    </div>
  </div>
);

const QuickAction = ({ icon, label, to }: any) => (
  <Link to={to} className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border border-gray-100 hover:border-black hover:bg-gray-50 transition-all group">
    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-black group-hover:text-white transition-colors">
      {icon}
    </div>
    <span className="text-[10px] sm:text-xs font-medium text-gray-600 group-hover:text-black">{label}</span>
  </Link>
);

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

export default Dashboard;
