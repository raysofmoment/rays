import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import Invoice from './Invoice';
import { ArrowLeft, Download } from 'lucide-react';
import { generateInvoicePDF } from '../services/invoiceService';

const InvoiceView = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (!id) return;
        
        // try to find first in bookings
        let orderDoc = await getDoc(doc(db, 'bookings', id));
        let data = orderDoc.data();
        
        if (!data) {
          // try in orders
          orderDoc = await getDoc(doc(db, 'orders', id));
          data = orderDoc.data();
        }
        
        if (data) {
          setOrder({ id: orderDoc.id, ...data });
        }
      } catch (error) {
        console.error("Error fetching invoice data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const getPackageFeatures = (order: any) => {
    return [order.requirement, order.specialRequirement].filter(Boolean);
  };

  const handleDownloadInvoice = () => {
    if (!order) return;
    try {
      generateInvoicePDF({
        invoiceNumber: order.invoiceNumber,
        clientName: order.clientName,
        clientMobile: order.clientMobile || order.mobileNumber,
        clientEmail: order.clientEmail,
        clientAddress: order.address || order.location,
        date: order.eventDate || order.date,
        invoiceDate: order.createdAt,
        eventType: order.eventType || 'Photography',
        packageName: order.package || order.packageName || 'Custom Package',
        totalAmount: order.finalAmount || order.totalPackageAmount || order.totalAmount,
        paidAmount: order.paidAmount || 0,
        dueAmount: (order.finalAmount || order.totalPackageAmount || order.totalAmount) - (order.paidAmount || 0),
        discount: order.discountAmount || 0,
        items: [],
        packageDetails: getPackageFeatures(order),
        location: order.eventPlace || order.location
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Invoice...</div>;
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold">Invoice Not Found</h2>
        <Link to="/" className="text-blue-600 hover:underline">Return Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </Link>
          <button
            onClick={handleDownloadInvoice}
            className="flex items-center space-x-2 px-6 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl"
          >
            <Download className="w-4 h-4" />
            <span>Download Invoice PDF</span>
          </button>
        </div>
        
        <div className="shadow-2xl overflow-hidden rounded-2xl">
          <Invoice 
            data={{
              invoiceNumber: order.invoiceNumber,
              clientName: order.clientName,
              clientMobile: order.clientMobile || order.mobileNumber,
              clientEmail: order.clientEmail,
              clientAddress: order.address || order.location,
              date: order.eventDate || order.date,
              invoiceDate: order.createdAt,
              eventType: order.eventType || 'Photography',
              packageName: order.package || order.packageName || 'Custom Package',
              totalAmount: order.finalAmount || order.totalPackageAmount || order.totalAmount,
              paidAmount: order.paidAmount || 0,
              dueAmount: (order.finalAmount || order.totalPackageAmount || order.totalAmount) - (order.paidAmount || 0),
              discount: order.discountAmount || 0,
              items: [],
              packageDetails: getPackageFeatures(order),
              location: order.eventPlace || order.location
            }} 
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
