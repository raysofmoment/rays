import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  CreditCard, 
  UserSquare2, 
  Clock, 
  Settings,
  ChevronRight,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  MoreVertical,
  DollarSign,
  PieChart,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Import existing components to reuse them as "Tabs" or "Views"
import Dashboard from './Dashboard';
import OrderManagement from './OrderManagement';
import TeamManagement from './TeamManagement';
import EmployeeList from './EmployeeList';
import PaymentManagement from './PaymentManagement';
import EventCostManagement from './EventCostManagement';
import FinancialOverview from './FinancialOverview';
import WorkInProgress from './WorkInProgress';
import InquiryManagement from './InquiryManagement';
import CRMModal from './CRMModal';
import BookingManagement from './BookingManagement';
import ProjectOverview from './ProjectOverview';

interface StudioHubProps {
  user: User;
  role: string | null;
}

type ActiveTab = 'overview' | 'projects' | 'team' | 'financials' | 'clients' | 'wip' | 'inquiries' | 'project-overview';

const StudioHub: React.FC<StudioHubProps> = ({ user, role }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalEarnings: 0,
    activeTeam: 0,
    pendingInquiries: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== 'admin') {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const teamSnap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['photographer', 'editor', 'other'])));
        const inquiriesSnap = await getDocs(query(collection(db, 'serviceInquiries')));

        const orders = ordersSnap.docs.map(doc => doc.data());
        const totalEarnings = orders.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);

        setStats({
          totalOrders: ordersSnap.size,
          pendingOrders: orders.filter(o => o.status === 'pending').length,
          totalEarnings,
          activeTeam: teamSnap.size,
          pendingInquiries: inquiriesSnap.size
        });
      } catch (error) {
        console.error('Error fetching hub stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [role]);

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'photographer', 'editor', 'other'] },
    { id: 'projects', label: 'Orders & Projects', icon: Briefcase, roles: ['admin', 'photographer', 'editor', 'other'] },
    { id: 'project-overview', label: 'Project Status', icon: TrendingUp, roles: ['admin', 'editor'] },
    { id: 'wip', label: 'Work in Progress', icon: Clock, roles: ['admin', 'photographer', 'editor', 'other'] },
    { id: 'financials', label: 'Payments & Costs', icon: CreditCard, roles: ['admin'] },
    { id: 'team', label: 'Team & Employees', icon: Users, roles: ['admin'] },
    { id: 'clients', label: 'Client CRM', icon: UserSquare2, roles: ['admin'] },
    { id: 'inquiries', label: 'Inquiries', icon: PieChart, roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(role || ''));

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Dashboard user={user} role={role} />;
      case 'projects':
        return <OrderManagement user={user} role={role} />;
      case 'wip':
        return <WorkInProgress user={user} role={role} />;
      case 'financials':
        return (
          <div className="space-y-8">
            <FinancialOverview userRole={role || ''} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold mb-4">Recent Payments</h3>
                <PaymentManagement />
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold mb-4">Event Costs</h3>
                <EventCostManagement user={user} role={role} />
              </div>
            </div>
          </div>
        );
      case 'team':
        return (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold mb-4">Employee Directory</h3>
              <EmployeeList userRole={role || ''} />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold mb-4">Team Management</h3>
              <TeamManagement user={user} role={role} />
            </div>
          </div>
        );
      case 'clients':
        return <BookingManagement user={user} role={role} />;
      case 'project-overview':
        return <ProjectOverview />;
      case 'inquiries':
        return <InquiryManagement />;
      default:
        return <Dashboard user={user} role={role} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Studio Hub</h2>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{role}</p>
            </div>
          </div>
        </div>

        <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? 'bg-black text-white shadow-lg shadow-black/10'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-gray-400'}`} />
              <span className="font-medium text-sm">{item.label}</span>
              {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-3">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}`} 
                alt="Profile" 
                className="w-8 h-8 rounded-full border border-gray-200"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-900 truncate">{user.displayName || 'User'}</p>
                <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <button className="w-full py-2 text-xs font-bold text-gray-600 hover:text-black transition-colors">
              Hub Settings
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto">
        {/* Hub Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-40 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 capitalize">{activeTab.replace('-', ' ')}</h1>
            <p className="text-xs text-gray-500">Manage your studio operations seamlessly.</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span>Live System</span>
            </div>
            <button className="p-2 text-gray-400 hover:text-black transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="p-8">
          {/* Quick Stats Row (Only on Overview) */}
          {activeTab === 'overview' && role === 'admin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">+12%</span>
                </div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.totalOrders}</h3>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">Action</span>
                </div>
                <p className="text-sm text-gray-500">Pending Orders</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</h3>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Revenue</span>
                </div>
                <p className="text-sm text-gray-500">Total Earnings</p>
                <h3 className="text-2xl font-bold text-gray-900">₹{stats.totalEarnings.toLocaleString()}</h3>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Team</span>
                </div>
                <p className="text-sm text-gray-500">Active Team</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.activeTeam}</h3>
              </div>
            </div>
          )}

          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default StudioHub;
