"use client";

import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Shield, Tags, Loader2, Sparkles, Check, Home, MapPin, Coffee, Zap, Sofa, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { useRouter, Link } from "@/i18n/routing";

const TAG_CATEGORIES = [
  {
    id: "vibe",
    name: "居住氛圍",
    icon: <Home className="w-4 h-4" />,
    tags: ["安靜巷弄", "採光優越", "高樓層景觀", "新屋", "通風良好", "純住宅區"]
  },
  {
    id: "appliances",
    name: "必備設備 (591)",
    icon: <Sofa className="w-4 h-4" />,
    tags: ["冷氣", "冰箱", "洗衣機", "電視", "熱水器", "天然瓦斯", "床組", "衣櫃", "沙發", "書桌"]
  },
  {
    id: "facility",
    name: "大樓服務",
    icon: <Zap className="w-4 h-4" />,
    tags: ["垃圾代收", "管理員代收件", "電梯", "獨立陽台", "台水台電計費", "網路寬頻"]
  },
  {
    id: "lifestyle",
    name: "生活習慣",
    icon: <Coffee className="w-4 h-4" />,
    tags: ["可養寵物", "可開伙", "近便利商店", "近超市", "樓下有宵夜", "附近有公園"]
  },
  {
    id: "transport",
    name: "交通偏好",
    icon: <MapPin className="w-4 h-4" />,
    tags: ["近捷運 (5min內)", "近捷運 (10min內)", "近公車站", "好停機車", "有平面車位"]
  }
];

