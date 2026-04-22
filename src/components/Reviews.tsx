import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { notifyAdmins } from '../services/notificationService';
import { Star, MessageSquare, Send, User as UserIcon, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ReviewsProps {
  user: User | null;
}

const Reviews: React.FC<ReviewsProps> = ({ user }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setReviews(reviewsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to leave a review');
      return;
    }
    if (!newReview.comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        clientId: user.uid,
        clientName: user.displayName || 'Anonymous',
        clientPhoto: user.photoURL || '',
        rating: newReview.rating,
        comment: newReview.comment,
        isApproved: true, // Auto-approve for now, or set to false for moderation
        createdAt: new Date().toISOString()
      });
      
      await notifyAdmins(
        'New Review Submitted',
        `${user.displayName || 'Anonymous'} left a ${newReview.rating}-star review.`,
        'success',
        '/reviews'
      );

      setNewReview({ rating: 5, comment: '' });
      toast.success('Thank you for your review!');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-24 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Client Reviews</h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">Hear from the people we've had the pleasure of working with.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Review Form */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 p-8 rounded-3xl sticky top-24">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Leave a Review</h2>
              {user ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                          className={`p-1 transition-colors ${newReview.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                        >
                          <Star className="w-8 h-8 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your Experience</label>
                    <textarea
                      rows={4}
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-black transition-all resize-none"
                      placeholder="Tell us about your session..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Submit Review</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-6">Please sign in to share your experience with us.</p>
                  <a href="/auth" className="inline-block bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all">
                    Sign In
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              </div>
            ) : reviews.length > 0 ? (
              <div className="grid grid-cols-1 gap-8">
                <AnimatePresence mode="popLayout">
                  {reviews.map((review, i) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white border border-gray-100 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all relative"
                    >
                      <Quote className="absolute top-6 right-8 w-12 h-12 text-gray-50" />
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-14 h-14 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0">
                          {review.clientPhoto ? (
                            <img src={review.clientPhoto || undefined} alt={review.clientName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <UserIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{review.clientName}</h3>
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                        <span className="ml-auto text-xs text-gray-400">
                          {review.createdAt ? format(new Date(review.createdAt), 'MMM d, yyyy') : ''}
                        </span>
                      </div>
                      <p className="text-gray-600 leading-relaxed italic">"{review.comment}"</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-24 bg-gray-50 rounded-3xl">
                <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500">No reviews yet. Be the first to leave one!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reviews;
