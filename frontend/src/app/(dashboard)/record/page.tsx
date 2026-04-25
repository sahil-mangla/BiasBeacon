'use client';

import { useState } from 'react';
import Modal from "@/components/ui/Modal";

export default function Record() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const generateReport = () => {
    setIsGenerating(true);
    setShowSuccess(false);
    setTimeout(() => {
      setIsGenerating(false);
      setShowSuccess(true);
    }, 3000);
  };

  const reports = [
    { id: "AR-2024-001", date: "March 12, 2024", type: "Quarterly Ethics Audit", status: "Certified", impact: "+1,240 Lives" },
    { id: "AR-2023-042", date: "December 15, 2023", type: "Annual Fairness Review", status: "Certified", impact: "+4,800 Lives" },
    { id: "AR-2023-031", date: "September 08, 2023", type: "Compliance Snapshot", status: "Archived", impact: "+820 Lives" }
  ];

  return (
    <div className="p-12 pb-32 max-w-5xl mx-auto">
      <div className="mb-12 flex justify-between items-end">
        <div>
          <span className="font-sans font-bold text-[10px] tracking-widest text-charcoal/50 bg-cream px-3 py-1 rounded-full uppercase">Archives</span>
          <h1 className="font-serif text-5xl text-charcoal mt-4">The Record</h1>
          <p className="font-serif text-charcoal/60 italic mt-2 text-xl">A permanent ledger of our commitment to equity.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-charcoal text-white px-8 py-3 rounded-xl font-serif text-lg hover:scale-105 transition-all shadow-lg flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add_notes</span>
          Generate New Audit
        </button>
      </div>

      <div className="bg-cream rounded-2xl border border-charcoal/5 shadow-organic overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/50 border-b border-charcoal/5">
              <th className="p-6 font-sans font-bold text-[10px] tracking-widest text-charcoal/40 uppercase">Report ID</th>
              <th className="p-6 font-sans font-bold text-[10px] tracking-widest text-charcoal/40 uppercase">Date</th>
              <th className="p-6 font-sans font-bold text-[10px] tracking-widest text-charcoal/40 uppercase">Type</th>
              <th className="p-6 font-sans font-bold text-[10px] tracking-widest text-charcoal/40 uppercase">Status</th>
              <th className="p-6 font-sans font-bold text-[10px] tracking-widest text-charcoal/40 uppercase text-right">Human Impact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-white/30 transition-colors cursor-pointer group">
                <td className="p-6 font-sans text-sm text-charcoal/60">{report.id}</td>
                <td className="p-6 font-serif text-lg text-charcoal">{report.date}</td>
                <td className="p-6 font-serif text-lg text-charcoal italic">{report.type}</td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${report.status === 'Certified' ? 'bg-sage/10 text-sage' : 'bg-charcoal/5 text-charcoal/40'}`}>
                    {report.status}
                  </span>
                </td>
                <td className="p-6 text-right font-serif text-xl text-sage">{report.impact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-12 p-8 bg-sage/5 rounded-3xl border border-dashed border-sage/20 text-center">
         <p className="font-serif text-xl text-charcoal/60 italic">"The record does not just measure compliance; it honors the human lives behind the data points."</p>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setShowSuccess(false); }}
        title="Generate Audit Report"
      >
        <div className="space-y-8 text-center py-4">
          {!isGenerating && !showSuccess && (
            <>
              <p className="font-serif text-xl text-charcoal/70 italic">
                Are you ready to commit this snapshot of fairness to the permanent record?
              </p>
              <div className="space-y-4">
                <button 
                  onClick={generateReport}
                  className="w-full py-4 bg-charcoal text-white rounded-xl font-serif text-xl"
                >
                  Confirm & Generate PDF
                </button>
                <p className="text-[10px] text-charcoal/30 font-bold uppercase tracking-widest">
                  This process includes metric validation and cryptographic signing.
                </p>
              </div>
            </>
          )}

          {isGenerating && (
            <div className="space-y-6 animate-pulse">
               <span className="material-symbols-outlined text-6xl text-sage animate-spin">history_edu</span>
               <h3 className="font-serif text-3xl text-charcoal italic">Compiling the truth...</h3>
               <div className="w-full h-1 bg-charcoal/5 rounded-full overflow-hidden max-w-xs mx-auto">
                  <div className="h-full bg-sage animate-infinite-loading"></div>
               </div>
            </div>
          )}

          {showSuccess && (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
               <span className="material-symbols-outlined text-6xl text-sage">verified</span>
               <h3 className="font-serif text-3xl text-sage italic">Report Certified</h3>
               <p className="font-sans text-charcoal/70">The report **AR-2024-002** has been generated and signed.</p>
               <button className="w-full py-4 bg-sage text-white rounded-xl font-serif text-xl">
                  Download Report
               </button>
            </div>
          )}
        </div>
        <p className="font-sans text-[10px] font-bold text-charcoal/30 uppercase tracking-widest mt-6 text-center">
          Secure Immutable Audit Log Active
        </p>
      </Modal>
    </div>
  );
}
