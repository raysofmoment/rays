import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ImageIcon, ArrowRight, Camera, Filter, Search, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PublicGalleryProps {
  user: any;
  role: string | null;
}

const PublicGallery: React.FC<PublicGalleryProps> = ({ user, role }) => {
  const [galleries, setGalleries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGallery, setNewGallery] = useState({
    name: '',
    isPublic: true,
    coverUrl: ''
  });

  useEffect(() => {
    const q = query(
      collection(db, 'galleries'),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const galleriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setGalleries(galleriesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'galleries'), {
        ...newGallery,
        createdAt: new Date().toISOString(),
        clientId: user?.uid || null
      });
      toast.success('Gallery created successfully!');
      setShowCreateModal(false);
      setNewGallery({ name: '', isPublic: true, coverUrl: '' });
    } catch (error) {
      toast.error('Failed to create gallery');
    }
  };

  const filteredGalleries = galleries.filter(gallery => {
    const matchesSearch = gallery.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || gallery.name.toLowerCase().includes(activeCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="py-24 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="text-left">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Our Public Galleries</h1>
            <p className="text-xl text-gray-500 max-w-2xl">A showcase of the moments we've captured for our clients.</p>
          </div>
          {role === 'admin' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span>Create Gallery</span>
            </button>
          )}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search galleries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-black transition-all"
            />
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
            {['All', 'Wedding', 'Event', 'Portrait', 'Commercial'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  activeCategory === cat ? 'bg-black text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : filteredGalleries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredGalleries.map((gallery, i) => (
                <motion.div
                  key={gallery.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  layout
                  className="group relative aspect-[4/5] rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all"
                >
                  <img
                    src={gallery.coverUrl || `https://picsum.photos/seed/${gallery.id}/800/1000`}
                    alt={gallery.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8">
                    <span className="text-xs font-bold text-white/60 uppercase tracking-widest mb-2">
                      {format(new Date(gallery.createdAt), 'MMMM yyyy')}
                    </span>
                    <h3 className="text-2xl font-bold text-white mb-4">{gallery.name}</h3>
                    <Link
                      to={`/gallery/${gallery.id}`}
                      className="inline-flex items-center text-white font-bold group/link"
                    >
                      <span>View Gallery</span>
                      <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover/link:translate-x-2" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-24 bg-gray-50 rounded-3xl">
            <ImageIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">No public galleries found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Create Gallery Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Gallery</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateGallery} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Gallery Name</label>
                  <input
                    type="text"
                    value={newGallery.name}
                    onChange={(e) => setNewGallery({ ...newGallery, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all"
                    placeholder="e.g., Summer Wedding 2024"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Cover Image URL (Optional)</label>
                  <input
                    type="url"
                    value={newGallery.coverUrl}
                    onChange={(e) => setNewGallery({ ...newGallery, coverUrl: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none transition-all"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div className="flex items-center space-x-3 py-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newGallery.isPublic}
                    onChange={(e) => setNewGallery({ ...newGallery, isPublic: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">Make this gallery public</label>
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-bold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-black text-white font-bold hover:bg-gray-800 transition-colors"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicGallery;
