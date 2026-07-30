"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * FluidGlass: A decorative cursor-following glass lens element
 * that creates a premium interactive experience. Uses debouncing
 * for smooth 60 FPS performance.
 */
export function FluidGlass() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Clear previous timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Debounce mouse tracking for performance
      timeoutRef.current = setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Only track if within container bounds
        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
          setMousePos({ x, y });
        }
      }, 16); // ~60 FPS
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        ref={lensRef}
        className="absolute w-40 h-40 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.05), transparent)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "inset 0 0 20px rgba(255, 255, 255, 0.1)",
          left: mousePos.x - 80,
          top: mousePos.y - 80,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </div>
  );
}
