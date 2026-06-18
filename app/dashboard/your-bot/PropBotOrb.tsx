"use client";

/**
 * PitchlyOrb — Custom AI Orb component
 * A fluid, animated orb with a highly realistic 3D tumbling wireframe particle sphere,
 * morphing blob shape, and layered glowing gradients. Supports drag-to-rotate with inertia
 * and hover perspective tilt. No external dependencies.
 */

import React, { useEffect, useRef } from "react";

interface PitchlyOrbProps {
  size?: number;
  /** "idle" | "thinking" | "speaking" */
  state?: "idle" | "thinking" | "speaking";
}

export default function PitchlyOrb({ size = 140, state = "idle" }: PitchlyOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = size;
    const H = size;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    const cx = W / 2;
    const cy = H / 2;
    const r = W * 0.36; // Sphere radius inside canvas

    // 1. Generate outer sphere dots (Fibonacci Sphere for uniform spacing)
    const outerDots: { x: number; y: number; z: number; size: number }[] = [];
    const N_outer = 75;
    for (let i = 0; i < N_outer; i++) {
      const y = 1 - (i / (N_outer - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y);
      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      const theta = goldenRatio * 2 * Math.PI * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      outerDots.push({
        x: x * 0.95,
        y: y * 0.95,
        z: z * 0.95,
        size: Math.random() * 1.2 + 0.6,
      });
    }

    // 2. Generate inner core dots (smaller nested sphere)
    const innerDots: { x: number; y: number; z: number; size: number }[] = [];
    const N_inner = 30;
    for (let i = 0; i < N_inner; i++) {
      const y = 1 - (i / (N_inner - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      const theta = goldenRatio * 2 * Math.PI * i + Math.PI; // offset rotation
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      innerDots.push({
        x: x * 0.45,
        y: y * 0.45,
        z: z * 0.45,
        size: Math.random() * 0.7 + 0.35,
      });
    }

    // 3. Generate 3D grid rings (orthogonal orbit lines)
    const ringXY: { x: number; y: number; z: number }[] = [];
    const ringYZ: { x: number; y: number; z: number }[] = [];
    const ringXZ: { x: number; y: number; z: number }[] = [];
    const ringSegments = 32;
    for (let i = 0; i < ringSegments; i++) {
      const theta = (i / ringSegments) * Math.PI * 2;
      // Equatorial ring XY
      ringXY.push({ x: Math.cos(theta) * 0.95, y: Math.sin(theta) * 0.95, z: 0 });
      // Meridian ring YZ
      ringYZ.push({ x: 0, y: Math.cos(theta) * 0.95, z: Math.sin(theta) * 0.95 });
      // Meridian ring XZ
      ringXZ.push({ x: Math.cos(theta) * 0.95, y: 0, z: Math.sin(theta) * 0.95 });
    }

    // Interactive states
    let angleX = 0;
    let angleY = 0;
    let angleZ = 0;

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let vx = 0; // momentum velocity Y
    let vy = 0; // momentum velocity X

    // Hover offsets (Parallax effect)
    let targetHoverX = 0;
    let targetHoverY = 0;
    let hoverX = 0;
    let hoverY = 0;

    // Mouse handlers
    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      vx = 0;
      vy = 0;
      canvas.style.cursor = "grabbing";
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left - cx;
      const my = e.clientY - rect.top - cy;

      if (isDragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        // Scale motion speed
        vx = dx * 0.008;
        vy = dy * 0.008;

        angleY += vx;
        angleX -= vy;
      } else {
        // Target tilt offset based on cursor position relative to center
        targetHoverX = (mx / W) * 0.35;
        targetHoverY = (my / H) * 0.35;
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
      canvas.style.cursor = "grab";
    };

    const handleMouseLeave = () => {
      isDragging = false;
      targetHoverX = 0;
      targetHoverY = 0;
      canvas.style.cursor = "grab";
    };

    // Touch handlers for mobile devices
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        vx = 0;
        vy = 0;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastX;
        const dy = e.touches[0].clientY - lastY;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;

        vx = dx * 0.008;
        vy = dy * 0.008;

        angleY += vx;
        angleX -= vy;
      }
    };

    const handleTouchEnd = () => {
      isDragging = false;
    };

    // Attach events
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    let frame = 0;
    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;

      // Adjust rotation speed & scale breathing depending on state
      let speedX = 0.003;
      let speedY = 0.005;
      let speedZ = 0.002;
      let pulseScale = 1.0 + 0.015 * Math.sin(frame * 0.025);

      if (state === "thinking") {
        speedX = 0.010;
        speedY = 0.015;
        speedZ = 0.006;
        pulseScale = 1.0 + 0.06 * Math.sin(frame * 0.07);
      } else if (state === "speaking") {
        speedX = 0.007;
        speedY = 0.020;
        speedZ = 0.012;
        pulseScale = 1.0 + 0.10 * Math.sin(frame * 0.13);
      }

      // Smooth interpolation for hover tilt
      hoverX += (targetHoverX - hoverX) * 0.1;
      hoverY += (targetHoverY - hoverY) * 0.1;

      // Update angles with momentum (when not dragging) or auto-rotation
      if (!isDragging) {
        angleY += vx;
        angleX += vy;
        vx *= 0.94; // Decay velocity
        vy *= 0.94;

        // Default continuous spinning
        angleX += speedX;
        angleY += speedY;
        angleZ += speedZ;
      }

      // Final outer angles
      const outerAngleX = angleX + hoverY;
      const outerAngleY = angleY + hoverX;
      const outerAngleZ = angleZ;

      // Inner angles (rotates counter/differently)
      const innerAngleX = -angleY * 0.85;
      const innerAngleY = -angleX * 1.15;
      const innerAngleZ = angleZ * 1.25;

      // List of 3D primitives to sort back-to-front (depth buffer / painter's algorithm)
      const primitives: { z: number; draw: (c: CanvasRenderingContext2D) => void }[] = [];

      // 3D Rotation helper
      const rotatePoint = (x: number, y: number, z: number, angX: number, angY: number, angZ: number) => {
        // Rotate around X
        const cosX = Math.cos(angX);
        const sinX = Math.sin(angX);
        let y1 = y * cosX - z * sinX;
        let z1 = y * sinX + z * cosX;
        let x1 = x;

        // Rotate around Y
        const cosY = Math.cos(angY);
        const sinY = Math.sin(angY);
        let x2 = x1 * cosY + z1 * sinY;
        let z2 = -x1 * sinY + z1 * cosY;
        let y2 = y1;

        // Rotate around Z
        const cosZ = Math.cos(angZ);
        const sinZ = Math.sin(angZ);
        let x3 = x2 * cosZ - y2 * sinZ;
        let y3 = x2 * sinZ + y2 * cosZ;
        let z3 = z2;

        return { x: x3, y: y3, z: z3 };
      };

      // Projection helper with perspective divide
      const project = (pt: { x: number; y: number; z: number }) => {
        const focalLength = 2.4;
        const perspective = focalLength / (focalLength - pt.z);
        return {
          px: cx + pt.x * r * pulseScale * perspective,
          py: cy + pt.y * r * pulseScale * perspective,
          pz: pt.z,
        };
      };

      // Add outer dots
      const isDark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";

      outerDots.forEach((dot) => {
        const rot = rotatePoint(dot.x, dot.y, dot.z, outerAngleX, outerAngleY, outerAngleZ);
        const proj = project(rot);
        primitives.push({
          z: proj.pz,
          draw: (c) => {
            const pzNorm = (proj.pz + 1.0) / 2.0; // normalize [-1, 1] to [0, 1]
            const alpha = 0.22 + pzNorm * 0.58;
            const sz = dot.size * (0.45 + pzNorm * 0.75);
            c.beginPath();
            c.arc(proj.px, proj.py, sz, 0, Math.PI * 2);
            c.fillStyle = isDark ? `rgba(9, 9, 11, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
            c.fill();

            // Glow effect on closest front-facing particles
            if (pzNorm > 0.76) {
              c.shadowColor = isDark ? "rgba(9, 9, 11, 0.45)" : "rgba(255, 255, 255, 0.45)";
              c.shadowBlur = 4.5;
              c.fillStyle = isDark ? `rgba(9, 9, 11, ${alpha * 0.9})` : `rgba(255, 255, 255, ${alpha * 0.9})`;
              c.fill();
              c.shadowBlur = 0; // reset
            }
          },
        });
      });

      // Add inner dots
      innerDots.forEach((dot) => {
        const rot = rotatePoint(dot.x, dot.y, dot.z, innerAngleX, innerAngleY, innerAngleZ);
        const proj = project(rot);
        primitives.push({
          z: proj.pz,
          draw: (c) => {
            const pzNorm = (proj.pz + 0.45) / 0.9; // inner normalized
            const alpha = (0.28 + pzNorm * 0.52) * 0.55;
            const sz = dot.size * (0.45 + pzNorm * 0.65);
            c.beginPath();
            c.arc(proj.px, proj.py, sz, 0, Math.PI * 2);
            c.fillStyle = isDark ? `rgba(63, 63, 70, ${alpha})` : `rgba(235, 240, 255, ${alpha})`;
            c.fill();
          },
        });
      });

      // Add grid ring segments
      const addRingSegments = (ringPoints: { x: number; y: number; z: number }[]) => {
        for (let i = 0; i < ringSegments; i++) {
          const ptA = ringPoints[i];
          const ptB = ringPoints[(i + 1) % ringSegments];

          const rotA = rotatePoint(ptA.x, ptA.y, ptA.z, outerAngleX, outerAngleY, outerAngleZ);
          const rotB = rotatePoint(ptB.x, ptB.y, ptB.z, outerAngleX, outerAngleY, outerAngleZ);

          const projA = project(rotA);
          const projB = project(rotB);

          const avgZ = (projA.pz + projB.pz) / 2.0;

          primitives.push({
            z: avgZ,
            draw: (c) => {
              const pzNorm = (avgZ + 1.0) / 2.0; // normalize
              const alpha = 0.015 + pzNorm * 0.145; // faded on back, clear on front
              c.beginPath();
              c.moveTo(projA.px, projA.py);
              c.lineTo(projB.px, projB.py);
              c.strokeStyle = isDark ? `rgba(9, 9, 11, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
              c.lineWidth = 0.75;
              c.stroke();
            },
          });
        }
      };

      addRingSegments(ringXY);
      addRingSegments(ringYZ);
      addRingSegments(ringXZ);

      // Sort all primitives by depth (z coordinate) ascending: back-to-front
      primitives.sort((a, b) => a.z - b.z);

      // Draw all items sequentially
      primitives.forEach((prim) => prim.draw(ctx));

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [size, state]);

  const speedMap = { idle: "6s", thinking: "2.5s", speaking: "1.8s" };
  const blobSpeed = speedMap[state];

  return (
    <>
      <style>{`
        /* ── Keyframes ─────────────────────────────────────── */
        @keyframes orb-blob {
          0%,100% { border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; }
          25%      { border-radius: 45% 55% 40% 60% / 60% 40% 55% 45%; }
          50%      { border-radius: 55% 45% 60% 40% / 45% 55% 50% 55%; }
          75%      { border-radius: 40% 60% 45% 55% / 55% 45% 60% 40%; }
        }
        @keyframes orb-float {
          0%,100% { transform: translateY(0px);   }
          50%      { transform: translateY(-10px); }
        }
        @keyframes orb-glow-pulse {
          0%,100% { opacity: 0.55; transform: scale(1);   }
          50%      { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes orb-inner-shimmer {
          0%,100% { transform: translate(-10%,-10%) rotate(0deg);   }
          50%      { transform: translate(10%, 10%)  rotate(180deg); }
        }
        @keyframes orb-shine-drift {
          0%,100% { transform: translate(0,0) scale(1);        }
          50%      { transform: translate(8px, -6px) scale(1.2); }
        }
        @keyframes orb-dot-pulse {
          0%,100% { opacity: 0.6; }
          50%      { opacity: 1;   }
        }

        :root {
          --orb-gradient: linear-gradient(135deg, #09090b 0%, #27272a 50%, #52525b 100%);
          --orb-glow: radial-gradient(
            circle,
            rgba(9, 9, 11, 0.25) 0%,
            rgba(39, 39, 42, 0.15) 40%,
            transparent 70%
          );
          --orb-shadow: 0 0 ${size * 0.35}px rgba(9, 9, 11, 0.25), 0 0 ${size * 0.6}px rgba(39, 39, 42, 0.12);
        }
        [data-theme="dark"] {
          --orb-gradient: linear-gradient(135deg, #ffffff 0%, #e4e4e7 50%, #a1a1aa 100%);
          --orb-glow: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.35) 0%,
            rgba(228, 228, 231, 0.2) 40%,
            transparent 70%
          );
          --orb-shadow: 0 0 ${size * 0.35}px rgba(255, 255, 255, 0.35), 0 0 ${size * 0.6}px rgba(228, 228, 231, 0.15);
        }

        .porb-wrap {
          position: relative;
          width: ${size}px;
          height: ${size}px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: orb-float 5s ease-in-out infinite;
        }

        /* Glow behind orb */
        .porb-glow {
          position: absolute;
          width: ${size * 1.1}px;
          height: ${size * 1.1}px;
          border-radius: 50%;
          background: var(--orb-glow);
          filter: blur(${size * 0.18}px);
          animation: orb-glow-pulse ${blobSpeed} ease-in-out infinite;
        }

        /* Main blob */
        .porb-core {
          position: relative;
          width: ${size}px;
          height: ${size}px;
          border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%;
          background: var(--orb-gradient);
          animation:
            orb-blob ${blobSpeed} ease-in-out infinite,
            orb-glow-pulse ${blobSpeed} ease-in-out infinite;
          box-shadow:
            var(--orb-shadow),
            inset 0 ${size * 0.05}px ${size * 0.12}px rgba(255,255,255,0.2);
          overflow: hidden;
        }

        /* Inner swirling highlight layer */
        .porb-inner {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(
            ellipse at 30% 25%,
            rgba(255,255,255,0.55) 0%,
            rgba(255,255,255,0.1)  35%,
            transparent 65%
          );
          animation: orb-inner-shimmer 8s ease-in-out infinite;
        }

        /* Top-left shine */
        .porb-shine {
          position: absolute;
          top: 14%;
          left: 18%;
          width: 32%;
          height: 22%;
          border-radius: 50%;
          background: rgba(255,255,255,0.45);
          filter: blur(6px);
          animation: orb-shine-drift 4s ease-in-out infinite;
        }

        /* Canvas overlay for dot particles */
        .porb-canvas {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          mix-blend-mode: normal;
          animation: orb-dot-pulse 3s ease-in-out infinite;
          cursor: grab;
          user-select: none;
          touch-action: none;
        }
      `}</style>

      <div className="porb-wrap">
        {/* Glow */}
        <div className="porb-glow" />

        {/* Main orb blob */}
        <div className="porb-core">
          <div className="porb-inner" />
          <div className="porb-shine" />
          {/* Dot sphere canvas */}
          <canvas ref={canvasRef} className="porb-canvas" />
        </div>
      </div>
    </>
  );
}
