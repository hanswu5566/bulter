"use client";

import { motion } from "framer-motion";
import { User, Sparkles, Compass, ClipboardCheck, LayoutDashboard, PlusCircle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

export default function LandingPage() {
  const t = useTranslations("HomePage");
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "TENANT";

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
            {t('hero_title_2')} <span className="text-primary italic">{t('hero_title_3')}</span> {t('hero_title_4')} <span className="text-primary">{t('hero_title_5')}</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            {t('hero_description')}
          </p>
          
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-butler', { 
                  detail: { type: 'START_INTERVIEW' } 
                }));
              }}
              className="w-full md:w-auto bg-primary text-white px-12 py-5 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all text-lg flex items-center justify-center gap-3 cursor-pointer"
            >
              {role === "LANDLORD" ? (
                <>
                  <LayoutDashboard className="w-6 h-6" />
                  {t('start_discovery_landlord')}
                </>
              ) : (
                <>
                  <User className="w-6 h-6" />
                  {t('start_discovery_tenant')}
                </>
              )}
            </button>

            {role === "LANDLORD" ? (
              <Link 
                href="/landlord/listings/create"
                className="w-full md:w-auto bg-white text-on-surface border border-gray-200 px-12 py-5 rounded-2xl font-bold shadow-sm hover:bg-gray-50 transition-all text-lg flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-6 h-6 text-primary" />
                {t('start_import')}
              </Link>
            ) : (
              <Link 
                href="/listings"
                className="w-full md:w-auto bg-white text-on-surface border border-gray-200 px-12 py-5 rounded-2xl font-bold shadow-sm hover:bg-gray-50 transition-all text-lg flex items-center justify-center gap-2"
              >
                <Compass className="w-6 h-6 text-primary" />
                {t('browse_listings')}
              </Link>
            )}
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
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
