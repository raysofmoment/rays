import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { getFormattedOrderName } from '../utils/orderFormatting';

interface InvoiceData {
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
}

export const generateInvoicePDF = (data: InvoiceData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const formattedName = getFormattedOrderName({ eventType: data.eventType, packageName: data.packageName })
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Vertical Invoice Number on the left
  doc.setTextColor(200, 220, 255);
  doc.setFontSize(40);
  doc.setFont('helvetica', 'bold');
  doc.text(`INVOICE #${data.invoiceNumber}`, 15, pageHeight / 2, { angle: 90 });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Company Header (Right of the vertical text)
  const leftMargin = 35;
  
  // Logo Image (Circular replacement)
  const logoUrl = 'https://69cb4f3f21aad77cf8fd3eac.imgix.net/photography/choto%20logo%20(1).png';
  try {
    doc.addImage(logoUrl, 'PNG', pageWidth - 50, 15, 30, 30);
  } catch (err) {
    console.warn('Failed to add logo image to PDF', err);
    // Fallback to placeholder if image fails
    doc.setDrawColor(200, 200, 200);
    doc.circle(pageWidth - 35, 30, 15);
    doc.setFontSize(6);
    doc.text('RAYS OF MOMENT', pageWidth - 35, 30, { align: 'center' });
  }

  // Logo Text
  doc.setFontSize(28);
  doc.setTextColor(255, 120, 0); // Orange for "Rays"
  doc.text('Rays', leftMargin, 25);
  doc.setTextColor(0, 0, 0); // Black for "of moment"
  doc.text('of moment', leftMargin + 25, 25);

  // Company Details
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Your moment our priority (Event management)', leftMargin, 32);
  doc.text('22Thakur para lane,Berhampore,murshidabad,742103', leftMargin, 37);
  doc.setTextColor(0, 0, 255);
  doc.text('raysofmoment@gmail.com', leftMargin, 42);
  doc.setTextColor(100, 100, 100);
  doc.text('8967106723/9083486788', leftMargin, 47);

  // Bill To & Payment Method Section
  doc.setDrawColor(0, 0, 255);
  doc.setLineWidth(0.5);
  
  // Bill To
  doc.setTextColor(0, 0, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', leftMargin, 65);
  doc.line(leftMargin, 67, leftMargin + 50, 67);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientName, leftMargin, 73);
  doc.text(formattedName, leftMargin, 78);
  doc.text(data.location || 'Berhampore, Murshidabad', leftMargin, 83);
  if (data.clientMobile) doc.text(data.clientMobile, leftMargin, 88);

  // Payment Method & Dates
  doc.setTextColor(0, 0, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment method', leftMargin + 80, 65);
  doc.line(leftMargin + 80, 67, leftMargin + 110, 67);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(data.paymentMethod || 'CASH', leftMargin + 80, 73);

  // Dates (Right aligned)
  const dateX = pageWidth - 20;
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice Date: ${format(data.invoiceDate ? new Date(data.invoiceDate) : new Date(), 'dd/MM/yy')}`, dateX, 73, { align: 'right' });
  doc.text(`Event Date: ${format(new Date(data.date), 'dd/MM/yy')}`, dateX, 78, { align: 'right' });

  // Table
  const tableData = [
    [formattedName, '1', data.totalAmount.toFixed(2), data.totalAmount.toFixed(2)]
  ];

  if (data.items && data.items.length > 0) {
    data.items.forEach(item => {
      tableData.push([item.name, (item.qty || 1).toString(), item.price.toFixed(2), (item.price * (item.qty || 1)).toFixed(2)]);
    });
  }

  autoTable(doc, {
    startY: 100,
    head: [['DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 50, 200], textColor: [255, 255, 255], fontSize: 9, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' }
    },
    margin: { left: leftMargin, right: 20 },
    styles: { fontSize: 8 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Package Details (Left side)
  let currentY = finalY;
  if (data.packageDetails && data.packageDetails.length > 0) {
    doc.setTextColor(0, 0, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Package Details & Inclusions', leftMargin, currentY);
    doc.line(leftMargin, currentY + 1, leftMargin + 50, currentY + 1);
    
    currentY += 8;
    doc.setTextColor(0, 0, 0);
    doc.text(formattedName, leftMargin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    data.packageDetails.forEach((detail, idx) => {
      currentY += 5;
      doc.text(`${idx + 1}. ${detail}`, leftMargin, currentY);
    });
  }

  // Summary (Right side)
  const summaryX = pageWidth - 70;
  const valueX = pageWidth - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  const subtotal = data.totalAmount;
  const discount = data.discount || 0;
  const subtotalLessDiscount = subtotal - discount;
  const paymentDone = data.paidAmount;
  const balanceDue = data.dueAmount;

  let summaryY = finalY;
  
  const addSummaryRow = (label: string, value: string, isBold = false, isUnderline = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(label, summaryX, summaryY);
    doc.text(value, valueX, summaryY, { align: 'right' });
    if (isUnderline) {
      doc.line(summaryX, summaryY + 1, valueX, summaryY + 1);
    }
    summaryY += 6;
  };

  addSummaryRow('SUBTOTAL', subtotal.toFixed(2));
  addSummaryRow('DISCOUNT', discount.toFixed(2));
  doc.setFillColor(245, 245, 245);
  doc.rect(summaryX - 2, summaryY - 4, 52, 6, 'F');
  addSummaryRow('SUBTOTAL LESS DISCOUNT', subtotalLessDiscount.toFixed(2), true);
  addSummaryRow('PAYMENT DONE', paymentDone.toFixed(2));
  addSummaryRow('Balance Due', balanceDue.toFixed(2), true, true);
  addSummaryRow('SHIPPING/HANDLING', '0.00');

  // Grand Total Box
  summaryY += 4;
  doc.setFillColor(230, 240, 255);
  doc.rect(summaryX - 5, summaryY - 5, 55, 12, 'F');
  doc.setTextColor(0, 50, 150);
  doc.setFontSize(10);
  doc.text('TOTAL', summaryX, summaryY + 2);
  doc.setFontSize(14);
  doc.text(`INR ${subtotalLessDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, valueX, summaryY + 2, { align: 'right' });

  // Terms & Instructions
  doc.setTextColor(0, 0, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const termsY = Math.max(currentY + 20, summaryY + 20);
  doc.text('Terms & Instructions', leftMargin, termsY);
  doc.line(leftMargin, termsY + 2, leftMargin + 40, termsY + 2);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const terms = [
    '1.Advance payment is not refundable in any circumstance if the contract is cancelled by the Client',
    '2.The client has to pay the remaining payment on the last day of the ceremony.',
    '3.Photo will be Delivered after 6 months'
  ];
  terms.forEach((term, idx) => {
    doc.text(term, leftMargin, termsY + 8 + (idx * 4));
  });

  // Save PDF
  doc.save(`Invoice_${data.invoiceNumber}.pdf`);
};
