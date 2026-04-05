import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { CheckCircle2, XCircle, Loader2, Calendar, IndianRupee, User, FileText, ExternalLink, Search, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PaymentRecord {
  id: string;
  orderId: string;
  clientId: string;
  amount: number;
  date: string;
  method: string;
  slipUrl: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
  clientName?: string;
}

const PaymentManagement: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('pending');

  useEffect(() => {
    const q = query(
      collection(db, 'payments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const paymentData = await Promise.all(snapshot.docs.map(async (paymentDoc) => {
        const data = paymentDoc.data() as PaymentRecord;
        
        // Fetch client name for better display
        let clientName = 'Unknown Client';
        try {
          // First check bookings
          const bookingDoc = await getDoc(doc(db, 'bookings', data.orderId));
          if (bookingDoc.exists()) {
            clientName = bookingDoc.data().clientName;
          } else {
            // Then check orders
            const orderDoc = await getDoc(doc(db, 'orders', data.orderId));
            if (orderDoc.exists()) {
              clientName = orderDoc.data().clientName;
            }
          }
        } catch (e) {
          console.error('Error fetching client name:', e);
        }

        return {
          ...data,
          id: paymentDoc.id,
          clientName
        };
      }));

      setPayments(paymentData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleConfirm = async (payment: PaymentRecord) => {
    try {
      setLoading(true);
      // 1. Update Payment status
      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'confirmed',
        confirmedBy: auth.currentUser?.uid,
        confirmedAt: new Date().toISOString()
      });

      // 2. Update Order/Booking paidAmount and dueAmount
      // Try bookings first
      const bookingRef = doc(db, 'bookings', payment.orderId);
      const bookingSnap = await getDoc(bookingRef);
      
      if (bookingSnap.exists()) {
        const data = bookingSnap.data();
        const currentPaid = data.paidAmount || 0;
        const newPaid = currentPaid + payment.amount;
        const newDue = (data.totalPackageAmount || 0) - newPaid;
        
        await updateDoc(bookingRef, {
          paidAmount: newPaid,
          dueAmount: newDue,
          status: newDue <= 0 ? 'confirmed' : data.status
        });
      } else {
        // Try orders
        const orderRef = doc(db, 'orders', payment.orderId);
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
          const data = orderSnap.data();
          const currentPaid = data.paidAmount || 0;
          const newPaid = currentPaid + payment.amount;
          
          await updateDoc(orderRef, {
            paidAmount: newPaid,
            status: (data.totalAmount - newPaid) <= 0 ? 'confirmed' : data.status
          });
        }
      }

      toast.success('Payment confirmed successfully!');
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Failed to confirm payment');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (paymentId: string) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'rejected',
        confirmedBy: auth.currentUser?.uid,
        confirmedAt: new Date().toISOString()
      });
      toast.success('Payment rejected');
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment');
    }
  };

  const filteredPayments = payments.filter(p => filter === 'all' || p.status === filter);

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-500 mt-1">Review and confirm manual payment submissions from clients.</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {(['all', 'pending', 'confirmed', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${filter === f ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredPayments.length > 0 ? (
          filteredPayments.map((payment) => (
            <div key={payment.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <IndianRupee className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-gray-900">{payment.clientName}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          payment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          payment.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
                        <div className="flex items-center text-sm text-gray-500">
                          <FileText className="w-4 h-4 mr-2" />
                          <span>Order ID: {payment.orderId}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>Paid On: {format(new Date(payment.date), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>Submitted: {format(new Date(payment.createdAt), 'MMM d, HH:mm')}</span>
                        </div>
                        <div className="flex items-center text-sm font-bold text-gray-900">
                          <IndianRupee className="w-4 h-4 mr-1" />
                          <span>Amount: ₹{payment.amount}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {payment.slipUrl && (
                      <a 
                        href={payment.slipUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>View Slip</span>
                      </a>
                    )}
                    
                    {payment.status === 'pending' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleReject(payment.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Reject Payment"
                        >
                          <XCircle className="w-8 h-8" />
                        </button>
                        <button
                          onClick={() => handleConfirm(payment)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                          title="Confirm Payment"
                        >
                          <CheckCircle2 className="w-8 h-8" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No payments found</h3>
            <p className="text-gray-500">There are no {filter} payments to display.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentManagement;
