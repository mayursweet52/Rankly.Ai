import React from 'react';

export const AntigravityUI = () => {
  return (
    <div className="relative min-h-screen bg-[#07080E] text-slate-100 p-8 flex flex-col items-center justify-center overflow-hidden gap-12 selection:bg-cyan-500/30">
      
      {/* Dynamic Floating Keyframe Styles */}
      <style>{`
        @keyframes antigravity-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes antigravity-float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .floating-element {
          animation: antigravity-float 6s ease-in-out infinite;
        }
        .floating-delayed {
          animation: antigravity-float-delayed 7s ease-in-out 1.5s infinite;
        }
        .shadow-antigravity {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7),
                      0 0 30px rgba(99, 102, 241, 0.08);
        }
        .shadow-glow-cyan {
          box-shadow: 0 20px 40px -15px rgba(0, 229, 255, 0.25),
                      0 0 20px rgba(0, 229, 255, 0.15);
        }
        .shadow-glow-purple {
          box-shadow: 0 20px 40px -15px rgba(129, 140, 248, 0.25),
                      0 0 20px rgba(129, 140, 248, 0.15);
        }
        .glass-card {
          background: rgba(14, 16, 26, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glass-card:hover {
          border-color: rgba(255, 255, 255, 0.18);
        }
        .interactive-glow {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.3s ease;
        }
        .interactive-glow:hover {
          transform: translateY(-4px) scale(1.02);
        }
      `}</style>

      {/* Subtle Background Orbs */}
      <div className="absolute w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none -top-20 -left-20" />
      <div className="absolute w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -bottom-20 -right-20" />

      {/* 1. Main Command Card (Floating & Glassmorphic) */}
      <div className="w-full max-w-4xl glass-card rounded-3xl p-8 shadow-antigravity floating-element relative z-10">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_#00e5ff]" />
            <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">System Active</span>
          </div>
          <span className="text-xs font-mono text-slate-500">v2.4.0 • Zero-G</span>
        </div>

        {/* Minimal Command Input & CTA */}
        <div className="mt-6 flex flex-col md:flex-row items-center gap-4">
          <div className="w-full relative">
            <input 
              type="text" 
              placeholder="Execute prompt or search candidates..." 
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:bg-white/[0.05] transition-all"
            />
          </div>
          
          <button className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-semibold text-sm rounded-2xl shadow-glow-cyan interactive-glow shrink-0">
            Execute
          </button>
        </div>
      </div>

      {/* 2. Metrics Section (Layered & Interactive Glow) */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div className="glass-card rounded-2xl p-6 shadow-antigravity interactive-glow group cursor-pointer hover:shadow-glow-cyan">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Screening Match</p>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-3xl font-light tracking-tight text-white group-hover:text-cyan-300 transition-colors">98.4%</h3>
            <span className="text-xs text-cyan-400 font-mono">↑ 4.2%</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 shadow-antigravity interactive-glow group cursor-pointer hover:shadow-glow-purple floating-delayed">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Throughput</p>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-3xl font-light tracking-tight text-white group-hover:text-indigo-300 transition-colors">1.2k/s</h3>
            <span className="text-xs text-indigo-400 font-mono">optimal</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 shadow-antigravity interactive-glow group cursor-pointer hover:shadow-glow-cyan">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Latency</p>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-3xl font-light tracking-tight text-white group-hover:text-cyan-300 transition-colors">18ms</h3>
            <span className="text-xs text-emerald-400 font-mono">zero-lag</span>
          </div>
        </div>
      </div>

      {/* 3. Glassmorphic Pricing Cards */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        <div className="glass-card rounded-3xl p-8 shadow-antigravity interactive-glow flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Base</span>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-light text-white">$49</span>
              <span className="text-xs text-slate-500">/ mo</span>
            </div>
            <p className="mt-4 text-xs text-slate-400 leading-relaxed">Core autonomous screening engine with real-time ranking.</p>
          </div>

          <button className="mt-8 w-full py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-xs font-medium rounded-xl transition-all">
            Select Base
          </button>
        </div>

        <div className="glass-card rounded-3xl p-8 shadow-antigravity floating-delayed interactive-glow border-indigo-500/30 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-[10px] font-mono text-white tracking-widest uppercase rounded-bl-xl">
            Popular
          </div>
          
          <div>
            <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Enterprise Zero-G</span>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-light text-white">$199</span>
              <span className="text-xs text-slate-500">/ mo</span>
            </div>
            <p className="mt-4 text-xs text-slate-400 leading-relaxed">Unlimited concurrent analysis with dedicated inference streams.</p>
          </div>

          <button className="mt-8 w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-medium rounded-xl shadow-glow-purple transition-all">
            Deploy Instance
          </button>
        </div>
      </div>

    </div>
  );
};

export default AntigravityUI;
