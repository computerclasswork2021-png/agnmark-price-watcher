"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

/**
 * LiquidEther: Animated fluid gradient background that simulates
 * nutrients flowing through soil. Uses canvas for performance.
 */
export function LiquidEther() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const animationIdRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const animate = () => {
      timeRef.current += 0.005;
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      // Clear canvas
      ctx.fillStyle = "transparent";
      ctx.clearRect(0, 0, width, height);

      // Create gradient background
      const bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, "rgba(244, 244, 245, 0.02)");
      bgGradient.addColorStop(1, "rgba(82, 131, 93, 0.04)");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Draw flowing blobs with organic shapes
      const blobs = [
        { x: width * 0.2, y: height * 0.3, speed: 0.0003, color: "rgba(82, 131, 93, 0.15)" }, // Forest green
        { x: width * 0.7, y: height * 0.6, speed: 0.0004, color: "rgba(138, 106, 77, 0.12)" }, // Warm brown
        { x: width * 0.5, y: height * 0.5, speed: 0.0002, color: "rgba(217, 175, 132, 0.08)" }, // Warm beige
      ];

      blobs.forEach((blob) => {
        const offsetX = Math.sin(timeRef.current * blob.speed + blob.x) * 60;
        const offsetY = Math.cos(timeRef.current * blob.speed + blob.y) * 40;

        const gradient = ctx.createRadialGradient(
          blob.x + offsetX,
          blob.y + offsetY,
          0,
          blob.x + offsetX,
          blob.y + offsetY,
          120,
        );
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(blob.x + offsetX, blob.y + offsetY, 120, 0, Math.PI * 2);
        ctx.fill();
      });

      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ filter: "blur(40px)" }}
    />
  );
}
