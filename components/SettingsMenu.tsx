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
  const [isDark, setIsDark] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<any>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Initialize theme from document class
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

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
      onMouseEnter={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsOpen(true);
      }}
      onMouseLeave={() => {
        timeoutRef.current = setTimeout(() => setIsOpen(false), 100);
      }}
    >
      <motion.button
        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isOpen ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
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
            className="absolute left-0 bottom-10 mb-2 w-56 bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden py-1.5"
          >
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Settings
            </div>

            <div className="space-y-0.5" onMouseLeave={() => setHoveredId(null)}>
              {/* Dark Mode Toggle */}
              <motion.button
                variants={itemVariants}
                onClick={toggleDarkMode}
                onMouseEnter={() => setHoveredId('dark-mode')}
                className="group relative w-full flex items-center justify-between px-3 py-2 text-sm text-foreground transition-colors"
              >
                {hoveredId === 'dark-mode' && (
                  <motion.div
                    layoutId="settings-hover"
                    className="absolute inset-0 bg-accent/15 rounded-lg"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-muted-foreground group-hover:text-foreground">
                    {isDark ? 'dark_mode' : 'light_mode'}
                  </span>
                  <span>Dark Mode</span>
                </div>
                <div className={`relative z-10 w-8 h-4 rounded-full transition-colors ${isDark ? 'bg-primary/40' : 'bg-muted'}`}>
                  <motion.div
                    animate={{ x: isDark ? 16 : 2 }}
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`absolute top-0.5 w-3 h-3 rounded-full shadow-sm ${isDark ? 'bg-primary' : 'bg-muted-foreground'}`}
                  />
                </div>
              </motion.button>

              {/* Animations Toggle */}
              <motion.button
                variants={itemVariants}
                onMouseEnter={() => setHoveredId('animations')}
                className="group relative w-full flex items-center justify-between px-3 py-2 text-sm text-foreground transition-colors"
              >
                {hoveredId === 'animations' && (
                  <motion.div
                    layoutId="settings-hover"
                    className="absolute inset-0 bg-accent/15 rounded-lg"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-muted-foreground group-hover:text-foreground">motion_mode</span>
                  <span>Animations</span>
                </div>
                <div className="relative z-10 w-8 h-4 bg-primary/40 rounded-full">
                  <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-primary rounded-full shadow-sm"></div>
                </div>
              </motion.button>

              <div className="h-px bg-border my-1 mx-2" />

              {/* About Button */}
              <motion.button
                variants={itemVariants}
                onMouseEnter={() => setHoveredId('about')}
                className="group relative w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors"
              >
                {hoveredId === 'about' && (
                  <motion.div
                    layoutId="settings-hover"
                    className="absolute inset-0 bg-accent/15 rounded-lg"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-muted-foreground group-hover:text-foreground">info</span>
                  <span>About</span>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsMenu;