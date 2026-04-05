import React from 'react';

interface LogoProps {
  className?: string;
  light?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "w-12 h-12", light = false }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <img 
        src="https://69cb4f3f21aad77cf8fd3eac.imgix.net/photography/choto%20logo%20(1).png" 
        alt="Rays of Moment Logo" 
        className={`w-full h-full object-contain ${light ? 'brightness-0 invert' : ''}`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

export default Logo;
