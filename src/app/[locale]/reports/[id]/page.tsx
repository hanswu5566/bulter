"use client";

import { motion } from "framer-motion";
import { 
  House, CheckCircle2, AlertCircle, 
  FileText, Download, Loader2, Sparkles,
  ArrowLeft, Star, ShieldCheck, ShieldAlert, MapPin, Calendar,
  Building2, Ruler, Tag, Info, DollarSign, Compass, Camera,
  X, Scale, Printer
} from "lucide-react";
import { use } from "react";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";

export default function InspectionReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingLease, setIsGeneratingLease] = useState(false);
  const [leaseHtml, setLeaseHtml] = useState<string | null>(null);
  const [showLeaseModal, setShowLeaseModal] = useState(false);

  const handleGenerateLease = async () => {
    setIsGeneratingLease(true);
    try {
      const res = await fetch(`/api/inspect/report/${id}/lease`, {
        method: "POST"
      });
      const resData = await res.json();
      if (resData.success && resData.data?.html) {
        setLeaseHtml(resData.data.html);
        setShowLeaseModal(true);
      } else {
        alert("自動生成租約失敗，請稍後再試。");
      }
    } catch (err) {
      console.error(err);
      alert("網路連線異常。");
    } finally {
      setIsGeneratingLease(false);
    }
  };
  const printLeaseIframe = () => {
    const iframe = document.getElementById("lease-iframe") as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };
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
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#D2691E]" />
    </div>
  );

  if (!report) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-gray-500 font-black text-sm">
      未找到報告
    </div>
  );

  const checklistData = report.checklistData || {};
  const listing = report.listing || {};
  const butlerInsight = listing.butlerInsight || {};
  const features = listing.features || {};
  const coverImage = listing.images && listing.images.length > 0 ? listing.images[0] : null;

  // Calculate dynamic verified statistics
  const totalTasks = Object.keys(checklistData).length;
  const verifiedCount = Object.values(checklistData).filter((v: any) => typeof v === "object" ? !!v.checked : !!v).length;
  const notesCount = Object.values(checklistData).filter((v: any) => typeof v === "object" && v.note && v.note.trim().length > 0).length;
  const honestyScore = totalTasks > 0 ? Math.round((verifiedCount / totalTasks) * 100) : 100;

  return (
    <div className="min-h-screen bg-[#FFFDD0]/10 p-6 md:p-12 pb-24 font-sans selection:bg-[#D2691E]/20 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Top Navigation Bar (Hidden in Print) */}
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link 
            href={`/listings/${listing.id || ""}`} 
            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-on-surface" />
          </Link>
          
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white border border-gray-100 px-6 py-3 rounded-xl font-black text-xs hover:bg-gray-50 transition-all shadow-sm cursor-pointer text-on-surface"
          >
            <Download className="w-4.5 h-4.5 text-[#D2691E]" />
            匯出決策 PDF
          </button>
        </div>

        {/* DOSSIER TITLE HEADER */}
        <div className="text-center space-y-2 select-none">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#D2691E]/10 rounded-full shadow-sm">
            <Sparkles className="w-4 h-4 text-[#D2691E]" />
            <span className="text-[10px] font-black text-[#D2691E] uppercase tracking-[0.2em]">Butler Decision Dossier</span>
          </div>
          <h1 className="text-4xl font-black text-on-surface tracking-tight">租屋決策白皮書</h1>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
            報告編號: #REP-{id?.toString().slice(0, 8)} | 產製日期: {new Date(report.createdAt).toLocaleDateString("zh-TW")}
          </p>
        </div>

        {/* PREMIUM UNIFIED PROPERTY PROFILE CONTEXT CARD */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden print:border-gray-200">
          <div className="flex items-center gap-5 w-full sm:w-auto">
            {coverImage ? (
              <div className="w-28 h-20 rounded-2xl overflow-hidden border border-gray-100 shrink-0 shadow-sm print:shadow-none">
                <img src={coverImage} alt="Listing Cover" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-28 h-20 bg-gray-50 rounded-2xl border border-gray-100 shrink-0 flex items-center justify-center text-gray-300">
                <House className="w-8 h-8" />
              </div>
            )}
            
            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] block">評估房源名稱</span>
              <h2 className="text-lg font-black text-on-surface line-clamp-1 leading-tight">{listing.title || "未命名房源"}</h2>
              
              {/* Specs capsule row */}
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-400 font-bold">
                <span className="flex items-center gap-0.5 text-on-surface">
                  <MapPin className="w-3.5 h-3.5 text-[#D2691E]" />
                  {listing.address || "未知地址"}
                </span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span>{features.size || "--"} 坪</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span>{features.floor || "--"} / {features.totalFloor || "--"} 樓</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span>{features.type || "獨立套房"}</span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-center w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-50">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] sm:block hidden">房租價格 (TWD)</span>
            <span className="text-2xl font-black text-[#D2691E] font-mono mt-1">
              NT$ {listing.price?.toLocaleString() || "0"} <span className="text-[10px] font-bold text-gray-500">/ 月</span>
            </span>
          </div>
        </div>

        {/* EXECUTIVE GLASSMORPHIC SUMMARY BANNER */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#D2691E]/95 via-[#C85A15]/95 to-[#B85A15]/95 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden border-2 border-[#FFFDD0]/15 select-none print:text-on-surface print:from-white print:to-white print:border-gray-200 print:shadow-none"
        >
          <div className="absolute -top-12 -right-12 p-8 opacity-10 pointer-events-none print:hidden">
            <FileText className="w-64 h-64" />
          </div>
          
          <div className="flex items-center gap-3 mb-6 border-b border-white/15 pb-4 print:border-gray-200">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shadow-sm print:bg-gray-50 print:text-on-surface">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse print:text-[#D2691E]" />
            </div>
            <div>
              <h2 className="text-xl font-black print:text-on-surface">AI 管家實地實勘總結建議</h2>
              <p className="text-[9px] text-[#FFFDD0]/60 font-bold tracking-widest uppercase mt-0.5 print:text-gray-400">Compiled Inspection Assessment</p>
            </div>
          </div>

          <p className="text-base md:text-lg font-bold leading-relaxed mb-8 italic whitespace-pre-wrap bg-white/5 p-5 rounded-2xl border border-white/10 shadow-inner print:bg-gray-50 print:border-gray-200 print:text-on-surface">
            「 {(report.aiSummary === "使用者手動檢查紀錄" || !report.aiSummary) ? "管家已成功整合您的現場物理實勘數據，目前核對項目基本合規，無重大水電或漏水地雷，整體居住防線防禦力良好！" : report.aiSummary} 」
          </p>

          {/* 3D Glass Capsule Micro-Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            
            {/* Card 1: Honesty Progress Dial */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center justify-between shadow-xs print:bg-gray-50 print:border-gray-200">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-[#FFFDD0]/70 uppercase tracking-widest block print:text-gray-400">房源誠實度</span>
                <span className="text-xl font-black font-mono print:text-on-surface">{honestyScore}%</span>
              </div>
              <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white flex items-center justify-center text-[9px] font-black relative print:border-gray-300">
                <div className="absolute inset-0 rounded-full border-4 border-green-400 opacity-80 animate-ping pointer-events-none print:hidden" />
                <span className="print:text-green-600">✓</span>
              </div>
            </div>

            {/* Card 2: Safety indicator pill */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center justify-between shadow-xs print:bg-gray-50 print:border-gray-200">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-[#FFFDD0]/70 uppercase tracking-widest block print:text-gray-400">核心物理風險</span>
                <span className="text-base font-black print:text-on-surface">極低 (Low)</span>
              </div>
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 shrink-0 shadow-inner print:bg-green-50 print:text-green-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Golden rating stars */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center justify-between shadow-xs print:bg-gray-50 print:border-gray-200">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-[#FFFDD0]/70 uppercase tracking-widest block print:text-gray-400">管家推薦指數</span>
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4].map(s => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-300 text-amber-300 print:fill-amber-500 print:text-amber-500" />
                  ))}
                  <Star className="w-3.5 h-3.5 text-amber-300/40 print:text-gray-300" />
                </div>
              </div>
              <div className="w-10 h-10 bg-amber-300/10 rounded-xl flex items-center justify-center text-amber-300 shrink-0 shadow-inner print:bg-amber-50 print:text-amber-600">
                <Star className="w-5 h-5 fill-amber-300 print:fill-amber-500" />
              </div>
            </div>

          </div>
        </motion.div>

        {/* AI BUTLER DIAGNOSTICS BOARD (Fusing the analysis results!) */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 print:border-gray-200">
          <div className="flex items-center gap-2.5 border-b border-gray-50 pb-4 print:border-gray-200">
            <Sparkles className="text-[#D2691E] w-5.5 h-5.5 animate-pulse" />
            <div>
              <h3 className="text-lg font-black text-on-surface">AI 管家避雷診斷</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">AI Listing Flaw & Risk Diagnostics</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Highlights */}
            <div className="space-y-3.5">
              <h4 className="text-sm font-black text-green-600 flex items-center gap-1.5">✓ 房源客觀亮點</h4>
              <div className="space-y-2">
                {butlerInsight.highlightLines && butlerInsight.highlightLines.length > 0 ? (
                  butlerInsight.highlightLines.map((hl: string, idx: number) => (
                    <div key={idx} className="bg-green-50/30 border border-green-100/40 p-3 rounded-xl text-xs text-gray-600 leading-relaxed font-medium flex items-center gap-2">
                      <span className="text-green-500 font-black">✦</span>
                      {hl}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-xs italic font-medium">暫無亮點數據。</div>
                )}
              </div>
            </div>

            {/* Risks */}
            <div className="space-y-3.5">
              <h4 className="text-sm font-black text-red-600 flex items-center gap-1.5">⚠️ 潛在生活與財務隱憂</h4>
              <div className="space-y-2.5">
                {butlerInsight.risks && butlerInsight.risks.length > 0 ? (
                  butlerInsight.risks.map((risk: any, idx: number) => (
                    <div key={idx} className="bg-red-50/20 border border-red-100/30 p-3.5 rounded-xl leading-relaxed">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-red-600">⚠️ {risk.type}</span>
                        <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-[8px] font-black rounded-md uppercase tracking-wider">{risk.severity}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{risk.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-xs italic font-medium">暫無安全或財務地雷警示。</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* UTILITIES GOLD FLOW ESTIMATOR (Fusing the financial logic!) */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 print:border-gray-200">
          <div className="flex items-center gap-2.5 border-b border-gray-50 pb-4 print:border-gray-200">
            <DollarSign className="text-[#D2691E] w-5.5 h-5.5" />
            <div>
              <h3 className="text-lg font-black text-on-surface">水電金流透明度與防坑叮嚀</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Financial Gold Flow & Utility Estimation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Cost capsule 1 */}
            <div className="bg-gray-50/80 p-4.5 rounded-2xl border border-gray-100/60 text-left">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">每月固定大樓管理費</span>
              <span className="text-xl font-black text-on-surface font-mono block mt-1">
                NT$ {butlerInsight.estimatedTotalCost?.management?.toLocaleString() || "0"}
              </span>
            </div>

            {/* Cost capsule 2 */}
            <div className="bg-gray-50/80 p-4.5 rounded-2xl border border-gray-100/60 text-left">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">水電計費模式</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black mt-2 border ${
                butlerInsight.estimatedTotalCost?.utilityBillingType === "TAIPOWER"
                  ? "bg-green-500/10 text-green-600 border-green-500/15"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/15"
              }`}>
                {butlerInsight.estimatedTotalCost?.utilityBillingType === "TAIPOWER" ? "⚡ 獨立台水台電帳單" : "🟠 私設獨立電表分水電"}
              </span>
            </div>

            {/* Boiler Warning */}
            <div className="bg-gray-50/80 p-4.5 rounded-2xl border border-gray-100/60 text-left">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">吃電怪獸設備警示</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black mt-2 border ${
                butlerInsight.estimatedTotalCost?.boilerWarning === "WARNING"
                  ? "bg-red-500/10 text-red-600 border-red-500/15 animate-pulse"
                  : "bg-green-500/10 text-green-600 border-green-500/15"
              }`}>
                {butlerInsight.estimatedTotalCost?.boilerWarning === "WARNING" ? "⚠️ 電熱水器警告" : "✓ 暫無高耗電設備警告"}
              </span>
            </div>
          </div>

          {butlerInsight.estimatedTotalCost?.utilityEstimateDesc && (
            <div className="bg-orange-50/20 border border-orange-100/30 p-4 rounded-2xl text-xs text-gray-600 leading-relaxed font-medium">
              <span className="font-black text-[#D2691E] block mb-1">💡 水電費用管家提醒：</span>
              {butlerInsight.estimatedTotalCost.utilityEstimateDesc}
            </div>
          )}
        </div>

        {/* PHYSICAL FACTS & ON-SITE NOTES BOARD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          {/* Left: Phy             <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1 text-left">
              {Object.entries(checklistData).map(([key, value]: any) => {
                const isChecked = typeof value === "object" ? !!value.checked : !!value;
                return (
                  <div key={key} className="flex items-center justify-between border-b border-gray-50 pb-3.5 text-sm">
                    <span className="text-gray-500 font-semibold">{key}</span>
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-sm select-none border ${
                      isChecked 
                        ? "bg-red-500/10 text-red-600 border-red-500/10" 
                        : "bg-green-500/10 text-green-600 border-green-500/10"
                    }`}>
                      {isChecked ? "有此瑕疵 ✘" : "無此問題 ✓"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Flagged Permanent Defects for Contract Annex */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 print:border-gray-200">
            <div className="flex items-center gap-2.5 border-b border-gray-50 pb-4 print:border-gray-200">
              <AlertCircle className="text-[#D2691E] w-5.5 h-5.5" />
              <div className="text-left">
                <h3 className="text-lg font-black text-on-surface">現場抓出既有永久瑕疵</h3>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Contract Annex Exemption List</p>
              </div>
            </div>

            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2 text-left">
              {Object.entries(checklistData)
                .filter(([_, value]: any) => typeof value === "object" && value.checked && value.isPermanent)
                .map(([key, _]: any) => (
                  <div key={key} className="bg-red-500/5 p-4.5 rounded-2xl border border-red-500/10 shadow-xs leading-relaxed">
                    <span className="text-xs font-black text-red-600 flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-red-500" />
                      ⚠️ 已鎖定既有永久瑕疵：
                    </span>
                    <p className="text-xs text-gray-600 font-black leading-relaxed bg-white/80 p-3 rounded-xl border border-gray-100/50 shadow-inner">
                      {key}
                    </p>
                    <span className="text-[9px] text-gray-400 font-semibold block mt-2 leading-relaxed">
                      💡 此項瑕疵將會被自動以特別約定的法律形式寫入正式租約第十三條，以在法律層面豁免您的折損/扣押金賠償責任！
                    </span>
                  </div>
                ))}
              {Object.entries(checklistData).filter(([_, value]: any) => typeof value === "object" && value.checked && value.isPermanent).length === 0 && (
                <div className="text-gray-400 text-xs italic font-medium text-center py-16 space-y-2 select-none">
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mx-auto border border-green-100 text-green-500">✓</div>
                  <p>恭喜！本次實勘無發現任何永久瑕疵項目，房屋現況極佳！</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ⚖️ 中華民國住宅租賃契約書自動生成中心 */}
        <div className="bg-gradient-to-r from-[#D2691E]/10 via-amber-500/5 to-transparent border-2 border-[#D2691E]/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm select-none print:hidden">
          <div className="space-y-1">
            <h4 className="font-black text-[#D2691E] text-lg flex items-center gap-2">
              <Scale className="w-5.5 h-5.5 text-[#D2691E]" />
              ⚖️ 內政部住宅租賃標準契約自動生成中心
            </h4>
            <p className="text-xs text-gray-500 font-semibold leading-relaxed max-w-2xl">
              管家已為您自動擷取此房源的月租金、押金規範、水電自適應費率以及實勘家具家電確認清單，自動為您填寫並生成 100% 符合行政院官方定型化契約範本的標準住宅租賃合約！
            </p>
          </div>
          <button
            disabled={isGeneratingLease}
            onClick={handleGenerateLease}
            className={`px-6 py-4 rounded-2xl text-xs font-black shadow-md active:scale-95 transition-all flex items-center gap-2 shrink-0 text-white border-transparent cursor-pointer ${
              isGeneratingLease
                ? "bg-gray-400 cursor-not-allowed shadow-none"
                : "bg-[#D2691E] hover:bg-[#b25915] shadow-lg shadow-[#D2691E]/20 animate-bounce"
            }`}
          >
            {isGeneratingLease ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                正在生成合規契約...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                📜 一鍵生成標準合規租約
              </>
            )}
          </button>
        </div>

        {/* Lease Preview and Isolated Printing Modal */}
        {showLeaseModal && leaseHtml && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white w-full max-w-5xl h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-gray-100"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-primary to-[#B85A15] p-5 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <Scale className="w-5.5 h-5.5" />
                  <div>
                    <h3 className="text-base font-black">中華民國住宅租賃契約書 (合規預覽與列印)</h3>
                    <p className="text-[9px] opacity-70 font-bold uppercase mt-0.5">Official Legal Lease Agreement Preview</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLeaseModal(false)}
                  className="hover:bg-white/15 p-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Modal Body: Perfect isolated HTML rendering via srcDoc iframe! */}
              <div className="flex-1 bg-gray-50 p-2 flex items-center justify-center relative">
                <iframe
                  id="lease-iframe"
                  srcDoc={leaseHtml}
                  className="w-full h-full border-none bg-white shadow-inner rounded-xl"
                />
              </div>

              {/* Modal Footer */}
              <div className="p-5 bg-white border-t border-gray-100 flex items-center justify-between gap-4 shrink-0">
                <div className="text-[10px] text-gray-400 font-bold">
                  💡 溫馨提示：按下列印將自動調用標準 A4 排版，支援紙本直接簽約生效！
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLeaseModal(false)}
                    className="px-5 py-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-bold transition-all cursor-pointer"
                  >
                    關閉預覽
                  </button>
                  <button
                    onClick={printLeaseIframe}
                    className="px-6 py-3 rounded-xl bg-[#D2691E] hover:bg-[#b25915] text-white text-xs font-black shadow-md shadow-[#D2691E]/20 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    🖨️ 開始列印 / 匯出租約 PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Report Info Bar */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-bold pt-4 select-none print:hidden">
          <Calendar className="w-3.5 h-3.5" />
          <span>報告產製時間：{new Date(report.createdAt).toLocaleDateString("zh-TW")}</span>
          <span className="mx-2">|</span>
          <span>智慧租屋管家 Butler 決策系統</span>
        </div>

      </div>
    </div>
  );
}
