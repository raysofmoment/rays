import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, or, onSnapshot, doc, getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  User as UserIcon, 
  Camera, 
  Edit2, 
  Users as UsersIcon,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Search,
  Filter,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface AssignmentsAndPaymentsProps {
  user: User;
  role: string | null;
}

const AssignmentsAndPayments: React.FC<AssignmentsAndPaymentsProps> = ({ user, role }) => {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, ongoing, completed
  const [paymentStatus, setPaymentStatus] = useState('all'); // all, paid, pending

  useEffect(() => {
    let q;
    if (role === 'admin') {
      // Admins see all assignments
      q = query(collection(db, 'bookings'));
    } else {
      // Staff see only their own assignments
      q = query(
        collection(db, 'bookings'),
        or(
          where('photographerId', '==', user.uid),
          where('editorId', '==', user.uid),
          where('otherId', '==', user.uid),
          where('photographerIds', 'array-contains', user.uid),
          where('editorIds', 'array-contains', user.uid),
          where('otherIds', 'array-contains', user.uid)
        )
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssignments(data.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid, role]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter(item => {
      const matchesSearch = 
        item.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.venue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.eventType?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = 
        filterType === 'all' || 
        (filterType === 'ongoing' && item.status !== 'delivered') ||
        (filterType === 'completed' && item.status === 'delivered');

      // For staff, check if they have pending payments
      const hasDues = role !== 'admin' 
        ? item.staffPayments?.[user.uid]?.totalFee - (item.staffPayments?.[user.uid]?.paidAmount || 0) > 0
        : false; // Admins logic differ

      const matchesPayment = 
        paymentStatus === 'all' ||
        (paymentStatus === 'pending' && hasDues) ||
        (paymentStatus === 'paid' && !hasDues);

      return matchesSearch && matchesType && matchesPayment;
    });
  }, [assignments, searchTerm, filterType, paymentStatus, role, user.uid]);

  const stats = useMemo(() => {
    if (role === 'admin') return null;
    return assignments.reduce((acc, item) => {
      const payment = item.staffPayments?.[user.uid];
      if (payment) {
        acc.totalEarned += (Number(payment.totalFee) || 0);
        acc.received += (Number(payment.paidAmount) || 0);
        acc.due += ((Number(payment.totalFee) || 0) - (Number(payment.paidAmount) || 0));
        acc.projectCount += 1;
      }
      return acc;
    }, { totalEarned: 0, received: 0, due: 0, projectCount: 0 });
  }, [assignments, user.uid, role]);

  const handlePayStaff = async (orderId: string, staffUid: string, amount: number, method: string) => {
    if (amount <= 0) return;
    try {
      const orderRef = doc(db, 'bookings', orderId);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        const currentStaffData = orderData.staffPayments?.[staffUid] || { totalFee: 0, paidAmount: 0, payments: [] };
        
        const date = new Date().toISOString();
        const newPayments = [...(currentStaffData.payments || []), { amount, date, method }];
        const newPaidAmount = newPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        
        const updatedStaffPayments = {
          ...orderData.staffPayments,
          [staffUid]: {
            ...currentStaffData,
            paidAmount: newPaidAmount,
            lastPaymentDate: date,
            payments: newPayments
          }
        };

        const updates = { staffPayments: updatedStaffPayments };
        await updateDoc(orderRef, updates);
        
        // Sync with orders collection for reporting
        const q = query(collection(db, 'orders'), where('bookingId', '==', orderId));
        const orderDocs = await getDocs(q);
        if (!orderDocs.empty) {
          await updateDoc(doc(db, 'orders', orderDocs.docs[0].id), updates);
        }

        toast.success(`₹${amount} paid successfully.`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${orderId}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-black text-white rounded-xl">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Assignments & Payments</h1>
            </div>
            <p className="text-gray-500 font-medium">
              {role === 'admin' ? 'Monitor all staff assignments and financial settlements' : 'Track your assigned projects and earnings progress'}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
              <input 
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:border-black outline-none w-full md:w-64 transition-all shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Staff Stats Summary */}
        {stats && stats.projectCount > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <StatCard 
              label="Total Projects" 
              value={stats.projectCount} 
              icon={<ClipboardList className="w-5 h-5" />} 
              color="indigo" 
            />
            <StatCard 
              label="Total Earnings" 
              value={`₹${stats.totalEarned.toLocaleString()}`} 
              icon={<TrendingUp className="w-5 h-5" />} 
              color="black" 
            />
            <StatCard 
              label="Received" 
              value={`₹${stats.received.toLocaleString()}`} 
              icon={<CheckCircle2 className="w-5 h-5" />} 
              color="green" 
            />
            <StatCard 
              label="Pending Due" 
              value={`₹${stats.due.toLocaleString()}`} 
              icon={<Clock className="w-5 h-5" />} 
              color="orange" 
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'all' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
            >
              All Time
            </button>
            <button 
              onClick={() => setFilterType('ongoing')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'ongoing' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
            >
              Ongoing
            </button>
            <button 
              onClick={() => setFilterType('completed')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'completed' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
            >
              Delivered
            </button>
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
             <button 
              onClick={() => setPaymentStatus('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${paymentStatus === 'all' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-green-600'}`}
            >
              All Payments
            </button>
            <button 
              onClick={() => setPaymentStatus('pending')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${paymentStatus === 'pending' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:text-orange-500'}`}
            >
              Pending Dues
            </button>
          </div>
        </div>

        {/* Assignments List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4" />
            <p className="text-gray-400 font-medium font-mono text-sm uppercase tracking-widest">Scanning Databases...</p>
          </div>
        ) : filteredAssignments.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {filteredAssignments.map((item) => (
              <AssignmentRow 
                key={item.id} 
                item={item} 
                currentUserUid={user.uid} 
                role={role} 
                onPay={handlePayStaff}
              />
            ))}
          </div>
        ) : (
          <div className="py-24 bg-white rounded-[3rem] border border-dashed border-gray-200 text-center shadow-inner">
            <ClipboardList className="w-16 h-16 text-gray-100 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No Assignments Found</h3>
            <p className="text-gray-300 text-sm mt-1">Assignments will appear here once you are added to a project.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    black: 'bg-gray-900 text-white border-transparent',
    green: 'bg-green-50 text-green-600 border-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100'
  };

  return (
    <div className={`p-6 rounded-[2.5rem] border shadow-sm transition-all hover:shadow-md ${colors[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-2xl ${color === 'black' ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
          {icon}
        </div>
        <ArrowUpRight className="w-4 h-4 opacity-30" />
      </div>
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${color === 'black' ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
};

const AssignmentRow = ({ item, currentUserUid, role, onPay }: any) => {
  const isSelf = (uid: string) => uid === currentUserUid;
  
  // Find my specific role and payment in this project
  const myPayment = item.staffPayments?.[currentUserUid];
  const due = myPayment ? (Number(myPayment.totalFee) || 0) - (Number(myPayment.paidAmount) || 0) : 0;

  // Determine what list(s) the user is in
  const roles = [];
  if (item.photographerId === currentUserUid || item.photographerIds?.includes(currentUserUid)) roles.push('Photographer');
  if (item.editorId === currentUserUid || item.editorIds?.includes(currentUserUid)) roles.push('Editor');
  if (item.otherId === currentUserUid || item.otherIds?.includes(currentUserUid)) roles.push('Staff');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden group"
    >
      <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center">
        {/* Project Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-3">
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
              item.status === 'delivered' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'
            }`}>
              {item.status || 'Ongoing'}
            </span>
            <div className="flex items-center space-x-1 text-gray-400 font-mono text-[10px]">
              <Calendar className="w-3 h-3" />
              <span>{item.date ? format(new Date(item.date), 'MMM dd, yyyy') : 'TBD'}</span>
            </div>
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-1 truncate">{item.clientName}'s {item.eventType}</h3>
          <div className="flex items-center text-gray-500 space-x-2 text-sm font-medium">
            <span className="truncate">{item.venue || 'No venue assigned'}</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full" />
            <span className="text-black font-bold uppercase text-[10px] tracking-widest">{roles.join(' & ') || 'Staff'}</span>
          </div>
        </div>

        {/* Financial Section */}
        <div className="w-full md:w-auto flex flex-wrap md:flex-nowrap items-center gap-6 pt-6 md:pt-0 border-t md:border-t-0 border-gray-50">
          {(role === 'admin' || myPayment) && (
            <div className="grid grid-cols-3 gap-6 md:gap-8 pr-6 md:border-r border-gray-100">
               <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Contract</p>
                <p className="text-lg font-black text-gray-900">₹{role === 'admin' ? item.totalPackageAmount?.toLocaleString() : myPayment?.totalFee?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest mb-1">Received</p>
                <p className="text-lg font-black text-green-600">₹{role === 'admin' ? item.paidAmount?.toLocaleString() : myPayment?.paidAmount?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mb-1">{role === 'admin' ? 'Total Due' : 'Balance'}</p>
                <p className={`text-lg font-black ${due > 0 || (role === 'admin' && item.dueAmount > 0) ? 'text-orange-500' : 'text-gray-300'}`}>
                  ₹{role === 'admin' ? item.dueAmount?.toLocaleString() : due.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Admin Payment Controls */}
          {role === 'admin' && (
            <div className="flex flex-col gap-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manage Staff Payments</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(item.staffPayments || {}).map(([uid, data]: any) => {
                  const staffDue = (data.totalFee || 0) - (data.paidAmount || 0);
                  if (staffDue <= 0) return null;

                  return (
                    <div key={uid} className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                      <div className="text-[10px] font-bold">
                        <span className="text-gray-400 mr-2">UID:{uid.slice(0,4)}...</span>
                        <span className="text-orange-600">₹{staffDue}</span>
                      </div>
                      <button 
                        onClick={() => onPay(item.id, uid, staffDue, 'Cash')}
                        className="text-[9px] font-black bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-black transition-all uppercase tracking-widest"
                      >
                        Settle
                      </button>
                    </div>
                  );
                })}
                {Object.keys(item.staffPayments || {}).length === 0 && <span className="text-[10px] text-gray-300 italic">No staff fees set</span>}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
             <button className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all shadow-sm">
              <Info className="w-5 h-5" />
            </button>
            <button className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all shadow-sm">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Feed (Simple) */}
      {(myPayment?.payments?.length > 0 || role === 'admin') && (
        <div className="px-8 pb-6 bg-gray-50/30">
          <div className="h-px bg-gray-100 w-full mb-4" />
          <div className="flex flex-wrap gap-4">
             {myPayment?.payments?.slice(-2).map((p: any, i: number) => (
               <div key={i} className="flex items-center space-x-2 text-[10px] font-medium text-gray-400 bg-white px-3 py-1.5 rounded-full border border-gray-100">
                 <DollarSign className="w-3 h-3 text-green-500" />
                 <span>Received ₹{p.amount} via {p.method} on {format(new Date(p.date), 'MMM d')}</span>
               </div>
             ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AssignmentsAndPayments;
