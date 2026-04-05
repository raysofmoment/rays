import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { X, ExternalLink, Download, FileText, CheckCircle2, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ProjectDetailsModalProps {
  order: any;
  role: string | null;
  onClose: () => void;
}

const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({ order, role, onClose }) => {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      if (order.invoiceNumber) {
        const q = query(collection(db, 'bookings'), where('invoiceNumber', '==', order.invoiceNumber));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setBooking({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        }
      }
      setLoading(false);
    };
    fetchBooking();
  }, [order.invoiceNumber]);

  if (loading) return null;

  const renderPhotographerOtherView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Client Name</h4>
          <p className="text-sm font-medium text-gray-900">{order.clientName}</p>
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mobile Number</h4>
          <p className="text-sm font-medium text-gray-900">{order.mobileNumber}</p>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Address</h4>
        <p className="text-sm font-medium text-gray-900">{booking?.address || 'Not provided'}</p>
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Package</h4>
        <p className="text-sm font-medium text-gray-900">{order.packageName}</p>
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Special Requirements</h4>
        <p className="text-sm font-medium text-gray-900">{booking?.requirement || 'None'}</p>
      </div>
    </div>
  );

  const renderEditorView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Client Name</h4>
          <p className="text-sm font-medium text-gray-900">{order.clientName}</p>
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bengali Name</h4>
          <p className="text-sm font-medium text-gray-900">{booking?.brideBengaliName || booking?.groomBengaliName || booking?.childBengaliName || 'Not provided'}</p>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Raw File Link</h4>
        {booking?.rawFileLink ? (
          <a href={booking.rawFileLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center space-x-1">
            <span>View Files</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <p className="text-sm text-gray-500 italic">No link provided</p>
        )}
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Selected Songs</h4>
        <div className="text-sm space-y-1">
          <p><span className="font-bold">Wedding:</span> {booking?.ourWeddingSong || 'N/A'}</p>
          <p><span className="font-bold">Event:</span> {booking?.eventSong || 'N/A'}</p>
          <p><span className="font-bold">Reels:</span> {booking?.reelsSong || 'N/A'}</p>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Special Requirements</h4>
        <p className="text-sm font-medium text-gray-900">{booking?.requirement || 'None'}</p>
      </div>
    </div>
  );

  const handleDownloadInvoice = () => {
    toast.success('Invoice download started...');
    // In a real app, this would generate a PDF or redirect to a download link
  };

  const renderClientView = () => (
    <div className="space-y-8">
      <div className="bg-gray-50 p-4 rounded-xl">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Payment Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Total</p>
            <p className="text-lg font-bold text-gray-900">₹{order.totalAmount}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Paid</p>
            <p className="text-lg font-bold text-green-600">₹{order.paidAmount || 0}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Due</p>
            <p className="text-lg font-bold text-red-600">₹{order.totalAmount - (order.paidAmount || 0)}</p>
          </div>
        </div>
        <button 
          onClick={handleDownloadInvoice}
          className="mt-4 w-full flex items-center justify-center space-x-2 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download Invoice</span>
        </button>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-4">Work in Progress</h3>
        <div className="space-y-4">
          {[
            { label: 'Teaser', status: booking?.teaserStatus, link: booking?.teaserLink },
            { label: 'Full Video', status: booking?.fullVideoStatus, link: booking?.fullVideoLink },
            { label: 'Photo Edit', status: booking?.editPhotoStatus, link: booking?.photoEditLink },
            { label: 'Album Design', status: booking?.albumDesignStatus, link: booking?.albumLink },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
              <div className="flex items-center space-x-3">
                {item.status === 'done' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Clock className="w-5 h-5 text-yellow-500" />
                )}
                <div>
                  <p className="text-sm font-bold text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500 capitalize">{item.status || 'Pending'}</p>
                </div>
              </div>
              {item.link && (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Project Details</h2>
            <p className="text-xs text-gray-500 mt-1">Invoice: {order.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {role === 'admin' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
              {renderPhotographerOtherView()}
              {renderEditorView()}
            </div>
            <div className="border-t pt-8">
              {renderClientView()}
            </div>
          </div>
        )}

        {(role === 'photographer' || role === 'other') && renderPhotographerOtherView()}
        {role === 'editor' && renderEditorView()}
        {role === 'client' && renderClientView()}
      </div>
    </div>
  );
};

export default ProjectDetailsModal;
