import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { CheckCircle2, XCircle, Loader2, Calendar, IndianRupee, User, FileText, ExternalLink, Search, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';

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
      try {
        await updateDoc(doc(db, 'payments', payment.id), {
          status: 'confirmed',
          confirmedBy: auth.currentUser?.uid,
          confirmedAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `payments/${payment.id}`);
      }

      // 2. Update Order/Booking paidAmount and dueAmount
      // Try bookings first
      const bookingRef = doc(db, 'bookings', payment.orderId);
      let bookingSnap;
      try {
        bookingSnap = await getDoc(bookingRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `bookings/${payment.orderId}`);
      }
      
      if (bookingSnap && bookingSnap.exists()) {
        const data = bookingSnap.data();
        const currentPaid = data.paidAmount || 0;
        const newPaid = currentPaid + payment.amount;
        const total = data.finalAmount || data.totalPackageAmount || 0;
        const newDue = total - newPaid;
        
        try {
          await updateDoc(bookingRef, {
            paidAmount: newPaid,
            dueAmount: newDue,
            status: newDue <= 0 ? 'confirmed' : data.status
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `bookings/${payment.orderId}`);
        }

        // Also check for linked order
        const ordersQuery = query(collection(db, 'orders'), where('bookingId', '==', payment.orderId));
        let orderSnapshot;
        try {
          orderSnapshot = await getDocs(ordersQuery);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'orders');
        }

        if (orderSnapshot && !orderSnapshot.empty) {
          const orderDoc = orderSnapshot.docs[0];
          const orderData = orderDoc.data();
          const orderPaid = (orderData.paidAmount || 0) + payment.amount;
          const orderTotal = orderData.finalAmount || orderData.totalAmount || 0;
          try {
            await updateDoc(doc(db, 'orders', orderDoc.id), {
              paidAmount: orderPaid,
              dueAmount: orderTotal - orderPaid,
              status: (orderTotal - orderPaid) <= 0 ? 'confirmed' : orderData.status
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `orders/${orderDoc.id}`);
          }
        }
      } else {
        // Try orders
        const orderRef = doc(db, 'orders', payment.orderId);
        let orderSnap;
        try {
          orderSnap = await getDoc(orderRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `orders/${payment.orderId}`);
        }

        if (orderSnap && orderSnap.exists()) {
          const data = orderSnap.data();
          const currentPaid = data.paidAmount || 0;
          const newPaid = currentPaid + payment.amount;
          const total = data.finalAmount || data.totalAmount || 0;
          const newDue = total - newPaid;
          
          try {
            await updateDoc(orderRef, {
              paidAmount: newPaid,
              dueAmount: newDue,
              status: newDue <= 0 ? 'confirmed' : data.status
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `orders/${payment.orderId}`);
          }

          // Also check for linked booking
          if (data.bookingId) {
            const bookingRef = doc(db, 'bookings', data.bookingId);
            let bookingSnap;
            try {
              bookingSnap = await getDoc(bookingRef);
            } catch (error) {
              handleFirestoreError(error, OperationType.GET, `bookings/${data.bookingId}`);
            }

            if (bookingSnap && bookingSnap.exists()) {
              const bookingData = bookingSnap.data();
              const bookingPaid = (bookingData.paidAmount || 0) + payment.amount;
              const bookingTotal = bookingData.finalAmount || bookingData.totalPackageAmount || 0;
              try {
                await updateDoc(bookingRef, {
                  paidAmount: bookingPaid,
                  dueAmount: bookingTotal - bookingPaid,
                  status: (bookingTotal - bookingPaid) <= 0 ? 'confirmed' : bookingData.status
                });
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, `bookings/${data.bookingId}`);
              }
            }
          }
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
      handleFirestoreError(error, OperationType.UPDATE, `payments/${paymentId}`);
    }
  };

  const [selectedSlip, setSelectedSlip] = useState<string | null>(null);

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
          <a 
            href="https://drive.google.com/drive/folders/10MEuvB7YLVCuqzsAczfckbRUU5ieVUkh" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 text-xs font-bold text-blue-600 hover:text-blue-700 mt-2 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Slips Folder in Drive</span>
          </a>
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
                          <span>Paid On: {payment.date && isValid(new Date(payment.date)) ? format(new Date(payment.date), 'MMM d, yyyy') : 'N/A'}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>Submitted: {payment.createdAt && isValid(new Date(payment.createdAt)) ? format(new Date(payment.createdAt), 'MMM d, HH:mm') : 'N/A'}</span>
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
                      <button 
                        onClick={() => setSelectedSlip(payment.slipUrl)}
                        className="flex items-center space-x-2 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>View Slip</span>
                      </button>
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

      {/* Slip Preview Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
              <h3 className="font-bold text-gray-900">Payment Slip Preview</h3>
              <div className="flex items-center gap-2">
                <a 
                  href={selectedSlip} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button 
                  onClick={() => setSelectedSlip(null)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-grow overflow-auto bg-gray-100 p-8 flex items-center justify-center">
              {selectedSlip.includes('drive.google.com') ? (
                <iframe 
                  src={selectedSlip.replace('/view', '/preview')} 
                  className="w-full h-full min-h-[60vh] rounded-lg shadow-lg border-0"
                  title="Slip Preview"
                />
              ) : (
                <img 
                  src={selectedSlip} 
                  alt="Payment Slip" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;
