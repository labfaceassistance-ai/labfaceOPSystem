import React from 'react';

const IdentityNode = ({ className = "" }) => (
    <div className={`pointer-events-none absolute ${className}`}>
       <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <g>
             <path d="M100,30 Q60,30 50,80 T100,170 T150,80 Q140,30 100,30 Z" fill="none" stroke="currentColor" className="text-identity-sky" strokeWidth="2" />
             <line x1="100" y1="30" x2="100" y2="170" stroke="currentColor" className="text-identity-navy" strokeWidth="1" />
             <line x1="60" y1="80" x2="140" y2="80" stroke="currentColor" className="text-identity-navy" strokeWidth="1" />
             <line x1="55" y1="110" x2="145" y2="110" stroke="currentColor" className="text-identity-navy" strokeWidth="1" />
             <circle cx="75" cy="80" r="3" fill="currentColor" className="text-identity-sky" />
             <circle cx="125" cy="80" r="3" fill="currentColor" className="text-identity-sky" />
             <circle cx="100" cy="110" r="3" fill="currentColor" className="text-identity-sky" />
             <circle cx="100" cy="30" r="2" fill="currentColor" className="text-identity-navy" />
             <circle cx="100" cy="170" r="2" fill="currentColor" className="text-identity-navy" />
             <line x1="75" y1="80" x2="100" y2="110" stroke="currentColor" className="text-identity-sky" strokeWidth="1" strokeDasharray="3 2" />
             <line x1="125" y1="80" x2="100" y2="110" stroke="currentColor" className="text-identity-sky" strokeWidth="1" strokeDasharray="3 2" />
          </g>
       </svg>
    </div>
);

export default function IdentityBackground() {
    return (
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-[#F8FAFC]">
            {/* Layer 1: Enhanced Blueprint Grid (Primary - 20px) */}
            <div className="absolute inset-0 bg-blueprint opacity-10"></div>

            {/* Layer 2: Enhanced Blueprint Grid (Fine - 8px) */}
            <div className="absolute inset-0 bg-blueprint-fine opacity-5"></div>
            
            {/* Layer 3: IdentityNodes (Subtle Face wireframe SVGs) */}
            <div className="absolute inset-0 opacity-[0.07]">
                <IdentityNode className="top-[5%] md:top-[15%] left-[-5%] md:left-[0%] w-16 h-16 sm:w-24 sm:h-24 md:w-[180px] md:h-[180px]" />
                <IdentityNode className="top-[35%] md:top-[45%] right-[-5%] md:right-[-2%] w-16 h-16 sm:w-24 sm:h-24 md:w-[240px] md:h-[240px]" />
                <IdentityNode className="bottom-[10%] md:bottom-[15%] left-[2%] md:left-[5%] w-16 h-16 sm:w-24 sm:h-24 md:w-[200px] md:h-[200px]" />
                
                <IdentityNode className="hidden md:block top-[25%] right-[15%] w-[130px] h-[130px]" />
                <IdentityNode className="hidden md:block bottom-[40%] left-[20%] w-[160px] h-[160px]" />
                <IdentityNode className="hidden md:block top-[60%] left-[2%] w-[110px] h-[110px]" />
            </div>

            {/* Subtle Vignette for depth without using heavy Mesh gradients */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(4,28,60,0.02)_100%)] opacity-50"></div>
        </div>
    );
}
