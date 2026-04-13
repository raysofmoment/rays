import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { LogOut, LayoutDashboard, Calendar, Users, Image as ImageIcon, Menu, X, Home, Briefcase, Star, Package, ClipboardList, DollarSign, Camera, ShoppingBag, Clock, TrendingUp, MessageSquare, User as UserIcon, FileText, ShoppingCart } from 'lucide-react';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';

interface NavbarProps {
  user: User | null;
  role: string | null;
}

const Navbar: React.FC<NavbarProps> = ({ user, role }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { totalItems } = useCart();

  const handleLogout = async () => {
    await signOut(auth);
    setIsOpen(false);
    navigate('/');
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setIsOpen(true)}
                className="p-2 mr-2 text-gray-500 hover:text-black transition-colors focus:outline-none"
                aria-label="Open Menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <Link to="/" className="flex items-center space-x-2">
                <Logo className="w-10 h-10" />
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tight text-black hidden xs:block">Rays of Moment</span>
                  <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase hidden xs:block leading-none">YOUR MOMENT OUR PRIORITY</span>
                </div>
              </Link>
              
              <div className="hidden lg:ml-8 lg:flex lg:space-x-6">
                <Link to="/gallery" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-black transition-colors">
                  Gallery
                </Link>
                <Link to="/services" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-black transition-colors">
                  Services
                </Link>
                <Link to="/packages" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-black transition-colors">
                  Packages
                </Link>
                <Link to="/blog" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-black transition-colors">
                  Blog
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link to="/cart" className="p-2 text-gray-500 hover:text-black transition-colors relative">
                <ShoppingCart className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>
              {user ? (
                <div className="flex items-center space-x-4">
                  <NotificationBell userId={user.uid} />
                  <div className="hidden sm:flex flex-col items-end">
                    <Link to="/profile" className="text-sm font-semibold text-gray-900 hover:text-black transition-colors">{user.displayName || user.email}</Link>
                    <span className="text-xs text-gray-500 capitalize">{role}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-500 hover:text-black transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Logo className="w-8 h-8" />
                  <div className="flex flex-col">
                    <span className="font-bold text-lg leading-none">Rays of Moment</span>
                    <span className="text-[8px] font-medium tracking-widest text-gray-500 uppercase leading-none">YOUR MOMENT OUR PRIORITY</span>
                  </div>
                </div>
                <button
                  onClick={closeMenu}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto py-6 px-4 space-y-1">
                <SidebarLink to="/" icon={<Home className="w-5 h-5" />} label="Home" onClick={closeMenu} />
                <SidebarLink to="/cart" icon={<ShoppingCart className="w-5 h-5" />} label={`Cart (${totalItems})`} onClick={closeMenu} />
                <SidebarLink to="/gallery" icon={<ImageIcon className="w-5 h-5" />} label="Gallery" onClick={closeMenu} />
                <SidebarLink to="/services" icon={<Briefcase className="w-5 h-5" />} label="Services" onClick={closeMenu} />
                <SidebarLink to="/packages" icon={<Package className="w-5 h-5" />} label="Packages" onClick={closeMenu} />
                <SidebarLink to="/blog" icon={<FileText className="w-5 h-5" />} label="Blog" onClick={closeMenu} />
                {role === 'admin' && (
                  <SidebarLink to="/employees" icon={<Users className="w-5 h-5" />} label="Employee List" onClick={closeMenu} />
                )}
                <SidebarLink to="/reviews" icon={<Star className="w-5 h-5" />} label="Reviews" onClick={closeMenu} />
                <SidebarLink to="/careers" icon={<Users className="w-5 h-5" />} label="Careers" onClick={closeMenu} />
                <SidebarLink to="/find-my-photos" icon={<Camera className="w-5 h-5" />} label="Find My Photos" onClick={closeMenu} />
                <SidebarLink to="/payment" icon={<DollarSign className="w-5 h-5" />} label="Pay Bill" onClick={closeMenu} />
                
                {user && (
                  <>
                    <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Account</div>
                    <SidebarLink to="/profile" icon={<UserIcon className="w-5 h-5" />} label="My Profile" onClick={closeMenu} />
                    <SidebarLink to="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label={role === 'client' ? 'Dashboard' : 'Studio Hub'} onClick={closeMenu} />
                    {role === 'client' && <SidebarLink to="/orders" icon={<ClipboardList className="w-5 h-5" />} label="Orders" onClick={closeMenu} />}
                    
                    {(role === 'admin' || role === 'photographer' || role === 'editor' || role === 'other') && (
                      <>
                        <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Management</div>
                        <SidebarLink to="/studio" icon={<LayoutDashboard className="w-5 h-5" />} label="Studio Command Center" onClick={closeMenu} />
                        <SidebarLink to="/team-portfolio" icon={<Camera className="w-5 h-5" />} label="Team Portfolio" onClick={closeMenu} />
                        <SidebarLink to="/orders" icon={<ClipboardList className="w-5 h-5" />} label="Order List" onClick={closeMenu} />
                        <SidebarLink to="/equipment" icon={<Camera className="w-5 h-5" />} label="Equipment" onClick={closeMenu} />
                        <SidebarLink to="/store" icon={<ShoppingBag className="w-5 h-5" />} label="Store" onClick={closeMenu} />
                      </>
                    )}
                  </>
                )}
              </div>

              {user && (
                <div className="p-6 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold truncate">{user.displayName || user.email}</p>
                      <p className="text-xs text-gray-500 capitalize">{role}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const SidebarLink = ({ to, icon, label, onClick }: any) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-black transition-all group"
  >
    <div className="text-gray-400 group-hover:text-black transition-colors">
      {icon}
    </div>
    <span className="font-medium">{label}</span>
  </Link>
);

export default Navbar;
