import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export const notifyAdmins = async (title: string, message: string, type: NotificationType = 'info', link?: string) => {
  try {
    const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
    const adminDocs = await getDocs(adminsQuery);
    
    const notifications = adminDocs.docs.map(adminDoc => {
      return addDoc(collection(db, 'notifications'), {
        userId: adminDoc.id,
        title,
        message,
        type,
        link: link || null,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    await Promise.all(notifications);
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
};

export const notifyUser = async (userId: string, title: string, message: string, type: NotificationType = 'info', link?: string) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      link: link || null,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error notifying user:', error);
  }
};
