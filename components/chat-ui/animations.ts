import { Variants } from 'framer-motion';

// ============================================================================
// Animation Variants - Premium Springy Physics
// ============================================================================

// User message animates from the center (input area) to the right bubble position
export const userMessageVariants: Variants = {
  initial: {
    opacity: 0,
    x: -100, // Move from left (input center) to right
    y: 40,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200, // Slower, more visible
      damping: 20,
      mass: 1,
      staggerChildren: 0.2, // More delay for text
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

// Slower text drift for the "text slowly moves to the right" effect
export const textContentVariants: Variants = {
  initial: {
    x: -30,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.8, // Slower
      ease: [0.2, 0.8, 0.2, 1], // Smooth easing
      delay: 0.2,
    },
  },
};

// Assistant message animates from left side
export const assistantMessageVariants: Variants = {
  initial: {
    opacity: 0,
    x: -40,
    y: 20,
    scale: 0.85,
  },
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 18,
      mass: 0.7,
      staggerChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

// Bubble content has its own subtle spring for the "settling" effect
export const bubbleContentVariants: Variants = {
  initial: {
    scale: 0.9,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 20,
      mass: 0.5,
    },
  },
};

// Avatar pops in with overshoot
export const avatarVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 600,
      damping: 12,
      mass: 0.4,
      delay: 0.1,
    },
  },
};

// Event card slides up with bounce
export const eventCardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 20,
      mass: 0.6,
    },
  },
};
