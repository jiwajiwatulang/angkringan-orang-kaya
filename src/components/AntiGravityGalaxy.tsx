"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  vy: number; // upward float speed (anti-gravity)
  vx: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  twinkleSpeed: number;
  isStarShape: boolean;
  angle: number;
  rotationSpeed: number;
}

export default function AntiGravityGalaxy() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener("resize", handleResize);

    // Cosmic palette tuned for White-Blue theme (Vibrant Sky Blue, Royal Blue, Electric Cyan, Soft Indigo, Twinkle Gold)
    const colorPalette = [
      "rgba(37, 99, 235,",   // blue-600
      "rgba(59, 130, 246,",  // blue-500
      "rgba(96, 165, 250,",  // blue-400
      "rgba(14, 165, 233,",  // sky-500
      "rgba(99, 102, 241,",  // indigo-500
      "rgba(56, 189, 248,",  // cyan-400
      "rgba(245, 158, 11,",  // gold sparkle
    ];

    const particleCount = Math.min(Math.floor((width * height) / 12000), 65);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const isStarShape = Math.random() < 0.22;
      const baseAlpha = isStarShape ? 0.5 + Math.random() * 0.45 : 0.25 + Math.random() * 0.5;
      const baseRadius = isStarShape ? 2.5 + Math.random() * 2.5 : 1.2 + Math.random() * 2.2;
      const colorBase = colorPalette[Math.floor(Math.random() * colorPalette.length)];

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: baseRadius,
        baseRadius,
        vy: -(0.25 + Math.random() * 0.55), // Always upward = anti-gravity!
        vx: (Math.random() - 0.5) * 0.35,
        color: colorBase,
        alpha: baseAlpha,
        baseAlpha,
        twinkleSpeed: 0.02 + Math.random() * 0.03,
        isStarShape,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
      });
    }

    // Helper: Draw 4-point star
    const drawStar = (cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number, rotation: number) => {
      let rot = (Math.PI / 2) * 3 + rotation;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
    };

    // Main animation loop
    let time = 0;
    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // 1. Constellation Connection Lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 90) {
            const lineAlpha = (1 - dist / 90) * 0.16;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(59, 130, 246, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // 2. Render and update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Anti-gravity upward float
        p.y += p.vy;
        p.x += p.vx + Math.sin(time + p.angle) * 0.25;
        p.angle += p.rotationSpeed;

        // Twinkle pulse
        p.alpha = p.baseAlpha + Math.sin(time * 3 + i) * 0.2;
        p.alpha = Math.max(0.1, Math.min(1, p.alpha));

        // Respawn when floating out of top screen
        if (p.y < -15) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -15) p.x = width + 10;
        if (p.x > width + 15) p.x = -10;

        // Draw particle
        ctx.save();
        if (p.isStarShape) {
          drawStar(p.x, p.y, 4, p.radius * 1.5, p.radius * 0.5, p.angle);
          ctx.fillStyle = `${p.color}${p.alpha})`;
          ctx.shadowBlur = 10;
          ctx.shadowColor = `${p.color}0.8)`;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${p.alpha})`;
          ctx.shadowBlur = p.radius > 2 ? 8 : 4;
          ctx.shadowColor = `${p.color}0.6)`;
          ctx.fill();
        }
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* 1. Celestial Aurora / Cosmic Nebular Radial Glow */}
      <div 
        className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[550px] rounded-full pointer-events-none blur-[120px] transition-all duration-1000 opacity-80"
        style={{
          background: "radial-gradient(ellipse at center, rgba(147, 197, 253, 0.45) 0%, rgba(199, 210, 254, 0.25) 45%, rgba(224, 231, 255, 0.1) 70%, transparent 85%)",
        }}
      />
      <div 
        className="absolute top-20 right-[15%] w-72 h-72 rounded-full pointer-events-none blur-[90px] opacity-60"
        style={{
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, transparent 70%)",
        }}
      />
      <div 
        className="absolute top-32 left-[12%] w-80 h-80 rounded-full pointer-events-none blur-[100px] opacity-50"
        style={{
          background: "radial-gradient(circle, rgba(129, 140, 248, 0.25) 0%, transparent 70%)",
        }}
      />

      {/* Decorative background only; never captures user input. */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

    </div>
  );
}
