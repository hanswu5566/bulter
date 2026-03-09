"use client";

import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { User, Mail, Shield, Tags, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const t = useTranslations("Navbar"); // Reusing for common terms

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-gray-500">請先登入以查看個人資料</p>
      </div>
    );
  }

  const profileTags = (session.user as any)?.profileTags || [];

  return (
    <main className="min-h-screen bg-surface p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-on-surface mb-2">個人帳戶設定</h1>
          <p className="text-gray-500">管理您的基本資訊與 AI 採集的生活特徵。</p>
        </header>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Sidebar - Profile Card */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-6 flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
                {session.user?.image ? (
                  <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-primary" />
                )}
              </div>
              <h2 className="text-xl font-bold text-on-surface mb-1">{session.user?.name}</h2>
              <p className="text-xs text-gray-400 mb-6">{session.user?.email}</p>
              
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                <Shield className="w-3 h-3" />
                {(session.user as any).role || "TENANT"}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Account Info */}
            <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                基本資訊
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-50">
                  <span className="text-gray-400 text-sm">名稱</span>
                  <span className="font-medium text-on-surface">{session.user?.name}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-50">
                  <span className="text-gray-400 text-sm">電子郵件</span>
                  <span className="font-medium text-on-surface">{session.user?.email}</span>
                </div>
              </div>
            </section>

            {/* AI collected Intent Tags */}
            <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                <Sparkles className="w-32 h-32 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Tags className="w-5 h-5 text-primary" />
                管家印象標籤
              </h3>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                這些標籤由管家透過對話分析得出，將用於為您精準推薦最合適的房源。
              </p>
              
              <div className="flex flex-wrap gap-3">
                {profileTags.length > 0 ? profileTags.map((tag: string, idx: number) => (
                  <motion.span 
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-600 hover:border-primary transition-colors cursor-default shadow-sm"
                  >
                    #{tag}
                  </motion.span>
                )) : (
                  <div className="text-center w-full py-8 text-gray-400 italic text-sm">
                    尚無標籤，試著跟管家聊聊您的居住需求！
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
