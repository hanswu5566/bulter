"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Sparkles, ChevronRight, RotateCcw, Search, MessageSquarePlus, Check, Lightbulb, ClipboardList, ClipboardCheck } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

// --- Custom Butler Icon (Simple & Iconic) ---
const ButlerIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="7" r="4" />
    <path d="M5 21v-2a7 7 0 0 1 7-7 7 7 0 0 1 7 7v2" />
    <path d="M10 14.5l2 1 2-1v2l-2-1-2 1v-2z" fill="currentColor" stroke="none" />
    <path d="M10 14.5l2 1 2-1-2 1-2-1z" fill="currentColor" />
  </svg>
);

const LOCAL_INTERVIEW_STEPS = [
  {
    step: 1,
    field: "budget",
    question: "您的每月最高租屋預算範圍大約是多少？",
    options: ["15,000 以下", "15,000 - 25,000", "25,000 - 35,000", "35,000 以上"],
    mode: "SINGLE" as const
  },
  {
    step: 2,
    field: "environment",
    question: "請問您偏好哪些「大樓服務」與「理想居住氛圍」？（可多選）",
    options: ["電梯", "垃圾代收", "管理員代收件", "獨立陽台", "台水台電計費", "網路寬頻", "安靜巷弄", "採光優越", "高樓層景觀", "新屋", "通風良好", "純住宅區"],
    mode: "MULTIPLE" as const
  },
  {
    step: 3,
    field: "hardware",
    question: "請問您需要房東提供哪些房源「必備家具與家電設備」？（可多選）",
    options: ["冷氣", "冰箱", "洗衣機", "電視", "熱水器", "天然瓦斯", "床組", "衣櫃", "沙發", "書桌"],
    mode: "MULTIPLE" as const
  },
  {
    step: 4,
    field: "lifestyle",
    question: "您的「生活習慣」與「周邊生活機能」有哪些需要管家特別注意？（可多選）",
    options: ["可養寵物", "可開伙", "近便利商店", "近超市", "樓下有宵夜", "附近有公園"],
    mode: "MULTIPLE" as const
  },
  {
    step: 5,
    field: "transit",
    question: "最後，請告訴我們您每天出行的「交通偏好」與車位需求？（可多選）",
    options: ["近捷運 (5min內)", "近捷運 (10min內)", "好停機車", "有平面車位", "近公車站"],
    mode: "MULTIPLE" as const
  }
];

type ButlerView = "MENU" | "DIAGNOSIS" | "OPTIMIZATION" | "INSPECTION" | "INTERVIEW";

