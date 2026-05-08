import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsConditions: React.FC = () => {
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
          <h1 className="text-4xl font-black text-gray-900 mb-8 uppercase tracking-tighter">Terms & Conditions</h1>
          
          <div className="prose prose-slate max-w-none text-gray-600 space-y-6">
            <p className="font-medium italic">
              This document is an electronic record in terms of Information Technology Act, 2000 and rules there under as applicable and the amended provisions pertaining to electronic records in various statutes as amended by the Information Technology Act, 2000.
            </p>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">1. Overview</h2>
              <p>
                The Platform is owned by Rays of Moment, a company incorporated under the Companies Act, 1956 with its registered office at Berhampore, Murshidabad, West Bengal 742103.
              </p>
              <p>
                Your use of the Platform and services and tools are governed by the following terms and conditions ("Terms of Use") as applicable to the Platform including the applicable policies which are incorporated herein by way of reference. If You transact on the Platform, You shall be subject to the policies that are applicable to the Platform for such transaction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">2. Eligibility</h2>
              <p>
                For the purpose of these Terms of Use, wherever the context so requires "you", "your" or "user" shall mean any natural or legal person who has agreed to become a user/buyer on the Platform. ACCESSING, BROWSING OR OTHERWISE USING THE PLATFORM INDICATES YOUR AGREEMENT TO ALL THE TERMS AND CONDITIONS UNDER THESE TERMS OF USE.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">3. Use of Services</h2>
              <p>
                To access and use the Services, you agree to provide true, accurate and complete information to us during and after registration, and you shall be responsible for all acts done through the use of your registered account on the Platform.
              </p>
              <p>
                Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials offered on this website or through the Services, for any specific purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">4. Intellectual Property</h2>
              <p>
                The contents of the Platform and the Services are proprietary to us and are licensed to us. You will not have any authority to claim any intellectual property rights, title, or interest in its contents. The contents includes and is not limited to the design, layout, look and graphics.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">5. Governing Law</h2>
              <p>
                These Terms and any dispute or claim relating to it, or its enforceability, shall be governed by and construed in accordance with the laws of India. All disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts in Berhampore, West Bengal.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">6. Liability</h2>
              <p>
                In no event will the Platform Owner be liable for any indirect, consequential, incidental, special or punitive damages, including without limitation damages for loss of profits or revenues, business interruption, loss of business opportunities, loss of data or other economic interests, whether in contract, negligence, tort or otherwise, arising from the use of or inability to use the Services.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsConditions;
