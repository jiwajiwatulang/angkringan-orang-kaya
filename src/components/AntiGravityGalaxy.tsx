"use client";

import React, { useEffect, useRef, useState } from "react";

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

interface SparkleBurst {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export default function AntiGravityGalaxy() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

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

    // Sparkle bursts from clicks or interaction
    const sparkles: SparkleBurst[] = [];

    // Mouse coordinates
    const mouse = {
      x: -9999,
      y: -9999,
      radius: 140,
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Spawn anti-gravity burst (micro stars floating up)
      for (let i = 0; i < 9; i++) {
        const angle = (Math.PI * 2 * i) / 9 + (Math.random() - 0.5);
        const speed = 1.2 + Math.random() * 2;
        sparkles.push({
          x: clickX,
          y: clickY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2, // Anti-gravity upward bias
          life: 0,
          maxLife: 35 + Math.random() * 25,
          color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
          size: 1.5 + Math.random() * 2.5,
        });
      }
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener("mousemove", handleMouseMove);
      parent.addEventListener("mouseleave", handleMouseLeave);
      parent.addEventListener("click", handleClick);
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

        // Interactive Anti-Gravity Mouse Repulsion
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

        if (mdist < mouse.radius) {
          const force = (mouse.radius - mdist) / mouse.radius;
          const angle = Math.atan2(mdy, mdx);
          // Gently push away & upward
          p.x += Math.cos(angle) * force * 3.5;
          p.y += (Math.sin(angle) * force * 3.5) - 0.8; // extra anti-gravity lift!
          
          // Draw subtle stardust ray from mouse
          ctx.beginPath();
          ctx.strokeStyle = `rgba(96, 165, 250, ${(1 - mdist / mouse.radius) * 0.22})`;
          ctx.lineWidth = 1;
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }

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

      // 3. Render and update interactive click sparkles
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i];
        s.life++;
        s.x += s.vx;
        s.y += s.vy;
        s.vy -= 0.05; // accelerates upward (anti-gravity)
        s.vx *= 0.96;

        const progress = s.life / s.maxLife;
        const alpha = Math.max(0, 1 - progress);

        ctx.save();
        drawStar(s.x, s.y, 4, s.size * (1 - progress * 0.4), s.size * 0.3, progress * Math.PI);
        ctx.fillStyle = `${s.color}${alpha})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `${s.color}0.8)`;
        ctx.fill();
        ctx.restore();

        if (s.life >= s.maxLife) {
          sparkles.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (parent) {
        parent.removeEventListener("mousemove", handleMouseMove);
        parent.removeEventListener("mouseleave", handleMouseLeave);
        parent.removeEventListener("click", handleClick);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
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

      {/* 2. Interactive HTML5 Canvas Starfield with Anti-Gravity Physics */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-auto cursor-crosshair"
        title="Gerakkan kursor untuk berinteraksi dengan partikel Anti-Gravity Galaxy!"
      />

      {/* 3. Floating Zero-Gravity Floating Micro-Badges (Desktop Parallax) */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none">
        
        {/* Floating Item 1: Top-Left (Nota Penjualan Melayang) */}
        <div className="absolute top-16 left-[4%] xl:left-[8%] animate-float-1 pointer-events-auto transition-transform hover:scale-105 duration-300">
          <div className="px-4 py-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-blue-200/80 shadow-xl shadow-blue-500/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-sm shadow-xs">
              🧾
            </div>
            <div className="text-left">
              <div className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                <span>Nota #104</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">LUNAS</span>
              </div>
              <div className="text-[10px] text-slate-500 font-semibold">
                Rp 35.000 • 0.1 Detik
              </div>
            </div>
          </div>
        </div>

        {/* Floating Item 2: Bottom-Left (100% Offline Badge) */}
        <div className="absolute bottom-14 left-[5%] xl:left-[10%] animate-float-2 pointer-events-auto transition-transform hover:scale-105 duration-300">
          <div className="px-4 py-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-blue-200/80 shadow-xl shadow-blue-500/10 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs">
              📶
            </div>
            <div className="text-left">
              <span className="text-[11px] font-black text-slate-800 block">100% Offline Ready</span>
              <span className="text-[10px] text-slate-500 font-medium">Internet mati kasir tetap jalan</span>
            </div>
          </div>
        </div>

        {/* Floating Item 3: Top-Right (Bluetooth Thermal Printer Badge) */}
        <div className="absolute top-20 right-[4%] xl:right-[8%] animate-float-3 pointer-events-auto transition-transform hover:scale-105 duration-300">
          <div className="px-4 py-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-blue-200/80 shadow-xl shadow-blue-500/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-blue-600/30">
              🖨️
            </div>
            <div className="text-left">
              <span className="text-[11px] font-black text-slate-800 block">Cetak Bluetooth Thermal</span>
              <span className="text-[10px] text-blue-600 font-bold">58mm &amp; 80mm Siap Cetak</span>
            </div>
          </div>
        </div>

        {/* Floating Item 4: Bottom-Right (Anti-Macet / 0% Komisi) */}
        <div className="absolute bottom-16 right-[5%] xl:right-[10%] animate-float-1 pointer-events-auto transition-transform hover:scale-105 duration-300">
          <div className="px-4 py-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-blue-200/80 shadow-xl shadow-blue-500/10 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-xs">
              ⚡
            </div>
            <div className="text-left">
              <span className="text-[11px] font-black text-slate-800 block">Zero-G Latency: 0s</span>
              <span className="text-[10px] text-slate-500 font-medium">0% Komisi • 100% Milik Anda</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
