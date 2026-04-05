import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { TrendingUp, TrendingDown, IndianRupee, PieChart, Briefcase, Camera, ShoppingBag, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell, PieChart as RePieChart, Pie } from 'recharts';

interface FinancialOverviewProps {
  userRole: string | null;
}

const FinancialOverview: React.FC<FinancialOverviewProps> = ({ userRole }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalRevenue: 0,
    totalExpenses: {
      team: 0,
      eventCosts: 0,
      equipment: 0,
      store: 0,
      total: 0
    },
    projectProfits: [] as any[],
    monthlyData: [] as any[],
    equipmentList: [] as any[],
    storeList: [] as any[],
    otherExpenses: [] as any[]
  });

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        const [bookingsSnap, eventCostsSnap, equipmentSnap, storeSnap, paymentsSnap] = await Promise.all([
          getDocs(collection(db, 'bookings')),
          getDocs(collection(db, 'eventCosts')),
          getDocs(collection(db, 'equipment')),
          getDocs(collection(db, 'store')),
          getDocs(collection(db, 'payments'))
        ]);

        const bookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const eventCosts = eventCostsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const equipment = equipmentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const store = storeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const payments = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

        // 1. Total Revenue (Confirmed Payments)
        const confirmedPayments = payments.filter(p => p.status === 'confirmed');
        const totalRevenue = confirmedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // 2. Team Payments (from bookings)
        const teamPayments = bookings.reduce((sum, b) => {
          return sum + (Number(b.photographerPrice) || 0) + (Number(b.videographerPrice) || 0) + (Number(b.otherServicePrice) || 0);
        }, 0);

        // 3. Event Costs (Other expenses)
        const totalEventCosts = eventCosts.reduce((sum, ec) => {
          return sum + 
            (ec.travelExtra || 0) + (ec.caligraphy || 0) + (ec.weddingVideo || 0) + 
            (ec.weddingTeaser || 0) + (ec.weddingPhoto || 0) + (ec.box || 0) + 
            (ec.other || 0) + (ec.albumDesign || 0) + (ec.albumPrint || 0) + 
            (ec.prePhoto || 0) + (ec.preVideo || 0) + (ec.lidGenerate || 0) + 
            (ec.gift || 0) + (ec.pendrive || 0) + (ec.tvLedProjector || 0);
        }, 0);

        // 4. Equipment Costs
        const totalEquipmentCosts = equipment.reduce((sum, e) => sum + (e.price || 0), 0);

        // 5. Store Costs
        const totalStoreCosts = store.reduce((sum, s) => sum + ((s.price || 0) * (s.quantity || 1)), 0);

        // 6. Project Profits
        const projectProfits = bookings.map(b => {
          const linkedCosts = eventCosts.find(ec => ec.invoice === b.invoiceNumber);
          const eventCostSum = linkedCosts ? (
            (linkedCosts.travelExtra || 0) + (linkedCosts.caligraphy || 0) + (linkedCosts.weddingVideo || 0) + 
            (linkedCosts.weddingTeaser || 0) + (linkedCosts.weddingPhoto || 0) + (linkedCosts.box || 0) + 
            (linkedCosts.other || 0) + (linkedCosts.albumDesign || 0) + (linkedCosts.albumPrint || 0) + 
            (linkedCosts.prePhoto || 0) + (linkedCosts.preVideo || 0) + (linkedCosts.lidGenerate || 0) + 
            (linkedCosts.gift || 0) + (linkedCosts.pendrive || 0) + (linkedCosts.tvLedProjector || 0)
          ) : 0;

          const teamCost = (Number(b.photographerPrice) || 0) + (Number(b.videographerPrice) || 0) + (Number(b.otherServicePrice) || 0);
          const totalProjectCost = eventCostSum + teamCost;
          const revenue = b.totalPackageAmount || 0;
          const profit = revenue - totalProjectCost;

          return {
            id: b.id,
            clientName: b.clientName,
            eventType: b.eventType,
            date: b.eventDate,
            revenue,
            cost: totalProjectCost,
            profit,
            profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0
          };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Monthly Data for Chart
        const monthlyMap = new Map();
        confirmedPayments.forEach(p => {
          const month = format(new Date(p.date), 'MMM yyyy');
          const current = monthlyMap.get(month) || { month, revenue: 0, expenses: 0 };
          current.revenue += p.amount;
          monthlyMap.set(month, current);
        });

        // Add expenses to monthly map (simplified: using booking date for team/event costs)
        bookings.forEach(b => {
          const month = format(new Date(b.eventDate), 'MMM yyyy');
          const current = monthlyMap.get(month) || { month, revenue: 0, expenses: 0 };
          const linkedCosts = eventCosts.find(ec => ec.invoice === b.invoiceNumber);
          const eventCostSum = linkedCosts ? (
            (linkedCosts.travelExtra || 0) + (linkedCosts.caligraphy || 0) + (linkedCosts.weddingVideo || 0) + 
            (linkedCosts.weddingTeaser || 0) + (linkedCosts.weddingPhoto || 0) + (linkedCosts.box || 0) + 
            (linkedCosts.other || 0) + (linkedCosts.albumDesign || 0) + (linkedCosts.albumPrint || 0) + 
            (linkedCosts.prePhoto || 0) + (linkedCosts.preVideo || 0) + (linkedCosts.lidGenerate || 0) + 
            (linkedCosts.gift || 0) + (linkedCosts.pendrive || 0) + (linkedCosts.tvLedProjector || 0)
          ) : 0;
          const teamCost = (Number(b.photographerPrice) || 0) + (Number(b.videographerPrice) || 0) + (Number(b.otherServicePrice) || 0);
          current.expenses += (eventCostSum + teamCost);
          monthlyMap.set(month, current);
        });

        const monthlyData = Array.from(monthlyMap.values()).sort((a, b) => {
          return new Date(a.month).getTime() - new Date(b.month).getTime();
        });

        setData({
          totalRevenue,
          totalExpenses: {
            team: teamPayments,
            eventCosts: totalEventCosts,
            equipment: totalEquipmentCosts,
            store: totalStoreCosts,
            total: teamPayments + totalEventCosts + totalEquipmentCosts + totalStoreCosts
          },
          projectProfits,
          monthlyData,
          equipmentList: equipment,
          storeList: store,
          otherExpenses: eventCosts
        });

      } catch (error) {
        console.error('Error fetching financial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, []);

  if (userRole !== 'admin') {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-gray-500">Only administrators can view financial reports.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  const netProfit = data.totalRevenue - data.totalExpenses.total;
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const pieData = [
    { name: 'Team Payments', value: data.totalExpenses.team },
    { name: 'Event Costs', value: data.totalExpenses.eventCosts },
    { name: 'Equipment', value: data.totalExpenses.equipment },
    { name: 'Store', value: data.totalExpenses.store },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Financial Overview</h1>
        <p className="text-gray-500 mt-1">Comprehensive analysis of company revenue, expenses, and profits.</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard 
          title="Total Revenue" 
          value={`₹${data.totalRevenue.toLocaleString()}`} 
          icon={<TrendingUp className="w-6 h-6 text-green-600" />} 
          color="bg-green-50"
          subtitle="Confirmed payments"
        />
        <SummaryCard 
          title="Total Expenses" 
          value={`₹${data.totalExpenses.total.toLocaleString()}`} 
          icon={<TrendingDown className="w-6 h-6 text-red-600" />} 
          color="bg-red-50"
          subtitle="Team, Costs, Gear, Store"
        />
        <SummaryCard 
          title="Net Profit" 
          value={`₹${netProfit.toLocaleString()}`} 
          icon={<IndianRupee className="w-6 h-6 text-blue-600" />} 
          color="bg-blue-50"
          subtitle="Revenue - All Expenses"
        />
        <SummaryCard 
          title="Profit Margin" 
          value={`${data.totalRevenue > 0 ? ((netProfit / data.totalRevenue) * 100).toFixed(1) : 0}%`} 
          icon={<PieChart className="w-6 h-6 text-purple-600" />} 
          color="bg-purple-50"
          subtitle="Overall efficiency"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Revenue vs Expenses (Monthly)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Expense Breakdown</h2>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Project Profitability */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Project Profitability</h2>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Top Performing Projects</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Direct Costs</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Net Profit</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.projectProfits.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">{project.clientName}</span>
                      <span className="text-xs text-gray-500">{project.eventType} • {format(new Date(project.date), 'MMM d, yyyy')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">₹{project.revenue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-red-600">-₹{project.cost.toLocaleString()}</td>
                  <td className={`px-6 py-4 text-sm font-bold ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{project.profit.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex-grow w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${project.profitMargin > 50 ? 'bg-green-500' : project.profitMargin > 20 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                          style={{ width: `${Math.max(0, Math.min(100, project.profitMargin))}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-600">{project.profitMargin.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Other Expenses Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Expense Categories</h2>
            </div>
            <div className="p-6 space-y-6">
              <ExpenseItem label="Team Payments" value={data.totalExpenses.team} icon={<Briefcase className="w-5 h-5" />} color="text-blue-600" />
              <ExpenseItem label="Event Costs" value={data.totalExpenses.eventCosts} icon={<AlertCircle className="w-5 h-5" />} color="text-yellow-600" />
              <ExpenseItem label="Equipment" value={data.totalExpenses.equipment} icon={<Camera className="w-5 h-5" />} color="text-purple-600" />
              <ExpenseItem label="Store Inventory" value={data.totalExpenses.store} icon={<ShoppingBag className="w-5 h-5" />} color="text-orange-600" />
            </div>
          </section>
        </div>

        <div className="lg:col-span-2">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Recent Gear & Store Purchases</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
              {[...data.equipmentList, ...data.storeList]
                .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
                .map((item, idx) => (
                  <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.quantity ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'}`}>
                        {item.quantity ? <ShoppingBag className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{format(new Date(item.purchaseDate), 'MMM d, yyyy')} • {item.quantity ? `Qty: ${item.quantity}` : 'Equipment'}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                    </p>
                  </div>
                ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, icon, color, subtitle }: any) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
        {icon}
      </div>
      {title === 'Net Profit' && (
        <div className="flex items-center text-green-600 text-xs font-bold">
          <ArrowUpRight className="w-4 h-4 mr-1" />
          <span>Healthy</span>
        </div>
      )}
    </div>
    <p className="text-sm font-medium text-gray-500">{title}</p>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wider font-bold">{subtitle}</p>
  </div>
);

const ExpenseItem = ({ label, value, icon, color }: any) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-3">
      <div className={`${color} bg-gray-50 p-2 rounded-lg`}>
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
    <span className="text-sm font-bold text-gray-900">₹{value.toLocaleString()}</span>
  </div>
);

export default FinancialOverview;
