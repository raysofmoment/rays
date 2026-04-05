import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { X, User, Mail, Phone, MapPin, MessageSquare, History, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CRMModalProps {
  clientId: string;
  onClose: () => void;
  currentUser: any;
}

const CRMModal: React.FC<CRMModalProps> = ({ clientId, onClose, currentUser }) => {
  const [client, setClient] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    // Fetch client info
    const fetchClient = async () => {
      try {
        const clientQuery = query(collection(db, 'users'), where('uid', '==', clientId));
        const snapshot = await getDocs(clientQuery);
        if (!snapshot.empty) {
          setClient(snapshot.docs[0].data());
        }
      } catch (error) {
        console.error('Error fetching client:', error);
      }
    };

    fetchClient();

    // Fetch orders history
    const ordersQuery = query(
      collection(db, 'orders'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    // Fetch notes
    const notesQuery = query(
      collection(db, 'clientNotes'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clientNotes');
    });

    return () => {
      unsubscribeOrders();
      unsubscribeNotes();
    };
  }, [clientId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmittingNote(true);
    try {
      await addDoc(collection(db, 'clientNotes'), {
        clientId,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email,
        content: newNote.trim(),
        createdAt: new Date().toISOString()
      });
      setNewNote('');
      toast.success('Note added successfully');
    } catch (error) {
      toast.error('Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading && !client) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
        <div className="bg-white p-8 rounded-2xl shadow-xl flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-black" />
          <span className="font-medium">Loading CRM data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{client?.displayName || 'Unknown Client'}</h2>
              <p className="text-sm text-gray-500">Client CRM Profile</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Contact Info */}
            <div className="space-y-8">
              <section>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-gray-700">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span>{client?.email}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-gray-700">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span>{client?.phone || 'No phone provided'}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-gray-700">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <span>{client?.address || 'No address provided'}</span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                  <History className="w-4 h-4 mr-2" />
                  Quick Stats
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-2xl font-bold text-gray-900">{notes.length}</p>
                    <p className="text-xs text-gray-500">Interaction Notes</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Middle Column: Order History */}
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                  <History className="w-4 h-4 mr-2" />
                  Order History
                </h3>
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No orders found for this client.</p>
                  ) : (
                    orders.map(order => (
                      <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-gray-900">{order.packageName}</p>
                            <p className="text-xs text-gray-500">{format(new Date(order.date), 'MMMM d, yyyy')}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">{order.location}</span>
                          <span className="font-bold text-gray-900">₹{order.totalAmount}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Interaction Notes
                </h3>
                
                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="mb-6">
                  <div className="relative">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note about this client..."
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-black transition-all min-h-[100px]"
                    />
                    <button
                      type="submit"
                      disabled={submittingNote || !newNote.trim()}
                      className="absolute bottom-3 right-3 bg-black text-white p-2 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {submittingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                </form>

                <div className="space-y-4">
                  {notes.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No notes yet.</p>
                  ) : (
                    notes.map(note => (
                      <div key={note.id} className="bg-gray-50 rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-gray-900">{note.authorName}</span>
                          <span className="text-[10px] text-gray-400">{format(new Date(note.createdAt), 'MMM d, yyyy HH:mm')}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

export default CRMModal;
