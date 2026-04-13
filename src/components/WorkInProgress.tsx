import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Search, ExternalLink, CheckCircle2, Clock, AlertCircle, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface Booking {
  id: string;
  clientName: string;
  eventDate: string;
  eventType: string;
  package: string;
  teaserStatus: string;
  teaserLink?: string;
  fullVideoStatus: string;
  fullVideoLink?: string;
  albumDesignStatus: string;
  albumLink?: string;
  eInviteStatus: string;
  eInviteLink?: string;
  photoSelectionStatus: string;
  photoSelectionLink?: string;
  editPhotoStatus: string;
  photoEditLink?: string;
  preWeddingVideoStatus: string;
  preWeddingVideoLink?: string;
  preWeddingPhotoStatus: string;
  preWeddingPhotoLink?: string;
  otherStatus: string;
  otherLink?: string;
}

const STATUS_OPTIONS = ['pending', 'review', 'delivered'];

const WorkInProgress: React.FC<{ user: any; role: string | null }> = ({ user, role }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('eventDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    });
    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (bookingId: string, field: string, newStatus: string) => {
    if (role !== 'admin' && role !== 'photographer' && role !== 'editor') {
      toast.error('Unauthorized access');
      return;
    }

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        [field]: newStatus
      });
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleLinkChange = async (bookingId: string, field: string, newLink: string) => {
    if (role !== 'admin' && role !== 'photographer' && role !== 'editor') {
      toast.error('Unauthorized access');
      return;
    }

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        [field]: newLink
      });
      toast.success('Link updated');
    } catch (error) {
      toast.error('Failed to update link');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'review':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'review':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      default:
        return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  const filteredBookings = bookings.filter(b => 
    b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.eventType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDeliverablesByPackage = (pkg: string) => {
    const common = ['rawFileLink', 'editPhotoStatus', 'albumDesignStatus'];
    if (pkg === 'Silver') return common;
    if (pkg === 'Gold') return [...common, 'teaserStatus', 'fullVideoStatus'];
    if (pkg === 'Diamond') return [...common, 'teaserStatus', 'fullVideoStatus', 'reelsStatus', 'eInviteStatus', 'preWeddingPhotoStatus', 'preWeddingVideoStatus'];
    return [...common, 'teaserStatus', 'fullVideoStatus', 'reelsStatus', 'eInviteStatus', 'preWeddingPhotoStatus', 'preWeddingVideoStatus'];
  };

  const ProgressItem = ({ booking, label, statusField, linkField }: { booking: Booking; label: string; statusField: keyof Booking; linkField: keyof Booking }) => {
    const status = (booking[statusField] as string) || 'pending';
    const link = (booking[linkField] as string) || '';

    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
        <div className="flex items-center space-x-3 mb-3 sm:mb-0">
          {getStatusIcon(status)}
          <span className="font-semibold text-gray-700">{label}</span>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <select
            value={status}
            onChange={(e) => handleStatusChange(booking.id, statusField as string, e.target.value)}
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border outline-none transition-all ${getStatusClass(status)}`}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Add link..."
              value={link}
              onChange={(e) => handleLinkChange(booking.id, linkField as string, e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none w-full sm:w-48 transition-all"
            />
            {link && (
              <a
                href={link.startsWith('http') ? link : `https://${link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-gray-50 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Work in Progress</h1>
          <p className="text-gray-500 mt-1">Track the status of all active projects.</p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search client or event type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
          />
        </div>
      </div>

      <div className="space-y-6">
        {filteredBookings.map((booking) => (
          <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all">
            <div 
              className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedBooking(expandedBooking === booking.id ? null : booking.id)}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center font-bold text-lg">
                  {booking.clientName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{booking.clientName}</h3>
                  <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
                    <span>{booking.eventType}</span>
                    <span>•</span>
                    <span>{new Date(booking.eventDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex items-center space-x-1">
                  {/* Quick summary icons */}
                  {getStatusIcon(booking.teaserStatus)}
                  {getStatusIcon(booking.fullVideoStatus)}
                  {getStatusIcon(booking.albumDesignStatus)}
                </div>
                {expandedBooking === booking.id ? <ChevronUp className="w-6 h-6 text-gray-400" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
              </div>
            </div>

            {expandedBooking === booking.id && (
              <div className="px-6 pb-6 bg-gray-50/50 border-t border-gray-50">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                  {getDeliverablesByPackage(booking.package).includes('teaserStatus') && (
                    <ProgressItem booking={booking} label="Teaser" statusField="teaserStatus" linkField="teaserLink" />
                  )}
                  {getDeliverablesByPackage(booking.package).includes('fullVideoStatus') && (
                    <ProgressItem booking={booking} label="Full Video" statusField="fullVideoStatus" linkField="fullVideoLink" />
                  )}
                  {getDeliverablesByPackage(booking.package).includes('albumDesignStatus') && (
                    <ProgressItem booking={booking} label="Album Design" statusField="albumDesignStatus" linkField="albumLink" />
                  )}
                  {getDeliverablesByPackage(booking.package).includes('eInviteStatus') && (
                    <ProgressItem booking={booking} label="E-Invite" statusField="eInviteStatus" linkField="eInviteLink" />
                  )}
                  <ProgressItem booking={booking} label="Photo Selection" statusField="photoSelectionStatus" linkField="photoSelectionLink" />
                  {getDeliverablesByPackage(booking.package).includes('editPhotoStatus') && (
                    <ProgressItem booking={booking} label="Photo Edit" statusField="editPhotoStatus" linkField="photoEditLink" />
                  )}
                  {getDeliverablesByPackage(booking.package).includes('preWeddingVideoStatus') && (
                    <ProgressItem booking={booking} label="Pre-Wedding Video" statusField="preWeddingVideoStatus" linkField="preWeddingVideoLink" />
                  )}
                  {getDeliverablesByPackage(booking.package).includes('preWeddingPhotoStatus') && (
                    <ProgressItem booking={booking} label="Pre-Wedding Photo" statusField="preWeddingPhotoStatus" linkField="preWeddingPhotoLink" />
                  )}
                  <ProgressItem booking={booking} label="Other" statusField="otherStatus" linkField="otherLink" />
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredBookings.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No projects found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkInProgress;
