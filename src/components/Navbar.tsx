import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { LogOut, LayoutDashboard, Calendar, Users, Image as ImageIcon, Menu, X, Home, Briefcase, Star, Package, ClipboardList, DollarSign, Camera, ShoppingBag, Clock, MessageSquare, User as UserIcon, FileText, ShoppingCart, CheckCircle2 } from 'lucide-react';
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
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { totalItems } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setIsOpen(false);
    navigate('/');
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <nav className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-white/70 backdrop-blur-2xl border-b border-white/40 py-2 shadow-2xl shadow-black/[0.03]' 
          : 'bg-transparent py-4'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className="p-2 mr-4 text-gray-900 focus:outline-none bg-white rounded-full shadow-sm hover:shadow-md transition-all border border-gray-100"
                aria-label="Open Menu"
              >
                <Menu className="w-5 h-5 transition-colors" />
              </motion.button>
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="relative">
                  <Logo className="w-10 h-10 transform group-hover:rotate-12 transition-transform duration-500 text-primary" />
                  <div className="absolute -inset-1 bg-primary/5 rounded-full -z-10 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-sans font-black tracking-tighter text-gray-900 hidden sm:block">RAYS OF MOMENT</span>
                  <span className="text-[9px] font-sans font-extrabold tracking-[0.2em] text-primary uppercase hidden sm:block leading-none">YOUR MOMENT OUR PRIORITY</span>
                </div>
              </Link>
              
              <div className="hidden lg:ml-12 lg:flex lg:space-x-8">
                <NavHashLink to="/gallery" label="Gallery" />
                <NavHashLink to="/packages" label="Packages" />
                <NavHashLink to="/blog" label="Journal" />
              </div>
            </div>

            <div className="flex items-center space-x-5">
              <Link to="/cart" className="relative p-2.5 text-gray-600 hover:text-primary transition-colors rounded-full hover:bg-primary/5">
                <ShoppingCart className="w-5 h-5" />
                <AnimatePresence>
                  {totalItems > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-1 right-1 bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white"
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
              
              {user ? (
                <div className="flex items-center space-x-5">
                  <NotificationBell userId={user.uid} />
                  <div className="hidden sm:flex flex-col items-end">
                    <Link to="/profile" className="text-sm font-bold text-gray-900 hover:text-black transition-colors">{user.displayName || user.email}</Link>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{role}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, color: '#ef4444' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleLogout}
                    className="p-2.5 text-gray-700 hover:bg-red-50 rounded-full transition-all border border-transparent hover:border-red-100"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </motion.button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="btn-premium py-2 px-6"
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
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]"
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Logo className="w-10 h-10" />
                  <div className="flex flex-col">
                    <span className="font-serif font-black text-xl leading-none">RAYS OF MOMENT</span>
                    <span className="text-[8px] font-black tracking-[0.2em] text-gray-400 uppercase leading-none mt-1">Creative Agency</span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={closeMenu}
                  className="p-2 text-gray-400 hover:text-black transition-colors"
                >
                  <X className="w-7 h-7" />
                </motion.button>
              </div>

              <div className="flex-grow overflow-y-auto py-8 px-6 space-y-1 custom-scrollbar">
                <SidebarLink to="/" icon={<Home className="w-5 h-5" />} label="Home" onClick={closeMenu} />
                <SidebarLink to="/gallery" icon={<ImageIcon className="w-5 h-5" />} label="Gallery" onClick={closeMenu} />
                <SidebarLink to="/services" icon={<Briefcase className="w-5 h-5" />} label="Services" onClick={closeMenu} />
                <SidebarLink to="/packages" icon={<Package className="w-5 h-5" />} label="Packages" onClick={closeMenu} />
                <SidebarLink to="/blog" icon={<FileText className="w-5 h-5" />} label="Journal" onClick={closeMenu} />
                
                {user && (
                  <>
                    <div className="pt-6 pb-2 text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Client Area</div>
                    <SidebarLink to="/find-my-photos" icon={<Camera className="w-5 h-5" />} label="Find My Photos" onClick={closeMenu} />
                    <SidebarLink to="/photo-selection" icon={<CheckCircle2 className="w-5 h-5" />} label="Photo Selection" onClick={closeMenu} />
                    <SidebarLink to="/payment" icon={<DollarSign className="w-5 h-5" />} label="Pay Bill" onClick={closeMenu} />
                  </>
                )}
                
                {user && (
                  <>
                    <div className="pt-6 pb-2 text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Management</div>
                    <SidebarLink to="/profile" icon={<UserIcon className="w-5 h-5" />} label="My Profile" onClick={closeMenu} />
                    <SidebarLink to="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label={role === 'client' ? 'Client Area' : 'Studio Hub'} onClick={closeMenu} />
                    {(role === 'admin' || role === 'photographer' || role === 'editor' || role === 'other') && (
                      <>
                        <SidebarLink to="/team-portfolio" icon={<Camera className="w-5 h-5" />} label="Team Portfolio" onClick={closeMenu} />
                      </>
                    )}
                  </>
                )}
                
                <div className="pt-6 pb-2 text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Company</div>
                <SidebarLink to="/careers" icon={<Briefcase className="w-5 h-5" />} label="Careers" onClick={closeMenu} />
                <SidebarLink to="/reviews" icon={<Star className="w-5 h-5" />} label="Reviews" onClick={closeMenu} />
              </div>

              {user && (
                <div className="p-8 border-t border-gray-50 bg-[#fafafa]">
                  <Link 
                    to="/profile" 
                    onClick={closeMenu}
                    className="flex items-center space-x-4 mb-6 group cursor-pointer hover:bg-gray-100 p-2 -m-2 rounded-2xl transition-colors"
                  >
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 group-hover:border-primary/30 transition-colors">
                      <UserIcon className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-black truncate group-hover:text-primary transition-colors">{user.displayName || user.email}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{role}</p>
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-3 bg-black text-white py-4 rounded-2xl hover:bg-gray-800 transition-all font-bold text-sm uppercase tracking-widest shadow-lg shadow-black/10"
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
    className="flex items-center space-x-4 px-4 py-3.5 rounded-2xl text-gray-500 hover:bg-primary/5 hover:text-primary transition-all group"
  >
    <div className="text-gray-300 group-hover:text-primary transition-colors transform group-hover:scale-110">
      {icon}
    </div>
    <span className="font-bold text-sm tracking-tight">{label}</span>
  </Link>
);

const NavHashLink = ({ to, label }: { to: string; label: string }) => (
  <Link 
    to={to} 
    className="relative group py-1"
  >
    <span className="text-[10px] font-black text-gray-500 group-hover:text-primary transition-colors uppercase tracking-[0.2em] leading-none">
      {label}
    </span>
    <motion.span 
      initial={{ width: 0 }}
      whileHover={{ width: '100%' }}
      className="absolute -bottom-1 left-0 h-[2px] bg-primary transition-all duration-300" 
    />
  </Link>
);

export default Navbar;
