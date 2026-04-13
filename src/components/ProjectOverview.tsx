import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Clock, 
  DollarSign, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  Filter,
  ArrowUpRight,
  UserCheck,
  Calendar,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Booking {
  id: string;
  clientName: string;
  eventType: string;
  eventDate: string;
  status: string;
  dueAmount: number;
  totalPackageAmount: number;
  editorName?: string;
  editorId?: string;
  editorIds?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  teaserStatus?: string;
  fullVideoStatus?: string;
  videoStatus?: string;
  editPhotoStatus?: string;
  albumDesignStatus?: string;
}

const ProjectOverview: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'dues' | 'priority'>('all');

  useEffect(() => {
    // Fetch users to map IDs to names
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const map: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        map[doc.id] = data.displayName || data.email || 'Unknown';
      });
      setUsersMap(map);
    });

    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribeBookings = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      setBookings(data);
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeBookings();
    };
  }, []);

  const getEditorDisplay = (booking: Booking) => {
    if (booking.editorName) return booking.editorName;
    if (booking.editorId && usersMap[booking.editorId]) return usersMap[booking.editorId];
    if (booking.editorIds && booking.editorIds.length > 0) {
      return booking.editorIds.map(id => usersMap[id] || id).join(', ');
    }
    return null;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.eventType.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'pending') return matchesSearch && booking.status !== 'completed';
    if (filter === 'dues') return matchesSearch && (booking.dueAmount || 0) > 0;
    if (filter === 'priority') return matchesSearch && (booking.priority === 'urgent' || booking.priority === 'high');
    return matchesSearch;
  });

  const stats = {
    pendingWork: bookings.filter(b => b.status !== 'completed').length,
    totalDues: bookings.reduce((acc, b) => acc + (b.dueAmount || 0), 0),
    urgentProjects: bookings.filter(b => b.priority === 'urgent').length,
    activeEditors: new Set(bookings.map(b => getEditorDisplay(b)).filter(Boolean)).size
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Pending Work</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.pendingWork}</h3>
            </div>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-1000" 
              style={{ width: `${(stats.pendingWork / bookings.length) * 100}%` }}
            />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-50 rounded-2xl">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Dues</p>
              <h3 className="text-2xl font-bold text-gray-900">₹{stats.totalDues.toLocaleString()}</h3>
            </div>
          </div>
          <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Action Required</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-orange-50 rounded-2xl">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Urgent Projects</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.urgentProjects}</h3>
            </div>
          </div>
          <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">High Priority</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-50 rounded-2xl">
              <UserCheck className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Editors</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.activeEditors}</h3>
            </div>
          </div>
          <p className="text-[10px] text-purple-500 font-bold uppercase tracking-wider">Resource Allocation</p>
        </motion.div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by client or event..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all text-sm"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {(['all', 'pending', 'dues', 'priority'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                filter === f 
                  ? 'bg-black text-white shadow-lg shadow-black/10' 
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Client & Event</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Priority</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Editor</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Financials</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Work Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence mode="popLayout">
                {filteredBookings.map((booking) => (
                  <motion.tr 
                    key={booking.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold">
                          {booking.clientName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{booking.clientName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{booking.eventType}</span>
                            <span className="text-[10px] text-gray-300">•</span>
                            <span className="text-[10px] text-gray-400">{booking.eventDate}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border ${getPriorityColor(booking.priority)}`}>
                        {booking.priority || 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getEditorDisplay(booking) ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 text-purple-600" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 max-w-[120px] truncate" title={getEditorDisplay(booking) || ''}>
                            {getEditorDisplay(booking)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-xs font-bold text-gray-900">₹{booking.totalPackageAmount?.toLocaleString()}</p>
                        {(booking.dueAmount || 0) > 0 ? (
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold text-red-500">₹{booking.dueAmount.toLocaleString()} Due</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-green-500 uppercase">Paid</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {[
                          { label: 'T', status: booking.teaserStatus },
                          { label: 'V', status: booking.fullVideoStatus },
                          { label: 'A', status: booking.albumDesignStatus },
                          { label: 'P', status: booking.editPhotoStatus }
                        ].map((item, idx) => (
                          <div 
                            key={idx}
                            title={`${item.label}: ${item.status || 'pending'}`}
                            className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold border ${
                              item.status === 'delivered' 
                                ? 'bg-green-50 text-green-600 border-green-100' 
                                : item.status === 'review'
                                ? 'bg-yellow-50 text-yellow-600 border-yellow-100'
                                : 'bg-gray-50 text-gray-400 border-gray-100'
                            }`}
                          >
                            {item.label}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-400 hover:text-black">
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProjectOverview;
