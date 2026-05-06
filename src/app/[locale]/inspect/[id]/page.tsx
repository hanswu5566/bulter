"use client";

import { useState, use, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, ChevronRight, Volume2, Droplets, 
  ShieldAlert, Loader2, MessageSquare, ArrowLeft, 
  Sparkles, ListChecks, Info
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";

const SCENARIOS = [
  {
    id: "noise",
    title: "安穩睡眠與隱私",
    description: "安靜觀察 30 秒。觀察窗外車流、鄰居走動或隔壁噪音。",
    icon: Volume2,
    tasks: ["外部交通噪音", "隔音牆/氣密窗品質", "鄰居進出聲量"]
  },
  {
    id: "water",
    title: "水電機能與結構",
    description: "同時開啟水龍頭，觀察水流壓力、排水速度與漏水痕跡。",
    icon: Droplets,
    tasks: ["冷熱水壓與流速", "天花板/牆角水漬痕跡", "排水孔是否通暢", "插座數量與位置"]
  },
  {
    id: "safety",
    title: "安全設施與動線",
    description: "檢查消防設備是否過期，以及逃生動線是否通暢。",
    icon: ShieldAlert,
    tasks: ["滅火器與偵煙器", "逃生出口/後陽台通暢", "門鎖品質與安全"]
  }
];

export default function InspectionFlow({ params }: { params: Promise<{ id: string }> }) {
  const { id: listingId } = use(params);
  const t = useTranslations("Inspection");
  const router = useRouter();
  const [activeScenario, setActiveScenario] = useState<number | null>(null);
  const [taskData, setTaskData] = useState<Record<string, { checked: boolean, note: string }>>({});
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

  const toggleTask = (task: string) => {
    setTaskData(prev => ({
      ...prev,
      [task]: { 
        checked: !prev[task]?.checked, 
        note: prev[task]?.note || "" 
      }
    }));
  };

  const updateNote = (task: string, note: string) => {
    setTaskData(prev => ({
      ...prev,
      [task]: { 
        checked: prev[task]?.checked || false, 
        note 
      }
    }));
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
      
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to submit report");
      
      router.push(`/reports`);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface font-sans pb-24">
      <div className="max-w-md mx-auto p-6">
        
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <Link href={`/listings/${listingId}`} className="p-2 -ml-2 text-gray-400 hover:text-on-surface">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Butler Guide</span>
          </div>
        </header>

        {!currentScenario ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-black text-on-surface mb-2">實地看房導引</h1>
            <p className="text-gray-500 text-sm mb-12">請隨我的引導檢查細節，這能幫助您在多個候選房源中做出最理性的選擇。</p>
            
            {/* Butler AI Dynamic Guide Points */}
            {aiPoints.length > 0 && (
              <div className="bg-primary/5 border-2 border-primary/20 p-6 rounded-[2rem] mb-8 space-y-4">
                <div className="flex items-center gap-2.5 text-primary">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-black text-base">💡 Butler 管家現場特別叮嚀</h3>
                </div>
                <div className="space-y-3 text-sm text-on-surface">
                  {aiPoints.map((point: any, idx: number) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-primary/10 shadow-sm leading-relaxed">
                      <span className="font-black text-primary mr-1">#{idx + 1} {point.title}：</span>
                      <span className="text-gray-600">{point.advice}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {SCENARIOS.map((s, idx) => {
                const completedCount = s.tasks.filter(t => taskData[t]?.checked).length;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveScenario(idx)}
                    className="w-full bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 text-left group hover:border-primary/30 transition-all"
                  >
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <s.icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-on-surface">{s.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden max-w-[60px]">
                           <div 
                             className="h-full bg-primary transition-all duration-500" 
                             style={{ width: `${(completedCount / s.tasks.length) * 100}%` }}
                           />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{completedCount}/{s.tasks.length} 已確認</p>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-200 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                );
              })}
            </div>

            <div className="mt-12 bg-on-surface p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
               <div className="relative z-10">
                 <h4 className="font-bold text-lg mb-2">檢查完畢？</h4>
                 <p className="text-xs text-gray-400 mb-8 leading-relaxed">您的紀錄將存入「決策清單」，我們會根據現場事實動態調整房源的最終評分。</p>
                 <button 
                  onClick={handleSubmitReport}
                  disabled={submitting || Object.keys(taskData).length === 0}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95 transition-all"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ListChecks className="w-5 h-5" />}
                  完成紀錄並產生報告
                </button>
               </div>
               <Sparkles className="absolute -bottom-8 -right-8 w-32 h-32 text-primary opacity-20" />
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScenario.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6 shadow-sm">
                  <currentScenario.icon className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black text-on-surface mb-2">{currentScenario.title}</h2>
                <p className="text-gray-500 text-sm leading-relaxed">{currentScenario.description}</p>
              </div>

              <div className="space-y-6">
                {currentScenario.tasks.map((task) => (
                  <div key={task} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div 
                      onClick={() => toggleTask(task)}
                      className="p-6 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        taskData[task]?.checked ? "bg-primary border-primary" : "border-gray-200"
                      }`}>
                        {taskData[task]?.checked && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <span className={`font-bold flex-1 ${taskData[task]?.checked ? "text-on-surface" : "text-gray-400"}`}>
                        {task}
                      </span>
                    </div>
                    
                    <div className="px-6 pb-6">
                      <div className="relative group">
                        <div className="absolute left-4 top-4 text-gray-300">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <textarea
                          placeholder="點擊紀錄現場細節或備註..."
                          value={taskData[task]?.note || ""}
                          onChange={(e) => updateNote(task, e.target.value)}
                          className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 min-h-[80px] resize-none text-on-surface"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-6 bg-surface/80 backdrop-blur-xl border-t border-gray-100 flex gap-4">
                <button 
                  onClick={() => setActiveScenario(null)}
                  className="flex-1 bg-white border border-gray-200 text-on-surface py-4 rounded-2xl font-black active:scale-95 transition-all shadow-sm"
                >
                  回總表
                </button>
                <button 
                  onClick={() => {
                    const nextIdx = (activeScenario ?? 0) + 1;
                    if (nextIdx < SCENARIOS.length) setActiveScenario(nextIdx);
                    else setActiveScenario(null);
                  }}
                  className="flex-1 bg-primary text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all shadow-primary/20"
                >
                  下一組項目
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
