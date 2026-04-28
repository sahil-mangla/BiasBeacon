'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface FairnessGaugeProps {
  label: string;
  value: number; // 0.0 to 1.0
  historicalData?: number[];
}

export default function FairnessGauge({ label, value, historicalData = [] }: FairnessGaugeProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setDisplayValue(isNaN(value) || value === null || value === undefined ? 0 : value);
  }, [value]);

  useEffect(() => {
    if (canvasRef.current && historicalData.length > 0) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const width = canvasRef.current.width;
        const height = canvasRef.current.height;
        ctx.clearRect(0, 0, width, height);
        
        ctx.beginPath();
        ctx.strokeStyle = '#5E7B5C';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        
        const step = width / (historicalData.length - 1);
        historicalData.forEach((val, i) => {
          const x = i * step;
          const y = height - (val * height);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    }
  }, [historicalData]);

  const getColor = (v: number) => {
    if (v >= 0.8) return '#5E7B5C'; // Green
    if (v >= 0.65) return '#F4D03F'; // Amber
    return '#C44536'; // Red
  };

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayValue * (circumference / 2)); // Half circle gauge

  return (
    <div className="flex flex-col items-center p-6 glass-card w-full">
      <h4 className="font-serif text-xl text-charcoal/60 mb-6 italic">{label}</h4>
      
      <div className="relative w-48 h-28 flex items-center justify-center">
        <svg className="absolute top-0" viewBox="0 0 200 110" width="100%" height="100%">
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="transparent"
            stroke="#e6e2e0"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <motion.path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="transparent"
            stroke={getColor(displayValue)}
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: displayValue }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        
        <div className="absolute bottom-2 flex flex-col items-center z-10 bg-white/50 px-4 rounded-full backdrop-blur-sm">
          <div className="flex items-center gap-1">
            <span className="metric-number text-4xl font-bold text-charcoal">
              {Math.round(displayValue * 100)}
            </span>
            <span className="w-2 h-2 rounded-full bg-sage animate-pulse" />
          </div>
        </div>
      </div>

      <div className="mt-8 w-full h-20 bg-charcoal/5 rounded-lg overflow-hidden border border-charcoal/5">
        <canvas 
          ref={canvasRef} 
          width={240} 
          height={80} 
          className="w-full h-full ink-bleed opacity-60"
        />
      </div>
      <p className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest mt-2">12-Week Trend</p>
    </div>
  );
}
