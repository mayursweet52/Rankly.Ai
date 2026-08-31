import React, { useState } from 'react';

export const FlipLoginCard = () => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleShowCompany = (e) => {
    e.preventDefault();
    setIsFlipped(true);
  };

  const handleBackToLogin = (e) => {
    e.preventDefault();
    setIsFlipped(false);
  };

  return (
    <div className="min-h-screen bg-[#07080E] text-slate-100 flex items-center justify-center p-4">
      {/* Dynamic Flip Card CSS */}
      <style>{`
        .flip-container {
          perspective: 1000px;
          width: 100%;
          max-width: 440px;
        }
        .flipper {
          position: relative;
          width: 100%;
          transform-style: preserve-3d;
          transition: transform 0.8s cubic-bezier(0.4, 0.2, 0.2, 1);
        }
        .flipper.flipped {
          transform: rotateY(180deg);
        }
        .front, .back {
          width: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .front {
          position: relative;
          z-index: 2;
          transform: rotateY(0deg);
        }
        .back {
          position: absolute;
          top: 0;
          left: 0;
          transform: rotateY(180deg);
        }
      `}</style>

      <div className="flip-container">
        <div className={`flipper ${isFlipped ? 'flipped' : ''}`} id="loginFlipper">
          
          {/* FRONT: User Login */}
          <div className="front">
            <div className="login-card bg-[#0E101A]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">Welcome Back</h2>
              <p className="text-xs text-slate-400 mb-6">Sign in to your candidate screening workspace</p>
              
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Email</label>
                  <input 
                    type="email" 
                    placeholder="name@company.com" 
                    required 
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    required 
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full mt-2 py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-semibold text-sm rounded-xl shadow-lg transition-all"
                >
                  Sign In
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/5 text-center">
                <a 
                  id="showCompanyForm" 
                  href="#company" 
                  onClick={handleShowCompany}
                  className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  Company Login →
                </a>
              </div>
            </div>
          </div>

          {/* BACK: Create Organization */}
          <div className="back">
            <div className="login-card bg-[#0E101A]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">Create Organization</h2>
              <p className="text-xs text-slate-400 mb-6">Register your company instance</p>
              
              <form id="orgForm" className="space-y-3.5" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <input 
                    type="text" 
                    name="orgName" 
                    placeholder="Organization Name" 
                    required 
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <input 
                    type="email" 
                    name="workEmail" 
                    placeholder="Work Email" 
                    required 
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    name="industry" 
                    placeholder="Industry" 
                    required 
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                  <input 
                    type="text" 
                    name="size" 
                    placeholder="Size (e.g. 50-200)" 
                    required 
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <input 
                    type="text" 
                    name="adminName" 
                    placeholder="Admin Name" 
                    required 
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <input 
                    type="password" 
                    name="adminPassword" 
                    placeholder="Admin Password" 
                    required 
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full mt-2 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all"
                >
                  Register Organization
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-white/5 text-center">
                <a 
                  id="backToLogin" 
                  href="#login" 
                  onClick={handleBackToLogin}
                  className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ← Back to User Login
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FlipLoginCard;
