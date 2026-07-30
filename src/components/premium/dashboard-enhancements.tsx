"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * AnimatedCounter: Smoothly animates a number from 0 to the target value.
 * Perfect for displaying scores, percentages, and metrics.
 */
export function AnimatedCounter({
  value,
  decimals = 0,
  duration = 1,
  suffix = "",
  prefix = "",
  className = "",
}: {
  value: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const steps = Math.ceil(duration * 60); // 60 FPS
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current * Math.pow(10, decimals)) / Math.pow(10, decimals));
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [value, decimals, duration]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/**
 * LoadingSkeleton: Premium loading placeholder with shimmer effect.
 * Creates a smooth, professional loading experience.
 */
export function LoadingSkeleton({
  className = "h-4 w-full",
  count = 1,
  gap = 3,
}: {
  className?: string;
  count?: number;
  gap?: number;
}) {
  return (
    <div className={`space-y-${gap}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={`${className} bg-muted rounded-lg overflow-hidden relative`}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ["0%", "100%"] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * PremiumGauge: Interactive circular gauge with smooth animation.
 * Great for displaying health scores, risk levels, and metrics.
 */
export function PremiumGauge({
  value,
  max = 100,
  label = "",
  color = "var(--brand)",
  size = 120,
  strokeWidth = 8,
}: {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / max) * circumference;

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <motion.svg
          width={size}
          height={size}
          className="transform -rotate-90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={strokeWidth}
          />

          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </motion.svg>

        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            className="text-2xl font-bold text-foreground"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {Math.round(value)}
          </motion.div>
          {label && <div className="text-xs text-muted-foreground mt-0.5">{label}</div>}
        </div>
      </div>
    </div>
  );
}

/**
 * GradientBorder: Element with an animated gradient border.
 * Perfect for highlighting premium cards and sections.
 */
export function GradientBorder({
  children,
  className = "",
  animating = true,
}: {
  children: React.ReactNode;
  className?: string;
  animating?: boolean;
}) {
  return (
    <motion.div
      className={`relative ${className}`}
      animate={
        animating
          ? { boxShadow: ["0 0 0 1px var(--brand)", "0 0 20px 1px var(--brand) / 0.3"] }
          : {}
      }
      transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-brand/20 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/**
 * HoverElevation: Card that elevates and glows on hover.
 * Creates a premium interactive feel.
 */
export function HoverElevation({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={`group rounded-2xl ${className}`}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * PageTransition: Wrapper for page entrance animations.
 * Ensures smooth transitions between views.
 */
export function PageTransition({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
