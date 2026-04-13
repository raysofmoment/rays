import React from 'react';
import { format } from 'date-fns';
import Logo from './Logo';

interface InvoiceProps {
  data: {
    invoiceNumber: string;
    clientName: string;
    clientMobile?: string;
    clientEmail?: string;
    clientAddress?: string;
    date: string; // Event Date
    invoiceDate?: string;
    paymentMethod?: string;
    eventType: string;
    packageName: string;
    totalAmount: number;
    discount?: number;
    paidAmount: number;
    dueAmount: number;
    location?: string;
    items?: Array<{ name: string; price: number; qty?: number }>;
    packageDetails?: string[];
  };
  id?: string;
}

const Invoice: React.FC<InvoiceProps> = ({ data, id }) => {
  const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : new Date();
  const eventDate = new Date(data.date);

  const subtotal = data.totalAmount;
  const discount = data.discount || 0;
  const subtotalLessDiscount = subtotal - discount;
  const paymentDone = data.paidAmount;
  const balanceDue = data.dueAmount;
  const shippingHandling = 0;
  const total = subtotalLessDiscount + shippingHandling;

  return (
    <div id={id} className="bg-white p-12 max-w-[800px] mx-auto font-sans text-gray-800 relative min-h-[1100px]">
      {/* Vertical Invoice Number */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 origin-left">
        <h1 className="text-5xl font-light text-blue-600/20 tracking-widest uppercase">
          INVOICE #{data.invoiceNumber}
        </h1>
      </div>

      <div className="ml-16">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-4xl font-bold text-orange-500">Rays</span>
              <span className="text-4xl font-bold text-black">of moment</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">Your moment our priority (Event management)</p>
            <p className="text-sm text-gray-500 mb-1">22Thakur para lane,Berhampore,murshidabad,742103</p>
            <p className="text-sm text-blue-600 mb-1 underline">raysofmoment@gmail.com</p>
            <p className="text-sm text-gray-500">8967106723/9083486788</p>
          </div>
          <div className="w-32 h-32 relative">
            <div className="absolute inset-0 border-2 border-gray-200 rounded-full flex items-center justify-center p-2">
              <div className="text-center">
                <div className="text-[8px] font-bold tracking-tighter uppercase leading-none mb-1">YOUR MOMENT OUR PRIORITY</div>
                <Logo className="w-12 h-12 mx-auto" />
                <div className="text-[8px] font-bold tracking-tighter uppercase leading-none mt-1">RAYS OF MOMENT</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-2 gap-8 mb-12">
          <div>
            <h3 className="text-blue-600 font-bold border-b border-blue-600 mb-4 pb-1 uppercase text-sm">BILL TO</h3>
            <div className="space-y-1 text-sm">
              <p className="font-bold">{data.clientName}</p>
              <p>{data.packageName}</p>
              <p>{data.location || 'Berhampore, Murshidabad'}</p>
              <p>{data.clientMobile}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-blue-600 font-bold border-b border-blue-600 mb-4 pb-1 uppercase text-sm">Payment method</h3>
              <p className="text-sm">{data.paymentMethod || 'CASH'}</p>
            </div>
            <div className="text-right space-y-1 text-sm">
              <p><span className="font-bold">Invoice Date:</span> {format(invoiceDate, 'dd/MM/yy')}</p>
              <p><span className="font-bold">Event Date:</span> {format(eventDate, 'dd/MM/yy')}</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="bg-blue-600 text-white text-xs uppercase">
              <th className="py-2 px-4 text-left border border-blue-600">DESCRIPTION</th>
              <th className="py-2 px-4 text-center border border-blue-600 w-20">QTY</th>
              <th className="py-2 px-4 text-right border border-blue-600 w-32">UNIT PRICE</th>
              <th className="py-2 px-4 text-right border border-blue-600 w-32">TOTAL</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr>
              <td className="py-2 px-4 border border-gray-200">{data.packageName}</td>
              <td className="py-2 px-4 border border-gray-200 text-center">1</td>
              <td className="py-2 px-4 border border-gray-200 text-right">{data.totalAmount.toFixed(2)}</td>
              <td className="py-2 px-4 border border-gray-200 text-right">{data.totalAmount.toFixed(2)}</td>
            </tr>
            {data.items?.map((item, idx) => (
              <tr key={idx}>
                <td className="py-2 px-4 border border-gray-200">{item.name}</td>
                <td className="py-2 px-4 border border-gray-200 text-center">{item.qty || 1}</td>
                <td className="py-2 px-4 border border-gray-200 text-right">{item.price.toFixed(2)}</td>
                <td className="py-2 px-4 border border-gray-200 text-right">{(item.price * (item.qty || 1)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary and Details */}
        <div className="flex justify-between gap-8">
          <div className="flex-grow">
            {data.packageDetails && data.packageDetails.length > 0 && (
              <div className="text-sm">
                <h4 className="font-bold underline mb-2">{data.packageName}</h4>
                <ul className="space-y-1">
                  {data.packageDetails.map((detail, idx) => (
                    <li key={idx}>{idx + 1}. {detail}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span className="font-bold uppercase text-[10px]">SUBTOTAL</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span className="font-bold uppercase text-[10px]">DISCOUNT</span>
              <span>{discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1 bg-gray-50 px-1">
              <span className="font-bold uppercase text-[10px]">SUBTOTAL LESS DISCOUNT</span>
              <span>{subtotalLessDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span className="font-bold uppercase text-[10px]">PAYMENT DONE</span>
              <span>{paymentDone.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span className="font-bold uppercase text-[10px] underline">Balance Due</span>
              <span className="font-bold">{balanceDue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span className="font-bold uppercase text-[10px]">SHIPPING/HANDLING</span>
              <span>{shippingHandling.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center bg-blue-50 p-2 mt-4">
              <span className="font-bold text-blue-800 uppercase text-xs">TOTAL</span>
              <span className="text-xl font-bold text-blue-800">₹ {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="mt-16 pt-8 border-t border-gray-100">
          <h3 className="text-blue-600 font-bold border-b border-blue-600 mb-4 pb-1 uppercase text-sm w-48">Terms & Instructions</h3>
          <ol className="text-[10px] text-gray-500 space-y-1 list-decimal ml-4">
            <li>Advance payment is not refundable in any circumstance if the contract is cancelled by the Client</li>
            <li>The client has to pay the remaining payment on the last day of the ceremony.</li>
            <li>Photo will be Delivered after 6 months</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
