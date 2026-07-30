"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Zap, Leaf, Cloud, Lightbulb, Gauge } from "lucide-react";

interface Card {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
}

const cards: Card[] = [
  {
    id: "soil",
    title: "Soil Intelligence",
    description:
      "Deep analysis of soil health, nutrients, and composition for optimal crop planning.",
    icon: <Leaf className="size-6" />,
    gradient: "from-emerald-500/20 to-emerald-600/10",
  },
  {
    id: "disease",
    title: "Disease Detection",
    description: "AI-powered early detection of crop diseases with preventive recommendations.",
    icon: <Zap className="size-6" />,
    gradient: "from-orange-500/20 to-orange-600/10",
  },
  {
    id: "weather",
    title: "Weather Intelligence",
    description: "Precise micro-climate predictions integrated with farming decisions.",
    icon: <Cloud className="size-6" />,
    gradient: "from-blue-500/20 to-blue-600/10",
  },
  {
    id: "crop",
    title: "Crop Recommendation",
    description: "Personalized crop selection based on soil, climate, and market conditions.",
    icon: <Lightbulb className="size-6" />,
    gradient: "from-yellow-500/20 to-yellow-600/10",
  },
  {
    id: "mandi",
    title: "Mandi Intelligence",
    description: "Real-time market prices and demand forecasting for better selling decisions.",
    icon: <TrendingUp className="size-6" />,
    gradient: "from-purple-500/20 to-purple-600/10",
  },
  {
    id: "assistant",
    title: "AI Farm Assistant",
    description: "Voice-enabled 24/7 support in Hindi and English for all farming queries.",
    icon: <Gauge className="size-6" />,
    gradient: "from-indigo-500/20 to-indigo-600/10",
  },
];

interface CardSwapProps {
  autoRotateInterval?: number;
  pauseOnHover?: boolean;
}

export function CardSwap({ autoRotateInterval = 4000, pauseOnHover = true }: CardSwapProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % cards.length);
    }, autoRotateInterval);

    return () => clearInterval(timer);
  }, [isPaused, autoRotateInterval]);

  const handleMouseEnter = () => {
    if (pauseOnHover) setIsPaused(true);
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) setIsPaused(false);
  };

  return (
    <div
      className="relative w-full max-w-sm"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card display area */}
      <div className="relative h-64 rounded-2xl overflow-hidden bg-surface/50 border border-border/50 backdrop-blur-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute inset-0 p-6 flex flex-col justify-between"
          >
            {/* Background gradient */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${cards[activeIndex].gradient} pointer-events-none`}
            />

            {/* Content */}
            <div className="relative z-10">
              <div className="text-foreground/70 mb-3 inline-block p-2 rounded-lg bg-background/40 backdrop-blur-sm">
                {cards[activeIndex].icon}
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {cards[activeIndex].title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {cards[activeIndex].description}
              </p>
            </div>

            {/* Card index indicator */}
            <div className="relative z-10 text-xs font-medium text-muted-foreground">
              {activeIndex + 1} / {cards.length}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Gradient border animation */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl bg-gradient-to-r from-brand/20 to-accent/20 pointer-events-none" />
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {cards.map((_, idx) => (
          <motion.button
            key={idx}
            onClick={() => {
              setActiveIndex(idx);
              if (pauseOnHover) setIsPaused(true);
            }}
            className={`rounded-full transition-all ${
              idx === activeIndex ? "bg-brand" : "bg-border"
            }`}
            animate={{
              width: idx === activeIndex ? 28 : 8,
              height: 8,
            }}
            whileHover={{ scale: 1.2 }}
            aria-label={`Go to card ${idx + 1}`}
          />
        ))}
      </div>

      {/* Auto-rotation indicator */}
      {!isPaused && (
        <motion.div
          className="absolute -inset-1 rounded-2xl border border-brand/30"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
}
