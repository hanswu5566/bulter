"use client";

import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Shield, Loader2, Sparkles, Check, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, Link } from "@/i18n/routing";

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      
      if (res.ok) {
        await update({ name });
        setShowSavedToast(true);
        setTimeout(() => setShowSavedToast(false), 3000);
      }
    } catch (err) {
      console.error("Save profile failed", err);
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <main className="min-h-screen bg-surface p-6 md:p-12 relative">
      <AnimatePresence>
        {showSavedToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 bg-on-surface text-white px-8 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3"
          >
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
            個人資料已儲存！
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-on-surface" />
            </Link>
            <h1 className="text-4xl font-black text-on-surface">個人資料設定</h1>
          </div>
          <p className="text-gray-500">
            管理您的基本帳戶資料與使用者角色。
          </p>
        </header>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center sm:flex-row sm:items-center gap-6">
            <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
              {session.user?.image ? (
                <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-primary" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black text-on-surface">{session.user?.name || "使用者"}</h3>
              <p className="text-sm text-gray-400">{session.user?.email}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-xs font-black rounded-full uppercase tracking-tighter">
                Elite Tenant
              </div>
            </div>
          </div>

          <div className="border-t border-gray-50 pt-8 space-y-6">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">顯示名稱</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="請輸入您的姓名"
                />
              </div>
            </div>

            {/* Email (Readonly) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">電子郵件</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="email" 
                  value={session.user?.email || ""} 
                  readOnly
                  className="w-full pl-12 pr-4 py-3 border border-gray-100 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1 ml-2">電子郵件由登入服務提供，無法在此修改。</p>
            </div>


          </div>

          {/* Save Button */}
          <div className="border-t border-gray-50 pt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving || name === session.user?.name}
              className="bg-primary text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              儲存修改
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
