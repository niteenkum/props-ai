"use client";

/**
 * PropBot AI — Animated hero orb for the chat page.
 * A pulsing, glowing sphere using CSS animations.
 */

import React from "react";

export default function PropBotOrb() {
  return (
    <>
      <style>{`
        @keyframes orb-float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-10px) scale(1.03); }
        }
        @keyframes orb-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.15); }
        }
        @keyframes orb-glow-ring {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50%       { transform: scale(1.4); opacity: 0; }
        }
        .propbot-orb-wrap {
          position: relative;
          width: 96px;
          height: 96px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .propbot-orb-ring {
          position: absolute;
          inset: -16px;
          border-radius: 50%;
          border: 2px solid rgba(124,58,237,0.5);
          animation: orb-glow-ring 2.4s ease-in-out infinite;
        }
        .propbot-orb-ring-2 {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 1px solid rgba(124,58,237,0.3);
          animation: orb-glow-ring 2.4s ease-in-out 0.6s infinite;
        }
        .propbot-orb-core {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: radial-gradient(
            circle at 35% 35%,
            #a78bfa 0%,
            #7c3aed 40%,
            #4f46e5 75%,
            #312e81 100%
          );
          box-shadow:
            0 0 40px rgba(124,58,237,0.6),
            0 0 80px rgba(124,58,237,0.2),
            inset 0 4px 12px rgba(255,255,255,0.25);
          animation: orb-float 4s ease-in-out infinite;
          position: relative;
        }
        .propbot-orb-shine {
          position: absolute;
          top: 12px;
          left: 16px;
          width: 28px;
          height: 18px;
          border-radius: 50%;
          background: rgba(255,255,255,0.3);
          filter: blur(4px);
          animation: orb-pulse 4s ease-in-out infinite;
        }
      `}</style>
      <div className="propbot-orb-wrap">
        <div className="propbot-orb-ring" />
        <div className="propbot-orb-ring-2" />
        <div className="propbot-orb-core">
          <div className="propbot-orb-shine" />
        </div>
      </div>
    </>
  );
}