export default function AIButler() {
  const { data: session } = useSession();
  const t = useTranslations("AIButler");
  const commonT = useTranslations("Common");
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ButlerView>("MENU");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  
  // States for Dynamic Interview
  const [suggestedOptions, setSuggestedOptions] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<"SINGLE" | "MULTIPLE">("SINGLE");
  const [multiSelectItems, setMultiSelectItems] = useState<string[]>([]);
  const [isInterviewFinished, setIsInterviewFinished] = useState(false);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [minBudgetInput, setMinBudgetInput] = useState("");
  const [maxBudgetInput, setMaxBudgetInput] = useState("");
  const [diagnosisData, setDiagnosisData] = useState<any>(null);
  const [optimizationData, setOptimizationData] = useState<any>(null);
  const [inspectionData, setInspectionData] = useState<any>(null);

  const role = "TENANT";
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll to the bottom whenever new messages, loading states, or options appear
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [messages, loading, suggestedOptions, isOpen]);

  // Handle Session Persistence & History Loading
  useEffect(() => {
    let sid = localStorage.getItem("butler_session_id");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("butler_session_id", sid);
    }
    setSessionId(sid);
    
    // Fetch History
    fetch(`/api/ai/interview/history?sessionId=${sid}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data.messages?.length > 0) {
          setMessages(resData.data.messages);
          setIsInterviewFinished(resData.data.isFinished);
          setView("INTERVIEW");
        }
        setIsHistoryLoaded(true);
      })
      .catch(err => {
        console.error("Failed to load Butler history", err);
        setIsHistoryLoaded(true);
      });
  }, []);

  // Expose message state for Navbar role-switching check
  useEffect(() => {
    (window as any).__BUTLER_HAS_MESSAGES__ = messages.length > 0;
    return () => { (window as any).__BUTLER_HAS_MESSAGES__ = false; };
  }, [messages]);

  // Reset chat if role changes to prevent context mixup
  useEffect(() => {
    if (isHistoryLoaded && messages.length > 0) {
      resetToMenu();
    }
  }, [role]);

  // --- Context Detection ---
  const context = useMemo(() => {
    if (pathname.includes("/listings/") && params.id) return "LISTING_DETAIL";
    if (pathname.includes("/landlord/listings/create")) return "LISTING_CREATE";
    if (pathname.includes("/inspect/")) return "INSPECTION";
    return "GENERAL";
  }, [pathname, params]);

  // --- Initial Greeting & Listener ---
  useEffect(() => {
    const handleOpenButler = (e: any) => {
      setIsOpen(true);
      if (e.detail?.type === 'START_INTERVIEW') {
        handleAction("START_INTERVIEW");
      } else if (e.detail?.message) {
        setMessages([{ role: "assistant", content: e.detail.message }]);
      }
    };
    window.addEventListener('open-butler', handleOpenButler);

    if (isOpen && messages.length === 0 && view === "MENU" && isHistoryLoaded) {
      const greetingMap: Record<string, string[]> = {
        LISTING_DETAIL: ['greeting_listing_1', 'greeting_listing_2'],
        LISTING_CREATE: ['greeting_create_1', 'greeting_create_2'],
        INSPECTION: ['greeting_inspection_1', 'greeting_inspection_2'],
        GENERAL: ['greeting_general_1', 'greeting_general_2', 'greeting_general_3'],
      };

      const pool = greetingMap[context] || greetingMap.GENERAL;
      const randomKey = pool[Math.floor(Math.random() * pool.length)];
      setMessages([{ role: "assistant", content: t(randomKey) }]);
    }
    return () => window.removeEventListener('open-butler', handleOpenButler);
  }, [isOpen, context, locale, messages.length, view, isHistoryLoaded]);

  // --- Actions ---
  const handleAction = async (action: string) => {
    if (!session) {
      signIn("google");
      return;
    }

    if (action === "START_INTERVIEW") {
      setView("INTERVIEW");
      setCurrentStep(1);
      setMessages([{ role: "assistant", content: LOCAL_INTERVIEW_STEPS[0].question }]);
      setSuggestedOptions(LOCAL_INTERVIEW_STEPS[0].options);
      setSelectionMode(LOCAL_INTERVIEW_STEPS[0].mode);
      setIsInterviewFinished(false);
      return;
    }

    setLoading(true);
    
    if (action === "DIAGNOSE") {
      setView("DIAGNOSIS");
      try {
        const res = await fetch("/api/ai/diagnose", {
          method: "POST",
          body: JSON.stringify({ listingId: params.id, locale }),
          headers: { "Content-Type": "application/json" },
        });
        const resData = await res.json();
        if (resData.success) {
          setDiagnosisData(resData.data);
          setMessages(prev => [...prev, { role: "assistant", content: resData.data.summary }]);
          if (resData.data.butlerInsight) {
            window.dispatchEvent(new CustomEvent('listing-updated', { detail: { butlerInsight: resData.data.butlerInsight } }));
          }
        }
      } catch (err) { console.error(err); }
    } 
    else if (action === "OPTIMIZE") {
      setView("OPTIMIZATION");
      window.dispatchEvent(new CustomEvent('butler-request-data'));
      const handleDataResponse = async (e: any) => {
        window.removeEventListener('butler-data-response', handleDataResponse);
        const listingData = e.detail;
        try {
          const res = await fetch("/api/ai/optimize", {
            method: "POST",
            body: JSON.stringify({ ...listingData, locale }),
            headers: { "Content-Type": "application/json" },
          });
          const resData = await res.json();
          if (resData.success) {
            setOptimizationData(resData.data);
            const summary = resData.data.suggestions.map((s: any) => `${s.status} **${s.title}**: ${s.content}`).join("\n\n");
            setMessages(prev => [...prev, { role: "assistant", content: `${t('status_optimized')}\n\n${summary}` }]);
          }
        } catch (err) { console.error(err); }
        setLoading(false);
      };
      window.addEventListener('butler-data-response', handleDataResponse);
      return; 
    }
    else if (action === "INSPECT") {
      setView("INSPECTION");
      try {
        const res = await fetch("/api/ai/inspect", {
          method: "POST",
          body: JSON.stringify({ listingId: params.id, locale }),
          headers: { "Content-Type": "application/json" },
        });
        const resData = await res.json();
        if (resData.success) {
          setInspectionData(resData.data);
          const points = resData.data.points.map((p: any, idx: number) => `${idx+1}. **${p.title}**\n   💡 ${p.advice}`).join("\n\n");
          setMessages(prev => [...prev, { role: "assistant", content: `${t('status_inspecting')}\n\n${points}` }]);
        }
      } catch (err) { console.error(err); }
    }

    setLoading(false);
  };

  const handleCustomBudgetSubmit = () => {
    const min = parseInt(minBudgetInput, 10);
    const max = parseInt(maxBudgetInput, 10);
    
    if (isNaN(min) || isNaN(max)) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "⚠️ 請在「最低」與「最高」兩個欄位中都輸入預算數字！" }
      ]);
      return;
    }
    
    if (min < 3000) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `⚠️ 最低預算 NT$ ${min.toLocaleString()} 元過低，請輸入大於 3,000 元的合理金額！` }
      ]);
      return;
    }
    
    if (max > 300000) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `⚠️ 最高預算 NT$ ${max.toLocaleString()} 元過高，請輸入小於 300,000 元的合理金額！` }
      ]);
      return;
    }
    
    if (min >= max) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "⚠️ 錯誤：最低預算必須「小於」最高預算！" }
      ]);
      return;
    }
    
    const displayString = `預算 NT$ ${min.toLocaleString()} - ${max.toLocaleString()} 元`;
    
    setMinBudgetInput("");
    setMaxBudgetInput("");
    
    nextInterviewStep(displayString);
  };

  const nextInterviewStep = async (currentResponse?: string) => {
    if (!session) {
      signIn("google");
      return;
    }

    if (currentResponse) {
      // Append user response to messages instantly!
      setMessages(prev => [...prev, { role: "user", content: currentResponse }]);
      
      // 1. Calculate and transition to Next Step 100% locally inside React (0ms latency!)
      const nextStepIdx = currentStep; // Since currentStep is 1-indexed, it is the next step's 0-based index!
      const isFinished = nextStepIdx >= LOCAL_INTERVIEW_STEPS.length;
      
      if (isFinished) {
        setIsInterviewFinished(true);
        const finishMsg = "太棒了！我已經記錄下您的所有偏好，正在為您準備契合度比對...";
        setMessages(prev => [...prev, { role: "assistant", content: finishMsg }]);
        setSuggestedOptions([]);
        
        // Dispatch custom event to trigger pending analysis instantly on parent pages!
        window.dispatchEvent(new CustomEvent('butler-interview-finished'));
        
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        const nextStep = LOCAL_INTERVIEW_STEPS[nextStepIdx];
        setCurrentStep(nextStep.step);
        setMessages(prev => [...prev, { role: "assistant", content: nextStep.question }]);
        setSuggestedOptions(nextStep.options);
        setSelectionMode(nextStep.mode);
        setMultiSelectItems([]);
      }
      
      // 2. Silent Background Save: Push the answer to the database in the background without locking the UI or showing loader!
      fetch("/api/ai/interview/next", {
        method: "POST",
        body: JSON.stringify({ sessionId, message: currentResponse, role, locale }),
        headers: { "Content-Type": "application/json" },
      }).catch(err => console.error("[Background Save Error]", err));
    }
  };

  const toggleMultiItem = (item: string) => {
    setMultiSelectItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const resetToMenu = () => {
    setView("MENU");
    setMessages([]);
    setSuggestedOptions([]);
    setMultiSelectItems([]);
    setIsInterviewFinished(false);
    const sid = crypto.randomUUID();
    setSessionId(sid);
    localStorage.setItem("butler_session_id", sid);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setView("MENU");
    }, 400);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        /* Immersive Center Flex Container to prevent all CSS transform conflicts! */
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 flex items-center justify-center p-4 pointer-events-auto"
          onClick={() => handleClose()}
        >
          {/* Center Modal Card Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="w-full md:w-[520px] h-[550px] bg-white/95 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white/25 shadow-2xl shadow-black/10 flex flex-col overflow-hidden pointer-events-auto"
            onClick={(e) => e.stopPropagation()} // Stop click event from closing the backdrop modal
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-primary to-[#B85A15] p-5 text-white flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><ButlerIcon className="w-5 h-5 text-white" /></div>
                <div>
                  <div className="font-semibold tracking-wide text-sm">{t('name')}</div>
                  <div className="text-[9px] opacity-70">
                    {view === "INTERVIEW" ? t('view_interview_tenant') : t('view_menu')}
                  </div>
                </div>
              </div>
              <button onClick={() => handleClose()} className="hover:bg-white/10 p-1.5 rounded-full transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            {/* Chat messages body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface/30">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] p-3.5 text-[13px] leading-relaxed ${m.role === "user" ? "bg-primary text-white rounded-2xl rounded-br-none shadow-md shadow-primary/10 font-bold" : "bg-card text-on-surface shadow-sm rounded-2xl rounded-bl-none border border-gray-100 whitespace-pre-wrap font-bold"}`}>{m.content}</div>
                </div>
              ))}
              
              {view === "INTERVIEW" && suggestedOptions.length > 0 && !loading && !isInterviewFinished && (
                <div className="flex flex-wrap gap-1.5 pt-2 select-none">
                  {suggestedOptions.map((opt, idx) => {
                    const optValue = typeof opt === 'object' ? (opt as any).content || (opt as any).label || JSON.stringify(opt) : String(opt);
                    const isSelected = multiSelectItems.includes(optValue);
                    return (
                      <button 
                        key={`${idx}-${optValue}`} 
                        onClick={() => {
                          if (currentStep === 1) {
                            if (optValue === "15,000 以下") {
                              setMinBudgetInput("0");
                              setMaxBudgetInput("15000");
                              nextInterviewStep("預算 NT$ 0 - 15,000 元");
                            } else if (optValue === "15,000 - 25,000") {
                              setMinBudgetInput("15000");
                              setMaxBudgetInput("25000");
                              nextInterviewStep("預算 NT$ 15,000 - 25,000 元");
                            } else if (optValue === "25,000 - 35,000") {
                              setMinBudgetInput("25000");
                              setMaxBudgetInput("35000");
                              nextInterviewStep("預算 NT$ 25,000 - 35,000 元");
                            } else if (optValue === "35,000 以上") {
                              setMinBudgetInput("35000");
                              setMaxBudgetInput("200000");
                              nextInterviewStep("預算 NT$ 35,000 - 200,000 元");
                            }
                          } else {
                            selectionMode === "SINGLE" ? nextInterviewStep(optValue) : toggleMultiItem(optValue);
                          }
                        }} 
                        className={`px-4 py-2.5 rounded-2xl border-2 text-xs font-black transition-all duration-300 shadow-sm flex items-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-95 ${
                          isSelected 
                            ? 'bg-[#D2691E] border-[#D2691E] text-white shadow-md shadow-[#D2691E]/15' 
                            : 'bg-orange-50/30 border-orange-500/15 text-[#D2691E] hover:bg-[#D2691E] hover:text-white hover:border-[#D2691E]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {optValue}
                      </button>
                    );
                  })}
                </div>
              )}
              {loading && <div className="flex justify-start"><div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50"><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /></div></div>}
              {/* Scroll Anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input footer */}
            <div className="p-5 bg-white border-t border-gray-100">
              {quota && !["hanswu@google.com", "shankesleroux8988@gmail.com"].includes(session?.user?.email || "") && (
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daily Quota</div>
                  <div className={`text-[10px] font-black ${quota.used >= quota.limit ? 'text-red-500' : 'text-primary'}`}>
                    {quota.used} / {quota.limit}
                  </div>
                </div>
              )}

              {view === "INTERVIEW" ? (
                <div className="space-y-3">
                  {!isInterviewFinished ? (
                    currentStep === 1 ? (
                      /* Step 1: Render dual-box budget inputs side-by-side for direct number typing! */
                      <div className="flex flex-col gap-3 select-none">
                        <div className="flex gap-2 items-center">
                          <input 
                            type="number" 
                            placeholder="最低預算 (NT$)" 
                            value={minBudgetInput}
                            onChange={(e) => setMinBudgetInput(e.target.value)}
                            className="w-1/2 bg-gray-50 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-[#D2691E]/30 outline-none font-black text-center shadow-inner"
                          />
                          <span className="text-gray-400 text-xs font-black select-none">~</span>
                          <input 
                            type="number" 
                            placeholder="最高預算 (NT$)" 
                            value={maxBudgetInput}
                            onChange={(e) => setMaxBudgetInput(e.target.value)}
                            className="w-1/2 bg-gray-50 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-[#D2691E]/30 outline-none font-black text-center shadow-inner"
                          />
                        </div>
                        <button 
                          onClick={handleCustomBudgetSubmit}
                          className="w-full py-3.5 rounded-2xl bg-[#D2691E] hover:bg-[#b25915] text-white text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          確認自訂預算區間
                        </button>
                      </div>
                    ) : (
                      /* Steps 2, 3, 4, 5: Hide input bar and render the premium, wide confirm button! */
                      <button 
                        disabled={multiSelectItems.length === 0}
                        onClick={() => nextInterviewStep(multiSelectItems.join("、"))} 
                        className={`w-full py-4 rounded-2xl font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-white border-transparent ${
                          multiSelectItems.length === 0
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                            : "bg-[#D2691E] hover:bg-[#b25915] shadow-lg shadow-[#D2691E]/10"
                        }`}
                      >
                        <Check className="w-4.5 h-4.5" />
                        確認選取 ({multiSelectItems.length} 項) 並進入下一單元
                      </button>
                    )
                  ) : (
                    <button onClick={resetToMenu} className="w-full p-4.5 rounded-2xl bg-on-surface text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-800 transition-all active:scale-98"><RotateCcw className="w-3.5 h-3.5" /> {t('btn_back_to_menu')}</button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {context === "LISTING_DETAIL" && (
                    <button disabled={quota !== null && quota.used >= quota.limit} onClick={() => handleAction("DIAGNOSE")} className="w-full text-left p-4 rounded-[1.5rem] bg-primary text-white shadow-xl shadow-primary/20 hover:translate-y-[-2px] active:translate-y-0 transition-all group relative overflow-hidden border border-white/10 disabled:opacity-50 cursor-pointer">
                      <Sparkles className="absolute -right-2 -top-2 w-16 h-16 opacity-10 rotate-12" />
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                          <Search className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm leading-tight">{t('action_diagnose')}</div>
                          <div className="text-[9px] opacity-70 mt-0.5">{t('action_diagnose_desc')}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-40 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  )}
                  {context === "LISTING_CREATE" && (
                    <button disabled={quota !== null && quota.used >= quota.limit} onClick={() => handleAction("OPTIMIZE")} className="w-full text-left p-4 rounded-[1.5rem] bg-primary text-white shadow-xl shadow-primary/20 hover:translate-y-[-2px] active:translate-y-0 transition-all group relative overflow-hidden border border-white/10 disabled:opacity-50 cursor-pointer">
                      <Lightbulb className="absolute -right-2 -top-2 w-16 h-16 opacity-10 rotate-12" />
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm leading-tight">{t('action_optimize')}</div>
                          <div className="text-[9px] opacity-70 mt-0.5">{t('action_optimize_desc')}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-40 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  )}
                  {context === "INSPECTION" && (
                    <button disabled={quota !== null && quota.used >= quota.limit} onClick={() => handleAction("INSPECT")} className="w-full text-left p-4 rounded-[1.5rem] bg-primary text-white shadow-xl shadow-primary/20 hover:translate-y-[-2px] active:translate-y-0 transition-all group relative overflow-hidden border border-white/10 disabled:opacity-50 cursor-pointer">
                      <ClipboardList className="absolute -right-2 -top-2 w-16 h-16 opacity-10 rotate-12" />
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                          <ClipboardCheck className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm leading-tight">{t('action_inspect')}</div>
                          <div className="text-[9px] opacity-70 mt-0.5">{t('action_inspect_desc')}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-40 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  )}
                  <button 
                    disabled={quota !== null && quota.used >= quota.limit}
                    onClick={() => handleAction("START_INTERVIEW")} 
                    className={`w-full text-left transition-all group relative overflow-hidden disabled:opacity-50 cursor-pointer ${
                      context === "GENERAL" ? 'p-4 rounded-[1.5rem] bg-primary text-white shadow-lg' : 'p-3 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <div className={`rounded-lg flex items-center justify-center ${context === "GENERAL" ? 'w-10 h-10 bg-white/20 backdrop-blur-md' : 'w-8 h-8 bg-white border border-gray-100 shadow-sm'}`}>
                        <MessageSquarePlus className={`w-4 h-4 ${context === "GENERAL" ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`} />
                      </div>
                      <div className="flex-1">
                        <div className={`font-bold ${context === "GENERAL" ? 'text-sm' : 'text-[11px]'}`}>
                          {t('action_interview_tenant')}
                        </div>
                        {context === "GENERAL" && <div className="text-[9px] opacity-70">獲取精準推薦</div>}
                      </div>
                      <ChevronRight className={`opacity-40 group-hover:translate-x-0.5 transition-transform ${context === "GENERAL" ? 'w-4 h-4' : 'w-3 h-3'}`} />
                    </div>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
