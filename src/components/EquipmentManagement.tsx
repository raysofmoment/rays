import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Plus, Search, Trash2, Camera, Calendar, DollarSign, Activity, Briefcase, X, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Equipment {
  id: string;
  name: string;
  purchaseDate: string;
  price: number;
  status: 'Available' | 'In Use' | 'Repair' | 'Retired';
  workUsing: string;
  createdAt: any;
}

const EquipmentManagement: React.FC<{ userRole: string | null }> = ({ userRole }) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'equipment'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEquipment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'equipment');
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this equipment?')) return;
    try {
      await deleteDoc(doc(db, 'equipment', id));
      toast.success('Equipment deleted successfully');
    } catch (error) {
      toast.error('Failed to delete equipment');
    }
  };

  const filteredEquipment = equipment.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.workUsing.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equipment Inventory</h1>
          <p className="text-gray-500 mt-1">Track and manage your photography gear.</p>
        </div>
        {(userRole === 'admin' || userRole === 'photographer') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/20"
          >
            <Plus className="w-5 h-5" />
            <span>Add Equipment</span>
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search equipment name or work..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipment.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <Camera className="w-6 h-6 text-gray-700" />
              </div>
              <div className="flex space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  item.status === 'Available' ? 'bg-green-100 text-green-700' :
                  item.status === 'In Use' ? 'bg-blue-100 text-blue-700' :
                  item.status === 'Repair' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {item.status}
                </span>
                {userRole === 'admin' && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-4">{item.name}</h3>

            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Purchased: {item.purchaseDate}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <DollarSign className="w-4 h-4 mr-2" />
                <span>Price: ₹{item.price.toLocaleString()}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Briefcase className="w-4 h-4 mr-2" />
                <span>Work: {item.workUsing || 'None'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <AddEquipmentModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
};

const AddEquipmentModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    purchaseDate: '',
    price: '',
    status: 'Available',
    workUsing: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'equipment'), {
        ...formData,
        price: Number(formData.price),
        createdAt: serverTimestamp()
      });
      toast.success('Equipment added successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to add equipment');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add Equipment</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none"
              placeholder="e.g., Sony A7IV"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
              <input
                type="date"
                required
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <input
                type="number"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none"
            >
              <option value="Available">Available</option>
              <option value="In Use">In Use</option>
              <option value="Repair">Repair</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Using</label>
            <input
              type="text"
              value={formData.workUsing}
              onChange={(e) => setFormData({ ...formData, workUsing: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none"
              placeholder="e.g., Wedding Shoot"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/20 mt-6"
          >
            <Save className="w-5 h-5" />
            <span>Save Equipment</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default EquipmentManagement;
