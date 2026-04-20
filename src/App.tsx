import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { checkUpcomingEvents } from './services/notificationService';
import { Toaster } from 'sonner';
import AppRootErrorBoundary from './components/AppRootErrorBoundary';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import StudioHub from './components/StudioHub';
import Gallery from './components/Gallery';
import OrderManagement from './components/OrderManagement';
import TeamManagement from './components/TeamManagement';
import BookingManagement from './components/BookingManagement';
import WorkInProgress from './components/WorkInProgress';
import FindMyPhotos from './components/FindMyPhotos';
import Payment from './components/Payment';
import EventCostManagement from './components/EventCostManagement';
import EquipmentManagement from './components/EquipmentManagement';
import StoreManagement from './components/StoreManagement';
import EmployeeList from './components/EmployeeList';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentManagement from './components/PaymentManagement';
import FinancialOverview from './components/FinancialOverview';
import InquiryManagement from './components/InquiryManagement';
import Profile from './components/Profile';
import TeamPortfolio from './components/TeamPortfolio';
import PhotoSelection from './components/PhotoSelection';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import { CartProvider } from './context/CartContext';

import Home from './components/Home';
import Packages from './components/Packages';
import Careers from './components/Careers';
import AIChatbot from './components/AIChatbot';
import PublicGallery from './components/PublicGallery';
import Reviews from './components/Reviews';
import OtherServices from './components/OtherServices';
import Blog from './components/Blog';
import BlogPostDetail from './components/BlogPostDetail';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!isMounted) return;

          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (currentUser.email === 'saikatbanerjee139@gmail.com' && userData.role !== 'admin') {
              await setDoc(userDocRef, { ...userData, role: 'admin' }, { merge: true });
              if (isMounted) setRole('admin');
            } else {
              if (isMounted) setRole(userData.role);
            }
            
            // Check for upcoming events when a user logs in
            checkUpcomingEvents(currentUser.uid, userData.role);
          } else {
            const newRole = currentUser.email === 'saikatbanerjee139@gmail.com' ? 'admin' : 'client';
            const userData = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: newRole,
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, userData);
            if (isMounted) setRole(newRole);
            
            // Check for upcoming events for new user
            checkUpcomingEvents(currentUser.uid, newRole);
          }
          if (isMounted) setUser(currentUser);
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        if (isMounted) {
          setUser(null);
          setRole(null);
        }
      }
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <AppRootErrorBoundary>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar user={user} role={role} />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <Auth />} />
                <Route path="/packages" element={<Packages />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={user ? <Checkout /> : <Navigate to="/auth" />} />
                <Route path="/careers" element={<Careers user={user} role={role} />} />
              <Route path="/gallery" element={<PublicGallery user={user} role={role} />} />
              <Route path="/services" element={<OtherServices />} />
              <Route path="/reviews" element={<Reviews user={user} />} />
              <Route path="/dashboard" element={user ? (role === 'admin' || role === 'photographer' || role === 'editor' || role === 'other' ? <StudioHub user={user} role={role} /> : <Dashboard user={user} role={role} />) : <Navigate to="/auth" />} />
              <Route path="/studio" element={user && (role === 'admin' || role === 'photographer' || role === 'editor' || role === 'other') ? <StudioHub user={user} role={role} /> : <Navigate to="/auth" />} />
              <Route path="/orders" element={user ? <OrderManagement user={user} role={role} /> : <Navigate to="/auth" />} />
              <Route path="/bookings" element={user && (role === 'admin' || role === 'photographer' || role === 'editor') ? <BookingManagement user={user} role={role} /> : <Navigate to="/auth" />} />
              <Route path="/wip" element={user && (role === 'admin' || role === 'photographer' || role === 'editor') ? <WorkInProgress user={user} role={role} /> : <Navigate to="/auth" />} />
              <Route path="/find-my-photos" element={<FindMyPhotos user={user} role={role} />} />
              <Route path="/photo-selection" element={<PhotoSelection user={user} role={role} />} />
              <Route path="/photo-selection/:bookingId" element={<PhotoSelection user={user} role={role} />} />
              <Route path="/payment" element={<Payment user={user} role={role} />} />
              <Route path="/payment-management" element={user && role === 'admin' ? <PaymentManagement /> : <Navigate to="/auth" />} />
              <Route path="/financial-overview" element={user && role === 'admin' ? <FinancialOverview userRole={role} /> : <Navigate to="/auth" />} />
              <Route path="/event-costs" element={user && (role === 'admin' || role === 'photographer' || role === 'editor') ? <EventCostManagement user={user} role={role} /> : <Navigate to="/auth" />} />
              <Route path="/equipment" element={user && (role === 'admin' || role === 'photographer' || role === 'editor') ? <EquipmentManagement userRole={role} /> : <Navigate to="/auth" />} />
              <Route path="/store" element={user && (role === 'admin' || role === 'photographer' || role === 'editor') ? <StoreManagement userRole={role} /> : <Navigate to="/auth" />} />
              <Route path="/employees" element={user && role === 'admin' ? <EmployeeList userRole={role} /> : <Navigate to="/auth" />} />
              <Route path="/inquiries" element={user && role === 'admin' ? <InquiryManagement /> : <Navigate to="/auth" />} />
              <Route path="/team" element={user && (role === 'admin' || role === 'photographer' || role === 'editor') ? <TeamManagement user={user} role={role} /> : <Navigate to="/auth" />} />
              <Route path="/team-portfolio" element={user && (role === 'admin' || role === 'photographer' || role === 'editor' || role === 'other') ? <TeamPortfolio /> : <Navigate to="/auth" />} />
              <Route path="/profile" element={user ? <Profile user={user} role={role} /> : <Navigate to="/auth" />} />
              <Route path="/gallery/:galleryId" element={<Gallery user={user} role={role} />} />
              <Route path="/blog" element={<Blog user={user} role={role} />} />
              <Route path="/blog/:postId" element={<BlogPostDetail user={user} role={role} />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          <AIChatbot />
          <Toaster position="top-right" />
        </div>
      </Router>
      </CartProvider>
    </AppRootErrorBoundary>
  );
}
