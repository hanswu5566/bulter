"use client";

import { motion } from "framer-motion";
import { User, Sparkles, Compass, ClipboardCheck, LayoutDashboard, PlusCircle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const t = useTranslations("HomePage");
  const { data: session } = useSession();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const response = await fetch("/api/listings/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const res = await response.json();
      if (res.success) {
        if (res.data.listing?.id) {
          router.push(`/listings/${res.data.listing.id}`);
        } else {
          alert("分析完成！但未存入資料庫。");
        }
      } else {
        alert("分析失敗: " + res.error);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("連線失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface selection:bg-primary/30">
      {/* Hero Section */}
      <section className="px-6 py-24 md:py-32 max-w-7xl mx-auto text-center">
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
          <div className="max-w-3xl mx-auto mb-12">
            <div className="relative flex items-center bg-white rounded-2xl border-2 border-primary/20 focus-within:border-primary shadow-sm hover:shadow-md transition-all">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="貼上任何 591 或租屋網址，讓 Butler 為您透視真相..."
                className="w-full px-6 py-5 rounded-2xl text-on-surface focus:outline-none text-lg"
              />
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="absolute right-2 bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 disabled:bg-gray-300 transition-colors"
              >
                {loading ? "分析中..." : "一鍵透視"}
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="px-6 py-20 max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
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
