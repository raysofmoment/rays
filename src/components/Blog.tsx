import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'firebase/auth';
import { collection, query, onSnapshot, orderBy, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { FileText, Plus, Trash2, Edit, Check, X, Calendar, User as UserIcon, Image as ImageIcon, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ConfirmModal from './ConfirmModal';

interface BlogProps {
  user: User | null;
  role: string | null;
}

const Blog: React.FC<BlogProps> = ({ user, role }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const isAdmin = role === 'admin';

  useEffect(() => {
    const q = isAdmin 
      ? query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'blogPosts'), where('isPublished', '==', true), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'blogPosts');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const postData = {
        title,
        content,
        coverUrl: coverUrl || 'https://picsum.photos/seed/blog/800/400',
        isPublished,
        authorId: user.uid,
        authorName: user.displayName || user.email,
        updatedAt: new Date().toISOString()
      };

      if (editingPost) {
        await updateDoc(doc(db, 'blogPosts', editingPost.id), postData);
        toast.success('Blog post updated successfully!');
      } else {
        await addDoc(collection(db, 'blogPosts'), {
          ...postData,
          createdAt: new Date().toISOString()
        });
        toast.success('Blog post created successfully!');
      }

      resetForm();
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save blog post');
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCoverUrl('');
    setIsPublished(true);
    setEditingPost(null);
    setShowAddModal(false);
  };

  const handleEdit = (post: any) => {
    setEditingPost(post);
    setTitle(post.title);
    setContent(post.content);
    setCoverUrl(post.coverUrl);
    setIsPublished(post.isPublished);
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'blogPosts', itemToDelete));
      toast.success('Post deleted');
    } catch (error) {
      toast.error('Failed to delete post');
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const togglePublish = async (post: any) => {
    try {
      await updateDoc(doc(db, 'blogPosts', post.id), {
        isPublished: !post.isPublished
      });
      toast.success(post.isPublished ? 'Post unpublished' : 'Post published');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-black tracking-tight text-gray-900 mb-4">Our Journal</h1>
          <p className="text-xl text-gray-500">Insights, stories, and updates from the world of photography and moments that matter.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-black text-white px-6 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>New Post</span>
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post) => (
          <motion.article
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all border border-gray-100 flex flex-col h-full"
          >
            <div className="relative aspect-[16/9] overflow-hidden">
              <img
                src={post.coverUrl}
                alt={post.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              {isAdmin && (
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button
                    onClick={() => handleEdit(post)}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-700 hover:text-black shadow-sm transition-colors"
                    title="Edit Post"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => togglePublish(post)}
                    className={`p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm transition-colors ${post.isPublished ? 'text-green-600' : 'text-gray-400'}`}
                    title={post.isPublished ? 'Unpublish' : 'Publish'}
                  >
                    {post.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 hover:text-red-600 shadow-sm transition-colors"
                    title="Delete Post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              {!post.isPublished && isAdmin && (
                <div className="absolute top-4 left-4 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-sm">
                  Draft
                </div>
              )}
            </div>
            
            <div className="p-8 flex-grow flex flex-col">
              <div className="flex items-center space-x-4 text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                <span className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {format(new Date(post.createdAt), 'MMM d, yyyy')}
                </span>
                <span className="flex items-center">
                  <UserIcon className="w-3 h-3 mr-1" />
                  {post.authorName}
                </span>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4 line-clamp-2 group-hover:text-black transition-colors">
                {post.title}
              </h2>
              
              <p className="text-gray-500 line-clamp-3 mb-6 flex-grow">
                {post.content}
              </p>
              
              <Link
                to={`/blog/${post.id}`}
                className="inline-flex items-center font-bold text-black group/link"
              >
                <span>Read More</span>
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/link:translate-x-1" />
              </Link>
            </div>
          </motion.article>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-24 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900">No blog posts yet</h3>
          <p className="text-gray-500 mt-2">Check back later for fresh content and updates.</p>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-6 inline-flex items-center space-x-2 bg-black text-white px-6 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>Create First Post</span>
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="text-3xl font-black text-gray-900">{editingPost ? 'Edit Post' : 'Create New Post'}</h2>
                  <p className="text-gray-500">Share your thoughts and moments with the world.</p>
                </div>
                <button onClick={resetForm} className="p-3 hover:bg-white rounded-full transition-all shadow-sm">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2">Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-black outline-none transition-all text-lg font-bold"
                        placeholder="Enter a catchy title..."
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2">Cover Image URL</label>
                      <div className="flex space-x-4">
                        <input
                          type="url"
                          value={coverUrl}
                          onChange={(e) => setCoverUrl(e.target.value)}
                          className="flex-grow px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-black outline-none transition-all font-medium"
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2 italic">Leave blank for a random beautiful image.</p>
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <input
                        type="checkbox"
                        id="isPublished"
                        checked={isPublished}
                        onChange={(e) => setIsPublished(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                      />
                      <label htmlFor="isPublished" className="text-sm font-bold text-gray-700 cursor-pointer">
                        Publish immediately
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2">Content</label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="flex-grow w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-black outline-none transition-all font-medium resize-none min-h-[300px]"
                      placeholder="Write your story here..."
                      required
                    />
                  </div>
                </div>
              </form>

              <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-8 py-4 rounded-2xl font-bold text-gray-500 hover:text-black transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-12 py-4 rounded-2xl bg-black text-white font-black hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                  {editingPost ? 'Update Post' : 'Publish Post'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Blog Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default Blog;
