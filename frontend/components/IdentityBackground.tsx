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
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-bg-base">
            {/* Layer 1: Base Canvas is handled by bg-bg-base above */}
            
            {/* Layer 2: IdentityNodes at responsive opacity and size */}
            <div className="absolute inset-0 opacity-[0.10] sm:opacity-[0.15]">
                {/* 3 Active Nodes on Mobile, Scaling up to 30% -> Desktop */}
                <IdentityNode className="top-[5%] md:top-[15%] left-[-5%] md:left-[0%] w-16 h-16 sm:w-24 sm:h-24 md:w-[180px] md:h-[180px]" />
                <IdentityNode className="top-[35%] md:top-[45%] right-[-5%] md:right-[-2%] w-16 h-16 sm:w-24 sm:h-24 md:w-[240px] md:h-[240px]" />
                <IdentityNode className="bottom-[10%] md:bottom-[15%] left-[2%] md:left-[5%] w-16 h-16 sm:w-24 sm:h-24 md:w-[200px] md:h-[200px]" />
                
                {/* Extra nodes hidden on mobile to optimize performance and prevent clutter */}
                <IdentityNode className="hidden md:block top-[25%] right-[15%] w-[130px] h-[130px]" />
                <IdentityNode className="hidden md:block bottom-[40%] left-[20%] w-[160px] h-[160px]" />
                <IdentityNode className="hidden md:block top-[60%] left-[2%] w-[110px] h-[110px]" />
            </div>

            {/* Layer 3: Blueprint Grid at 5% opacity */}
            <div className="absolute inset-0 bg-blueprint opacity-[0.05]"></div>

            {/* Layer 4: Mesh Glows */}
            <div className="absolute inset-0 bg-mesh opacity-80 mix-blend-multiply"></div>
        </div>
    );
}
