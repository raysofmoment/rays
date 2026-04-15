import { collection, query, where, getDocs, writeBatch, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export const notifyAdmins = async (title: string, message: string, type: NotificationType = 'info', link?: string) => {
  try {
    const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
    const adminDocs = await getDocs(adminsQuery);
    
    if (adminDocs.empty) return;

    const batch = writeBatch(db);
    
    adminDocs.docs.forEach(adminDoc => {
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, {
        userId: adminDoc.id,
        title,
        message,
        type,
        link: link || null,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
};

export const notifyUser = async (userId: string, title: string, message: string, type: NotificationType = 'info', link?: string) => {
  try {
    const notificationRef = doc(collection(db, 'notifications'));
    const batch = writeBatch(db);
    batch.set(notificationRef, {
      userId,
      title,
      message,
      type,
      link: link || null,
      isRead: false,
      createdAt: new Date().toISOString()
    });
    await batch.commit();
  } catch (error) {
    console.error('Error notifying user:', error);
  }
};

export const checkUpcomingEvents = async (userId: string, role: string | null) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = today.toISOString().split('T')[0];

    let bookingsQuery;
    if (role === 'admin') {
      bookingsQuery = query(collection(db, 'bookings'));
    } else {
      bookingsQuery = query(collection(db, 'bookings'), where('clientId', '==', userId));
    }
    
    const bookingsSnapshot = await getDocs(bookingsQuery);
    return processBookings(bookingsSnapshot.docs, userId, today, todayStr);
  } catch (error) {
    console.error('Error checking upcoming events:', error);
  }
};

const processBookings = async (docs: any[], userId: string, today: Date, todayStr: string) => {
  const batch = writeBatch(db);
  let hasUpdates = false;

  for (const bookingDoc of docs) {
    const booking = bookingDoc.data() as any;
    if (!booking.eventDate) continue;

    // Parse eventDate (assuming YYYY-MM-DD)
    const [year, month, day] = booking.eventDate.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day);
    
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // If event is in 0 to 3 days
    if (diffDays >= 0 && diffDays <= 3) {
      const reminderId = `reminder_${bookingDoc.id}_${todayStr}`;
      const reminderRef = doc(db, 'reminders_sent', reminderId);
      
      // Check if we already sent a reminder for this booking today
      const reminderSnap = await getDoc(reminderRef);
      
      if (!reminderSnap.exists()) {
        // Notify admins
        const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
        const adminDocs = await getDocs(adminsQuery);
        
        adminDocs.docs.forEach(adminDoc => {
          const notificationRef = doc(collection(db, 'notifications'));
          batch.set(notificationRef, {
            userId: adminDoc.id,
            title: 'Upcoming Event Reminder',
            message: `Event "${booking.eventType}" for ${booking.clientName} is ${diffDays === 0 ? 'TODAY' : `in ${diffDays} days`} (${booking.eventDate}).`,
            type: diffDays === 0 ? 'error' : 'warning',
            link: '/bookings',
            isRead: false,
            createdAt: new Date().toISOString()
          });
        });

        // Also notify the client
        if (booking.clientId) {
          const clientNotifRef = doc(collection(db, 'notifications'));
          batch.set(clientNotifRef, {
            userId: booking.clientId,
            title: 'Upcoming Event Reminder',
            message: `Your event "${booking.eventType}" is ${diffDays === 0 ? 'TODAY' : `coming up in ${diffDays} days`}! We are ready for the shoot.`,
            type: 'info',
            link: '/orders',
            isRead: false,
            createdAt: new Date().toISOString()
          });
        }

        // Mark as sent for today
        batch.set(reminderRef, {
          bookingId: bookingDoc.id,
          sentAt: todayStr,
          eventDate: booking.eventDate
        });
        hasUpdates = true;
      }
    }
  }

  if (hasUpdates) {
    await batch.commit();
  }
};
