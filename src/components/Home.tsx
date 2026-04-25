import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Award, Mail, Phone, MapPin, ArrowRight, Star, Instagram, Twitter, Facebook, Linkedin, MessageCircle, Loader2, ImageIcon, Heart, Music, Baby, Calendar, Filter, MoreHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { notifyAdmins } from '../services/notificationService';
import Logo from './Logo';
import Captcha from './Captcha';

import ThreeDScene from './ThreeDScene';

const Home: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    subject: 'Wedding Inquiry',
    message: ''
  });
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  const FOLDER_MAP: Record<string, string> = {
    'All': '14s9KpnT6uwVnN-lXrzF7ixn_qq-Wp7OI',
    'Wedding': '1sWUCrEJQHgZfzF0C3ZbqL5xbYGxYo4Qn',
    'Music': '1UIs_4grBIKa2aq7qGLxWIlTmBm8gsXBg',
    'Kids': '1tX7LLW8IuorWPEh4_GZWir79T4SkPMM3',
    'Event': '1RUcpnCc3NIV87PI4OEhsiTQHd13FBAa0',
    'Other': '1WkAnOgDEioFqAyvD5BzTGi2ybB6ohc0V'
  };

  const categories = [
    { name: 'All', icon: Filter },
    { name: 'Wedding', icon: Heart },
    { name: 'Music', icon: Music },
    { name: 'Kids', icon: Baby },
    { name: 'Event', icon: Calendar },
    { name: 'Other', icon: MoreHorizontal }
  ];

  const FALLBACK_IMAGES = [
    { id: 'f1', name: 'Wedding 1', webViewLink: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800', thumbnailLink: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800', mimeType: 'image/jpeg' },
    { id: 'f2', name: 'Wedding 2', webViewLink: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800', thumbnailLink: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800', mimeType: 'image/jpeg' },
    { id: 'f3', name: 'Portrait 1', webViewLink: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800', thumbnailLink: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800', mimeType: 'image/jpeg' },
    { id: 'f4', name: 'Event 1', webViewLink: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=800', thumbnailLink: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=800', mimeType: 'image/jpeg' },
    { id: 'f5', name: 'Kids 1', webViewLink: 'https://images.unsplash.com/photo-1520856629106-ac9b48af63b2?auto=format&fit=crop&q=80&w=800', thumbnailLink: 'https://images.unsplash.com/photo-1520856629106-ac9b48af63b2?auto=format&fit=crop&q=80&w=800', mimeType: 'image/jpeg' },
    { id: 'f6', name: 'Other 1', webViewLink: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&q=80&w=800', thumbnailLink: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&q=80&w=800', mimeType: 'image/jpeg' },
  ];

  useEffect(() => {
    // Health check to verify backend connectivity
    const checkHealth = async () => {
      try {
        const response = await fetch(`${window.location.origin}/api/health`);
        if (response.ok) {
          const data = await response.json();
          console.log('[Home] Backend health check successful:', data);
        } else {
          console.warn('[Home] Backend health check returned non-200 status. This might be normal if the server is starting.');
        }
      } catch (err) {
        console.warn('[Home] Backend is currently unreachable. Will retry or use fallbacks.');
      }
    };
    checkHealth();

    const fetchPortfolio = async () => {
      try {
        setLoadingPortfolio(true);
        const folderId = FOLDER_MAP[activeCategory];
        
        if (!folderId) {
          setPortfolioItems(FALLBACK_IMAGES);
          setLoadingPortfolio(false);
          return;
        }

        const apiUrl = `${window.location.origin}/api/drive/list/${folderId}`;
        console.log(`[Home] Fetching portfolio: ${activeCategory}`);
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }
        
        const data = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          const images = data.filter((f: any) => f.mimeType && f.mimeType.startsWith('image/')).slice(0, 9);
          setPortfolioItems(images.length > 0 ? images : FALLBACK_IMAGES);
        } else {
          setPortfolioItems(FALLBACK_IMAGES);
        }
      } catch (error: any) {
        console.warn('[Home] Using fallback images due to fetch error:', error.message);
        setPortfolioItems(FALLBACK_IMAGES);
      } finally {
        setLoadingPortfolio(false);
      }
    };
    fetchPortfolio();
  }, [activeCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCaptchaVerified) {
      toast.error('Please complete the security verification');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'serviceInquiries'), {
        serviceTitle: formData.subject,
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        location: 'Home Page Contact Form',
        requirements: formData.message,
        createdAt: new Date().toISOString()
      });
      
      await notifyAdmins(
        'New Inquiry Received',
        `${formData.name} submitted a new inquiry regarding ${formData.subject}.`,
        'info',
        '/inquiries'
      );

      toast.success('Thank you for your inquiry! We will get back to you soon.');
      setFormData({
        name: '',
        email: '',
        phoneNumber: '',
        subject: 'Wedding Inquiry',
        message: ''
      });
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      toast.error('Failed to submit inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-black">
        <ThreeDScene />
        
        <div className="relative z-10 text-center px-4 max-w-6xl mx-auto flex flex-col items-center">
          <div className="mb-4">
             <motion.span 
               initial={{ opacity: 0, letterSpacing: '0.2em' }}
               animate={{ opacity: 0.6, letterSpacing: '0.4em' }}
               transition={{ duration: 1 }}
               className="text-[10px] text-white uppercase font-black"
             >
               Est. 2019 • Luxury Storytelling
             </motion.span>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center"
          >
            <h1 className="text-[14vw] sm:text-[12vw] md:text-[10vw] font-black text-white leading-[0.9] tracking-tighter uppercase text-center select-none mix-blend-difference drop-shadow-2xl">
              Capturing <br />
              <span className="text-transparent border-text-white" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.5)' }}>
                Deep Moments
              </span>
            </h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-gray-400 mt-6 md:mt-8 mb-10 md:mb-12 max-w-xl text-base md:text-lg font-medium leading-relaxed"
            >
              Rays of Moment is a high-end photography studio focused on the art of visual preservation.
            </motion.p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 w-full max-w-sm sm:max-w-none"
          >
            <Link to="/auth" className="w-full sm:w-auto text-center group relative overflow-hidden bg-white text-black px-8 md:px-12 py-4 md:py-5 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl">
              <span className="relative z-10">Start Session</span>
              <div className="absolute inset-0 bg-gray-200 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Link>
            <Link to="/packages" className="w-full sm:w-auto text-center group px-8 md:px-12 py-4 md:py-5 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest text-white border border-white/20 hover:border-white transition-all backdrop-blur-sm">
              Explore Collections
            </Link>
          </motion.div>

          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4">
             <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent animate-pulse" />
             <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Scroll</span>
          </div>
        </div>
      </section>

      {/* Portfolio Preview */}
      <section id="portfolio" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Our Portfolio</h2>
              <p className="text-gray-500">A glimpse into our latest captures and visual stories.</p>
            </div>
            <div className="flex items-center gap-4">
              <a 
                href="https://www.instagram.com/rays.of.moment/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Instagram className="w-4 h-4 mr-2" />
                Follow on Instagram
              </a>
              <Link to="/gallery" className="inline-flex items-center text-sm font-bold text-gray-900 hover:underline group">
                <span>View Gallery</span>
                <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
          
          {/* Category Highlights (like Gallery) */}
          <div className="flex justify-start md:justify-center items-start gap-4 md:gap-8 lg:gap-12 py-8 md:py-12 overflow-x-auto no-scrollbar scroll-smooth mb-8 border-y border-gray-100">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className="flex flex-col items-center gap-3 group min-w-[72px] md:min-w-[80px] shrink-0"
              >
                <div className={`relative p-[1.5px] rounded-full transition-all duration-500 transform ${
                  activeCategory === cat.name 
                    ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 scale-110 active:scale-100' 
                    : 'bg-gray-200 group-hover:bg-gray-300'
                }`}>
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-white bg-white flex items-center justify-center overflow-hidden">
                    <cat.icon className={`w-6 h-6 md:w-7 md:h-7 transition-colors ${
                      activeCategory === cat.name ? 'text-black' : 'text-gray-400 group-hover:text-gray-600'
                    }`} />
                  </div>
                </div>
                <span className={`text-[10px] md:text-xs font-bold leading-tight transition-colors ${
                  activeCategory === cat.name ? 'text-black' : 'text-gray-500 group-hover:text-gray-700'
                }`}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:grid-cols-3 md:gap-4">
            {loadingPortfolio ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 animate-pulse" />
              ))
            ) : portfolioItems.length > 0 ? (
              portfolioItems.map((item, i) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="relative aspect-square overflow-hidden bg-gray-100 group cursor-pointer"
                >
                  <Link to="/gallery">
                    <img 
                      src={item.thumbnailLink?.replace('=s220', '=s800') || item.webViewLink} 
                      alt={item.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex items-center gap-4 text-white font-bold text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-white" />
                          <span>{Math.floor(Math.random() * 100) + 10}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            ) : (
              [
                "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1520856629106-ac9b48af63b2?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&q=80&w=800"
              ].map((url, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="relative aspect-square overflow-hidden bg-gray-100 group cursor-pointer"
                >
                  <Link to="/gallery">
                    <img 
                      src={url || undefined} 
                      alt="Portfolio" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex items-center gap-4 text-white font-bold text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-white" />
                          <span>{Math.floor(Math.random() * 100) + 10}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Client Testimonials</h2>
              <p className="text-gray-500 max-w-2xl">Don't just take our word for it. Here's what our clients have to say about their experience.</p>
            </div>
            <Link to="/reviews" className="inline-flex items-center text-black font-bold hover:underline group">
              <span>Read All Reviews</span>
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-2" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Sabbyasachi Ghosh", role: "Wedding Client", comment: "The team at Rays of Moment captured our wedding so beautifully. Every photo tells a story and we couldn't be happier!", rating: 5 },
              { name: "Arindum Bhakat", role: "Event Organizer", comment: "Professional, punctual, and incredibly talented. They managed to capture the energy of our corporate event perfectly.", rating: 5 },
              { name: "Wasima Molla", role: "Portrait Client", comment: "I've never felt more comfortable in front of a camera. The results were stunning and exceeded all my expectations.", rating: 5 }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"
              >
                <div className="flex text-yellow-400 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 italic mb-6">"{testimonial.comment}"</p>
                <div>
                  <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&q=80&w=2070" 
                alt="About Us" 
                className="rounded-3xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-8 -right-8 bg-black text-white p-8 rounded-2xl hidden md:block">
                <p className="text-4xl font-bold mb-1">7+</p>
                <p className="text-gray-400 text-sm">Years of Experience</p>
              </div>
            </div>
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Crafting Visual Stories Since 2019</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Rays of Moment started with a simple mission: to capture the raw, authentic beauty of human connection. Over the years, we've grown into a full-service photography studio, working with clients worldwide to document their most precious milestones.
              </p>
              <div className="space-y-4">
                {[
                  { icon: <Users className="w-5 h-5" />, text: "Expert Team of 15+ Photographers" },
                  { icon: <Award className="w-5 h-5" />, text: "Award-winning Visual Storytelling" },
                  { icon: <Star className="w-5 h-5" />, text: "500+ Happy Clients Worldwide" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-black">
                      {item.icon}
                    </div>
                    <span className="font-medium text-gray-700">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">The creative minds behind the lens, dedicated to making your vision a reality.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: "Saikat Banerjee", role: "Lead Photographer", img: "https://69cb4f3f21aad77cf8fd3eac.imgix.net/photographer/ff.jpeg" },
              { name: "Manas Chakraborty", role: "Traditional Photographer", img: "https://69cb4f3f21aad77cf8fd3eac.imgix.net/photographer/IMG_20250928_152140.jpg.jpeg" },
              { name: "Soumyabrata Basu", role: "Director", img: "https://69cb4f3f21aad77cf8fd3eac.imgix.net/photographer/557633968_2157876834705384_1864001844006848917_n.jpg" },
              { name: "Ayan Das", role: "Portrait Artist", img: "https://69cb4f3f21aad77cf8fd3eac.imgix.net/photographer/IMG-20250930-WA0037%20(1).jpg.jpeg" },
              { name: "Sujan Mondal", role: "Candid Photographer", img: "https://69cb4f3f21aad77cf8fd3eac.imgix.net/photographer/487505057_9393009754129083_2252235840319595841_n.jpg" },
              { name: "Sujoy Mondal", role: "Cinematographer", img: "https://69cb4f3f21aad77cf8fd3eac.imgix.net/photographer/610113658_18159544471416473_8550580723945196816_n.jpg" },
              { name: "Mainak Biswas", role: "Vloger", img: "https://69cb4f3f21aad77cf8fd3eac.imgix.net/photographer/IMG-20241018-WA0039.jpg.jpeg" }
            ].map((member, i) => (
              <div key={i} className="text-center group">
                <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 bg-gray-100">
                  <img 
                    src={member.img} 
                    alt={member.name} 
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${member.name}/400/400`;
                    }}
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                <p className="text-gray-500 text-sm">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-4xl font-bold mb-6">Let's Create Something <br />Beautiful Together</h2>
              <p className="text-gray-400 mb-12">Ready to book your session or have questions? Our team is here to help you every step of the way.</p>
              
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">Our Studio</h4>
                    <p className="text-gray-400">Rays of moment, Berhampore<br />Murshidabad, West Bengal 742103</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">Phone & WhatsApp</h4>
                    <p className="text-gray-400">
                      <a href="tel:8967106723" className="hover:text-white transition-colors">8967106723</a>, 
                      <a href="tel:9083486788" className="hover:text-white transition-colors"> 9083486788</a>
                    </p>
                    <a href="https://wa.me/918967106723" target="_blank" rel="noopener noreferrer" className="text-sm text-green-400 hover:text-green-300 transition-colors flex items-center mt-1">
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Chat on WhatsApp
                    </a>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">Email</h4>
                    <p className="text-gray-400">raysofmoment@raysofmoment.com</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
              <form 
                className="space-y-6"
                onSubmit={handleSubmit}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white transition-all text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white transition-all text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
                    <input 
                      required
                      type="tel" 
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white transition-all text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Subject</label>
                    <select 
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white transition-all text-white"
                    >
                      <option className="bg-black" value="Wedding Inquiry">Wedding Inquiry</option>
                      <option className="bg-black" value="Event Coverage">Event Coverage</option>
                      <option className="bg-black" value="Portrait Session">Portrait Session</option>
                      <option className="bg-black" value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Message</label>
                  <textarea 
                    required
                    rows={4} 
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white transition-all text-white"
                  ></textarea>
                </div>
                
                <Captcha onVerify={setIsCaptchaVerified} className="bg-white/5 border-white/10" />

                <button 
                  disabled={isSubmitting || !isCaptchaVerified}
                  className="w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send Message</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-black border-t border-white/10 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center space-x-4">
              <Logo className="w-12 h-12" light />
              <div className="flex flex-col">
                <span className="text-2xl font-bold tracking-tight">Rays of Moment</span>
                <span className="text-xs font-medium tracking-widest text-gray-400 uppercase leading-none">YOUR MOMENT OUR PRIORITY</span>
              </div>
            </div>
            
            <div className="flex space-x-8 text-sm font-medium text-gray-400">
              <Link to="/careers" className="hover:text-white transition-colors">Careers</Link>
              <Link to="/packages" className="hover:text-white transition-colors">Packages</Link>
              <a href="#portfolio" className="hover:text-white transition-colors">Portfolio</a>
              <a href="#about" className="hover:text-white transition-colors">About</a>
            </div>
            
            <div className="flex space-x-6">
              <a href="https://www.instagram.com/rays.of.moment/" target="_blank" rel="noopener noreferrer">
                <Instagram className="w-5 h-5 text-gray-400 hover:text-white transition-colors cursor-pointer" />
              </a>
              <Twitter className="w-5 h-5 text-gray-400 hover:text-white transition-colors cursor-pointer" />
              <a href="https://www.facebook.com/Raysofmoment" target="_blank" rel="noopener noreferrer">
                <Facebook className="w-5 h-5 text-gray-400 hover:text-white transition-colors cursor-pointer" />
              </a>
              <a href="https://wa.me/918967106723" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5 text-gray-400 hover:text-white transition-colors cursor-pointer" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                <Linkedin className="w-5 h-5 text-gray-400 hover:text-white transition-colors cursor-pointer" />
              </a>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 text-center text-gray-500 text-sm">
            © 2026 Rays of Moment. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
