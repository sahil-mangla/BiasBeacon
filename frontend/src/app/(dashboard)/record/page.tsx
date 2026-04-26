'use client';

import { useState, useEffect } from 'react';
import Modal from "@/components/ui/Modal";
import { API_BASE_URL, fetchFromApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function Record() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const steps = [
    "Computing metrics...",
    "Generating charts...",
    "Compiling EU Act mapping...",
    "Signing document..."
  ];

  const generateReport = async () => {
    setIsGenerating(true);
    setShowSuccess(false);
    
    // Simulate steps for UX
    for (let i = 0; i < steps.length; i++) {
      setGenerationStep(i);
      await new Promise(r => setTimeout(r, 800));
    }

    setIsGenerating(false);
    setShowSuccess(true);
  };

  const downloadPDF = async () => {
    try {
      const threshold = typeof window !== 'undefined' && localStorage.getItem('bias_threshold') ? localStorage.getItem('bias_threshold') : '0.80';
      const response = await fetch(`${API_BASE_URL}/api/audit-report?threshold=${threshold}`, {
        method: 'POST',
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BiasBeacon_Audit_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Failed to download PDF", err);
    }
  };

  const downloadFixScript = () => {
    window.location.href = `${API_BASE_URL}/generate_script?feature=years_at_current_address`;
  };

  const reports = [
    { id: "AR-2024-001", date: "March 12, 2024", type: "Quarterly Ethics Audit", status: "Certified", impact: "+1,240 Lives" },
    { id: "AR-2023-042", date: "December 15, 2023", type: "Annual Fairness Review", status: "Certified", impact: "+4,800 Lives" },
    { id: "AR-2023-031", date: "September 08, 2023", type: "Compliance Snapshot", status: "Archived", impact: "+820 Lives" }
  ];

  return (
    <div className="p-12 pb-32 max-w-7xl mx-auto space-y-12">
      <header className="flex justify-between items-end">
        <div>
          <span className="font-outfit font-bold text-[10px] tracking-widest text-charcoal/50 bg-cream px-3 py-1 rounded-full uppercase">Archives</span>
          <h1 className="headline-serif text-6xl text-charcoal mt-4">The Record</h1>
          <p className="font-outfit text-charcoal/60 text-lg mt-2 italic">A permanent ledger of our commitment to equity.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-charcoal text-white px-8 py-3 rounded-xl font-serif text-lg hover:scale-105 transition-all shadow-lg flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add_notes</span>
          Generate New Audit
        </button>
      </header>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-charcoal/[0.02] border-b border-charcoal/5">
              <th className="p-6 text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Report ID</th>
              <th className="p-6 text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Date</th>
              <th className="p-6 text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Type</th>
              <th className="p-6 text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Status</th>
              <th className="p-6 text-[10px] font-bold text-charcoal/40 uppercase tracking-widest text-right">Human Impact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-white/30 transition-colors cursor-pointer group">
                <td className="p-6 font-mono text-xs text-charcoal/60">{report.id}</td>
                <td className="p-6 headline-serif text-xl text-charcoal">{report.date}</td>
                <td className="p-6 font-outfit text-charcoal/60 italic">{report.type}</td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${report.status === 'Certified' ? 'bg-sage/10 text-sage' : 'bg-charcoal/5 text-charcoal/40'}`}>
                    {report.status}
                  </span>
                </td>
                <td className="p-6 text-right metric-number text-2xl text-sage">{report.impact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-l-4 border-sage pl-12 py-8 bg-cream/30 rounded-r-2xl italic">
        <p className="headline-serif text-3xl text-charcoal/70 leading-relaxed">
          "The record does not just measure compliance; it honors the human lives behind the data points."
        </p>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { if (!isGenerating) { setIsModalOpen(false); setShowSuccess(false); } }}
        title="Generate Audit Report"
      >
        <div className="space-y-10 text-center py-6">
          {!isGenerating && !showSuccess && (
            <>
              <p className="font-serif text-2xl text-charcoal/70 italic">
                Are you ready to commit this snapshot of fairness to the permanent record?
              </p>
              <div className="space-y-4">
                <button 
                  onClick={generateReport}
                  className="w-full py-5 bg-charcoal text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Confirm & Generate Report
                </button>
                <p className="text-[10px] text-charcoal/30 font-bold uppercase tracking-widest">
                  Process includes metric validation and cryptographic signing.
                </p>
              </div>
            </>
          )}

          {isGenerating && (
            <div className="space-y-8 py-10">
               <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 border-4 border-sage/20 border-t-sage rounded-full mx-auto"
               />
               <div className="space-y-3">
                 <h3 className="headline-serif text-3xl text-charcoal italic">{steps[generationStep]}</h3>
                 <div className="w-full h-1 bg-charcoal/5 rounded-full overflow-hidden max-w-xs mx-auto">
                    <motion.div 
                      className="h-full bg-sage"
                      initial={{ width: 0 }}
                      animate={{ width: `${(generationStep + 1) * 25}%` }}
                    />
                 </div>
               </div>
            </div>
          )}

          {showSuccess && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-8"
            >
               <div className="w-20 h-20 bg-sage/10 rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-5xl text-sage">verified</span>
               </div>
               <div className="space-y-2">
                 <h3 className="headline-serif text-4xl text-sage">Report Certified</h3>
                 <p className="text-charcoal/50 font-outfit">The report <span className="font-mono font-bold">AR-2025-001</span> has been signed and archived.</p>
               </div>
               
               <div className="space-y-4 pt-4">
                 <button 
                   onClick={downloadPDF}
                   className="w-full py-5 bg-charcoal text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                   <span className="material-symbols-outlined">download</span>
                   Download PDF Report
                 </button>
                 <button 
                   onClick={downloadFixScript}
                   className="w-full py-5 border border-charcoal/10 text-charcoal rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-white transition-all flex items-center justify-center gap-3"
                 >
                   <span className="material-symbols-outlined">code</span>
                   Download Mitigation Script
                 </button>
               </div>
            </motion.div>
          )}
        </div>
      </Modal>
    </div>
  );
}
