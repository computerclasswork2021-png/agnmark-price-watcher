"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface StackItem {
  id: string;
  title: string;
  description: string;
  number: number;
}

const story: StackItem[] = [
  {
    id: "1",
    title: "Upload Soil Report",
    description: "Start by sharing your soil analysis data for comprehensive insights",
    number: 1,
  },
  {
    id: "2",
    title: "AI Analysis",
    description: "Our AI engine processes your data against 50+ farming parameters",
    number: 2,
  },
  {
    id: "3",
    title: "Soil Health Score",
    description: "Get a detailed health score with specific nutrient recommendations",
    number: 3,
  },
  {
    id: "4",
    title: "Crop Recommendation",
    description: "Receive personalized crop suggestions for optimal yields",
    number: 4,
  },
  {
    id: "5",
    title: "Fertilizer Plan",
    description: "Custom fertilizer schedule aligned with your soil needs",
    number: 5,
  },
  {
    id: "6",
    title: "Disease Detection",
    description: "Identify potential crop diseases before they spread",
    number: 6,
  },
  {
    id: "7",
    title: "Weather & Market",
    description: "Integrate weather forecasts with live mandi price data",
    number: 7,
  },
  {
    id: "8",
    title: "Action Plan",
    description: "Receive your personalized daily action plan for maximum profit",
    number: 8,
  },
];

interface ScrollStackProps {
  className?: string;
}

export function ScrollStack({ className = "" }: ScrollStackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const newVisible = new Set(visibleItems);
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            newVisible.add(entry.target.id);
          }
        });
        setVisibleItems(newVisible);
      },
      { threshold: 0.2 },
    );

    const items = containerRef.current?.querySelectorAll("[data-story-item]");
    items?.forEach((item) => observer.observe(item));

    return () => items?.forEach((item) => observer.unobserve(item));
  }, [visibleItems]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Connection line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand/30 via-brand/50 to-brand/30" />

      {/* Story items */}
      <div className="space-y-8">
        {story.map((item, index) => {
          const isVisible = visibleItems.has(item.id);
          return (
            <motion.div
              key={item.id}
              data-story-item
              id={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={isVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="pl-24 relative"
            >
              {/* Timeline dot */}
              <motion.div
                className="absolute left-0 w-16 h-16 bg-surface rounded-full border-2 border-brand flex items-center justify-center font-bold text-brand text-lg"
                animate={
                  isVisible ? { scale: 1, boxShadow: "0 0 20px rgba(82, 131, 93, 0.3)" } : {}
                }
              >
                {item.number}
              </motion.div>

              {/* Content card */}
              <motion.div
                className="bg-gradient-to-br from-surface to-surface/80 rounded-xl p-4 border border-border/50 hover:border-brand/30 transition-colors"
                animate={isVisible ? { boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)" } : {}}
              >
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>

                {/* Progress indicator */}
                {index > 0 && (
                  <motion.div
                    className="mt-3 h-1 bg-gradient-to-r from-brand/50 to-brand rounded-full"
                    initial={{ width: 0 }}
                    animate={isVisible ? { width: "100%" } : {}}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-8 w-0.5 h-12 bg-gradient-to-b from-brand/50 to-transparent" />
    </div>
  );
}
