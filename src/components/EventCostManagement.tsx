import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Plus, Search, Trash2, IndianRupee, Receipt, User as UserIcon, X, Save } from 'lucide-react';
import { toast } from 'sonner';

interface EventCostManagementProps {
  user: User;
  role: string | null;
}

const EventCostManagement: React.FC<EventCostManagementProps> = ({ user, role }) => {
  const [costs, setCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await deleteDoc(doc(db, 'eventCosts', id));
      toast.success('Record deleted successfully');
    } catch (error) {
      toast.error('Failed to delete record');
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
        {(role === 'admin' || role === 'photographer' || role === 'editor') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/20"
          >
            <Plus className="w-5 h-5" />
            <span>Add Cost</span>
          </button>
        )}
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
                    ₹{/* Simple sum of numeric fields for display */}
                    {(
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
    </div>
  );
};

const EventCostForm: React.FC<{ onClose: () => void; user: User }> = ({ onClose, user }) => {
  const [formData, setFormData] = useState({
    invoice: '',
    name: '',
    travelExtra: '',
    caligraphy: '',
    weddingVideo: '',
    weddingTeaser: '',
    weddingPhoto: '',
    box: '',
    other: '',
    albumDesign: '',
    albumPrint: '',
    prePhoto: '',
    preVideo: '',
    lidGenerate: '',
    gift: '',
    pendrive: '',
    tvLedProjector: '',
    // Photographer slots
    photographers: [
      { photographer: '', work: '', payment: '', workReview: '' },
      { photographer: '', work: '', payment: '', workReview: '' },
      { photographer: '', work: '', payment: '', workReview: '' },
      { photographer: '', work: '', payment: '', workReview: '' },
    ]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'eventCosts'), {
        ...formData,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      toast.success('Event cost added successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to add event cost');
    }
  };

  const updatePhotographer = (index: number, field: string, value: string) => {
    const newPhotographers = [...formData.photographers];
    newPhotographers[index] = { ...newPhotographers[index], [field]: value };
    setFormData({ ...formData, photographers: newPhotographers });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70] overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add Event Cost</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 border-b pb-2">Basic Info</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice</label>
                <input type="text" required value={formData.invoice} onChange={e => setFormData({...formData, invoice: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Travel & Extra</label>
                <input type="number" value={formData.travelExtra} onChange={e => setFormData({...formData, travelExtra: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caligraphy</label>
                <input type="number" value={formData.caligraphy} onChange={e => setFormData({...formData, caligraphy: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 border-b pb-2">Wedding & Media</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wedding Video</label>
                  <input type="number" value={formData.weddingVideo} onChange={e => setFormData({...formData, weddingVideo: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wedding Teaser</label>
                  <input type="number" value={formData.weddingTeaser} onChange={e => setFormData({...formData, weddingTeaser: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wedding Photo</label>
                  <input type="number" value={formData.weddingPhoto} onChange={e => setFormData({...formData, weddingPhoto: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Box</label>
                  <input type="number" value={formData.box} onChange={e => setFormData({...formData, box: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Other</label>
                <input type="number" value={formData.other} onChange={e => setFormData({...formData, other: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 border-b pb-2">Album & Pre-Wedding</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Album Design</label>
                  <input type="number" value={formData.albumDesign} onChange={e => setFormData({...formData, albumDesign: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Album Print</label>
                  <input type="number" value={formData.albumPrint} onChange={e => setFormData({...formData, albumPrint: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pre Photo</label>
                  <input type="number" value={formData.prePhoto} onChange={e => setFormData({...formData, prePhoto: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pre Video</label>
                  <input type="number" value={formData.preVideo} onChange={e => setFormData({...formData, preVideo: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 border-b pb-2">Miscellaneous</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lid Generate</label>
                  <input type="number" value={formData.lidGenerate} onChange={e => setFormData({...formData, lidGenerate: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gift</label>
                  <input type="number" value={formData.gift} onChange={e => setFormData({...formData, gift: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pendrive</label>
                  <input type="number" value={formData.pendrive} onChange={e => setFormData({...formData, pendrive: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TV/LED/Projector</label>
                  <input type="number" value={formData.tvLedProjector} onChange={e => setFormData({...formData, tvLedProjector: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-bold text-gray-900 border-b pb-2">Photographer & Work Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formData.photographers.map((p, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-xl space-y-3 border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase">Photographer {idx + 1}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Photographer Name" value={p.photographer} onChange={e => updatePhotographer(idx, 'photographer', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-black" />
                    <input placeholder="Work Type" value={p.work} onChange={e => updatePhotographer(idx, 'work', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-black" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Payment" value={p.payment} onChange={e => updatePhotographer(idx, 'payment', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-black" />
                    <input placeholder="Work Review" value={p.workReview} onChange={e => updatePhotographer(idx, 'workReview', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-black" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl border border-gray-200 font-bold hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className="px-8 py-2 rounded-xl bg-black text-white font-bold flex items-center space-x-2 hover:bg-gray-800 transition-colors shadow-lg shadow-black/20">
              <Save className="w-5 h-5" />
              <span>Save Cost</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventCostManagement;
