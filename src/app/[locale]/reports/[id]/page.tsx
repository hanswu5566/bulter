"use client";

import { motion } from "framer-motion";
import { 
  House, CheckCircle2, AlertCircle, 
  FileText, Download, Loader2, Sparkles 
} from "lucide-react";
import { use } from "react";
import { useEffect, useState } from "react";

export default function InspectionReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/inspect/report/${id}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setReport(res.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!report) return (
    <div className="min-h-screen bg-surface flex items-center justify-center text-gray-500">
      未找到報告
    </div>
  );

  const checklistData = report.checklistData || {};

  return (
    <div className="min-h-screen bg-surface p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Report Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg">
              <House className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-on-surface">智慧實勘報告</h1>
              <p className="text-gray-500 font-medium">編號: #REP-{id?.toString().slice(0, 8)}</p>
            </div>
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white border border-gray-100 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm print:hidden"
          >
            <Download className="w-5 h-5 text-primary" />
            匯出 PDF
          </button>
        </div>

        {/* Butler Summary Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary p-8 rounded-[2.5rem] text-white shadow-2xl mb-12 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <FileText className="w-40 h-40" />
          </div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <House className="w-6 h-6" />
            管家總結建議
          </h2>
          <p className="text-lg leading-relaxed mb-8 italic whitespace-pre-wrap">
            「{report.aiSummary || "管家正在分析您的看房記錄..."}」
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-8 border-t border-white/20">
            <div>
              <div className="text-xs opacity-70 mb-1 font-bold uppercase tracking-wider">房源誠實度</div>
              <div className="text-2xl font-black">92%</div>
            </div>
            <div>
              <div className="text-xs opacity-70 mb-1 font-bold uppercase tracking-wider">核心風險</div>
              <div className="text-2xl font-black">低 (Low)</div>
            </div>
            <div>
              <div className="text-xs opacity-70 mb-1 font-bold uppercase tracking-wider">推薦指數</div>
              <div className="text-2xl font-black">★★★★☆</div>
            </div>
          </div>
        </motion.div>

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Physical Facts */}
          <div className="butler-card bg-white">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 className="text-success w-5 h-5" />
              物理事實驗證
            </h3>
            <div className="space-y-4">
              {Object.entries(checklistData).map(([key, value]: any) => (
                <div key={key} className="flex justify-between border-b border-gray-50 pb-3">
                  <span className="text-gray-500">{key}</span>
                  <span className={`font-bold ${value ? "text-success" : "text-gray-400"}`}>
                    {value ? "已驗證" : "待確認"}
                  </span>
                </div>
              ))}
              {Object.keys(checklistData).length === 0 && (
                <div className="text-gray-400 text-sm italic">無細項數據。</div>
              )}
            </div>
          </div>

          {/* AI Visual Findings */}
          <div className="butler-card bg-white">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <AlertCircle className="text-primary w-5 h-5" />
              AI 視覺分析
            </h3>
            <div className="text-sm text-gray-500 italic whitespace-pre-wrap">
              {report.aiSummary ? "管家在分析中提到了一些值得注意的細節，請仔細閱讀上方的總結建議。" : "尚未產生視覺分析數據。"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
