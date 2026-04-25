'use client';

import { useState } from 'react';

interface FairnessThermometerProps {
  percentage: number;
}

export default function FairnessThermometer({ percentage }: FairnessThermometerProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex flex-col items-center">
      <h2 className="font-serif text-3xl text-primary mb-10 italic">The Fairness Thermometer</h2>
      
      <div 
        className="relative w-20 h-[450px] bg-cream rounded-full p-1 border border-charcoal/10 shadow-inner cursor-help"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Glass Tube Effect */}
        <div className="absolute inset-0 rounded-full opacity-30 pointer-events-none" 
             style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.8) 0%, transparent 20%, transparent 80%, rgba(255,255,255,0.8) 100%)' }}>
        </div>
        
        {/* Liquid Content */}
        <div 
          className="absolute bottom-0 left-1 right-1 rounded-full transition-all duration-1000 ease-out flex flex-col items-center justify-end overflow-hidden"
          style={{ 
            height: `${percentage}%`, 
            background: 'linear-gradient(to top, #5E7B5C, #C44536)' 
          }}
        >
          {/* Hand-drawn style highlight */}
          <div className="w-1.5 h-full absolute left-3 top-0 bg-white/20 blur-[1px]"></div>
        </div>

        {/* Floating Percentage Label */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-10 transition-all duration-700"
          style={{ bottom: `calc(${percentage}% - 20px)` }}
        >
          <div className="bg-terracotta text-white px-4 py-2 rounded-full font-serif text-2xl shadow-lg flex items-center gap-2 border-2 border-white/20 whitespace-nowrap">
            {percentage}% <span className="text-sm font-sans uppercase tracking-widest font-bold">Fair</span>
          </div>

          {/* Tooltip */}
          <div className={`absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 bg-white p-4 rounded-xl shadow-2xl transition-all duration-300 border border-cream ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
            <p className="text-sm font-sans text-charcoal leading-relaxed">
              {percentage}% - We are {percentage < 50 ? 'still' : ''} {percentage}% of the way to a world where every applicant is seen for their potential, not their category.
            </p>
            <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-r border-b border-cream"></div>
          </div>
        </div>
      </div>

      <div className="mt-10 text-center">
        <p className="font-serif text-2xl text-charcoal/60 italic">Our Collective Pulse</p>
        <div className="w-16 h-0.5 bg-sage mx-auto mt-2"></div>
      </div>
    </div>
  );
}
