import React, { useState } from 'react';
import { Check, Camera, Heart, Users, Briefcase, Star, ArrowRight, LayoutDashboard, Search, Filter, Plus, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

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
    <div className="py-24 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Our Packages & Services</h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">Choose from our curated packages or customize your own with our add-on services.</p>
        </div>

        {/* Category Navigation */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-full font-bold transition-all ${
                activeCategory === cat.id 
                ? 'bg-black text-white shadow-lg' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {cat.icon}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeCategory !== "AddOn" ? (
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {packageData[activeCategory]?.map((pkg, i) => (
                <motion.div
                  key={i}
                  className={`relative bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col h-full ${pkg.popular ? 'ring-2 ring-yellow-500 scale-105 z-10' : ''}`}
                >
                  {pkg.popular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                      Most Popular
                    </div>
                  )}
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                  <p className="text-gray-500 text-sm mb-6">{pkg.description}</p>
                  
                  <div className="mb-8">
                    <span className="text-4xl font-bold text-gray-900">₹{pkg.price}</span>
                    {pkg.unit && <span className="text-gray-500 ml-1">{pkg.unit}</span>}
                    <span className="text-gray-500 block text-xs mt-1">Starting from</span>
                  </div>
                  
                  <ul className="space-y-4 mb-8 flex-grow">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start space-x-3 text-sm text-gray-600">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => handleBookNow(pkg)}
                    className={`w-full py-4 rounded-xl text-white font-bold text-center transition-all flex items-center justify-center space-x-2 ${pkg.btnColor}`}
                  >
                    <span>Book Now</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="AddOn"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h2 className="text-3xl font-bold text-gray-900">Add-On Services</h2>
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAddOns.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors group">
                    <div className="flex-grow pr-4">
                      <h4 className="font-bold text-gray-900 group-hover:text-black">{item.name}</h4>
                      <p className="text-sm text-gray-500">₹{item.price}</p>
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
                      className="p-2 bg-white rounded-full shadow-sm hover:bg-black hover:text-white transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
              
              {filteredAddOns.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No services found matching your search.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Package Builder */}
        <div className="mt-24 bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Build Your Own Package</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Customize every detail of your shoot and get an instant estimate tailored to your needs.</p>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
      <div className="space-y-8">
        <div className="space-y-6">
          <h4 className="text-lg font-bold flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Base Configuration
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type of Work</label>
              <select 
                value={formData.workType}
                onChange={(e) => setFormData({...formData, workType: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black transition-all"
              >
                <option value="WeddingGroom">Wedding (Groom Side)</option>
                <option value="WeddingBride">Wedding (Bride Side)</option>
                <option value="WeddingBoth">Wedding (Both Side)</option>
                <option value="Birthday">Birthday / Rice Ceremony</option>
                <option value="Upanayan">Upanayan</option>
                <option value="PreWedding">Pre-Wedding / Music Video</option>
                <option value="ShortFilm">Short Film</option>
                <option value="Event">Event</option>
                <option value="ModelShoot">Model Shoot</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Days</label>
              <input 
                type="number" 
                min="1"
                value={formData.days}
                onChange={(e) => setFormData({...formData, days: parseInt(e.target.value) || 1})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Photographers</label>
              <input 
                type="number" 
                min="0"
                value={formData.photographers}
                onChange={(e) => setFormData({...formData, photographers: parseInt(e.target.value) || 0})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Videographers</label>
              <input 
                type="number" 
                min="0"
                value={formData.videographers}
                onChange={(e) => setFormData({...formData, videographers: parseInt(e.target.value) || 0})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sensor / Camera Type</label>
              <select 
                value={formData.sensorType}
                onChange={(e) => setFormData({...formData, sensorType: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black transition-all"
              >
                <option value="Crop">Crop Sensor (Budget)</option>
                <option value="Full">Full Sensor (Professional)</option>
                <option value="Cine">Cinema / Cine cam (Premium)</option>
              </select>
            </div>
            <div className="flex flex-col justify-center space-y-3 pt-2">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={formData.drone}
                  onChange={(e) => setFormData({...formData, drone: e.target.checked})}
                  className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-black transition-colors">Include Drone Coverage</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={formData.album}
                  onChange={(e) => setFormData({...formData, album: e.target.checked})}
                  className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-black transition-colors">Include Standard Album</span>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-lg font-bold flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Additional Services & Packages
          </h4>
          
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text"
                placeholder="Search and add any package or service..."
                value={serviceSearch}
                onFocus={() => setShowServiceList(true)}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-black transition-all"
              />
            </div>

            {showServiceList && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto">
                {filteredServices.length > 0 ? (
                  filteredServices.map((service, idx) => (
                    <button
                      key={idx}
                      onClick={() => addService(service)}
                      className="w-full text-left px-6 py-3 hover:bg-gray-50 flex justify-between items-center transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div>
                        <p className="font-bold text-gray-900">{service.name}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">{service.category}</p>
                      </div>
                      <span className="font-bold text-black">₹{service.price.toLocaleString()}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-6 py-4 text-gray-500 text-center">No matching services found</div>
                )}
              </div>
            )}
            {showServiceList && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowServiceList(false)}
              />
            )}
          </div>

          {formData.extraServices.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {formData.extraServices.map((service, idx) => (
                <div 
                  key={idx}
                  className="bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 group"
                >
                  <span>{service.name} (₹{service.price.toLocaleString()})</span>
                  <button 
                    onClick={() => removeService(service.name)}
                    className="hover:text-red-500 transition-colors"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Shoot Location</label>
          <input 
            type="text" 
            placeholder="e.g. Berhampore, Kolkata, etc."
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black transition-all"
          />
        </div>
      </div>

      <div className="bg-black text-white p-8 rounded-3xl sticky top-24">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6" />
          Package Summary
        </h3>
        
        <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex justify-between text-gray-400">
            <span>Work Type</span>
            <span className="text-white font-medium">{formData.workType}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Duration</span>
            <span className="text-white font-medium">{formData.days} Day(s)</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Team</span>
            <span className="text-white font-medium">
              {formData.photographers > 0 && `${formData.photographers} Photo`}
              {formData.photographers > 0 && formData.videographers > 0 && ' + '}
              {formData.videographers > 0 && `${formData.videographers} Video`}
              {formData.photographers === 0 && formData.videographers === 0 && 'None selected'}
            </span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Equipment</span>
            <span className="text-white font-medium">{formData.sensorType} Sensor</span>
          </div>
          {(formData.drone || formData.album) && (
            <div className="flex justify-between text-gray-400">
              <span>Quick Add-ons</span>
              <span className="text-white font-medium">
                {[formData.drone && 'Drone', formData.album && 'Album'].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {formData.extraServices.length > 0 && (
            <div className="pt-4 border-t border-white/10 space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Additional Services</p>
              {formData.extraServices.map((s, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-400">{s.name}</span>
                  <span className="text-white">₹{s.price.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          {formData.location && (
            <div className="flex justify-between text-gray-400 pt-4 border-t border-white/10">
              <span>Location</span>
              <span className="text-white font-medium">{formData.location}</span>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-white/10">
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="text-gray-400 text-sm mb-1">Estimated Total</p>
              <p className="text-5xl font-bold">₹{amount.toLocaleString()}</p>
            </div>
            <p className="text-gray-500 text-xs text-right max-w-[150px]">Final price may vary based on travel and specific needs.</p>
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
            className="w-full bg-white text-black py-4 rounded-xl font-bold text-center hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
          >
            <span>Proceed to Booking</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Packages;
