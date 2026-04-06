import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';

interface EventCostFormProps {
  onClose: () => void;
  user: User;
  initialInvoice?: string;
  initialName?: string;
}

const EventCostForm: React.FC<EventCostFormProps> = ({ onClose, user, initialInvoice = '', initialName = '' }) => {
  const [formData, setFormData] = useState({
    invoice: initialInvoice,
    name: initialName,
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[80] overflow-y-auto">
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

export default EventCostForm;
