import React, { useState } from 'react';
import { Check, Camera, Heart, Users, Briefcase, Star, ArrowRight, LayoutDashboard, Search, Filter, Plus, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Logo from './Logo';

import { categories, packageData } from '../constants/packages';

const Packages: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState("WeddingGroom");
  const [searchQuery, setSearchQuery] = useState("");
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleBookNow = (pkg: any) => {
    addToCart({
      id: `${activeCategory}-${pkg.name}`,
      name: pkg.name,
      price: pkg.price,
      category: activeCategory,
    });
    navigate('/cart');
  };

  const filteredAddOns = packageData.AddOn.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="py-20 md:py-32 bg-white min-h-screen relative overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-full bg-accent/5 blur-[120px] rounded-full opacity-30 -translate-y-1/2 translate-x-1/3" />
      
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 relative z-10">
        <div className="text-center mb-32 max-w-3xl mx-auto">
          <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary mb-8 block">The Collection</span>
          <h1 className="text-4xl md:text-8xl font-sans font-black text-gray-900 tracking-tighter uppercase leading-[0.85] mb-12">
            Engineered <br /> Experiences
          </h1>
          <p className="text-gray-400 text-lg font-medium leading-relaxed">
            Select from our performance-tuned visual archives or facilitate a bespoke sequence tailored to your creative objectives.
          </p>
        </div>

        {/* Category Navigation */}
        <div className="flex flex-wrap justify-center gap-6 mb-24 border-b border-gray-100 pb-12 overflow-x-auto no-scrollbar scroll-smooth">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-4 px-10 py-4 rounded-full font-sans font-black text-[10px] uppercase tracking-[0.3em] transition-all duration-700 whitespace-nowrap ${
                activeCategory === cat.id 
                ? 'bg-primary text-white shadow-2xl shadow-primary/40 scale-105' 
                : 'bg-transparent text-gray-400 hover:text-black hover:bg-gray-50'
              }`}
            >
              <span className={activeCategory === cat.id ? 'text-white' : 'text-primary'}>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeCategory !== "AddOn" ? (
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12"
            >
              {packageData[activeCategory]?.map((pkg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.8 }}
                  className={`relative glass-card p-12 rounded-[3.5rem] flex flex-col h-full group hover:scale-[1.02] transition-all duration-700 ${pkg.popular ? 'border-primary/30 product-shadow' : ''}`}
                >
                  {pkg.popular && (
                    <div className="absolute top-0 right-12 -translate-y-1/2 bg-accent text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.4em] shadow-xl shadow-accent/20">
                      Standard Issue
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-3">{pkg.name}</h3>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{activeCategory}</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                      <Camera className="w-6 h-6" />
                    </div>
                  </div>
                  
                  <div className="mb-12">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-gray-900 tracking-tighter">₹{pkg.price.toLocaleString()}</span>
                      {pkg.unit && <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">{pkg.unit}</span>}
                    </div>
                    <span className="text-primary text-[9px] font-black uppercase tracking-[0.3em] block mt-2">Base Specification Cost</span>
                  </div>
                  
                  <ul className="space-y-6 mb-16 flex-grow">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-4 text-xs font-medium text-gray-500 group-hover:text-gray-900 transition-colors">
                        <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => handleBookNow(pkg)}
                    className="btn-premium w-full py-6 text-xs tracking-[0.4em] uppercase flex items-center justify-center gap-4"
                  >
                    <span>Initiate Booking</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="AddOn"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="bg-white rounded-[3.5rem] p-16 product-shadow border border-gray-100"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-12">
                <div className="max-w-xl">
              <h2 className="text-4xl font-sans font-black text-gray-900 tracking-tighter uppercase leading-none mb-6">Component <br /> Upgrades</h2>
                  <p className="text-gray-400 font-medium">Refine your session with tactical add-ons designed for maximum visual performance.</p>
                </div>
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="text"
                    placeholder="Search Specifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-16 pr-6 py-6 bg-gray-50 border border-gray-100 rounded-3xl outline-none focus:border-primary transition-all font-sans font-medium text-lg placeholder:text-gray-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredAddOns.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-8 bg-gray-50 rounded-[2.5rem] hover:bg-white hover:product-shadow border border-transparent hover:border-gray-100 transition-all duration-700 group">
                    <div className="flex-grow pr-6">
                      <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors tracking-tight uppercase text-sm mb-2">{item.name}</h4>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">₹{item.price.toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => {
                        addToCart({
                          id: `addon-${item.name}`,
                          name: item.name,
                          price: item.price,
                          category: 'Add-On'
                        });
                        navigate('/cart');
                      }}
                      className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:bg-primary group-hover:text-white transition-all duration-500"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
              
              {filteredAddOns.length === 0 && (
                <div className="text-center py-20">
                  <Logo className="w-16 h-16 text-gray-100 mx-auto mb-8 animate-pulse" />
                  <p className="text-gray-300 font-sans font-black uppercase tracking-[0.4em] text-xs">No Data Found</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Package Builder */}
        <div className="mt-40 bg-[#0a0a0a] rounded-[4rem] p-12 md:p-24 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-full bg-primary/5 blur-[120px] rounded-full opacity-50 translate-x-1/2 -translate-y-1/2 group-hover:bg-accent/5 transition-all duration-1000" />
          
          <div className="text-center mb-32 relative z-10 max-w-2xl mx-auto">
            <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary mb-8 block">The Forge</span>
            <h2 className="text-4xl md:text-8xl font-sans font-black text-white tracking-tighter uppercase leading-[0.85] mb-12">Bespoke <br /> Generation</h2>
            <p className="text-white/40 text-lg font-medium leading-relaxed">
              Manually configure your session parameters. Our real-time engine will calculate a precision estimate based on your unique creative requirements.
            </p>
          </div>

          <CustomPackageForm />
        </div>
      </div>
    </div>
  );
};

const CustomPackageForm: React.FC = () => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState({
    workType: 'Wedding',
    days: 1,
    photographers: 1,
    videographers: 1,
    sensorType: 'Full',
    drone: false,
    album: false,
    location: '',
    extraServices: [] as { name: string, price: number }[]
  });

  const [serviceSearch, setServiceSearch] = React.useState("");
  const [showServiceList, setShowServiceList] = React.useState(false);

  // Unified list of all available services and packages
  const allServices = React.useMemo(() => {
    const services: { name: string, price: number, category: string }[] = [];
    
    // Add base packages
    Object.entries(packageData).forEach(([category, pkgs]) => {
      if (category !== "AddOn") {
        pkgs.forEach(pkg => {
          services.push({
            name: `${category} - ${pkg.name}`,
            price: pkg.price,
            category: category
          });
        });
      } else {
        // Add add-ons
        pkgs.forEach(addon => {
          services.push({
            name: addon.name,
            price: addon.price,
            category: "Add-On"
          });
        });
      }
    });
    
    return services;
  }, []);

  const filteredServices = allServices.filter(s => 
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) &&
    !formData.extraServices.find(es => es.name === s.name)
  );

  const addService = (service: { name: string, price: number }) => {
    setFormData({
      ...formData,
      extraServices: [...formData.extraServices, service]
    });
    setServiceSearch("");
    setShowServiceList(false);
  };

  const removeService = (name: string) => {
    setFormData({
      ...formData,
      extraServices: formData.extraServices.filter(s => s.name !== name)
    });
  };

  const calculateAmount = () => {
    // Rates based on Add-On services
    const rates: Record<string, Record<string, number>> = {
      'WeddingGroom': { 'Crop': 4000, 'Full': 6000, 'Cine': 15000 },
      'WeddingBride': { 'Crop': 4000, 'Full': 6000, 'Cine': 15000 },
      'WeddingBoth': { 'Crop': 4000, 'Full': 6000, 'Cine': 15000 },
      'Birthday': { 'Crop': 2500, 'Full': 4500, 'Cine': 12000 },
      'Upanayan': { 'Crop': 3500, 'Full': 5000, 'Cine': 12000 },
      'Event': { 'Crop': 3000, 'Full': 4000, 'Cine': 12000 },
      'ModelShoot': { 'Crop': 1500, 'Full': 2000, 'Cine': 2500 },
      'PreWedding': { 'Crop': 3500, 'Full': 4500, 'Cine': 12000 },
      'ShortFilm': { 'Crop': 3500, 'Full': 5500, 'Cine': 15000 },
      'Other': { 'Crop': 3500, 'Full': 5500, 'Cine': 13000 }
    };

    const currentRates = rates[formData.workType] || rates['Other'];
    const ratePerPerson = currentRates[formData.sensorType] || currentRates['Full'];
    
    let total = (formData.photographers + formData.videographers) * ratePerPerson * formData.days;
    
    // Checkboxes
    if (formData.drone) total += 6000 * formData.days;
    if (formData.album) total += 7500;
    
    // Extra services
    formData.extraServices.forEach(s => total += s.price);
    
    return total;
  };

  const amount = calculateAmount();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-start relative z-10 text-white">
      <div className="space-y-16">
        <div className="space-y-10">
          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary flex items-center gap-4">
            <Filter className="w-4 h-4" />
            Core Configuration
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Engagement Archetype</label>
              <select 
                value={formData.workType}
                onChange={(e) => setFormData({...formData, workType: e.target.value})}
                className="w-full bg-white/[0.02] border-b border-white/10 py-4 outline-none focus:border-primary transition-all text-white font-sans font-medium text-lg"
              >
                <option className="bg-[#0a0a0a]" value="WeddingGroom">Wedding (Groom Side)</option>
                <option className="bg-[#0a0a0a]" value="WeddingBride">Wedding (Bride Side)</option>
                <option className="bg-[#0a0a0a]" value="WeddingBoth">Wedding (Both Side)</option>
                <option className="bg-[#0a0a0a]" value="Birthday">Birthday / Rice Ceremony</option>
                <option className="bg-[#0a0a0a]" value="Upanayan">Upanayan Archive</option>
                <option className="bg-[#0a0a0a]" value="PreWedding">Pre-Wedding / Cine Video</option>
                <option className="bg-[#0a0a0a]" value="ShortFilm">Short Film Sequence</option>
                <option className="bg-[#0a0a0a]" value="Event">Event Documentation</option>
                <option className="bg-[#0a0a0a]" value="ModelShoot">Model Portfolio</option>
                <option className="bg-[#0a0a0a]" value="Other">Bespoke Protocol</option>
              </select>
            </div>
            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Temporal Duration (Days)</label>
              <input 
                type="number" 
                min="1"
                value={formData.days}
                onChange={(e) => setFormData({...formData, days: parseInt(e.target.value) || 1})}
                className="w-full bg-white/[0.02] border-b border-white/10 py-4 outline-none focus:border-primary transition-all text-white font-sans font-medium text-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Optical Units (Photo)</label>
              <input 
                type="number" 
                min="0"
                value={formData.photographers}
                onChange={(e) => setFormData({...formData, photographers: parseInt(e.target.value) || 0})}
                className="w-full bg-white/[0.02] border-b border-white/10 py-4 outline-none focus:border-primary transition-all text-white font-sans font-medium text-lg"
              />
            </div>
            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Motion Units (Video)</label>
              <input 
                type="number" 
                min="0"
                value={formData.videographers}
                onChange={(e) => setFormData({...formData, videographers: parseInt(e.target.value) || 0})}
                className="w-full bg-white/[0.02] border-b border-white/10 py-4 outline-none focus:border-primary transition-all text-white font-sans font-medium text-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Sensor Fidelity</label>
              <select 
                value={formData.sensorType}
                onChange={(e) => setFormData({...formData, sensorType: e.target.value})}
                className="w-full bg-white/[0.02] border-b border-white/10 py-4 outline-none focus:border-primary transition-all text-white font-sans font-medium text-lg"
              >
                <option className="bg-[#0a0a0a]" value="Crop">Standard Fidelity (Crop)</option>
                <option className="bg-[#0a0a0a]" value="Full">Studio Fidelity (Full Frame)</option>
                <option className="bg-[#0a0a0a]" value="Cine">Cinema Grade (CINE)</option>
              </select>
            </div>
            <div className="flex flex-col justify-center space-y-6 pt-4">
              <label className="flex items-center space-x-4 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={formData.drone}
                  onChange={(e) => setFormData({...formData, drone: e.target.checked})}
                  className="w-5 h-5 rounded border-white/10 bg-white/5 text-primary focus:ring-primary transition-all"
                />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">Drone Services</span>
              </label>
              <label className="flex items-center space-x-4 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={formData.album}
                  onChange={(e) => setFormData({...formData, album: e.target.checked})}
                  className="w-5 h-5 rounded border-white/10 bg-white/5 text-primary focus:ring-primary transition-all"
                />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">Photo Album</span>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary flex items-center gap-4">
            <Plus className="w-4 h-4" />
            Extra Services
          </h4>
          
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
              <input 
                type="text"
                placeholder="Search Services..."
                value={serviceSearch}
                onFocus={() => setShowServiceList(true)}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/5 rounded-[2rem] pl-16 pr-6 py-6 outline-none focus:border-primary transition-all text-white font-sans font-medium text-lg placeholder:text-white/10"
              />
            </div>

            {showServiceList && (
              <div className="absolute z-50 w-full mt-4 bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] shadow-2xl max-h-80 overflow-y-auto no-scrollbar backdrop-blur-3xl animate-in fade-in slide-in-from-top-4 duration-500">
                {filteredServices.length > 0 ? (
                  filteredServices.map((service, idx) => (
                    <button
                      key={idx}
                      onClick={() => addService(service)}
                      className="w-full text-left px-8 py-6 hover:bg-white/[0.03] flex justify-between items-center transition-all border-b border-white/[0.02] last:border-0 group"
                    >
                      <div>
                        <p className="font-bold text-white group-hover:text-primary transition-colors tracking-tight uppercase text-sm">{service.name}</p>
                        <p className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-1">{service.category}</p>
                      </div>
                      <span className="font-sans font-black text-white/40 group-hover:text-white">₹{service.price.toLocaleString()}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-8 py-10 text-white/20 text-center text-xs font-black uppercase tracking-widest">No Protocol Matches Found</div>
                )}
              </div>
            )}
            {showServiceList && (
              <div 
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" 
                onClick={() => setShowServiceList(false)}
              />
            )}
          </div>

          {formData.extraServices.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {formData.extraServices.map((service, idx) => (
                <div 
                  key={idx}
                  className="bg-primary/10 text-primary px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-4 border border-primary/20 animate-in zoom-in duration-300"
                >
                  <span>{service.name} (₹{service.price.toLocaleString()})</span>
                  <button 
                    onClick={() => removeService(service.name)}
                    className="hover:text-white transition-colors"
                  >
                    <Plus className="w-3 h-3 rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Engagement Coordinates (Location)</label>
          <input 
            type="text" 
            placeholder="Deployment Radius..."
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            className="w-full bg-white/[0.02] border-b border-white/10 py-4 outline-none focus:border-primary transition-all text-white font-sans font-medium text-lg placeholder:text-white/10"
          />
        </div>
      </div>

      <div className="bg-white/[0.02] backdrop-blur-3xl p-12 lg:p-16 rounded-[4rem] border border-white/5 sticky top-32 product-shadow overflow-hidden group/card shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[80px] rounded-full opacity-50" />
        
        <h3 className="text-2xl font-sans font-black text-white tracking-tighter uppercase mb-12 flex items-center gap-6">
          <LayoutDashboard className="w-8 h-8 text-primary" />
          Protocol Summary
        </h3>
        
        <div className="space-y-6 mb-16 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
          <div className="flex justify-between items-center group/item">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 group-hover/item:text-white/40 transition-colors">Archetype</span>
            <span className="text-white font-black uppercase text-xs tracking-tighter">{formData.workType}</span>
          </div>
          <div className="flex justify-between items-center group/item">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 group-hover/item:text-white/40 transition-colors">Sequence Duration</span>
            <span className="text-white font-black uppercase text-xs tracking-tighter">{formData.days} Session(s)</span>
          </div>
          <div className="flex justify-between items-center group/item">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 group-hover/item:text-white/40 transition-colors">Division Team</span>
            <span className="text-white font-black uppercase text-xs tracking-tighter">
              {formData.photographers > 0 && `${formData.photographers} OPTIC`}
              {formData.photographers > 0 && formData.videographers > 0 && ' • '}
              {formData.videographers > 0 && `${formData.videographers} MOTION`}
              {formData.photographers === 0 && formData.videographers === 0 && 'UNDEFINED'}
            </span>
          </div>
          <div className="flex justify-between items-center group/item">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 group-hover/item:text-white/40 transition-colors">Optical Standard</span>
            <span className="text-white font-black uppercase text-xs tracking-tighter">{formData.sensorType} GRAIN</span>
          </div>
          {(formData.drone || formData.album) && (
            <div className="flex justify-between items-center group/item">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 group-hover/item:text-white/40 transition-colors">Integrations</span>
              <span className="text-primary font-black uppercase text-xs tracking-tighter">
                {[formData.drone && 'AERIAL', formData.album && 'PHYSICAL'].filter(Boolean).join(' • ')}
              </span>
            </div>
          )}
          {formData.extraServices.length > 0 && (
            <div className="pt-8 border-t border-white/5 space-y-4">
              <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.5em]">Active Modules</p>
              {formData.extraServices.map((s, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-white/30 font-bold uppercase tracking-tight">{s.name}</span>
                  <span className="text-white font-black">₹{s.price.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          {formData.location && (
            <div className="flex justify-between items-center pt-8 border-t border-white/5 group/item">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 group-hover/item:text-white/40 transition-colors">Deployment</span>
              <span className="text-white font-black uppercase text-xs tracking-tighter">{formData.location}</span>
            </div>
          )}
        </div>

        <div className="pt-12 border-t border-white/5">
          <div className="flex flex-col gap-4 mb-12">
            <div>
              <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Calculated Cost Basis</p>
              <p className="text-7xl font-sans font-black text-white tracking-tighter">₹{amount.toLocaleString()}</p>
            </div>
            <p className="text-white/10 text-[9px] font-black uppercase tracking-[0.4em] max-w-xs leading-relaxed">System-generated estimate. Final facilitation parameters subject to studio audit.</p>
          </div>

          <button
            onClick={() => {
              addToCart({
                id: `custom-${formData.workType}-${formData.days}-${formData.location}`,
                name: `Custom ${formData.workType} Package`,
                price: amount,
                category: 'Custom',
                details: {
                  days: formData.days,
                  location: formData.location,
                  sensorType: formData.sensorType,
                  extraServices: formData.extraServices
                }
              });
              navigate('/cart');
            }}
            className="btn-premium w-full py-8 text-[11px] tracking-[0.5em] uppercase flex items-center justify-center gap-6 group"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-5 h-5 transform group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Packages;
