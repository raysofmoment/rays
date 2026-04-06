import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { ArrowLeft, Send, Calendar, MapPin, Phone, Mail, User, Tag } from 'lucide-react';
import { notifyAdmins } from '../services/notificationService';

const Checkout: React.FC = () => {
  const { cart, totalAmount, clearCart } = useCart();
  const navigate = useNavigate();
  const user = auth.currentUser;

  const getInitialEventType = () => {
    if (cart.length === 0) return 'WEDD GROOM';
    const category = cart[0].category;
    const mapping: Record<string, string> = {
      'Wedding': 'WEDD GROOM',
      'WeddingBride': 'WEDD BRIDESIDE',
      'WeddingBoth': 'WEDD BOTH',
      'Birthday': 'BIRTHDAY',
      'Upanayan': 'UPANAYAN',
      'PrePostWedding': 'CINEMATIC',
      'ShortFilm': 'SHORT FILM',
      'Event': 'EVENT',
      'AddOn': 'EVENT'
    };
    return mapping[category] || 'WEDD GROOM';
  };

  const [formData, setFormData] = useState({
    clientName: user?.displayName || '',
    clientMobile: '',
    clientEmail: user?.email || '',
    eventDate: '',
    eventType: getInitialEventType(),
    eventPlace: '',
    address: '',
    requirement: cart.map(item => `${item.name} (x${item.quantity})`).join(', '),
    discountRequest: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <button
            onClick={() => navigate('/packages')}
            className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all"
          >
            Browse Packages
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to proceed');
      return;
    }

    setIsSubmitting(true);
    try {
      const bookingData = {
        ...formData,
        clientId: user.uid,
        totalPackageAmount: totalAmount,
        dueAmount: totalAmount,
        adminStatus: 'requested',
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        package: 'Customize',
        items: cart,
      };

      await addDoc(collection(db, 'bookings'), bookingData);
      
      // Notify admins
      await notifyAdmins(
        'New Booking Request',
        `${formData.clientName} requested a booking for ${formData.eventType}. Total: ₹${totalAmount.toLocaleString()}`,
        'info',
        '/orders'
      );

      toast.success('Booking request sent to admin successfully!');
      clearCart();
      navigate('/orders');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
      toast.error('Failed to submit booking request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-24 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/cart')}
          className="flex items-center text-gray-500 hover:text-black mb-8 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Cart
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Checkout Information</h1>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" /> Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black transition-all"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.clientMobile}
                      onChange={(e) => setFormData({ ...formData, clientMobile: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black transition-all"
                      placeholder="Enter mobile number"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black transition-all"
                    placeholder="Enter email address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Event Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.eventDate}
                      onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                    <select
                      value={formData.eventType}
                      onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black transition-all"
                    >
                      <option value="WEDD BRIDESIDE">Wedding (Bride Side)</option>
                      <option value="WEDD GROOM">Wedding (Groom Side)</option>
                      <option value="WEDD BOTH">Wedding (Both Side)</option>
                      <option value="ANNOPRASAN">Annoprasan</option>
                      <option value="UPANAYAN">Upanayan</option>
                      <option value="BIRTHDAY">Birthday</option>
                      <option value="MODEL SHOOT">Model Shoot</option>
                      <option value="CINEMATIC">Cinematic</option>
                      <option value="EVENT">Event</option>
                      <option value="SHORT FILM">Short Film</option>
                      <option value="MUSIC VIDEO">Music Video</option>
                      <option value="OUTDOOR">Outdoor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Event Place / Venue
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.eventPlace}
                    onChange={(e) => setFormData({ ...formData, eventPlace: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black transition-all"
                    placeholder="Venue name or city"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Address</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black transition-all resize-none"
                    placeholder="Enter your complete address"
                  />
                </div>

                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                  <label className="block text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Request Discount
                  </label>
                  <textarea
                    rows={2}
                    value={formData.discountRequest}
                    onChange={(e) => setFormData({ ...formData, discountRequest: e.target.value })}
                    className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm"
                    placeholder="Optional: Request a discount or special pricing..."
                  />
                  <p className="text-xs text-blue-600 mt-2 italic">
                    * Admin will review your request and provide a final bill with an invoice number.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Send Order Request</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>

          {/* Summary Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-4 mb-6">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-500">{item.name} x{item.quantity}</span>
                    <span className="font-bold text-gray-900">₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-bold text-gray-900">₹{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xl font-bold text-gray-900 mt-4">
                  <span>Estimated Total</span>
                  <span>₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-6 p-4 bg-gray-50 rounded-2xl text-xs text-gray-500">
                <p>By sending this request, you agree to our terms of service. An admin will contact you shortly with the final invoice.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
