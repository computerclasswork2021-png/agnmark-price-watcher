import { motion } from "framer-motion";
import { ReactNode } from "react";

/**
 * FadeInUp: Fade in and slide up animation
 */
export function FadeInUp({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * ScaleIn: Scale and fade in animation
 */
export function ScaleIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * SlideInLeft: Slide in from left with fade
 */
export function SlideInLeft({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * PulseAnimation: Gentle pulsing animation
 */
export function PulseAnimation({ children }: { children: ReactNode }) {
  return (
    <motion.div animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 3, repeat: Infinity }}>
      {children}
    </motion.div>
  );
}

/**
 * HoverScale: Scale up on hover
 */
export function HoverScale({ children, scale = 1.05 }: { children: ReactNode; scale?: number }) {
  return (
    <motion.div whileHover={{ scale }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      {children}
    </motion.div>
  );
}

/**
 * AnimatedCounter: Animate number counting up
 */
export function AnimatedCounter({
  value,
  duration = 1,
  suffix = "",
}: {
  value: number;
  duration?: number;
  suffix?: string;
}) {
  return (
    <motion.div>
      {value}
      {suffix}
    </motion.div>
  );
}

/**
 * StaggerContainer: Container for staggered animations
 */
export function StaggerContainer({
  children,
  delay = 0.1,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerItem: Item for use within StaggerContainer
 */
export function StaggerItem({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
