import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Award, Mail, Phone, MapPin, ArrowRight, Star, Instagram, Twitter, Facebook, Linkedin, MessageCircle, Loader2, ImageIcon, Heart, Music, Baby, Calendar, Filter, MoreHorizontal, Pin } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { collection, addDoc, onSnapshot, query, setDoc, doc } from 'firebase/firestore';
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
    subject: 'Wedding',
    message: ''
  });
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  const FOLDER_MAP: Record<string, string> = {
    'Wedding': '1MyprAhR1qLeye5TC832J9XvmFw2Afjra',
    'Music': '1YgviutdlsMvMrZxDmEBvle3n0ssB2eWk',
    'Kids': '1vWObut98zYGgkvAnctVu1wInJVDKOIbV',
    'Event': '15nzoF4PdtZkSE33r_3AO_jya6jIWXFR-',
    'Other': '1wEaZxNFrhTRglcS5JV96XZL_66wPPIVC'
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
    { id: 'f1', name: 'Wedding 1', webViewLink: 'https://69cb4f3f21aad77cf8fd3eac.imgix.net/509602419_4148434212060416_7248306857233352987_n.jpg', thumbnailLink: 'https://69cb4f3f21aad77cf8fd3eac.imgix.net/509602419_4148434212060416_7248306857233352987_n.jpg', mimeType: 'image/jpeg' },
    { id: 'f2', name: 'Wedding 2', webViewLink: 'https://69cb4f3f21aad77cf8fd3eac.imgix.net/WhatsApp%20Image%202026-04-11%20at%2013.27.23%20(2).jpeg', thumbnailLink: 'https://69cb4f3f21aad77cf8fd3eac.imgix.net/WhatsApp%20Image%202026-04-11%20at%2013.27.23%20(2).jpeg', mimeType: 'image/jpeg' },
    { id: 'f3', name: 'Portrait 1', webViewLink: 'https://69cb4f3f21aad77cf8fd3eac.imgix.net/477000377_4017440055159833_5411229908014627216_n.jpg', thumbnailLink: 'https://69cb4f3f21aad77cf8fd3eac.imgix.net/477000377_4017440055159833_5411229908014627216_n.jpg', mimeType: 'image/jpeg' },
    { id: 'f4', name: 'Event 1', webViewLink: 'https://69cb4f3f21aad77cf8fd3eac.imgix.net/476134843_4012525998984572_1314767316960360426_n.jpg', thumbnailLink: 'https://69cb4f3f21aad77cf8fd3eac.imgix.net/476134843_4012525998984572_1314767316960360426_n.jpg', mimeType: 'image/jpeg' },
    { id: 'f5', name: 'Kids 1', webViewLink: 'https://69cb4f3f21aad77cf8fd3eac.imgix.net/481258407_4038125419757963_5536967683075139349_n.jpg', thumbnailLink: 'https://69cb4f3f21aad77cf8fd3eac.imgix.net/481258407_4038125419757963_5536967683075139349_n.jpg', mimeType: 'image/jpeg' },
    { id: 'f6', name: 'Other 1', webViewLink: 'https://69cb4f3f21aad77cf8fd3eac.imgix.net/WhatsApp%20Image%202026-04-11%20at%2013.07.47.jpeg', thumbnailLink: 'https://69cb4f3f21aad77cf8fd3eac.imgix.net/WhatsApp%20Image%202026-04-11%20at%2013.07.47.jpeg', mimeType: 'image/jpeg' },
  ];

  useEffect(() => {
    // Health check
    const checkHealth = async () => {
      try {
        await fetch('/api/health');
      } catch (err) {
        console.warn('[Home] Backend health check failed');
      }
    };
    checkHealth();

    // Separate listener for pins to avoid infinite loops
    const pinsQ = collection(db, 'pinnedAssets');
    const pinsUnsubscribe = onSnapshot(pinsQ, (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.id);
      setPinnedIds(ids);
    });

    return () => pinsUnsubscribe();
  }, []);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        setLoadingPortfolio(true);

        const fetchForCategory = async (folderId: string, category: string) => {
          const apiUrl = `/api/drive/list/${folderId}`;
          console.log(`[Home] Fetching portfolio: ${category}`);
          
          const response = await fetch(apiUrl, {
            headers: { 'Accept': 'application/json' }
          });
          
          if (!response.ok) {
            console.warn(`[Home] Failed to fetch portfolio for ${category}: ${response.status}`);
            return [];
          }

          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('[Home] Non-JSON response for portfolio');
            return [];
          }
          
          const data = await response.json();
          if (data && Array.isArray(data) && data.length > 0) {
            return data.filter((f: any) => f.mimeType && f.mimeType.startsWith('image/'));
          }
          return [];
        };

        let allImages: any[] = [];

        if (activeCategory === 'All') {
          const fetchPromises = Object.entries(FOLDER_MAP).map(([cat, folderId]) => 
            fetchForCategory(folderId, cat)
          );
          const results = await Promise.all(fetchPromises);
          allImages = results.flat();
        } else {
          const folderId = FOLDER_MAP[activeCategory];
          if (!folderId) {
            setPortfolioItems(FALLBACK_IMAGES);
            setLoadingPortfolio(false);
            return;
          }
          allImages = await fetchForCategory(folderId, activeCategory);
        }

        // Shuffle and take top 9 to simulate a varied portfolio
        // Put pinned items at the top
        if (allImages.length > 0) {
          const sorted = [...allImages].sort((a, b) => {
            const isPinnedA = pinnedIds.includes(a.id);
            const isPinnedB = pinnedIds.includes(b.id);
            if (isPinnedA && !isPinnedB) return -1;
            if (!isPinnedA && isPinnedB) return 1;
            return 0.5 - Math.random(); // Still shuffle the rest
          });
          setPortfolioItems(sorted.slice(0, 9));
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
  }, [activeCategory, pinnedIds.join(',')]);

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
        subject: 'Wedding',
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
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
        <ThreeDScene />
        
        {/* Classic Camera Viewfinder & Film Grain Effect */}
        <div className="absolute inset-0 z-[5] pointer-events-none">
          {/* Film Grain Texture Overlay */}
          <div className="absolute inset-0 bg-[url('https://grain-y.com/images/grain-pattern.png')] opacity-[0.05] mix-blend-overlay" />
          
          {/* Viewfinder Frame */}
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-8 md:inset-16 border-[1px] border-white/5 rounded-3xl"
          >
            {/* Corner Marks */}
            <div className="absolute -top-[1px] -left-[1px] w-12 h-12 border-t-[3px] border-l-[3px] border-primary/30 rounded-tl-3xl shadow-[0_0_15px_rgba(16,185,129,0.1)]" />
            <div className="absolute -top-[1px] -right-[1px] w-12 h-12 border-t-[3px] border-r-[3px] border-primary/30 rounded-tr-3xl shadow-[0_0_15px_rgba(16,185,129,0.1)]" />
            <div className="absolute -bottom-[1px] -left-[1px] w-12 h-12 border-b-[3px] border-l-[3px] border-primary/30 rounded-bl-3xl shadow-[0_0_15px_rgba(16,185,129,0.1)]" />
            <div className="absolute -bottom-[1px] -right-[1px] w-12 h-12 border-b-[3px] border-r-[3px] border-primary/30 rounded-br-3xl shadow-[0_0_15px_rgba(16,185,129,0.1)]" />

            {/* Central Autofocus Bracket */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 opacity-20">
               <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white" />
               <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white" />
               <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white" />
               <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white" />
            </div>

            {/* Technical Data HUD */}
            <div className="absolute top-10 left-10 hidden md:block">
              <div className="flex items-center gap-3 text-white/20 font-mono text-[9px] uppercase tracking-[0.2em]">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]" />
                LIVE VIEW
              </div>
            </div>
            
            <div className="absolute bottom-10 right-10 hidden md:flex items-center gap-8 text-white/20 font-mono text-[9px] uppercase tracking-[0.2em]">
               <span>S-LOG3 / BT.2020</span>
               <span>4K 60FPS</span>
               <div className="flex items-center gap-2 border border-white/10 px-2 py-0.5 rounded">
                  <div className="w-3 h-1.5 bg-primary/40 rounded-sm" />
                  STBY
               </div>
            </div>
          </motion.div>

          {/* Bottom Fade */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a] opacity-80" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-7xl mx-auto flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, letterSpacing: '1em' }}
            animate={{ opacity: 1, letterSpacing: '0.4em' }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="mb-10"
          >
             <span className="text-[10px] text-primary uppercase font-bold tracking-[0.6em] block mb-2">
               rays of moment
             </span>
             <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center mb-16"
          >
            <h1 className="text-[12vw] md:text-[9vw] font-sans font-black text-white leading-[0.85] tracking-tighter uppercase text-center select-none perspective-1000">
              Your Moment <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-primary drop-shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                Our Priority
              </span>
            </h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 1 }}
              className="text-white/40 mt-12 max-w-lg text-sm md:text-lg font-sans font-medium leading-relaxed tracking-wide"
            >
              Mastering the art of cinematic precision. We refine every pixel to capture the pure essence of your life's greatest performances.
            </motion.p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-8 w-full"
          >
            <Link to="/auth" className="btn-premium px-12 py-4 text-xs tracking-[0.3em]">
              EXPERIENCE NOW
            </Link>
            <Link to="/gallery" className="text-white/60 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.4em] flex items-center group">
              VIEW THE COLLECTION
              <ArrowRight className="w-3 h-3 ml-3 transform group-hover:translate-x-2 transition-transform text-primary" />
            </Link>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1 }}
          className="absolute bottom-12 flex flex-col items-center gap-4"
        >
           <span className="text-[8px] text-white/30 font-black tracking-[0.5em] uppercase">Scroll</span>
           <div className="w-[1px] h-20 bg-gradient-to-b from-primary/50 to-transparent" />
        </motion.div>
      </section>

      {/* Product Highlight Marquee */}
      <div className="bg-[#0f0f0f] py-12 border-y border-white/5 overflow-hidden select-none">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          className="flex whitespace-nowrap gap-24 items-center"
        >
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-24">
              <span className="text-5xl md:text-7xl font-sans font-black text-white/5 uppercase tracking-tighter">Premium Visuals</span>
              <Logo className="w-10 h-10 text-primary opacity-20" />
              <span className="text-5xl md:text-7xl font-sans font-black text-white/5 uppercase tracking-tighter">Cinematic Fidelity</span>
              <div className="w-4 h-[1px] bg-primary/20" />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Feature Showcase Grid */}
      <section id="features" className="py-20 md:py-40 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full bg-accent/5 blur-[120px] rounded-full opacity-50" />
        
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 relative z-10">
          <div className="text-center mb-24 max-w-3xl mx-auto">
            <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary mb-6 block">The Tech Stack</span>
            <h2 className="text-4xl md:text-8xl font-sans font-black text-gray-900 tracking-tighter uppercase leading-none mb-10">
              Engineered <br /> for Impact
            </h2>
            <p className="text-gray-400 text-lg font-medium leading-relaxed">
              We leverage advanced optics and digital refinement to deliver a visual experience that isn't just observed, but felt.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[
              { icon: Heart, name: "Wedding Cinematic", desc: "Soul-stirring visual narratives that turn your vows into timeless cinematic history." },
              { icon: Music, name: "Fidelity Audio-Visual", desc: "Crisp, dynamic rhythm captures that bring the stage presence to every screen." },
              { icon: Award, name: "Premium Portraits", desc: "Signature lighting and character framing designed to capture your unique essence." },
              { icon: Star, name: "Expert Curation", desc: "Each frame is meticulously selected and processed through our proprietary color science." },
              { icon: Users, name: "Client Collaboration", desc: "Seamless digital management of your project from conception to delivery." }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                className="glass-card p-12 rounded-[2.5rem] group hover:scale-[1.02] transition-all duration-500"
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-black/5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">{feature.name}</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-medium">{feature.desc}</p>
                <div className="mt-8 pt-8 border-t border-gray-100 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Learn Specifications</span>
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Preview */}
      <section id="portfolio" className="py-20 md:py-40 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-12">
            <div className="max-w-2xl">
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary mb-6 block">The Portfolio</span>
              <h2 className="text-4xl md:text-8xl font-sans font-black text-gray-900 tracking-tighter uppercase leading-none mb-10">Selected <br /> Works</h2>
              <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-lg">A curated anthology of visual stories, specifically engineered to capture the profound depth of human experience.</p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-10">
              <Link to="/gallery" className="btn-premium px-12">Full Archives</Link>
            </div>
          </div>
          
          {/* Category Highlights */}
          <div className="flex justify-start items-center gap-4 md:gap-8 py-10 overflow-x-auto no-scrollbar mb-20 scroll-smooth border-b border-gray-100">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-4 px-8 py-4 rounded-full transition-all duration-700 font-sans font-black text-[10px] uppercase tracking-[0.3em] whitespace-nowrap ${
                  activeCategory === cat.name 
                    ? 'bg-primary text-white shadow-2xl shadow-primary/40 scale-105' 
                    : 'bg-transparent text-gray-400 hover:text-black hover:bg-gray-50'
                }`}
              >
                <cat.icon className={`w-4 h-4 ${activeCategory === cat.name ? 'text-white' : 'text-primary'}`} />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
            {loadingPortfolio ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-gray-50 animate-pulse rounded-[2.5rem]" />
              ))
            ) : portfolioItems.length > 0 ? (
              portfolioItems.map((item, i) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.8 }}
                  className="relative aspect-[4/5] overflow-hidden bg-gray-100 group cursor-pointer rounded-[2.5rem] product-shadow border border-gray-50 hover:-translate-y-2 transition-all duration-700"
                >
                  <Link to="/gallery" className="block w-full h-full">
                    {pinnedIds.includes(item.id) && (
                      <div className="absolute top-6 right-6 z-30 bg-primary text-white p-2 rounded-full shadow-lg">
                        <Pin className="w-3 h-3 fill-current" />
                      </div>
                    )}
                    <img 
                      src={item.thumbnailLink ? item.thumbnailLink.replace('=s220', '=s1000') : (item.webViewLink?.includes('imgix.net') ? item.webViewLink : `/api/drive/image/${item.id}`)} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                      referrerPolicy="no-referrer" 
                    />
                  </Link>
                </motion.div>
              ))
            ) : (
              [
                "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800"
              ].map((url, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative aspect-[4/5] overflow-hidden bg-gray-50 group cursor-pointer rounded-[2.5rem] product-shadow border border-gray-100"
                >
                  <Link to="/gallery" className="block w-full h-full">
                    <img 
                      src={url || undefined} 
                      alt="Portfolio Placeholder" 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-80 group-hover:opacity-100" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 flex flex-col justify-end p-10">
                       <p className="text-white font-sans font-black text-xl tracking-tighter uppercase">Cinematic Reserve</p>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 md:py-40 bg-[#0a0a0a] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-primary/5 blur-[120px] rounded-full opacity-20 -translate-y-1/2 translate-x-1/3" />
        
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-32 gap-12">
            <div className="max-w-2xl">
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary/60 mb-6 block">Client Reviews</span>
              <h2 style={{ color: '#6FD1D7' }} className="text-4xl md:text-8xl font-sans font-black tracking-tighter uppercase leading-[0.85] mb-10">Trusted <br /> by Legends</h2>
            </div>
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Sabbyasachi Ghosh", role: "Principal Architect", comment: "The cinematic fidelity brought to our project was unparalleled. A true masterclass in visual storytelling.", rating: 5 },
              { name: "Arindum Bhakat", role: "Creative Director", comment: "Meticulous attention to detail and a workflow that respects the artistic integrity of the subject matter.", rating: 5 },
              { name: "Wasima Molla", role: "Exhibition Curator", comment: "A level of lighting and composition that borders on fine art. Simply the best in the studio class.", rating: 5 }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 1 }}
                className="bg-white/[0.03] p-12 rounded-[3rem] border border-white/5 backdrop-blur-3xl group hover:bg-white/[0.07] transition-all duration-700"
              >
                <div className="flex gap-1 mb-10">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-primary fill-current opacity-60 group-hover:opacity-100 transition-opacity" />
                  ))}
                </div>
                <p className="text-2xl font-sans font-medium text-white leading-relaxed mb-12 tracking-tight">"{testimonial.comment}"</p>
                <div className="flex items-center gap-6 pt-10 border-t border-white/5">
                  <div className="w-10 h-0.5 bg-primary/40 group-hover:w-16 transition-all duration-700" />
                  <div>
                    <h4 style={{ color: '#6FD1D7' }} className="font-sans font-black text-sm tracking-tighter uppercase">{testimonial.name}</h4>
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.3em] mt-1">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section - Redesigned as Studio Philosophy */}
      <section id="about" className="py-20 md:py-40 bg-gray-50 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full" />
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="relative"
            >
              <div className="relative aspect-[4/5] rounded-[3rem] overflow-hidden product-shadow">
                <img 
                  src="https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&q=80&w=2070" 
                  alt="Studio Environment" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent" />
              </div>
              <div className="absolute -bottom-12 -right-12 bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 hidden md:block">
                <p className="text-5xl font-sans font-black text-primary mb-1 tracking-tighter">7+</p>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Years of Precision</p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary mb-8 block">Our Manifesto</span>
              <h2 className="text-5xl md:text-7xl font-sans font-black text-gray-900 tracking-tighter uppercase leading-[0.9] mb-12">Visual <br /> Engineering</h2>
              <p className="text-gray-500 text-lg font-medium leading-relaxed mb-16">
                Rays of Moment is more than a studio; it's a digital forge. We refine the raw chaos of light and life into high-fidelity visual assets that endure the test of time.
              </p>
              <div className="space-y-8">
                {[
                  { icon: <Users className="w-5 h-5" />, title: "Precision Team", text: "A collective of technical artists and visual engineers." },
                  { icon: <Award className="w-5 h-5" />, title: "Studio Standards", text: "Operating at the intersection of tech and tradition." },
                  { icon: <Star className="w-5 h-5" />, title: "Global Impact", text: "Delivering excellence to clients across international borders." }
                ].map((item, i) => (
                  <div key={i} className="flex items-start space-x-6 group">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg text-primary group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 tracking-tight uppercase text-xs mb-1">{item.title}</h4>
                      <p className="text-gray-400 text-sm font-medium">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-20 md:py-40 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14">
          <div className="flex flex-col md:flex-row items-end justify-between mb-32 gap-12">
            <div className="max-w-2xl">
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary mb-6 block">The Collective</span>
              <h2 className="text-4xl md:text-8xl font-sans font-black text-gray-900 tracking-tighter uppercase leading-[0.85] mb-10">Visual <br /> Pioneers</h2>
            </div>
            <Link to="/careers" className="btn-premium px-12">Join Our Talent</Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { name: "Saikat Banerjee", role: "Chief Cinematographer", img: "https://media.canva.com/v2/image-resize/format:JPG/height:550/quality:92/uri:ifs%3A%2F%2FM%2F61ff3ea2-afab-45d8-868b-3fb4fdd8adee/watermark:F/width:366?csig=AAAAAAAAAAAAAAAAAAAAAI_K_7MvVVMRCRIGqfOTcp0MTRTrzX07IqB-jVuMQTFz&exp=1778278919&osig=AAAAAAAAAAAAAAAAAAAAADyv6HQLdv5P_TNHfn0h6mIS4b-j3gRzh5BxAAX2MO0B&signer=media-rpc&x-canva-quality=thumbnail_large" },
              { name: "Manas Chakraborty", role: "Traditional Architect", img: "https://media.canva.com/v2/image-resize/format:JPG/height:550/quality:92/uri:ifs%3A%2F%2FM%2F0167562b-021f-49f8-a759-156edec2854e/watermark:F/width:550?csig=AAAAAAAAAAAAAAAAAAAAAMCETAXR6nnG2OfC1x_HF-9knyVjdaJFfvvkWVHjjjSn&exp=1778280127&osig=AAAAAAAAAAAAAAAAAAAAAHY05uoo0f7A2Q4UHdqOzgbl6SCNI_QYvGnf5juz1p-W&signer=media-rpc&x-canva-quality=thumbnail_large" },
              { name: "Soumyabrata Basu", role: "Creative Director", img: "https://69cb4f3f21aad77cf8fd3eac.imgix.net/photographer/557633968_2157876834705384_1864001844006848917_n.jpg" },
              { name: "Ayan Das", role: "Portrait Specialist", img: "https://69cb4f3f21aad77cf8fd3eac.imgix.net/WhatsApp%20Image%202026-04-15%20at%2019.06.57.jpeg" },
              { name: "Sujan Mondal", role: "Candid Strategist", img: "https://media.canva.com/v2/image-resize/format:JPG/height:550/quality:92/uri:ifs%3A%2F%2FM%2Fda9665c9-a9f2-45a4-861a-78e5cf239f71/watermark:F/width:392?csig=AAAAAAAAAAAAAAAAAAAAAOtEbkPQJZdTWFAd8-OsRPLuc0E_dNzxGactNp8gYQFJ&exp=1778280328&osig=AAAAAAAAAAAAAAAAAAAAADIENTEd7622W0G4CnRdxyJY8PLRDRAYq1SMpnt9Edp8&signer=media-rpc&x-canva-quality=thumbnail_large" },
              { name: "Sujoy Mondal", role: "High-Fidelity Cinematographer", img: "https://69cb4f3f21aad77cf8fd3eac.imgix.net/photographer/610113658_18159544471416473_8550580723945196816_n.jpg" },
              { name: "Mainak Biswas", role: "Digital Content Lead", img: "https://media.canva.com/v2/image-resize/format:JPG/height:550/quality:92/uri:ifs%3A%2F%2FM%2F283a93e1-55d1-416a-882d-6a85f7b7f14f/watermark:F/width:545?csig=AAAAAAAAAAAAAAAAAAAAANx-DwvzMJlT81F9FLlRFFhTLFoTvm19gGOJL43POyWe&exp=1778281506&osig=AAAAAAAAAAAAAAAAAAAAABvNi2JGLsFRIjBkcIOSjr5oHP0x2HG3ekai4WkBgS3n&signer=media-rpc&x-canva-quality=thumbnail_large" }
            ].map((member, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                className="group"
              >
                <div className="relative aspect-[4/5] rounded-[3rem] overflow-hidden mb-10 bg-gray-50 product-shadow transition-all duration-1000 group-hover:scale-[1.02] group-hover:rotate-1">
                  <img 
                    src={member.img} 
                    alt={member.name} 
                    className="w-full h-full object-cover transition-all duration-1000 scale-[1.05] group-hover:scale-100" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${member.name}/600/800`;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                </div>
                <div className="px-6">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors tracking-tight uppercase leading-none mb-3">{member.name}</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-[1px] bg-primary/20 group-hover:w-10 group-hover:bg-primary transition-all duration-700" />
                    <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.2em]">{member.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 md:py-40 bg-[#0a0a0a] text-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary mb-10 block">Consultation</span>
              <h2 style={{ color: '#6FD1D7' }} className="text-4xl md:text-8xl font-sans font-black tracking-tighter uppercase leading-[0.85] mb-12">Submit <br /> Inquiry</h2>
              <p className="text-white/40 text-lg font-medium leading-relaxed mb-20 max-w-lg">Initiate your creative sequence. Our studio facilitates bespoke visual engagements designed for maximum performance and impact.</p>
              
              <div className="space-y-16">
                <div className="flex items-start gap-8 group">
                  <div className="w-16 h-16 bg-white/[0.03] rounded-3xl flex items-center justify-center border border-white/5 shadow-2xl group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-500">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 style={{ color: '#6FD1D7' }} className="font-sans font-black text-sm tracking-tighter uppercase mb-2">Studio Location</h4>
                    <p className="text-white/30 font-medium">Berhampore Headquarters<br />Murshidabad, WB 742103</p>
                  </div>
                </div>
                <div className="flex items-start gap-8 group">
                  <div className="w-16 h-16 bg-white/[0.03] rounded-3xl flex items-center justify-center border border-white/5 shadow-2xl group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-500">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 style={{ color: '#6FD1D7' }} className="font-sans font-black text-sm tracking-tighter uppercase mb-2">Live Support</h4>
                    <div className="flex flex-col gap-1">
                      <a href="tel:8967106723" className="text-white/30 hover:text-white transition-colors font-medium">8967106723</a>
                      <a href="tel:9083486788" className="text-white/30 hover:text-white transition-colors font-medium">9083486788</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/[0.02] p-8 md:p-16 rounded-[3.5rem] border border-white/5 backdrop-blur-3xl product-shadow">
              <form className="space-y-10" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Identification</label>
                    <input 
                      required
                      placeholder="Full Name"
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/[0.02] border-b border-white/10 py-6 outline-none focus:border-primary transition-all text-white placeholder:text-white/10 font-sans font-medium text-lg" 
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Communication Line</label>
                    <input 
                      required
                      placeholder="Email Address"
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/[0.02] border-b border-white/10 py-6 outline-none focus:border-primary transition-all text-white placeholder:text-white/10 font-sans font-medium text-lg" 
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Contact Number</label>
                    <input 
                      required
                      placeholder="+91"
                      type="tel" 
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full bg-white/[0.02] border-b border-white/10 py-6 outline-none focus:border-primary transition-all text-white placeholder:text-white/10 font-sans font-medium text-lg" 
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Engagement Type</label>
                    <select 
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full bg-white/[0.02] border-b border-white/10 py-6 outline-none focus:border-primary transition-all text-white font-sans font-medium text-lg"
                    >
                      <option className="bg-[#0a0a0a]" value="Wedding">Wedding</option>
                      <option className="bg-[#0a0a0a]" value="Rice ceremony">Rice ceremony</option>
                      <option className="bg-[#0a0a0a]" value="Birthday">Birthday</option>
                      <option className="bg-[#0a0a0a]" value="Music video">Music video</option>
                      <option className="bg-[#0a0a0a]" value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Project Summary</label>
                  <textarea 
                    required
                    placeholder="Describe your vision..."
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-3xl p-8 outline-none focus:border-primary transition-all text-white placeholder:text-white/10 font-sans font-medium text-lg resize-none" 
                  />
                </div>

                <Captcha onVerify={setIsCaptchaVerified} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6" />
                
                <button 
                  type="submit" 
                  disabled={isSubmitting || !isCaptchaVerified}
                  className="btn-premium w-full py-6 text-xs tracking-[0.4em] disabled:opacity-50 disabled:scale-100 uppercase flex items-center justify-center gap-4"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <span>Submit Engagement</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer is now global in App.tsx */}
    </div>
  );
};

export default Home;
