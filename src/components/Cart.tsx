import React from 'react';
import { useCart } from '../context/CartContext';
import { Trash2, ArrowRight, ShoppingCart, Calendar, MapPin, Camera, Plus, Minus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

const Cart: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="py-24 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white p-8 rounded-full shadow-sm inline-block mb-6">
            <ShoppingCart className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Looks like you haven't added any packages or services yet.</p>
          <Link
            to="/packages"
            className="bg-black text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-800 transition-all inline-flex items-center gap-2"
          >
            Browse Packages
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-24 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-4xl font-bold text-gray-900">Your Booking Cart</h1>
          <div className="flex items-center gap-6">
            <Link
              to="/packages"
              className="bg-white text-black px-4 py-2 rounded-xl border border-gray-200 font-medium flex items-center gap-2 hover:bg-gray-50 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add More
            </Link>
            <button
              onClick={clearCart}
              className="text-red-500 hover:text-red-600 font-medium flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Clear Cart
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            {cart.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-gray-100 p-4 rounded-2xl">
                    <Camera className="w-8 h-8 text-black" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
                    <p className="text-gray-500 text-sm uppercase tracking-wider font-medium">{item.category}</p>
                    {item.details && (
                      <div className="mt-2 space-y-1">
                        {item.details.days && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {item.details.days} Day(s)
                          </p>
                        )}
                        {item.details.location && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {item.details.location}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-8">
                  <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-right min-w-[120px]">
                    <p className="text-2xl font-bold text-gray-900">₹{(item.price * item.quantity).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">₹{item.price.toLocaleString()} each</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-black text-white p-8 rounded-3xl sticky top-24">
              <h2 className="text-2xl font-bold mb-8">Summary</h2>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-white font-medium">₹{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Processing Fee</span>
                  <span className="text-white font-medium">₹0</span>
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Amount</p>
                    <p className="text-4xl font-bold">₹{totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                Proceed to Checkout
                <ArrowRight className="w-5 h-5" />
              </button>
              <p className="mt-6 text-xs text-gray-500 text-center">
                By proceeding, you agree to our terms and conditions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
