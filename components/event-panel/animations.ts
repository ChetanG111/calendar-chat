import { Variants } from 'framer-motion';

export const containerVariants: Variants = {
    hidden: {
        x: 480,
        opacity: 0,
        scale: 0.98,
        filter: "blur(10px)",
        boxShadow: "0 0 0 rgba(0,0,0,0)"
    },
    visible: {
        x: 0,
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.75)",
        transition: {
            type: "spring",
            damping: 24,
            stiffness: 280,
            mass: 0.8,
            staggerChildren: 0.08,
            delayChildren: 0.1
        }
    },
    exit: {
        x: 480,
        opacity: 0,
        scale: 0.98,
        filter: "blur(10px)",
        boxShadow: "0 0 0 rgba(0,0,0,0)",
        transition: {
            type: "spring",
            damping: 30,
            stiffness: 300,
            mass: 1,
            velocity: 2
        }
    }
};

export const itemVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 20,
        scale: 0.95,
        filter: "blur(4px)"
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 25,
            mass: 0.8
        }
    }
};

export const editModeVariants: Variants = {
    hidden: {
        opacity: 0,
    },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.06,
            delayChildren: 0.02
        }
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.15 }
    }
};

export const viewModeVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.05
        }
    },
    exit: { opacity: 0, transition: { duration: 0.15 } }
};

export const contentContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            delayChildren: 0.1,
            staggerChildren: 0.08
        }
    }
};
