import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Utensils, 
  Sparkles, 
  Flower2, 
  ArrowRight, 
  CheckCircle2,
  Users,
  CalendarDays,
  X,
  Mail,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { notifyAdmins } from '../services/notificationService';
import Logo from './Logo';

const OtherServices: React.FC = () => {
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    location: '',
    requirements: ''
  });

  const services = [
    {
      title: "Full Event Management",
      icon: <LayoutDashboard className="w-10 h-10 text-orange-500" />,
      description: "End-to-end planning and execution for your most important milestones.",
      features: ["Venue Selection", "Timeline Management", "Vendor Coordination", "On-site Supervision"],
      img: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=2069"
    },
    {
      title: "Professional Makeup",
      icon: <Sparkles className="w-10 h-10 text-pink-500" />,
      description: "Expert makeup artists to make you look stunning for your special day.",
      features: ["Bridal Makeup", "Party Styling", "Hair Design", "Trial Sessions"],
      img: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=2071"
    },
    {
      title: "Premium Catering",
      icon: <Utensils className="w-10 h-10 text-green-500" />,
      description: "Exquisite culinary experiences tailored to your taste and guest list.",
      features: ["Custom Menus", "Professional Staff", "Buffet & Plated Service", "Dessert Tables"],
      img: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=2070"
    },
    {
      title: "Luxury Decoration",
      icon: <Flower2 className="w-10 h-10 text-purple-500" />,
      description: "Transforming spaces with breathtaking decor and floral arrangements.",
      features: ["Theme Design", "Floral Artistry", "Lighting Setup", "Stage Decoration"],
      img: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=2074"
    }
  ];

  const handleOpenInquiry = (serviceTitle: string) => {
    setSelectedService(serviceTitle);
    setIsInquiryModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsInquiryModalOpen(false);
    setFormData({
      name: '',
      email: '',
      phoneNumber: '',
      location: '',
      requirements: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'serviceInquiries'), {
        serviceTitle: selectedService,
        ...formData,
        createdAt: new Date().toISOString()
      });
      
      await notifyAdmins(
        'New Service Inquiry',
        `${formData.name} inquired about ${selectedService}.`,
        'info',
        '/inquiries'
      );

      toast.success('Inquiry submitted successfully! We will contact you soon.');
      handleCloseModal();
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      toast.error('Failed to submit inquiry. Please try again.');
    }
  };

  return (
    <div className="py-24 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold text-gray-900 mb-6"
          >
            Beyond Photography
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-500 max-w-3xl mx-auto"
          >
            We offer a complete suite of event services to ensure your celebration is seamless, beautiful, and unforgettable.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-24">
          {services.map((service, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              className={`flex flex-col lg:flex-row items-center gap-12 ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
            >
              <div className="flex-1">
                <div className="mb-6">{service.icon}</div>
                <h2 className="text-4xl font-bold text-gray-900 mb-4">{service.title}</h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  {service.description}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                  {service.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-black" />
                      <span className="text-gray-700 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => handleOpenInquiry(service.title)}
                  className="inline-flex items-center space-x-2 bg-black text-white px-8 py-4 rounded-full font-bold hover:bg-gray-800 transition-all group"
                >
                  <span>Inquire Now</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
                </button>
              </div>
              <div className="flex-1 w-full">
                <div className="relative aspect-[16/10] rounded-[2rem] overflow-hidden shadow-2xl">
                  <img 
                    src={service.img} 
                    alt={service.title} 
                    className="w-full h-full object-cover transition-transform duration-1000 hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Why Choose Us Section */}
        <div className="mt-32 bg-gray-50 rounded-[3rem] p-12 lg:p-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our Management?</h2>
            <p className="text-gray-500">One point of contact for all your event needs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Users className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-xl font-bold mb-3">Expert Team</h3>
              <p className="text-gray-600">Dedicated specialists for each department ensuring top-tier quality.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <CalendarDays className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-xl font-bold mb-3">Seamless Planning</h3>
              <p className="text-gray-600">We handle the stress so you can focus on enjoying your moment.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Logo className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold mb-3">Integrated Media</h3>
              <p className="text-gray-600">Perfect synergy between event flow and photography coverage.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Inquiry Modal */}
      <AnimatePresence>
        {isInquiryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Service Inquiry</h2>
                  <p className="text-sm text-gray-500">{selectedService}</p>
                </div>
                <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
                    placeholder="Your Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone Number</label>
                  <input
                    required
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
                    placeholder="Your Phone Number"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Event Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      required
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
                      placeholder="City, Venue, etc."
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Specific Requirements</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <textarea
                      required
                      rows={3}
                      value={formData.requirements}
                      onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
                      placeholder="Tell us more about your event..."
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-black text-white py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/20"
                  >
                    <span>Submit Inquiry</span>
                    <ArrowRight className="w-5 h-5" />
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

export default OtherServices;