export default function PreferencesPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<Record<string, number>>({});
  const [minBudget, setMinBudget] = useState<number>(10000);
  const [maxBudget, setMaxBudget] = useState<number>(30000);
  const [budgetWeight, setBudgetWeight] = useState<number>(3);
  const [elevator, setElevator] = useState<boolean | null>(null);
  const [pets, setPets] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [wishlist, setWishlist] = useState("");
  const [activeTab, setActiveTab] = useState("vibe");

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/user/preferences")
        .then(res => res.json())
        .then(res => {
          if (res.success && res.data) {
            const aiTags = res.data;
            if (typeof aiTags === "object") {
              // 優先讀取權重格式
              if (aiTags.tagsWithWeight) {
                setSelectedTags(aiTags.tagsWithWeight);
              } else if (aiTags.tags && Array.isArray(aiTags.tags)) {
                // 相容舊的陣列格式，預設給權重 2
                const mockWeights: Record<string, number> = {};
                aiTags.tags.forEach((tag: string) => mockWeights[tag] = 2);
                setSelectedTags(mockWeights);
              }
              
              setMinBudget(aiTags.minBudget || 10000);
              setMaxBudget(aiTags.maxBudget || aiTags.budget || 30000);
              setBudgetWeight(aiTags.budgetWeight || 3);
              setElevator(aiTags.elevator ?? null);
              setPets(aiTags.pets ?? null);
              setWishlist(aiTags.wishlist || "");
            }
          }
        })
        .catch(err => console.error("Failed to fetch preferences:", err));
    }
  }, [status]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const currentWeight = prev[tag] || 0;
      const nextWeight = (currentWeight + 1) % 4; // 0 -> 1 -> 2 -> 3 -> 0
      
      const updated = { ...prev };
      if (nextWeight === 0) {
        delete updated[tag];
      } else {
        updated[tag] = nextWeight;
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    const profileData = {
      tagsWithWeight: selectedTags,
      tags: Object.keys(selectedTags), // 保留舊格式相容性
      minBudget,
      maxBudget,
      budgetWeight,
      elevator,
      pets,
      wishlist
    };
    try {
      const res = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: profileData })
      });
      
      if (res.ok) {
        await update({ aiTags: profileData });
        setShowSavedToast(true);
        setTimeout(() => {
          setShowSavedToast(false);
        }, 5000);
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface gap-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-on-surface">專屬管家服務</h2>
          <p className="text-gray-500 text-sm">請先登入以設定您的個人租屋偏好</p>
        </div>
        <button
          onClick={() => signIn("google")}
          className="bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-5 h-5" />
          使用 Google 帳號登入
        </button>
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
            <div className="flex items-center gap-4">
              <span>偏好設定已儲存，管家已準備就緒！</span>
              <a href="https://rent.591.com.tw" target="_blank" rel="noopener noreferrer" className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-black hover:scale-[1.02] transition-transform flex items-center gap-1">
                前往 591 找房 <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer">
                <ArrowLeft className="w-5 h-5 text-on-surface" />
              </Link>
              <h1 className="text-4xl font-black text-on-surface">設定生活偏好</h1>
            </div>
            <p className="text-gray-500 max-w-lg">
              告訴 Butler 您的生活習慣，我們將為您在 591 瀏覽時提供最精準的「智慧匹配分數」。
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 
             showSavedToast ? <Check className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            {showSavedToast ? "已儲存成功！" : "儲存生活偏好"}
          </button>
        </header>

        <div className="grid md:grid-cols-4 gap-12">
          {/* Main Questionnaire */}
          <div className="md:col-span-3 space-y-12">
            {/* Basic Conditions Form */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="text-xl font-black text-on-surface">基本條件與預算</h3>
              </div>
              
              <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">最低預算 (TWD)</label>
                    <input 
                      type="number" 
                      value={minBudget} 
                      onChange={(e) => setMinBudget(parseInt(e.target.value) || 0)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                      placeholder="例如: 10000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">最高預算 (TWD)</label>
                    <input 
                      type="number" 
                      value={maxBudget} 
                      onChange={(e) => setMaxBudget(parseInt(e.target.value) || 0)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                      placeholder="例如: 30000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">是否需要電梯？</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setElevator(true)}
                        className={`flex-1 py-2 rounded-xl font-bold text-sm ${elevator === true ? "bg-primary text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                      >
                        需要
                      </button>
                      <button 
                        onClick={() => setElevator(false)}
                        className={`flex-1 py-2 rounded-xl font-bold text-sm ${elevator === false ? "bg-primary text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                      >
                        不需要
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">是否會養寵物？</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setPets(true)}
                        className={`flex-1 py-2 rounded-xl font-bold text-sm ${pets === true ? "bg-primary text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                      >
                        會
                      </button>
                      <button 
                        onClick={() => setPets(false)}
                        className={`flex-1 py-2 rounded-xl font-bold text-sm ${pets === false ? "bg-primary text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                      >
                        不會
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Tab Header */}
            <div className="flex border-b border-gray-100 mb-6 overflow-x-auto">
              {TAG_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  className={`px-6 py-3 font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === category.id 
                      ? "text-primary border-b-2 border-primary" 
                      : "text-gray-400 hover:text-on-surface"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* 權重操作提示 */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-primary font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                智慧標籤優先級玩法
              </p>
              <p className="text-xs text-gray-600 mt-1">
                點擊標籤可以循環切換優先級：點 1 下「普通」 ➔ 點 2 下「重要」 ➔ 點 3 下「極重要」 ➔ 再點則取消。
              </p>
            </div>

            {/* Tab Content */}
            {TAG_CATEGORIES.filter(c => c.id === activeTab).map((category, catIdx) => (
              <section key={category.id}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    {category.icon}
                  </div>
                  <h3 className="text-xl font-black text-on-surface">{category.name}</h3>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {category.tags.map((tag, tagIdx) => {
                    const weight = selectedTags[tag] || 0;
                    const isSelected = weight > 0;
                    return (
                      <motion.button
                        key={tag}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (catIdx * 0.1) + (tagIdx * 0.05) }}
                        onClick={() => toggleTag(tag)}
                        className={`group relative p-4 rounded-[1.5rem] border-2 text-left transition-all ${
                          weight === 3 ? "bg-primary text-white border-primary shadow-md" :
                          weight === 2 ? "bg-primary/10 border-primary" :
                          weight === 1 ? "bg-primary/5 border-primary/30" :
                          "bg-white border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            weight === 3 ? "bg-white border-white" :
                            isSelected ? "bg-primary border-primary" : 
                            "border-gray-200"
                          }`}>
                            {isSelected && <Check className={`w-3 h-3 ${weight === 3 ? "text-primary" : "text-white"}`} />}
                          </div>
                        </div>
                        <span className={`font-bold text-sm transition-colors ${
                          weight === 3 ? "text-white" :
                          isSelected ? "text-primary" : 
                          "text-gray-500 group-hover:text-on-surface"
                        }`}>
                          {tag}
                          {weight === 1 && " (普通)"}
                          {weight === 2 && " (重要)"}
                          {weight === 3 && " (極重要)"}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* AI Wishlist */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-xl font-black text-on-surface">AI 智慧許願池 (自由描述)</h3>
              </div>
              
              <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100">
                <textarea
                  value={wishlist}
                  onChange={(e) => setWishlist(e.target.value.substring(0, 500))}
                  placeholder="請用自然語言描述您的理想房屋（例如：希望客廳採光好，有貓咪活動空間，附近有公園...）。"
                  className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  rows={5}
                />
                <div className="text-[10px] text-gray-400 mt-2 text-right">{wishlist.length}/500 字</div>
              </div>
            </section>
          </div>

          {/* User Preview Sticky Card */}
          <div className="md:col-span-1">
            <div className="sticky top-32 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                <Sparkles className="w-32 h-32 text-primary" />
              </div>

              <div className="w-20 h-20 bg-primary/10 rounded-3xl mb-6 flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
              
              <h2 className="text-xl font-black text-on-surface mb-1">{session?.user?.name}</h2>
              <p className="text-xs text-gray-400 mb-8">{session?.user?.email}</p>

              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-400 uppercase tracking-widest">已選標籤</span>
                  <span className="text-primary">{Object.keys(selectedTags).length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto no-scrollbar">
                  {Object.keys(selectedTags).length > 0 ? Object.keys(selectedTags).map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-50 text-[10px] font-black text-gray-500 rounded-lg">
                      #{tag} (權重:{selectedTags[tag]})
                    </span>
                  )) : (
                    <span className="text-[10px] text-gray-300 italic">尚未選取任何特徵</span>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-50">
                <p className="text-[10px] text-gray-400 leading-relaxed italic">
                  "Butler 會根據這些標籤，在您的 591 頁面上即時分析房源優缺點。"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
