"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Sparkles, ChevronRight, RotateCcw, LayoutDashboard, Search, FileText, ClipboardCheck, MessageSquarePlus, Check, Lightbulb, ClipboardList } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useParams } from "next/navigation";
import { useSession } from "next-auth/react";

// --- Custom Butler Icon (Simple & Iconic) ---
const ButlerIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="7" r="4" />
    <path d="M5 21v-2a7 7 0 0 1 7-7 7 7 0 0 1 7 7v2" />
    <path d="M10 14.5l2 1 2-1v2l-2-1-2 1v-2z" fill="currentColor" stroke="none" />
    <path d="M10 14.5l2 1 2-1-2 1-2-1z" fill="currentColor" />
  </svg>
);

type ButlerView = "MENU" | "DIAGNOSIS" | "OPTIMIZATION" | "INSPECTION" | "INTERVIEW";

export default function AIButler() {
  const { data: session } = useSession();
  const t = useTranslations("AIButler");
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ButlerView>("MENU");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  // States for Dynamic Interview
  const [suggestedOptions, setSuggestedOptions] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<"SINGLE" | "MULTIPLE">("SINGLE");
  const [multiSelectItems, setMultiSelectItems] = useState<string[]>([]);
  const [isInterviewFinished, setIsInterviewFinished] = useState(false);

  const [diagnosisData, setDiagnosisData] = useState<any>(null);
  const [optimizationData, setOptimizationData] = useState<any>(null);
  const [inspectionData, setInspectionData] = useState<any>(null);

  const role = (session?.user as any)?.role || "TENANT";

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

    if (isOpen && messages.length === 0 && view === "MENU") {
      // 1. Define possible keys for each context
      const greetingMap: Record<string, string[]> = {
        LISTING_DETAIL: ['greeting_listing_1', 'greeting_listing_2'],
        LISTING_CREATE: ['greeting_create_1', 'greeting_create_2'],
        INSPECTION: ['greeting_inspection_1', 'greeting_inspection_2'],
        GENERAL: ['greeting_general_1', 'greeting_general_2', 'greeting_general_3'],
      };

      // 2. Select random key based on current context
      const pool = greetingMap[context] || greetingMap.GENERAL;
      const randomKey = pool[Math.floor(Math.random() * pool.length)];
      
      // 3. Set message instantly
      setMessages([{ role: "assistant", content: t(randomKey) }]);
    }
    return () => window.removeEventListener('open-butler', handleOpenButler);
  }, [isOpen, context, locale, messages.length, view]);

  // --- Actions ---
  const handleAction = async (action: string) => {
    if (action === "START_INTERVIEW") {
      setView("INTERVIEW");
      setMessages([]);
      setIsInterviewFinished(false);
      await nextInterviewStep([]);
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
            window.dispatchEvent(new CustomEvent('listing-updated', { 
              detail: { butlerInsight: resData.data.butlerInsight } 
            }));
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

  const nextInterviewStep = async (history: any[], currentResponse?: string) => {
    setLoading(true);
    const updatedHistory = currentResponse ? [...history, { role: "user", content: currentResponse }] : history;
    if (currentResponse) setMessages(updatedHistory);

    try {
      const res = await fetch("/api/ai/interview/next", {
        method: "POST",
        body: JSON.stringify({ history: updatedHistory, role, locale }),
        headers: { "Content-Type": "application/json" },
      });
      const resData = await res.json();
      if (resData.success) {
        const { question, options, mode, isFinished } = resData.data;
        setMessages(prev => [...prev, { role: "assistant", content: question }]);
        setSuggestedOptions(options || []);
        setSelectionMode(mode || "SINGLE");
        setMultiSelectItems([]);
        setIsInterviewFinished(isFinished);
        if (isFinished) saveInterviewResults(updatedHistory);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const toggleMultiItem = (item: string) => {
    setMultiSelectItems(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const saveInterviewResults = async (finalHistory: any[]) => {
    try {
      const res = await fetch("/api/ai/intent", {
        method: "POST",
        body: JSON.stringify({ messages: finalHistory, locale }),
        headers: { "Content-Type": "application/json" },
      });
      const { tags } = await res.json();
      await fetch("/api/user/profile", {
        method: "POST",
        body: JSON.stringify({ tags }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) { console.error(err); }
  };

  const resetToMenu = () => {
    setView("MENU");
    setMessages([]);
    setSuggestedOptions([]);
    setMultiSelectItems([]);
    setIsInterviewFinished(false);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="butler-fab group z-50">
        <ButlerIcon className="w-8 h-8" />
        <span className="absolute right-24 bg-on-surface text-white px-4 py-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm font-bold pointer-events-none">{t('fab_help')}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="fixed bottom-28 right-10 w-[calc(100vw-3rem)] md:w-80 bg-white rounded-[2rem] shadow-2xl border border-gray-100 z-50 flex flex-col overflow-hidden h-[500px]">
            {/* Header */}
            <div className="bg-primary p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><ButlerIcon className="w-5 h-5 text-white" /></div>
                <div>
                  <div className="font-bold text-sm">{t('name')}</div>
                  <div className="text-[9px] opacity-70">
                    {view === "INTERVIEW" ? (role === "LANDLORD" ? t('view_interview_landlord') : t('view_interview_tenant')) : t('view_menu')}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-full transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface/30">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] p-3 rounded-2xl text-[13px] ${m.role === "user" ? "bg-primary text-white rounded-br-none" : "bg-white text-on-surface shadow-sm rounded-bl-none border border-gray-100 whitespace-pre-wrap"}`}>{m.content}</div>
                </div>
              ))}
              
              {view === "INTERVIEW" && suggestedOptions.length > 0 && !loading && !isInterviewFinished && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {suggestedOptions.map(opt => {
                    const isSelected = multiSelectItems.includes(opt);
                    return (
                      <button 
                        key={opt} 
                        onClick={() => selectionMode === "SINGLE" ? nextInterviewStep(messages, opt) : toggleMultiItem(opt)} 
                        className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all shadow-sm flex items-center gap-1 ${
                          isSelected 
                            ? 'bg-primary border-primary text-white' 
                            : 'bg-white border-primary/20 text-primary hover:bg-primary/5'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {loading && <div className="flex justify-start"><div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50"><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /></div></div>}
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
              {view === "INTERVIEW" ? (
                <div className="space-y-3">
                  {!isInterviewFinished ? (
                    <div className="flex gap-2">
                      <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (nextInterviewStep(messages, input), setInput(""))} placeholder={t('input_placeholder')} className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2.5 text-[13px] focus:ring-1 focus:ring-primary outline-none" />
                      
                      {selectionMode === "MULTIPLE" && multiSelectItems.length > 0 ? (
                        <button onClick={() => { nextInterviewStep(messages, multiSelectItems.join("、")); }} className="bg-success text-white px-3 rounded-xl flex items-center gap-1.5 text-[11px] font-bold"><Check className="w-3.5 h-3.5" /> {t('btn_confirm_selection')}</button>
                      ) : (
                        <button onClick={() => { nextInterviewStep(messages, input); setInput(""); }} className="bg-primary text-white p-2.5 rounded-xl"><Send className="w-5 h-5" /></button>
                      )}
                    </div>
                  ) : (
                    <button onClick={resetToMenu} className="w-full p-3 rounded-xl bg-on-surface text-white text-sm font-bold flex items-center justify-center gap-2"><RotateCcw className="w-3.5 h-3.5" /> {t('btn_back_to_menu')}</button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* --- Primary Contextual Action --- */}
                  {context === "LISTING_DETAIL" && (
                    <button onClick={() => handleAction("DIAGNOSE")} className="w-full text-left p-4 rounded-[1.5rem] bg-primary text-white shadow-xl shadow-primary/20 hover:translate-y-[-2px] active:translate-y-0 transition-all group relative overflow-hidden border border-white/10">
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
                    <button onClick={() => handleAction("OPTIMIZE")} className="w-full text-left p-4 rounded-[1.5rem] bg-primary text-white shadow-xl shadow-primary/20 hover:translate-y-[-2px] active:translate-y-0 transition-all group relative overflow-hidden border border-white/10">
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
                    <button onClick={() => handleAction("INSPECT")} className="w-full text-left p-4 rounded-[1.5rem] bg-primary text-white shadow-xl shadow-primary/20 hover:translate-y-[-2px] active:translate-y-0 transition-all group relative overflow-hidden border border-white/10">
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

                  {/* --- Secondary Action (Interview) --- */}
                  <button 
                    onClick={() => handleAction("START_INTERVIEW")} 
                    className={`w-full text-left transition-all group relative overflow-hidden ${
                      context === "GENERAL" 
                        ? 'p-4 rounded-[1.5rem] bg-primary text-white shadow-lg' 
                        : 'p-3 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <div className={`rounded-lg flex items-center justify-center ${
                        context === "GENERAL" 
                          ? 'w-10 h-10 bg-white/20 backdrop-blur-md' 
                          : 'w-8 h-8 bg-white border border-gray-100 shadow-sm'
                      }`}>
                        <MessageSquarePlus className={`w-4 h-4 ${context === "GENERAL" ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`} />
                      </div>
                      <div className="flex-1">
                        <div className={`font-bold ${context === "GENERAL" ? 'text-sm' : 'text-[11px]'}`}>
                          {role === "TENANT" ? t('action_interview_tenant') : t('action_interview_landlord')}
                        </div>
                        {context === "GENERAL" && (
                          <div className="text-[9px] opacity-70">獲取精準推薦</div>
                        )}
                      </div>
                      <ChevronRight className={`opacity-40 group-hover:translate-x-0.5 transition-transform ${context === "GENERAL" ? 'w-4 h-4' : 'w-3 h-3'}`} />
                    </div>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
