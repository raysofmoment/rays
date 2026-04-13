import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Video, Image as ImageIcon, Link as LinkIcon, ExternalLink, Search, Filter, User as UserIcon, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

const TeamPortfolio: React.FC = () => {
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  useEffect(() => {
    const q = query(collection(db, 'sampleWorks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const samplesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSamples(samplesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sampleWorks');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredSamples = samples.filter(sample => {
    const matchesSearch = 
      sample.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || sample.type === filterType;
    const matchesRole = filterRole === 'all' || sample.userRole === filterRole;

    return matchesSearch && matchesType && matchesRole;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-gray-900 mb-4">Team Portfolio</h1>
        <p className="text-gray-500 text-lg">Explore the creative work from our talented team of photographers and editors.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-12">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, member, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-8 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all shadow-sm appearance-none font-bold text-sm"
            >
              <option value="all">All Types</option>
              <option value="image">Photos</option>
              <option value="video">Videos</option>
              <option value="link">Links</option>
            </select>
          </div>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="pl-10 pr-8 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all shadow-sm appearance-none font-bold text-sm"
            >
              <option value="all">All Roles</option>
              <option value="photographer">Photographers</option>
              <option value="editor">Editors</option>
              <option value="admin">Admins</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      ) : filteredSamples.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredSamples.map((sample) => (
              <motion.div
                key={sample.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all duration-500"
              >
                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  {sample.type === 'image' ? (
                    <img 
                      src={sample.url} 
                      alt={sample.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      referrerPolicy="no-referrer"
                    />
                  ) : sample.type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                      <Video className="w-16 h-16 text-white opacity-20 group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl">
                          <ExternalLink className="w-8 h-8 text-black" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <LinkIcon className="w-16 h-16 text-gray-200 group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center shadow-xl">
                          <ExternalLink className="w-8 h-8" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute top-6 left-6">
                    <span className="px-3 py-1.5 bg-white/90 backdrop-blur-md text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm flex items-center">
                      {sample.type === 'image' ? <ImageIcon className="w-3 h-3 mr-1.5" /> : sample.type === 'video' ? <Video className="w-3 h-3 mr-1.5" /> : <LinkIcon className="w-3 h-3 mr-1.5" />}
                      {sample.type}
                    </span>
                  </div>
                </div>

                <div className="p-8">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center font-black text-gray-400">
                      {sample.userName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">{sample.userName}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{sample.userRole}</p>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-black text-gray-900 mb-2 line-clamp-1">{sample.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-6 leading-relaxed">{sample.description || 'No description provided.'}</p>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {format(new Date(sample.createdAt), 'MMM d, yyyy')}
                    </span>
                    <a
                      href={sample.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center shadow-lg shadow-black/10"
                    >
                      View Work
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-gray-200">
          <Camera className="w-20 h-20 text-gray-100 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-gray-900">No Portfolio Items Found</h2>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Try adjusting your search or filters to find what you're looking for.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setFilterType('all'); setFilterRole('all'); }}
            className="mt-8 text-black font-bold underline hover:text-gray-600"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamPortfolio;
