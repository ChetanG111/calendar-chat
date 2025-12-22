"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

const menuVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: "spring",
      bounce: 0,
      duration: 0.2,
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    filter: 'blur(4px)',
    transition: { duration: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 500, damping: 30 }
  }
};

const SettingsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      className="relative z-50" 
      ref={containerRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <motion.button
        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isOpen ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        whileTap={{ scale: 0.95 }}
      >
        <span className="material-symbols-outlined text-[20px]">settings</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute left-0 bottom-10 mb-2 w-56 bg-[#1e1e1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden py-1.5"
          >
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Settings
            </div>
            
            <div className="space-y-0.5">
              <motion.button variants={itemVariants} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-white">dark_mode</span>
                  <span>Dark Mode</span>
                </div>
                <div className="w-8 h-4 bg-primary/20 rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-primary rounded-full shadow-sm"></div>
                </div>
              </motion.button>

              <motion.button variants={itemVariants} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-white">motion_mode</span>
                  <span>Animations</span>
                </div>
                <div className="w-8 h-4 bg-primary/20 rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-primary rounded-full shadow-sm"></div>
                </div>
              </motion.button>

              <div className="h-px bg-white/10 my-1 mx-2" />

              <motion.button variants={itemVariants} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors group">
                <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-white">info</span>
                <span>About</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsMenu;