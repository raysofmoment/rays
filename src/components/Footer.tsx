import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook, MessageCircle, Linkedin } from 'lucide-react';
import Logo from './Logo';
import { User } from 'firebase/auth';

interface FooterProps {
  user: User | null;
}

const Footer: React.FC<FooterProps> = ({ user }) => {
  return (
    <footer className="py-32 bg-[#050505] border-t border-white/5 text-white overflow-hidden relative">
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full opacity-30 translate-y-1/2 translate-x-1/2" />
      
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 mb-24">
          <div className="space-y-10">
            <div className="flex items-center space-x-6">
              <Logo className="w-12 h-12 text-primary" />
              <div className="flex flex-col">
                <span className="text-2xl font-sans font-black tracking-tighter text-white leading-none uppercase">RAYS OF MOMENT</span>
                <span className="text-[10px] font-sans font-black tracking-[0.4em] text-primary uppercase mt-1">YOUR MOMENT OUR PRIORITY</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-10">
            <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/50">Navigation</h4>
            <div className="grid grid-cols-1 gap-4 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
              <Link to="/packages" className="hover:text-primary transition-colors">Collections</Link>
              <Link to="/gallery" className="hover:text-primary transition-colors">Archives</Link>
              {user && (
                <>
                  <Link to="/find-my-photos" className="hover:text-primary transition-colors">Asset Retrieval</Link>
                  <Link to="/photo-selection" className="hover:text-primary transition-colors">Curation</Link>
                  <Link to="/payment" className="hover:text-primary transition-colors">Pay Bill</Link>
                </>
              )}
            </div>
          </div>

          <div className="space-y-10">
            <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/50">Legal Protocol</h4>
            <div className="flex flex-col gap-4 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
              <Link to="/terms-conditions" className="hover:text-primary transition-colors">Terms of Service</Link>
              <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Shield</Link>
              <Link to="/refund-policy" className="hover:text-primary transition-colors">Refund Policy</Link>
            </div>
          </div>
          
          <div className="space-y-10">
            <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/50">Connect</h4>
            <div className="flex space-x-4">
              {[
                { icon: Instagram, href: "https://www.instagram.com/rays.of.moment/" },
                { icon: Facebook, href: "https://www.facebook.com/Raysofmoment" },
                { icon: MessageCircle, href: "https://wa.me/918967106723" }
              ].map((social, i) => (
                <a 
                  key={i}
                  href={social.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center bg-white/[0.02] border border-white/5 rounded-full text-white/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-500"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="pt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[9px] font-black uppercase tracking-[0.5em] text-white/20">
          <p>© {new Date().getFullYear()} RAYS OF MOMENT STUDIO. CORE PROTOCOL SECURED.</p>
          <div className="flex items-center gap-4">
            <div className="w-4 h-[1px] bg-white/10" />
            <p>Engineered by RAYS OF MOMENT</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
