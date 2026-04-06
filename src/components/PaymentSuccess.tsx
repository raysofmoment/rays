import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doc, updateDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle, ArrowRight, Calendar, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const type = searchParams.get('type') || 'order';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const updatePayment = async () => {
      if (!orderId) return;
      try {
        const collectionName = type === 'booking' ? 'bookings' : 'orders';
        const docRef = doc(db, collectionName, orderId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const docData = docSnap.data();
          const total = docData.finalAmount || docData.totalPackageAmount || docData.totalAmount || 0;
          
          if (type === 'booking') {
            await updateDoc(docRef, {
              paidAmount: total,
              dueAmount: 0,
              paymentStatus: 'paid',
              status: 'confirmed'
            });

            // Update linked order
            const ordersQuery = query(collection(db, 'orders'), where('bookingId', '==', orderId));
            const orderSnapshot = await getDocs(ordersQuery);
            if (!orderSnapshot.empty) {
              const orderDoc = orderSnapshot.docs[0];
              await updateDoc(doc(db, 'orders', orderDoc.id), {
                paidAmount: total,
                dueAmount: 0,
                status: 'confirmed'
              });
            }
          } else {
            await updateDoc(docRef, {
              paidAmount: total,
              dueAmount: 0,
              status: 'confirmed'
            });

            // Update linked booking
            if (docData.bookingId) {
              await updateDoc(doc(db, 'bookings', docData.bookingId), {
                paidAmount: total,
                dueAmount: 0,
                paymentStatus: 'paid',
                status: 'confirmed'
              });
            }
          }
          setData({ id: docSnap.id, ...docData });
          toast.success('Payment confirmed!');
        }
      } catch (error) {
        console.error('Error updating payment:', error);
        toast.error('Failed to update payment status');
      } finally {
        setLoading(false);
      }
    };

    updatePayment();
  }, [orderId, type]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-green-100">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-8">Thank you for your payment. Your transaction has been confirmed and processed.</p>
        
        {data && (
          <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">ID</span>
              <span className="text-sm font-bold text-gray-900">#{data.id.slice(0, 8)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Service</span>
              <span className="text-sm font-bold text-gray-900">{data.package || data.packageName || 'Photography Service'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Amount Paid</span>
              <span className="text-sm font-bold text-green-600">₹{data.dueAmount !== undefined ? (data.totalPackageAmount || 0) : (data.totalAmount || 0)}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <Link
            to="/orders"
            className="w-full flex items-center justify-center space-x-2 bg-black text-white py-4 rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg"
          >
            <span>View My Orders</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/dashboard"
            className="w-full block text-sm font-medium text-gray-500 hover:text-black transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
