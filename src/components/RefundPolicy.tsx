import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const RefundPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-white py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center text-sm font-bold text-gray-900 mb-8 hover:underline group">
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Home
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-black text-gray-900 mb-8 uppercase tracking-tighter">Refund & Return Policy</h1>
          
          <div className="prose prose-slate max-w-none text-gray-600 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Shipping Policy</h2>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Processing Time</h3>
                <p>
                  All orders (such as physical albums or prints) are delivered within 2-3 business days. Orders are not shipped or delivered on weekends or holidays.
                </p>
                <p>
                  If we are experiencing a high volume of orders, shipments may be delayed by a few days. Please allow additional days in transit for delivery. If there will be a significant delay in the shipment of your order, we will contact you via email or phone.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Return & Refund Policy</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Returns</h3>
                  <p>
                    We have a 5-day return policy, which means you have 5 days after receiving your item to request a return.
                  </p>
                  <p>
                    Once the return product is received it will be inspected and the return will be approved within 2 days.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Refunds</h3>
                  <p>
                    We will notify you once we’ve received and inspected your return, and let you know if the refund was approved or not. If approved, you’ll be automatically refunded on your original payment method within 10 business days.
                  </p>
                  <p>
                    Please remember it can take some time for your bank or credit card company to process and post the refund too. If more than 15 business days have passed since we’ve approved your return, please contact us at <span className="font-medium text-gray-900">raysofmoment@raysofmoment.com</span> or <span className="font-medium text-gray-900">8967106723</span>.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Cancellations</h3>
                  <p>
                    Cancellations for service bookings (photography sessions) must be requested at least 48 hours prior to the scheduled event time for a full refund of any deposit paid, unless otherwise specified in your specific service contract.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RefundPolicy;
