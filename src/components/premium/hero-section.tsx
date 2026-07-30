"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { LiquidEther } from "./liquid-ether";
import { CardSwap } from "./card-swap";
import { FluidGlass } from "./fluid-glass";

interface HeroSectionProps {
  onGetStarted?: () => void;
  ctaLabel?: string;
}

export function HeroSection({ onGetStarted, ctaLabel = "Get Started" }: HeroSectionProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Background with LiquidEther */}
      <div className="absolute inset-0 -z-10">
        <LiquidEther />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
      </div>

      {/* FluidGlass lens - subtle cursor follow */}
      <div className="absolute inset-0 -z-5 opacity-40">
        <FluidGlass />
      </div>

      {/* Main content */}
      <div className="relative px-4 py-16 md:py-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left column: Messaging */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/30"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              <span className="text-xs font-semibold text-brand">Premium Intelligence</span>
            </motion.div>

            {/* Main heading */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground text-balance leading-tight">
                Your Farm's
                <br />
                <span className="bg-gradient-to-r from-brand via-brand to-accent bg-clip-text text-transparent">
                  AI Decision Engine
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-[45ch] leading-relaxed text-balance">
                Fuse soil intelligence, weather forecasts, market prices, and disease risks into one
                clear action plan every single day.
              </p>
            </motion.div>

            {/* Feature highlights */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3 pt-4"
            >
              {[
                "Unified AI-powered decisions",
                "Real-time soil analysis",
                "24/7 voice assistant support",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                  {feature}
                </div>
              ))}
            </motion.div>

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={onGetStarted}
              whileHover={{ scale: 1.02, boxShadow: "0 12px 32px rgba(82, 131, 93, 0.3)" }}
              whileTap={{ scale: 0.98 }}
              className="group inline-flex items-center gap-2 px-6 py-3 bg-brand text-brand-foreground rounded-xl font-semibold text-base hover:bg-brand/90 transition-colors shadow-lg"
            >
              {ctaLabel}
              <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                <ArrowRight className="size-5" />
              </motion.div>
            </motion.button>
          </motion.div>

          {/* Right column: CardSwap */}
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex justify-center md:justify-end"
          >
            <CardSwap autoRotateInterval={4000} pauseOnHover={true} />
          </motion.div>
        </div>

        {/* Bottom stats/trust indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-3 gap-8 mt-16 pt-12 border-t border-border/50"
        >
          {[
            { number: "50K+", label: "Active Farmers" },
            { number: "98%", label: "Recommendation Accuracy" },
            { number: "24/7", label: "AI Support" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-brand mb-1">{stat.number}</div>
              <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
