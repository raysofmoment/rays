import React, { useState, useRef } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Search, CreditCard, Loader2, CheckCircle2, AlertCircle, Mail, Phone, User, Calendar, IndianRupee, FileText, Upload, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const Payment: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [booking, setBooking] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'manual'>('online');
  
  // Manual Payment State
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualSlip, setManualSlip] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFindBooking = async () => {
    if (!searchQuery) {
      toast.error('Please enter your mobile number or invoice number');
      return;
    }

    setLoading(true);
    try {
      // Try searching by mobile number in bookings
      let q = query(collection(db, 'bookings'), where('clientMobile', '==', searchQuery));
      let querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Try searching by invoice number in bookings
        q = query(collection(db, 'bookings'), where('invoiceNumber', '==', searchQuery));
        querySnapshot = await getDocs(q);
      }

      if (querySnapshot.empty) {
        // Try searching by mobile number in orders
        q = query(collection(db, 'orders'), where('mobileNumber', '==', searchQuery));
        querySnapshot = await getDocs(q);
      }

      if (querySnapshot.empty) {
        // Try searching by invoice number in orders
        q = query(collection(db, 'orders'), where('invoiceNumber', '==', searchQuery));
        querySnapshot = await getDocs(q);
      }
      
      if (querySnapshot.empty) {
        toast.error('No booking or order found for this number');
        setBooking(null);
      } else {
        const data = querySnapshot.docs[0].data();
        // Normalize data for display
        const normalizedData = {
          id: querySnapshot.docs[0].id,
          clientName: data.clientName,
          clientEmail: data.clientEmail || data.email,
          clientId: data.clientId || '',
          eventType: data.eventType || data.packageName,
          eventDate: data.eventDate || data.date,
          package: data.package || data.packageName,
          totalPackageAmount: data.totalPackageAmount || data.totalAmount,
          dueAmount: data.dueAmount !== undefined ? data.dueAmount : (data.totalAmount - (data.paidAmount || 0)),
          invoiceNumber: data.invoiceNumber
        };
        setBooking(normalizedData);
        setManualAmount(normalizedData.dueAmount.toString());
        
        // Fetch existing payments for this booking
        const paymentsQuery = query(collection(db, 'payments'), where('orderId', '==', querySnapshot.docs[0].id));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        setPayments(paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        toast.success('Booking found!');
      }
    } catch (error) {
      console.error('Error finding booking:', error);
      toast.error('Failed to search for booking');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setManualSlip(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualSubmit = async () => {
    if (!booking) return;
    if (!manualAmount || !manualDate || !manualSlip) {
      toast.error('Please fill all manual payment details and upload a slip');
      return;
    }

    setPaying(true);
    try {
      const newPayment = {
        orderId: booking.id,
        clientId: booking.clientId || auth.currentUser?.uid || 'anonymous',
        amount: parseFloat(manualAmount),
        date: manualDate,
        method: 'manual',
        slipUrl: manualSlip,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'payments'), newPayment);

      setPayments(prev => [...prev, { id: docRef.id, ...newPayment }]);
      toast.success('Payment submitted for review! Admin will confirm shortly.');
      setManualSlip(null);
      setManualAmount('');
    } catch (error) {
      console.error('Error submitting manual payment:', error);
      toast.error('Failed to submit payment');
    } finally {
      setPaying(false);
    }
  };

  const handlePayment = async () => {
    if (paymentMethod === 'manual') {
      handleManualSubmit();
      return;
    }

    if (!booking || booking.dueAmount <= 0) {
      toast.error('No due amount to pay');
      return;
    }

    setPaying(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: booking.id,
          amount: booking.dueAmount,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          type: 'booking'
        }),
      });

      const session = await response.json();
      if (session.error) {
        throw new Error(session.error);
      }

      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const { error } = await (stripe as any).redirectToCheckout({
        sessionId: session.id,
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to initiate payment');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Pay Your Bill</h1>
          <p className="text-gray-500">Enter your mobile number to find your booking and pay the remaining balance.</p>
        </div>

        {!booking ? (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-6">Client Login</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Mobile or Invoice Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter mobile or invoice number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
                  />
                </div>
              </div>
              <button
                onClick={handleFindBooking}
                disabled={loading}
                className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center space-x-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                <span>Find My Booking</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-xl">
                  {booking.clientName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{booking.clientName}</h2>
                  <p className="text-gray-500">{booking.eventType} • {new Date(booking.eventDate).toLocaleDateString()}</p>
                  {booking.invoiceNumber && (
                    <p className="text-xs text-blue-600 font-bold mt-1">Invoice: {booking.invoiceNumber}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setBooking(null)}
                className="text-sm font-bold text-gray-400 hover:text-black transition-colors"
              >
                Change Booking
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Booking Summary</span>
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Package</span>
                    <span className="font-bold">{booking.package}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Event Date</span>
                    <span className="font-bold">{new Date(booking.eventDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Total Amount</span>
                    <span className="font-bold">₹{booking.totalPackageAmount}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Paid Amount</span>
                    <span className="font-bold text-green-600">₹{booking.totalPackageAmount - booking.dueAmount}</span>
                  </div>
                  <div className="flex justify-between py-4 bg-gray-50 px-4 rounded-xl mt-4">
                    <span className="text-gray-900 font-bold">Due Balance</span>
                    <span className="text-2xl font-bold text-red-600">₹{booking.dueAmount}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Payment Method</span>
                </h3>

                <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                  <button
                    onClick={() => setPaymentMethod('online')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${paymentMethod === 'online' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Online Payment
                  </button>
                  <button
                    onClick={() => setPaymentMethod('manual')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${paymentMethod === 'manual' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Manual Payment
                  </button>
                </div>

                {paymentMethod === 'online' ? (
                  <div className="flex-grow flex flex-col justify-between">
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start space-x-4 mb-8">
                      <Mail className="w-6 h-6 text-blue-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-blue-900">Invoice & Receipt</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          A digital invoice and payment receipt will be sent to <strong>{booking.clientEmail || 'your email'}</strong> immediately after payment.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <button
                        onClick={handlePayment}
                        disabled={paying || booking.dueAmount <= 0}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center space-x-2 disabled:bg-gray-200 disabled:cursor-not-allowed shadow-lg shadow-black/20"
                      >
                        {paying ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-5 h-5" />
                            <span>Pay ₹{booking.dueAmount} Now</span>
                          </>
                        )}
                      </button>
                      <p className="text-xs text-center text-gray-400">
                        Secure payment powered by Stripe. All major cards accepted.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Paid Amount</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          value={manualAmount}
                          onChange={(e) => setManualAmount(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-black"
                          placeholder="Enter amount paid..."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Payment Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="date"
                          value={manualDate}
                          onChange={(e) => setManualDate(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Payment Slip / Screenshot</label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-black transition-all bg-gray-50"
                      >
                        {manualSlip ? (
                          <div className="relative w-full aspect-video">
                            <img src={manualSlip} alt="Slip" className="w-full h-full object-contain rounded-lg" />
                            <button 
                              onClick={(e) => { e.stopPropagation(); setManualSlip(null); }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-xs font-bold text-gray-500">Click to upload slip</p>
                            <p className="text-[10px] text-gray-400 mt-1">PNG, JPG up to 2MB</p>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                    <button
                      onClick={handleManualSubmit}
                      disabled={paying || !manualSlip}
                      className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center space-x-2 disabled:bg-gray-200 disabled:cursor-not-allowed"
                    >
                      {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                      <span>Submit for Review</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Confirmed Payments & Invoice Section */}
            {payments.length > 0 && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Payment History</span>
                  </h3>
                  {payments.some(p => p.status === 'confirmed') && (
                    <button 
                      onClick={() => toast.info('Invoice generation feature coming soon! Your payments are confirmed.')}
                      className="text-sm font-bold text-blue-600 hover:underline flex items-center space-x-1"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Download Invoice</span>
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg ${payment.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                          <IndianRupee className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">₹{payment.amount}</p>
                          <p className="text-xs text-gray-500 capitalize">{payment.method} • {new Date(payment.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        payment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        payment.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Payment;
