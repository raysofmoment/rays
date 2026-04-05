import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, Calendar, User as UserIcon, Share2, Facebook, Twitter, Link as LinkIcon, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface BlogPostDetailProps {
  user: User | null;
  role: string | null;
}

const BlogPostDetail: React.FC<BlogPostDetailProps> = ({ user, role }) => {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        const postDoc = await getDoc(doc(db, 'blogPosts', postId));
        if (postDoc.exists()) {
          const data = postDoc.data();
          if (!data.isPublished && role !== 'admin') {
            toast.error('This post is not published yet.');
            navigate('/blog');
            return;
          }
          setPost({ id: postDoc.id, ...data });
        } else {
          toast.error('Post not found');
          navigate('/blog');
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        toast.error('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, role, navigate]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="p-24 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white min-h-screen pb-24"
    >
      {/* Hero Section */}
      <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden">
        <img
          src={post.coverUrl}
          alt={post.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16">
          <div className="max-w-4xl mx-auto w-full">
            <Link
              to="/blog"
              className="inline-flex items-center text-white/80 hover:text-white mb-8 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" />
              <span className="font-bold uppercase tracking-widest text-sm">Back to Journal</span>
            </Link>
            
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-8"
            >
              {post.title}
            </motion.h1>
            
            <div className="flex flex-wrap items-center gap-6 text-white/80 font-bold uppercase tracking-widest text-xs">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {format(new Date(post.createdAt), 'MMMM d, yyyy')}
              </div>
              <div className="flex items-center">
                <UserIcon className="w-4 h-4 mr-2" />
                {post.authorName}
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {Math.ceil(post.content.split(' ').length / 200)} min read
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Sidebar / Social */}
          <aside className="md:w-16 flex md:flex-col items-center justify-center md:justify-start space-x-6 md:space-x-0 md:space-y-8 sticky top-24 h-fit">
            <button
              onClick={handleShare}
              className="p-4 rounded-full bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-100 transition-all shadow-sm"
              title="Copy Link"
            >
              <LinkIcon className="w-6 h-6" />
            </button>
            <button
              className="p-4 rounded-full bg-gray-50 text-gray-400 hover:text-[#1877F2] hover:bg-blue-50 transition-all shadow-sm"
              title="Share on Facebook"
            >
              <Facebook className="w-6 h-6" />
            </button>
            <button
              className="p-4 rounded-full bg-gray-50 text-gray-400 hover:text-[#1DA1F2] hover:bg-sky-50 transition-all shadow-sm"
              title="Share on Twitter"
            >
              <Twitter className="w-6 h-6" />
            </button>
          </aside>

          {/* Main Content */}
          <article className="flex-grow">
            <div className="prose prose-xl prose-stone max-w-none">
              {post.content.split('\n').map((paragraph: string, index: number) => (
                paragraph.trim() ? (
                  <p key={index} className="text-xl leading-relaxed text-gray-700 mb-8 first-letter:text-5xl first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:mt-1">
                    {paragraph}
                  </p>
                ) : <br key={index} />
              ))}
            </div>
            
            <div className="mt-24 pt-12 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8 bg-gray-50 p-12 rounded-[2rem]">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                  <UserIcon className="w-10 h-10 text-gray-300" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Written By</p>
                  <h3 className="text-2xl font-black text-gray-900">{post.authorName}</h3>
                  <p className="text-gray-500 font-medium">Professional Photographer & Storyteller</p>
                </div>
              </div>
              
              <button
                onClick={handleShare}
                className="flex items-center space-x-3 bg-black text-white px-8 py-4 rounded-2xl font-black hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                <Share2 className="w-5 h-5" />
                <span>Share this story</span>
              </button>
            </div>
          </article>
        </div>
      </div>
    </motion.div>
  );
};

export default BlogPostDetail;
