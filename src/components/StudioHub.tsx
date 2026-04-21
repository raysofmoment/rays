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
  Calendar,
  Camera,
  Image as ImageIcon,
  Cloud,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'motion/react';

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
import TeamPortfolio from './TeamPortfolio';
import PhotoSelection from './PhotoSelection';

interface StudioHubProps {
  user: User;
  role: string | null;
}

type ActiveTab = 'overview' | 'projects' | 'team' | 'financials' | 'clients' | 'wip' | 'inquiries' | 'project-overview' | 'portfolio' | 'selection';

const StudioHub: React.FC<StudioHubProps> = ({ user, role }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
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

        const orders = ordersSnap.docs.map(doc => doc.data() || {});
        const totalEarnings = orders.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);

        setStats({
          totalOrders: ordersSnap.size,
          pendingOrders: orders.filter(o => o && o.status === 'pending').length,
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

  useEffect(() => {
    const checkDriveStatus = async () => {
      try {
        const response = await fetch(`${window.location.origin}/api/auth/google/status`);
        if (!response.ok) return; // Prevent parsing non-200 responses like 'Rate exceeded'
        const data = await response.json();
        
        if (!data.connected && role === 'admin') {
          // Sync tokens from Firestore if they exist
          const { doc, getDoc } = await import('firebase/firestore');
          const docRef = doc(db, 'settings', 'google_drive');
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const tokens = docSnap.data().value;
            await fetch(`${window.location.origin}/api/auth/google/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tokens })
            });
            setIsDriveConnected(true);
            return;
          }
        }
        
        setIsDriveConnected(data.connected);
      } catch (err) {
        console.error('Error checking Drive status:', err);
      }
    };
    checkDriveStatus();

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        if (event.data.tokens && role === 'admin') {
          const { doc, setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'settings', 'google_drive'), {
            value: event.data.tokens,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        checkDriveStatus();
        toast.success('Google Drive connected successfully!');
        setIsConnectingDrive(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectDrive = async () => {
    setIsConnectingDrive(true);
    try {
      const response = await fetch(`${window.location.origin}/api/auth/google/url`);
      if (!response.ok) {
        try {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to get auth URL');
        } catch {
          const errText = await response.text();
          throw new Error(errText || 'Failed to get auth URL');
        }
      }
      const data = await response.json();
      if (data.url) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.url,
          'google_drive_auth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          toast.error('Popup blocked. Please allow popups for this site.');
          setIsConnectingDrive(false);
        }
      }
    } catch (error: any) {
      console.error('Error connecting to Google Drive:', error);
      toast.error(error.message || 'Failed to initiate Google Drive connection');
      setIsConnectingDrive(false);
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'photographer', 'editor', 'other'] },
    { id: 'projects', label: 'Orders & Projects', icon: Briefcase, roles: ['admin', 'photographer', 'editor', 'other'] },
    { id: 'project-overview', label: 'Project Status', icon: TrendingUp, roles: ['admin', 'editor'] },
    { id: 'wip', label: 'Work in Progress', icon: Clock, roles: ['admin', 'photographer', 'editor', 'other'] },
    { id: 'portfolio', label: 'Team Portfolio', icon: Camera, roles: ['admin', 'photographer', 'editor', 'other'] },
    { id: 'selection', label: 'Photo Selection', icon: ImageIcon, roles: ['admin', 'photographer', 'editor'] },
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
      case 'portfolio':
        return <TeamPortfolio />;
      case 'selection':
        return <PhotoSelection user={user} role={role} />;
      default:
        return <Dashboard user={user} role={role} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen">
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
              className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl transition-all ${
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
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto">
        {/* Hub Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 sticky top-0 z-40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div>
              <h1 className="text-xl font-bold text-gray-900 capitalize leading-none mb-1">{activeTab.replace('-', ' ')}</h1>
              <p className="text-[10px] md:text-xs text-gray-500">Manage your studio operations seamlessly.</p>
            </div>
            {/* Mobile Stats Toggle or Info could go here */}
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            <div className={`flex flex-shrink-0 items-center space-x-2 px-3 py-1.5 ${isDriveConnected ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'} rounded-full text-[10px] font-bold uppercase`}>
              <Cloud className={`w-3 h-3 ${isDriveConnected ? 'text-blue-500' : 'text-yellow-500'}`} />
              <span className="whitespace-nowrap">Drive: {isDriveConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            {!isDriveConnected && (
              <button 
                onClick={handleConnectDrive}
                disabled={isConnectingDrive}
                className="flex-shrink-0 bg-black text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase hover:bg-gray-800 transition-all flex items-center space-x-2"
              >
                {isConnectingDrive ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
                <span className="whitespace-nowrap">Connect Drive</span>
              </button>
            )}
            <div className="flex flex-shrink-0 items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase whitespace-nowrap">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span>Live System</span>
            </div>
          </div>
        </header>

        {/* Mobile Sub-Navigation */}
        <div className="lg:hidden bg-white border-b border-gray-200 sticky top-[73px] md:top-[65px] z-30 overflow-x-auto no-scrollbar flex items-center px-4 py-2 space-x-2">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all ${
                activeTab === item.id
                  ? 'bg-black text-white shadow-md'
                  : 'text-gray-500 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-3 h-3" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 md:p-8">
          {/* Quick Stats Row (Only on Overview) */}
          {activeTab === 'overview' && role === 'admin' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg group-hover:scale-110 transition-transform">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">+12%</span>
                </div>
                <p className="text-sm text-gray-500 font-medium">Total Orders</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalOrders}</h3>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-yellow-50 rounded-lg group-hover:scale-110 transition-transform">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">Action</span>
                </div>
                <p className="text-sm text-gray-500 font-medium">Pending Orders</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingOrders}</h3>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-50 rounded-lg group-hover:scale-110 transition-transform">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Revenue</span>
                </div>
                <p className="text-sm text-gray-500 font-medium">Total Earnings</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">₹{stats.totalEarnings.toLocaleString()}</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-purple-50 rounded-lg group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Team</span>
                </div>
                <p className="text-sm text-gray-500 font-medium">Active Team</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.activeTeam}</h3>
              </div>
            </div>
          )}

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default StudioHub;
