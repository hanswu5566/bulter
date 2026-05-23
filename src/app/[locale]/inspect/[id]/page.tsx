"use client";

import { useState, use, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, ChevronRight, Volume2, Droplets, 
  ShieldAlert, Loader2, MessageSquare, ArrowLeft, 
  Sparkles, ListChecks, Info, FileText, PenTool
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";

const SCENARIOS = [
  {
    id: "noise",
    title: "隔音與周邊環境瑕疵",
    description: "請關閉室內所有窗戶，靜聽 1 分鐘，勾選現場存在的環境硬傷。",
    icon: Volume2,
    tasks: [
      { label: "氣密窗緊閉時仍有明顯窗外車流噪音", isPermanent: true },
      { label: "走道或鄰房有明顯人聲、電視回音雜音", isPermanent: true },
      { label: "大樓內部有低頻共振運轉聲 (如水箱/發電機)", isPermanent: true },
      { label: "臥室或衛浴 4G/5G 行動網路收訊強度微弱 (小於2格)", isPermanent: true }
    ]
  },
  {
    id: "structure",
    title: "水電機能與結構瑕疵",
    description: "現場實測現場水電機能，勾選現狀有損壞或隱憂的項目。",
    icon: Droplets,
    tasks: [
      { label: "淋浴間冷熱水壓偏低，或熱水出水忽冷忽熱", isPermanent: false },
      { label: "天花板/牆面/窗框有滲漏水、壁癌或霉斑痕跡", isPermanent: true },
      { label: "浴室地漏排水流速極慢有積水，或馬桶沖水不順暢", isPermanent: false },
      { label: "廚房/客廳無三孔接地插座 (高功率電器有漏電隱憂)", isPermanent: true },
      { label: "牆面或木地板有受潮變形、大面積刮痕或毀損", isPermanent: true },
      { label: "玻璃窗有龜裂，或紗窗破損紗網脫落", isPermanent: false }
    ]
  },
  {
    id: "safety",
    title: "安全消防與防盜瑕疵",
    description: "核對逃生與安全設施，勾選有缺漏的項目。",
    icon: ShieldAlert,
    tasks: [
      { label: "現場無滅火器，或滅火器過期、指針不在綠色安全區", isPermanent: false },
      { label: "現場無住警器/防煙面罩，或設備已損壞", isPermanent: false },
      { label: "安全通道/安全梯/後陽台堆放雜物影響逃生", isPermanent: false },
      { label: "大門門鎖防盜功能損壞，或無法順暢上鎖", isPermanent: false }
    ]
  }
];

export default function InspectionFlow({ params }: { params: Promise<{ id: string }> }) {
  const { id: listingId } = use(params);
  const t = useTranslations("Inspection");
  const router = useRouter();
  const [activeScenario, setActiveScenario] = useState<number | null>(null);
  const [taskData, setTaskData] = useState<Record<string, { checked: boolean, isPermanent: boolean }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [aiPoints, setAiPoints] = useState<any[]>([]);
  const [loadingAi, setLoadingAi] = useState(true);

  useEffect(() => {
    fetch("/api/ai/inspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId })
    })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data?.points) {
          setAiPoints(res.data.points);
        }
        setLoadingAi(false);
      })
      .catch(err => {
        console.error("Failed to fetch AI inspection points", err);
        setLoadingAi(false);
      });
  }, [listingId]);

  useEffect(() => {
    // Fetch existing report to pre-fill edit mode!
    fetch(`/api/listings/${listingId}?t=${Date.now()}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data?.reports && res.data.reports.length > 0) {
          const rep = res.data.reports[0];
          if (rep.checklistData) {
            setTaskData(rep.checklistData);
          }
        }
      })
      .catch(err => console.error("Failed to fetch existing report for edit pre-fill:", err));
  }, [listingId]);

  const toggleTask = (taskLabel: string, isPermanent: boolean) => {
    setTaskData(prev => {
      const isCurrentlyChecked = !!prev[taskLabel]?.checked;
      return {
        ...prev,
        [taskLabel]: { 
          checked: !isCurrentlyChecked, 
          isPermanent
        }
      };
    });
  };

  const currentScenario = activeScenario !== null ? SCENARIOS[activeScenario] : null;

  const handleSubmitReport = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/inspect/report", {
        method: "POST",
        body: JSON.stringify({
          listingId,
          checklistData: taskData,
          aiSummary: "使用者手動檢查紀錄",
          status: "COMPLETED"
        }),
        headers: { "Content-Type": "application/json" },
      });
      
      if (!res.ok) throw new Error("Failed to submit report");
      router.push(`/listings/${listingId}?tab=inspect`);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDD0]/10 font-sans pb-32 selection:bg-[#D2691E]/20">
      <div className="max-w-6xl mx-auto p-6 md:p-12">
        
        {/* Header */}
        <header className="mb-12 flex items-center justify-between">
          <Link href={`/listings/${listingId}`} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition-all shadow-sm cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-on-surface" />
          </Link>
          <div className="flex items-center gap-2 px-4 py-2 bg-[#D2691E]/10 rounded-full shadow-sm select-none">
            <Sparkles className="w-4 h-4 text-[#D2691E]" />
            <span className="text-[10px] font-black text-[#D2691E] tracking-wider uppercase">On-site Inspection</span>
          </div>
        </header>

        {activeScenario === null ? (
          /* WELCOME DASHBOARD / LANDING VIEW */
          <div className="max-w-2xl mx-auto bg-white p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8 text-center select-none">
            <div className="w-20 h-20 bg-[#D2691E]/10 rounded-3xl flex items-center justify-center mx-auto text-[#D2691E]">
              <ListChecks className="w-10 h-10" />
            </div>

            <div className="space-y-2.5">
              <h1 className="text-3xl font-black text-on-surface leading-tight">隨管家出發實地看房</h1>
              <p className="text-xs text-gray-500 leading-relaxed max-w-md mx-auto">
                本清單已結合「管家 AI 避雷評估」抓出的潛在隱憂，為您量身客製出這份實勘事實核對卡。請至看房現場逐項核對。
              </p>
            </div>

            {/* AI Recommended Highlights */}
            {aiPoints.length > 0 && (
              <div className="bg-[#D2691E]/5 border border-[#D2691E]/10 p-5 rounded-2xl text-left space-y-3">
                <h4 className="text-xs font-black text-[#D2691E] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  💡 實勘前管家特別提醒：
                </h4>
                <div className="space-y-2">
                  {aiPoints.slice(0, 2).map((pt: any, idx: number) => (
                    <div key={idx} className="text-[10px] text-gray-600 font-semibold leading-relaxed flex items-start gap-2 bg-white/80 p-3 rounded-xl border border-gray-100/50">
                      <span className="text-amber-500">✦</span>
                      <div>
                        <span className="font-black text-on-surface block mb-0.5">{pt.title}</span>
                        {pt.advice}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={() => setActiveScenario(0)}
              className="w-full bg-[#D2691E] hover:bg-[#b25915] text-white py-4.5 rounded-2xl font-black text-xs shadow-lg shadow-[#D2691E]/10 active:scale-98 transition-all cursor-pointer block text-center"
            >
              🚀 隨管家開始實地檢驗
            </button>
          </div>
        ) : currentScenario ? (
          <AnimatePresence mode="wait">
            {/* DETAILED STEPPED CHECKLIST EDITING VIEW */}
            <motion.div
              key={currentScenario.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-[#D2691E]/10 rounded-2xl flex items-center justify-center text-[#D2691E] shadow-xs shrink-0">
                    <currentScenario.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-on-surface">{currentScenario.title}</h2>
                    <p className="text-gray-500 text-xs leading-relaxed mt-1 font-medium">{currentScenario.description}</p>
                  </div>
                </div>
                
                {/* Clickable progress step bubbles */}
                <div className="flex items-center gap-2.5 select-none self-start sm:self-center">
                  {SCENARIOS.map((sc, index) => (
                    <button
                      key={sc.id}
                      onClick={() => setActiveScenario(index)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-300 cursor-pointer active:scale-90 ${
                        activeScenario === index
                          ? "bg-[#D2691E] text-white shadow-md shadow-[#D2691E]/20 hover:scale-105"
                          : "bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100 hover:text-gray-600"
                      }`}
                      title={sc.title}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* COMPACT SELECTABLE CHECKLIST ROWS */}
              <div className="space-y-4">
                {currentScenario.tasks.map((task) => {
                  const isChecked = !!taskData[task.label]?.checked;

                  return (
                    <div 
                      key={task.label} 
                      onClick={() => toggleTask(task.label, task.isPermanent)}
                      className={`rounded-2xl border p-5 flex items-center justify-between gap-4 cursor-pointer select-none transition-all hover:shadow-md active:scale-99 ${
                        isChecked 
                          ? "bg-red-50/30 border-red-200 shadow-sm" 
                          : "bg-white border-gray-100 shadow-sm hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1">
                        {/* Custom Checkbox (Red/Warning color if checked to flag the defect!) */}
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                          isChecked ? "bg-red-500 border-red-500 shadow-xs animate-pulse" : "border-gray-200 bg-white"
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="text-left">
                          <span className={`font-black text-sm leading-snug block ${isChecked ? "text-red-700" : "text-gray-600"}`}>
                            {task.label}
                          </span>
                          <span className="text-[9px] text-gray-400 font-bold mt-1 uppercase tracking-wider block">
                            {task.isPermanent ? "⚠️ 既有永久瑕疵 (將列入合約免責約定)" : "🔧 可修繕系統項目"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* FOOTER NAVIGATION CONTROLLER */}
              <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 flex justify-between items-center gap-4 z-40">
                <button 
                  onClick={() => activeScenario === 0 ? setActiveScenario(null) : setActiveScenario(prev => (prev ?? 0) - 1)}
                  className="bg-white border border-gray-200 text-on-surface px-6 py-3.5 rounded-xl text-xs font-black hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  返回上一步
                </button>
                
                {activeScenario === SCENARIOS.length - 1 ? (
                  <button 
                    onClick={handleSubmitReport}
                    disabled={submitting}
                    className="bg-primary text-white px-8 py-3.5 rounded-xl text-xs font-black shadow-lg hover:bg-[#b25915] disabled:bg-gray-300 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        儲存中...
                      </>
                    ) : (
                      "✓ 完成實地實勘"
                    )}
                  </button>
                ) : (
                  <button 
                    onClick={() => setActiveScenario(prev => (prev ?? 0) + 1)}
                    className="bg-[#D2691E] text-white px-8 py-3.5 rounded-xl text-xs font-black shadow-md hover:bg-[#b25915] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    下一單元
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}

      </div>
    </div>
  );
}
