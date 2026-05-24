"use client";

import { motion, AnimatePresence } from "framer-motion";
import { User, Sparkles, Compass, ClipboardCheck, LayoutDashboard, PlusCircle, Check, Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const t = useTranslations("HomePage");
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showPrefsModal, setShowPrefsModal] = useState(false); // Onboarding preferences blocking modal state

  // Check if the user has configured their lifestyle preferences (aiTags)
  const aiTags = (session?.user as any)?.aiTags;
  const hasPrefs = aiTags && (
    (aiTags.tags && aiTags.tags.length > 0) ||
    (aiTags.tagsWithWeight && Object.keys(aiTags.tagsWithWeight).length > 0) ||
    aiTags.maxBudget ||
    aiTags.budget ||
    aiTags.pets !== null ||
    aiTags.elevator !== null
  );

  const [localHasPrefs, setLocalHasPrefs] = useState(false);

  // Sync local state with session once loaded
  useEffect(() => {
    if (hasPrefs) {
      setLocalHasPrefs(true);
    }
  }, [hasPrefs]);

  // Automatically cycle the loading message steps during analysis
  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < 4 ? prev + 1 : prev));
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  const runAnalysis = async (targetUrl: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/listings/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl })
      });
      const res = await response.json();
      if (res.success) {
        if (res.data.listing?.id) {
          router.push(`/listings/${res.data.listing.id}`);
        } else {
          alert("分析完成！但未存入資料庫。");
        }
      } else {
        if (res.error === "NEEDS_PREFERENCES") {
          setShowPrefsModal(true);
        } else {
          alert("分析失敗: " + res.error);
        }
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("連線失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!url || url.trim() === "") {
      alert("請先貼上要解析的 591 房源網址！");
      return;
    }

    // Force login before allowing analysis (resilient to background NextAuth loading status!)
    if (status === "loading") {
      setLoading(true);
      setTimeout(() => {
        handleAnalyze();
      }, 800);
      return;
    }

    if (!session) {
      // Save pending URL to localStorage before OAuth redirect
      localStorage.setItem("pending_591_url", url);
      signIn("google");
      return;
    }

    await runAnalysis(url);
  };

  // Auto-trigger analysis after successful Google OAuth redirect, checking for onboarding
  useEffect(() => {
    const pendingUrl = localStorage.getItem("pending_591_url");
    if (session && pendingUrl) {
      setUrl(pendingUrl);
      
      // Run analysis immediately after Google OAuth login redirects!
      localStorage.removeItem("pending_591_url");
      runAnalysis(pendingUrl);
    }
  }, [session, localHasPrefs]);



  return (
    <main className="min-h-screen bg-surface selection:bg-primary/30">
      {/* Hero Section */}
      <section className="px-6 pt-20 pb-8 md:pt-28 md:pb-12 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold mb-8">
            <Sparkles className="w-4 h-4" />
            {t('badge')}
          </div>
          <h1 className="text-5xl md:text-8xl font-black text-on-surface mb-8 leading-[1.1] tracking-tight">
            {t('hero_title_1')}<br />
            <span className="text-primary">{t('hero_title_2')}</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            {t('hero_description')}
          </p>
          
          {/* 巨型輸入框 */}
          <div className="max-w-3xl mx-auto mb-12 space-y-6">
            {/* Glowing Glassmorphic Onboarding Hint for First-Time Users! */}
            {session && !localHasPrefs && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#D2691E]/10 border-2 border-[#D2691E]/25 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left select-none shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-[#D2691E] animate-pulse shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-[#D2691E]">🤵🏻 AI 溫馨提示：您尚未設定租屋偏好！</h4>
                    <p className="text-[10px] text-gray-500 font-bold mt-0.5">
                      立即花 1 分鐘與管家對話，解鎖專屬「房源契合度分數」與「機車通勤避橋時間」！
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            <div className="relative flex items-center bg-white rounded-2xl border-2 border-primary/20 focus-within:border-primary shadow-sm hover:shadow-md transition-all">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="貼上台灣 591 房源網址，讓 Butler 為您解析真相..."
                className="w-full px-6 py-5 rounded-2xl text-on-surface focus:outline-none text-lg"
              />
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="absolute right-2 bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 disabled:bg-gray-300 transition-colors"
              >
                {loading ? "分析中..." : "一鍵解析"}
              </button>
            </div>

            {/* Informative Loading Progress Indicator */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-400 font-bold bg-gray-50 py-2.5 px-5 rounded-full w-fit mx-auto border border-gray-100 shadow-sm"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={loadingStep}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="inline-block font-sans"
                    >
                      {loadingStep === 0 && "🤵🏻 Butler 正在抓取網頁數據..."}
                      {loadingStep === 1 && "🖼️ 正在儲存資訊..."}
                      {loadingStep === 2 && "🧠 正在進行AI 深度診斷合規性與地雷..."}
                      {loadingStep === 3 && "🗺️ 正在偵測周邊感官隱患..."}
                      {loadingStep === 4 && "⚡ 正在生成房源解析..."}
                    </motion.span>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </section>

      <section className="px-6 pb-24 pt-4 max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
        <div className="butler-card group hover:-translate-y-1 transition-transform bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black mb-3 text-on-surface">{t('feature_1_title')}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{t('feature_1_desc')}</p>
        </div>
        
        <div className="butler-card group hover:-translate-y-1 transition-transform bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500">
            <ClipboardCheck className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black mb-3 text-on-surface">{t('feature_2_title')}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{t('feature_2_desc')}</p>
        </div>
        
        <div className="butler-card group hover:-translate-y-1 transition-transform bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black mb-3 text-on-surface">{t('feature_3_title')}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{t('feature_3_desc')}</p>
        </div>
      </section>

      </main>
      );
      }
