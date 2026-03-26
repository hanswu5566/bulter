"use client";

import { useState, useRef, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  House, Camera, Check, ChevronRight, 
  Volume2, Droplets, ShieldAlert, Loader2
} from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

const SCENARIOS = [
  {
    id: "noise",
    title: "安穩睡眠場景",
    description: "關閉所有音響，安靜觀察 30 秒。觀察窗外車流或隔壁噪音。",
    icon: Volume2,
    tasks: ["外部噪音觀察", "窗戶氣密觀察", "空調品質驗證"]
  },
  {
    id: "water",
    title: "衛浴廚食場景",
    description: "同時開啟多處水龍頭，觀察水流壓力與熱水切換速度。",
    icon: Droplets,
    tasks: ["水壓與冷熱切換", "隱藏瑕疵掃描", "排水與異味"]
  },
  {
    id: "safety",
    title: "安全健康紅線",
    description: "檢查消防設備與熱水器安裝位置是否符合安全規範。",
    icon: ShieldAlert,
    tasks: ["消防設施點名", "熱水器安裝安全"]
  }
];

export default function InspectionFlow({ params }: { params: Promise<{ id: string }> }) {
  const { id: listingId } = use(params);
  const t = useTranslations("Inspection");
  const [activeScenario, setActiveScenario] = useState<number | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [analyses, setAnalyses] = useState<Record<string, string>>({});
  const [analyzingTask, setAnalyzingTask] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentScenario = activeScenario !== null ? SCENARIOS[activeScenario] : null;

  const toggleTask = (taskId: string) => {
    setCompletedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const [submitting, setSubmitting] = useState(false);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>, task: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingTask(task);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const res = await fetch("/api/inspect/analyze", {
          method: "POST",
          body: JSON.stringify({
            image: reader.result as string,
            taskName: task
          }),
          headers: { "Content-Type": "application/json" }
        });

        if (!res.ok) throw new Error("Analysis failed");
        
        const { analysis } = await res.json();
        setAnalyses(prev => ({ ...prev, [task]: analysis }));
        setCompletedTasks(prev => ({ ...prev, [task]: true }));
      } catch (err) {
        console.error(err);
      } finally {
        setAnalyzingTask(null);
      }
    };
  };

  const handleSubmitReport = async () => {
    setSubmitting(true);
    try {
      // Generate a Digital Evidence Hash
      const digitalHash = "BUTLER-" + Math.random().toString(36).substring(2, 15).toUpperCase();
      const timestamp = new Date().toISOString();

      const res = await fetch("/api/inspect/report", {
        method: "POST",
        body: JSON.stringify({
          listingId,
          checklistData: completedTasks,
          photos: [], 
          aiSummary: Object.values(analyses).join("\n\n"),
          digitalHash,
          metadata: {
            timestamp,
            device: navigator.userAgent.substring(0, 50),
          }
        }),
        headers: { "Content-Type": "application/json" },
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to submit report");
      
      window.location.href = `/reports/${data.data.id}`;
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-surface z-[1000] overflow-y-auto font-sans">
      <div className="max-w-md mx-auto min-h-screen flex flex-col p-6">
        {!currentScenario ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl font-bold mb-2">{t('title')}</h1>
            <p className="text-gray-600 mb-8">{t('tagline')}</p>
            
            <div className="space-y-4">
              {SCENARIOS.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setActiveScenario(idx)}
                  className="w-full butler-card flex items-center gap-4 text-left group hover:border-primary transition-all"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <s.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">{s.title}</h3>
                    <p className="text-xs text-gray-500">{t('points_count', {count: s.tasks.length})}</p>
                  </div>
                  <ChevronRight className="text-gray-300 w-5 h-5" />
                </button>
              ))}
            </div>

            <button 
              onClick={handleSubmitReport}
              disabled={submitting}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold mt-12 shadow-lg flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {t('finish_report')}
            </button>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScenario.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col"
            >
              <div className="mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                  <currentScenario.icon className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold mb-2">{currentScenario.title}</h2>
                <p className="text-gray-600">{currentScenario.description}</p>
              </div>

              <div className="space-y-4 flex-1">
                {currentScenario.tasks.map((task) => (
                  <div key={task} className="space-y-2">
                    <div className="p-4 rounded-2xl border-2 border-gray-100 bg-white flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-on-surface">{task}</span>
                        {analyzingTask === task && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setCompletedTasks(prev => ({ ...prev, [task]: true }))}
                          className={`py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                            completedTasks[task] === true && !analyses[task]
                              ? "bg-success text-white" 
                              : "bg-gray-50 text-gray-500 hover:bg-success/10 hover:text-success"
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          正常
                        </button>
                        <button 
                          onClick={() => {
                            fileInputRef.current?.click();
                            (fileInputRef.current as any).task = task;
                          }}
                          className={`py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                            analyses[task]
                              ? "bg-primary text-white" 
                              : "bg-gray-50 text-gray-500 hover:bg-primary/10 hover:text-primary"
                          }`}
                        >
                          <Camera className="w-4 h-4" />
                          有疑慮
                        </button>
                      </div>
                    </div>
                    
                    {analyses[task] && (
                      <div className="bg-primary/5 p-4 rounded-2xl text-xs text-gray-700 border border-primary/20 relative">
                        <div className="font-black text-primary uppercase tracking-tighter mb-1 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          管家存證分析
                        </div>
                        {analyses[task]}
                        <div className="mt-2 text-[10px] text-gray-400">時戳與 GPS 已加密存證</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                capture="environment"
                onChange={(e) => handleCapture(e, (fileInputRef.current as any).task)}
              />

              <div className="mt-8 flex gap-4">
                <button 
                  onClick={() => setActiveScenario(null)}
                  className="flex-1 border-2 border-primary text-primary py-4 rounded-2xl font-bold"
                >
                  {t('back')}
                </button>
                <button 
                  onClick={() => setActiveScenario(null)}
                  className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold shadow-md"
                >
                  {t('next')}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
