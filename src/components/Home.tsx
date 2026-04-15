import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Award, Mail, Phone, MapPin, ArrowRight, Star, Instagram, Twitter, Facebook, Linkedin, MessageCircle, Loader2, ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { notifyAdmins } from '../services/notificationService';
import Logo from './Logo';
import Captcha from './Captcha';

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
  const FOLDER_ID = '14s9KpnT6uwVnN-lXrzF7ixn_qq-Wp7OI';

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch(`/api/drive/list/${FOLDER_ID}`);
        if (response.ok) {
          const data = await response.json();
          // Filter for images and take first 3
          const images = data.filter((f: any) => f.mimeType.startsWith('image/')).slice(0, 3);
          setPortfolioItems(images);
        }
      } catch (error) {
        console.error('Error fetching portfolio:', error);
      } finally {
        setLoadingPortfolio(false);
      }
    };
    fetchPortfolio();
  }, []);

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
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=2071"
            alt="Hero Background"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight"
          >
            Capturing Moments, <br />
            <span className="text-gray-300">Preserving Memories.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto"
          >
            Rays of Moment is a premier photography studio dedicated to telling your unique story through stunning visual narratives.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/auth" className="w-full sm:w-auto bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-gray-200 transition-all">
              Get Started
            </Link>
            <Link to="/packages" className="w-full sm:w-auto border-2 border-white text-white px-8 py-4 rounded-full font-bold hover:bg-white hover:text-black transition-all">
              View Packages
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Portfolio Preview */}
      <section id="portfolio" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Portfolio</h2>
              <p className="text-gray-500 max-w-2xl">A glimpse into the stories we've told and the moments we've captured across the globe.</p>
            </div>
            <Link to="/gallery" className="inline-flex items-center text-black font-bold hover:underline group">
              <span>View All Galleries</span>
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-2" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {loadingPortfolio ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-2xl bg-gray-100 animate-pulse" />
              ))
            ) : portfolioItems.length > 0 ? (
              portfolioItems.map((item, i) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="relative aspect-[4/5] min-h-[400px] rounded-2xl overflow-hidden shadow-lg group cursor-pointer bg-gray-100"
                >
                  <Link to="/gallery">
                    <img 
                      src={item.thumbnailLink?.replace('=s220', '=s800') || item.webViewLink} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8">
                      <h3 className="text-2xl font-bold text-white mb-2 truncate">{item.name}</h3>
                      <div className="flex items-center text-white/80 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0 duration-300">
                        <span>View in Gallery</span>
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            ) : (
              [
                { url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=2070", title: "Weddings", category: "Wedding" },
                { url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=2069", title: "Events", category: "Event" },
                { url: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=2070", title: "Portraits", category: "Portrait" }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="relative aspect-[4/5] min-h-[400px] rounded-2xl overflow-hidden shadow-lg group cursor-pointer bg-gray-100"
                >
                  <Link to={`/gallery?category=${item.category}`}>
                    <img 
                      src={item.url} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8">
                      <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                      <div className="flex items-center text-white/80 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0 duration-300">
                        <span>View Gallery</span>
                        <ArrowRight className="w-4 h-4 ml-2" />
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
