import React from 'react';

export const DynamicPortalBackground = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#070A13] text-slate-100">
      
      {/* LAYER 0: Background Graphic, Gradient Mask & Ambient Glows (z-0, Non-interactive) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Background Image Base */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 scale-105 transition-all duration-1000"
          style={{ backgroundImage: `url('/assets/backgrounds/portal-bg.jpg')` }}
        />
        
        {/* Multi-Layer Contrast Overlay (Ensures text is 100% sharp & readable) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#070A13]/95 via-[#0B0F19]/85 to-[#0F172A]/90 backdrop-blur-[8px]" />

        {/* Brand Ambient Glow Orbs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[120px] animate-pulse" />
      </div>

      {/* LAYER 1: Active Interactive Application Content (z-10) */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {children}
      </div>

    </div>
  );
};

export default DynamicPortalBackground;
