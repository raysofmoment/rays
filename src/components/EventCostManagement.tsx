import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Plus, Search, Trash2, IndianRupee, Receipt, User as UserIcon, Download } from 'lucide-react';
import { toast } from 'sonner';
import EventCostForm from './EventCostForm';
import ConfirmModal from './ConfirmModal';
import { exportToExcel } from '../utils/excelExport';

interface EventCostManagementProps {
  user: User;
  role: string | null;
}

const EventCostManagement: React.FC<EventCostManagementProps> = ({ user, role }) => {
  const [costs, setCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'eventCosts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'eventCosts');
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'eventCosts', itemToDelete));
      toast.success('Record deleted successfully');
    } catch (error) {
      toast.error('Failed to delete record');
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const filteredCosts = costs.filter(cost => 
    cost.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cost.invoice?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Event Cost</h1>
          <p className="text-gray-500 mt-1">Manage and track event-related expenses.</p>
        </div>
        <div className="flex space-x-4">
          {(role === 'admin' || role === 'photographer' || role === 'editor') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/20"
            >
              <Plus className="w-5 h-5" />
              <span>Add Cost</span>
            </button>
          )}
          {role === 'admin' && (
             <button
               onClick={() => {
                 const exportData = costs.map(c => ({
                   'Invoice': c.invoice || '-',
                   'Name': c.name || '-',
                   'Travel Extra': c.travelExtra || 0,
                   'Caligraphy': c.caligraphy || 0,
                   'Wedding Video': c.weddingVideo || 0,
                   'Wedding Teaser': c.weddingTeaser || 0,
                   'Wedding Photo': c.weddingPhoto || 0,
                   'Box': c.box || 0,
                   'Other': c.other || 0,
                   'Album Design': c.albumDesign || 0,
                   'Album Print': c.albumPrint || 0,
                   'Pre Photo': c.prePhoto || 0,
                   'Pre Video': c.preVideo || 0,
                   'Lid Generate': c.lidGenerate || 0,
                   'Gift': c.gift || 0,
                   'Pendrive': c.pendrive || 0,
                   'TV/LED/Projector': c.tvLedProjector || 0,
                   'Total Cost': (
                      Number(c.travelExtra || 0) +
                      Number(c.caligraphy || 0) +
                      Number(c.weddingVideo || 0) +
                      Number(c.weddingTeaser || 0) +
                      Number(c.weddingPhoto || 0) +
                      Number(c.box || 0) +
                      Number(c.other || 0) +
                      Number(c.albumDesign || 0) +
                      Number(c.albumPrint || 0) +
                      Number(c.prePhoto || 0) +
                      Number(c.preVideo || 0) +
                      Number(c.lidGenerate || 0) +
                      Number(c.gift || 0) +
                      Number(c.pendrive || 0) +
                      Number(c.tvLedProjector || 0)
                   )
                 }));
                 exportToExcel(exportData, 'Event_Costs');
               }}
               className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20"
             >
               <Download className="w-5 h-5" />
               <span>Export Excel</span>
             </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredCosts.map((cost) => (
          <div key={cost.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-grow">
                <div>
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <Receipt className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Invoice</span>
                  </div>
                  <p className="font-bold text-gray-900">{cost.invoice || 'N/A'}</p>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <UserIcon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Name</span>
                  </div>
                  <p className="font-bold text-gray-900">{cost.name || 'N/A'}</p>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <IndianRupee className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Total Calculated</span>
                  </div>
                  <p className="font-bold text-green-600">
                    ₹{(
                      Number(cost.travelExtra || 0) +
                      Number(cost.caligraphy || 0) +
                      Number(cost.weddingVideo || 0) +
                      Number(cost.weddingTeaser || 0) +
                      Number(cost.weddingPhoto || 0) +
                      Number(cost.box || 0) +
                      Number(cost.other || 0) +
                      Number(cost.albumDesign || 0) +
                      Number(cost.albumPrint || 0) +
                      Number(cost.prePhoto || 0) +
                      Number(cost.preVideo || 0) +
                      Number(cost.lidGenerate || 0) +
                      Number(cost.gift || 0) +
                      Number(cost.pendrive || 0) +
                      Number(cost.tvLedProjector || 0)
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
              {role === 'admin' && (
                <button
                  onClick={() => handleDelete(cost.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-50 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-400">Wedding Video:</span> <span className="font-medium">{cost.weddingVideo || 0}</span></div>
              <div><span className="text-gray-400">Wedding Photo:</span> <span className="font-medium">{cost.weddingPhoto || 0}</span></div>
              <div><span className="text-gray-400">Album Print:</span> <span className="font-medium">{cost.albumPrint || 0}</span></div>
              <div><span className="text-gray-400">Pre Photo:</span> <span className="font-medium">{cost.prePhoto || 0}</span></div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <EventCostForm onClose={() => setShowAddModal(false)} user={user} />
      )}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Cost Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default EventCostManagement;
