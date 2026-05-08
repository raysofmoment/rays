import React from 'react';
import { motion } from 'motion/react';
import { Camera, Aperture, Focus, Target } from 'lucide-react';

const FloatingBackground: React.FC = () => {
  const elements = [
    { Icon: Camera, size: 100, x: '10%', y: '15%', delay: 0, duration: 25 },
    { Icon: Aperture, size: 120, x: '80%', y: '10%', delay: 2, duration: 30 },
    { Icon: Focus, size: 80, x: '15%', y: '70%', delay: 5, duration: 22 },
    { Icon: Target, size: 60, x: '75%', y: '65%', delay: 1, duration: 28 },
    { Icon: Camera, size: 40, x: '45%', y: '25%', delay: 3, duration: 35 },
    { Icon: Aperture, size: 180, x: '50%', y: '85%', delay: 7, duration: 40 },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-white">
      {/* Subtle Grain Overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grain-y.com/images/grain-pattern.png')] mix-blend-multiply" />
      
      {/* Floating Elements */}
      {elements.map((el, i) => (
        <motion.div
          key={i}
          initial={{ x: el.x, y: el.y, opacity: 0, rotate: 0 }}
          animate={{
            y: [typeof el.y === 'string' ? parseInt(el.y) - 5 + '%' : 0, typeof el.y === 'string' ? parseInt(el.y) + 5 + '%' : 0],
            rotate: [0, 360],
            opacity: [0.03, 0.08, 0.03],
          }}
          transition={{
            y: {
              duration: el.duration / 2,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            },
            rotate: {
              duration: el.duration,
              repeat: Infinity,
              ease: 'linear',
            },
            opacity: {
              duration: 5,
              repeat: Infinity,
              repeatType: 'reverse',
            },
            delay: el.delay,
          }}
          style={{ position: 'absolute' }}
          className="text-primary hidden md:block"
        >
          <el.Icon size={el.size} strokeWidth={0.5} />
        </motion.div>
      ))}

      {/* Decorative Gradient Blobs */}
      <div className="absolute top-[10%] -left-20 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute top-[40%] -right-40 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[5%] left-[20%] w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px]" />
      <div className="absolute bottom-[10%] -right-20 w-96 h-96 bg-gray-50 rounded-full blur-[80px]" />
    </div>
  );
};

export default FloatingBackground;
