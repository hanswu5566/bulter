"use client";

import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Shield, Tags, Loader2, Sparkles, 
  Check, Home, MapPin, Coffee, Zap, Sofa, 
  ArrowLeft, Star, AlertCircle, Sliders
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { useRouter, Link } from "@/i18n/routing";

const TAG_CATEGORIES = [
  {
    id: "vibe",
    name: "居住氛圍",
    icon: <Home className="w-4.5 h-4.5" />,
    tags: ["安靜巷弄", "採光優越", "高樓層景觀", "新屋", "通風良好", "純住宅區"]
  },
  {
    id: "appliances",
    name: "必備設備 (591)",
    icon: <Sofa className="w-4.5 h-4.5" />,
    tags: ["冷氣", "冰箱", "洗衣機", "電視", "熱水器", "天然瓦斯", "床組", "衣櫃", "沙發", "書桌"]
  },
  {
    id: "facility",
    name: "大樓服務",
    icon: <Zap className="w-4.5 h-4.5" />,
    tags: ["垃圾代收", "管理員代收件", "電梯", "獨立陽台", "台水台電計費", "網路寬頻"]
  },
  {
    id: "lifestyle",
    name: "生活習慣",
    icon: <Coffee className="w-4.5 h-4.5" />,
    tags: ["可養寵物", "可開伙", "近便利商店", "近超市", "樓下有宵夜", "附近有公園"]
  },
  {
    id: "transport",
    name: "交通偏好",
    icon: <MapPin className="w-4.5 h-4.5" />,
    tags: ["近捷運 (5min內)", "近捷運 (10min內)", "近公車站", "好停機車", "有平面車位"]
  }
];

const BUDGET_PRESETS = [15000, 20000, 25000, 30000, 40000, 50000];

export default function PreferencesPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  
  const [selectedTags, setSelectedTags] = useState<Record<string, number>>({});
  const [minBudget, setMinBudget] = useState<number>(5000);
  const [maxBudget, setMaxBudget] = useState<number>(25000);
  const [budgetWeight, setBudgetWeight] = useState<number>(3);
  const [elevator, setElevator] = useState<boolean | null>(null);
  const [pets, setPets] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isMinActive, setIsMinActive] = useState(false);
  
  // ⚡ Premium Session-Driven Selection States
  const [activeCard, setActiveCard] = useState<string | null>(null); // Focused card edit pills
  const [activeSessionTags, setActiveSessionTags] = useState<string[]>([]); // Tags selected in the current editing session

  const loadPreferences = () => {
    fetch("/api/user/preferences")
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          const aiTags = res.data;
          if (typeof aiTags === "object") {
            if (aiTags.tagsWithWeight) {
              setSelectedTags(aiTags.tagsWithWeight);
            } else if (aiTags.tags && Array.isArray(aiTags.tags)) {
              const mockWeights: Record<string, number> = {};
              aiTags.tags.forEach((tag: string) => mockWeights[tag] = 2);
              setSelectedTags(mockWeights);
            }
            
            setMinBudget(aiTags.minBudget || 5000);
            setMaxBudget(aiTags.maxBudget || aiTags.budget || 25000);
            setBudgetWeight(aiTags.budgetWeight || 3);
            setElevator(aiTags.elevator ?? null);
            setPets(aiTags.pets ?? null);
          }
        }
      })
      .catch(err => console.error("Failed to fetch preferences:", err));
  };

  useEffect(() => {
    if (status === "authenticated") {
      loadPreferences();
    }
  }, [status]);

  // ⚡ Listen to AI onboarding interview finished to reactively update settings in 0ms!
  useEffect(() => {
    const handleFinished = async () => {
      console.log("[Preferences Sync] Onboarding finished! Reactively updating 35 tags...");
      loadPreferences();
      await update();
    };

    window.addEventListener('butler-interview-finished', handleFinished);
    return () => window.removeEventListener('butler-interview-finished', handleFinished);
  }, [update]);

  const handleMinBudgetChange = (val: number) => {
    setMinBudget(Math.max(0, val));
  };

  const handleMaxBudgetChange = (val: number) => {
    setMaxBudget(Math.max(0, val));
  };

  const handleSliderMinChange = (val: number) => {
    if (val <= maxBudget - 2000) {
      setMinBudget(val);
    }
  };

  const handleSliderMaxChange = (val: number) => {
    if (val >= minBudget + 2000) {
      setMaxBudget(val);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const updated = { ...prev };
      if (prev[tag]) {
        delete updated[tag]; // Unselect
        setActiveCard(null);
        setActiveSessionTags(s => s.filter(t => t !== tag)); // Remove from active session too
      } else {
        updated[tag] = 1; // Standard select (普通 / 1)
        setActiveCard(tag);
        setActiveSessionTags(s => [...s, tag]); // Add to active session
      }
      return updated;
    });
  };

  const setTagWeight = (tag: string, weight: number) => {
    setSelectedTags(prev => {
      const updated = { ...prev };
      if (weight === 0 || prev[tag] === weight) {
        delete updated[tag]; // Toggle off if clicking same weight
        setActiveSessionTags(s => s.filter(t => t !== tag));
      } else {
        updated[tag] = weight;
        if (!activeSessionTags.includes(tag)) {
          setActiveSessionTags(s => [...s, tag]);
        }
      }
      return updated;
    });
  };

  const handleBulkSetWeight = (weight: number) => {
    setSelectedTags(prev => {
      const updated = { ...prev };
      activeSessionTags.forEach(tag => {
        if (weight === 0) {
          delete updated[tag];
        } else {
          updated[tag] = weight;
        }
      });
      return updated;
    });
    setActiveSessionTags([]); // Close and clear the current editing session!
    setActiveCard(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const profileData = {
      tagsWithWeight: selectedTags,
      tags: Object.keys(selectedTags),
      minBudget,
      maxBudget,
      budgetWeight,
      elevator,
      pets
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
        
        // ⚡ Clean up active multi-edit session states instantly upon successful save!
        setActiveSessionTags([]);
        setActiveCard(null);

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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#D2691E]" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-6">
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

  const selectedCount = Object.keys(selectedTags).length;
  const sessionCount = activeSessionTags.length;

  return (
    <main 
      className="min-h-screen bg-white p-6 md:p-12 pb-36 relative"
      onClick={() => {
        setActiveCard(null);        // ⚡ Close focused card editor
        setActiveSessionTags([]);    // ⚡ Click blank area to instantly close/clear the active session, keeping all edited weights safe!
      }}
    >
      {/* Floating Saved Toast */}
      <AnimatePresence>
        {showSavedToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-32 left-1/2 z-50 bg-[#333333] text-white px-6 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-4 max-w-lg w-[92%] border border-gray-800"
          >
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0 shadow-md">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-black text-white">✨ 租屋偏好已儲存，管家準備就緒！</p>
              <p className="text-[9px] text-gray-400 font-medium mt-0.5 leading-relaxed">
                💡 溫馨提示：所有已分析房源的「契合度」與「事實對照表」，在您重新點入時都將自動以新偏好實時重組，免重解析或扣點！
              </p>
            </div>
            <Link href="/listings" className="bg-[#D2691E] text-white px-4 py-2 rounded-xl text-[10px] font-black hover:scale-[1.02] active:scale-95 transition-all shrink-0 text-center">
              比較庫
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ⚡ Floating Bulk Action Panel (Session-Driven!) */}
      <AnimatePresence>
        {sessionCount >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-28 left-1/2 z-50 bg-[#333333]/95 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl font-bold flex flex-col sm:flex-row items-center gap-4 max-w-2xl w-[92%] border border-gray-700 select-none"
            onClick={(e) => e.stopPropagation()} // Prevent toolbar click from closing itself
          >
            <span className="text-xs shrink-0 text-center">⚡ 已圈選 <span className="text-[#D2691E] font-mono text-sm">{sessionCount}</span> 個標籤，一鍵設為：</span>
            <div className="flex flex-wrap gap-2 w-full justify-center sm:justify-end">
              <button
                onClick={(e) => { e.stopPropagation(); handleBulkSetWeight(1); }}
                className="bg-green-500 text-white px-3.5 py-2 rounded-xl text-[10px] font-black hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm border border-transparent"
              >
                🟢 普通
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleBulkSetWeight(2); }}
                className="bg-[#D2691E] text-white px-3.5 py-2 rounded-xl text-[10px] font-black hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm border border-transparent"
              >
                🟠 重要
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleBulkSetWeight(3); }}
                className="bg-red-500 text-white px-3.5 py-2 rounded-xl text-[10px] font-black hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm border border-transparent"
              >
                🔴 極重要
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleBulkSetWeight(0); }}
                className="bg-gray-600 text-gray-300 px-3.5 py-2 rounded-xl text-[10px] font-black hover:scale-105 active:scale-95 transition-all cursor-pointer border border-gray-500 shadow-sm"
              >
                ⚪ 一鍵取消選取
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-12 text-left space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 bg-white rounded-xl flex-shrink-0 flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-on-surface" />
            </Link>
            <h1 className="text-4xl font-black text-on-surface">設定租屋偏好</h1>
          </div>
          <p className="text-gray-500 max-w-xl text-sm leading-relaxed">
            告訴 Butler 您的居住要求與預算，我們將為您在解析 591 時提供最精準的「智慧匹配分數」與地雷分析。
          </p>

          {/* Dynamic Preferences Nudge Banner! (Only show if no tags are configured yet!) */}
          {selectedCount === 0 && (
            <div className="bg-gradient-to-r from-[#D2691E]/10 via-amber-500/5 to-transparent border-2 border-[#D2691E]/20 p-6 rounded-3xl shadow-sm select-none">
              <div className="space-y-1">
                <h4 className="font-black text-[#D2691E] text-sm flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-[#D2691E] animate-pulse" />
                  ⚠️ 您尚未設定任何租屋偏好！
                </h4>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  請在下方點亮您的生活細節標籤、配置理想月租金區間並點擊儲存，即可立刻啟用專屬契合度打分大腦！
                </p>
              </div>
            </div>
          )}
        </header>

        <div className="grid md:grid-cols-4 gap-12">
          {/* Sidebar Navigation (Desktop Only) */}
          <div className="hidden md:block md:col-span-1">
            <div className="sticky top-32 space-y-6">
              <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">快速跳轉分區</h4>
                <nav className="space-y-2">
                  <button onClick={(e) => { e.stopPropagation(); scrollToSection("section-budget"); }} className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-white hover:text-on-surface hover:shadow-sm transition-all flex items-center gap-2 cursor-pointer border-0 bg-transparent">
                    <Sliders className="w-4 h-4 text-[#D2691E]/60" /> 預算與基本要求
                  </button>
                  {TAG_CATEGORIES.map((category) => (
                    <button 
                      key={category.id} 
                      onClick={(e) => { e.stopPropagation(); scrollToSection(`section-${category.id}`); }} 
                      className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-white hover:text-on-surface hover:shadow-sm transition-all flex items-center gap-2 cursor-pointer border-0 bg-transparent"
                    >
                      <div className="text-[#D2691E]/60">{category.icon}</div>
                      {category.name}
                    </button>
                  ))}
                </nav>
              </div>
              
              <div className="bg-[#D2691E]/5 border border-[#D2691E]/15 p-6 rounded-[2.5rem] text-xs text-[#D2691E] leading-relaxed font-bold">
                <h4 className="font-black flex items-center gap-1.5 text-sm mb-2 text-[#D2691E]">
                  <Star className="w-4.5 h-4.5 fill-[#D2691E] text-[#D2691E]" />
                  三色權重控制法
                </h4>
                <p className="mb-3 text-gray-500">選取多個標籤後，下方會自動滑出批次調整工具列：</p>
                <div className="space-y-2 text-gray-600">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> <b>普通</b> (納入篩選)</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[#D2691E] inline-block" /> <b>重要</b> (優先加權)</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> <b>極重要 ⭐</b> (核心必備)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Form Accordion/Waterfall Flow */}
          <div className="md:col-span-3 space-y-12">
            
            {/* 1. Budget & Basic Conditions */}
            <section id="section-budget" className="scroll-mt-28" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#D2691E]/10 rounded-xl flex items-center justify-center text-[#D2691E]">
                  <Sliders className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-xl font-black text-on-surface">基本條件與預算範圍</h3>
              </div>
              
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 space-y-8 shadow-sm">
                {/* Budget Double-Handle Range Slider */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end select-none">
                    <label className="text-sm font-black text-gray-700">理想月租金區間 (TWD)</label>
                    <div className="text-right">
                      <span className="text-3xl font-black text-[#D2691E] font-mono">
                        NT$ {minBudget?.toLocaleString()} ~ {maxBudget >= 200000 ? "無上限" : `${maxBudget?.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative w-full pt-6 pb-4 select-none">
                    {/* Track Background Line */}
                    <div className="absolute top-[26px] left-0 right-0 h-2 bg-gray-100 rounded-lg z-0"></div>
                    
                    {/* Highlighted Mid Track Range Line */}
                    <div 
                      className="absolute top-[26px] h-2 bg-gradient-to-r from-primary to-[#B85A15] rounded-lg z-10"
                      style={{
                        left: `${((minBudget - 5000) / (200000 - 5000)) * 100}%`,
                        width: `${((maxBudget - minBudget) / (200000 - 5000)) * 100}%`
                      }}
                    ></div>
                    
                    {/* Dual Inputs (Stacked Absolutely) */}
                    {/* Dual Inputs (Stacked Absolutely with Dynamic Z-Index Swapping!) */}
                    <input 
                      type="range" 
                      min="5000" 
                      max="200000" 
                      step="5000"
                      value={minBudget} 
                      onChange={(e) => handleSliderMinChange(parseInt(e.target.value, 10))}
                      onMouseEnter={() => setIsMinActive(true)}
                      onTouchStart={() => setIsMinActive(true)}
                      className={`absolute top-5 left-0 w-full h-2 bg-transparent appearance-none cursor-pointer pointer-events-none accent-primary focus:outline-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md ${
                        isMinActive ? "z-30" : "z-20"
                      }`}
                    />
                    <input 
                      type="range" 
                      min="5000" 
                      max="200000" 
                      step="5000"
                      value={maxBudget} 
                      onChange={(e) => handleSliderMaxChange(parseInt(e.target.value, 10))}
                      onMouseEnter={() => setIsMinActive(false)}
                      onTouchStart={() => setIsMinActive(false)}
                      className={`absolute top-5 left-0 w-full h-2 bg-transparent appearance-none cursor-pointer pointer-events-none accent-[#B85A15] focus:outline-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#B85A15] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md ${
                        isMinActive ? "z-20" : "z-30"
                      }`}
                    />
                    
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-6 select-none">
                      <span>NT$ 5,000</span>
                      <span>NT$ 50,000</span>
                      <span>NT$ 100,000</span>
                      <span>NT$ 150,000</span>
                      <span>無上限 (200K+)</span>
                    </div>

                    {/* Dynamic dual hand-typing number inputs (Strict positive integers only!) */}
                    <div className="flex items-center gap-3 mt-6 select-none">
                      <div className="flex-1 relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">最低 NT$</span>
                        <input 
                          type="text" 
                          pattern="\d*"
                          value={minBudget === 0 ? "" : minBudget}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, ""); // Strictly positive integers only!
                            const num = val ? parseInt(val, 10) : 0;
                            handleMinBudgetChange(num);
                          }}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-16 pr-4 text-xs font-black text-on-surface focus:outline-none focus:border-[#D2691E] text-right"
                          placeholder="不限"
                        />
                      </div>
                      <span className="text-gray-400 font-black text-xs select-none">至</span>
                      <div className="flex-1 relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">最高 NT$</span>
                        <input 
                          type="text" 
                          pattern="\d*"
                          value={maxBudget >= 200000 ? "" : maxBudget}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, ""); // Strictly positive integers only!
                            const num = val ? parseInt(val, 10) : 200000;
                            handleMaxBudgetChange(num);
                          }}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-16 pr-4 text-xs font-black text-on-surface focus:outline-none focus:border-[#D2691E] text-right"
                          placeholder="無上限"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Elevator and Pets Grid */}
                <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                  <div className="space-y-3">
                    <label className="block text-sm font-black text-gray-700">是否需要電梯？</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setElevator(true)}
                        className={`flex-1 py-3.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${elevator === true ? "bg-[#D2691E] border-[#D2691E] text-white shadow-md" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"}`}
                      >
                        電梯
                      </button>
                      <button 
                        onClick={() => setElevator(false)}
                        className={`flex-1 py-3.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${elevator === false ? "bg-[#D2691E] border-[#D2691E] text-white shadow-md" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"}`}
                      >
                        不需要
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-black text-gray-700">是否會養寵物？</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setPets(true)}
                        className={`flex-1 py-3.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${pets === true ? "bg-[#D2691E] border-[#D2691E] text-white shadow-md" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"}`}
                      >
                        可寵
                      </button>
                      <button 
                        onClick={() => setPets(false)}
                        className={`flex-1 py-3.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${pets === false ? "bg-[#D2691E] border-[#D2691E] text-white shadow-md" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"}`}
                      >
                        不需要
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. All Tag Categories */}
            {TAG_CATEGORIES.map((category) => (
              <section 
                key={category.id} 
                id={`section-${category.id}`}
                className="scroll-mt-28"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#D2691E]/10 rounded-xl flex items-center justify-center text-[#D2691E]">
                    {category.icon}
                  </div>
                  <h3 className="text-xl font-black text-on-surface">{category.name}</h3>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {category.tags.map((tag) => {
                    const weight = selectedTags[tag] || 0;
                    const isSelected = weight > 0;
                    const isSessionChecked = activeSessionTags.includes(tag);
                    
                    return (
                      <div
                        key={tag}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent main container click outside closing
                          
                          // Toggling card body click in the current editing session
                          if (activeCard === tag) {
                            toggleTag(tag);
                          } else {
                            setActiveCard(tag);
                            
                            // Auto-select & add to the active editing session basket
                            if (!selectedTags[tag]) {
                              setSelectedTags(prev => ({ ...prev, [tag]: 1 }));
                            }
                            if (!activeSessionTags.includes(tag)) {
                              setActiveSessionTags(prev => [...prev, tag]);
                            }
                          }
                        }}
                        className={`p-5 rounded-[2rem] border-2 text-left transition-all duration-300 relative overflow-hidden group cursor-pointer flex flex-col justify-between ${
                          isSessionChecked ? "bg-blue-50/10 border-dashed border-blue-500 text-on-surface scale-[1.01] shadow-sm animate-pulse" :
                          activeCard === tag ? "min-h-[145px] ring-2 ring-[#D2691E]/25" : "min-h-[100px]"
                        } ${
                          weight === 3 ? "bg-red-500/5 border-red-500 text-on-surface scale-[1.01] shadow-sm" :
                          weight === 2 ? "bg-orange-50/20 border-[#D2691E] text-on-surface shadow-sm" :
                          weight === 1 ? "bg-green-50/15 border-green-500 text-on-surface" :
                          "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
                        }`}
                      >
                        {/* Weight Star Badge inside tags */}
                        <div className="flex justify-between items-start w-full mb-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSessionChecked ? "bg-blue-500 border-blue-500 text-white shadow-md" :
                            weight === 3 ? "bg-red-500 border-red-500 text-white" :
                            weight === 2 ? "bg-[#D2691E] border-[#D2691E] text-white" :
                            weight === 1 ? "bg-green-500 border-green-500 text-white" :
                            "border-gray-200"
                          }`}>
                            {(isSelected || isSessionChecked) && <Check className="w-3 h-3 text-white" />}
                          </div>

                          {!isSessionChecked && weight === 3 && (
                            <Star className="w-4 h-4 fill-red-500 text-red-500 animate-bounce" />
                          )}
                        </div>
                        
                        <div className="w-full flex flex-col flex-1 justify-between">
                          <div>
                            <span className="font-black text-sm tracking-tight block">
                              {tag}
                            </span>
                            <div className="text-[9px] font-black mt-0.5 uppercase tracking-wider text-gray-400">
                              {isSessionChecked ? "🎯 本次編輯選取中" : (
                                <>
                                  {weight === 0 && "未選取"}
                                  {weight === 1 && "優先度：普通"}
                                  {weight === 2 && "優先度：重要"}
                                  {weight === 3 && "優先度：極重要"}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Direct 1-Click Selector Row */}
                          {!isSessionChecked && activeCard === tag && (
                            <div 
                              className="flex gap-1 mt-3 pt-2.5 border-t border-gray-100 w-full" 
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => setTagWeight(tag, 1)}
                                className={`flex-1 py-1.5 rounded-lg text-[8px] font-black transition-all border cursor-pointer ${
                                  weight === 1 
                                    ? "bg-green-500 text-white border-green-500 shadow-sm" 
                                    : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"
                                }`}
                                title="普通優先度"
                              >
                                普通
                              </button>
                              <button
                                onClick={() => setTagWeight(tag, 2)}
                                className={`flex-1 py-1.5 rounded-lg text-[8px] font-black transition-all border cursor-pointer ${
                                  weight === 2 
                                    ? "bg-[#D2691E] text-white border-[#D2691E] shadow-sm" 
                                    : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"
                                }`}
                                title="重要加權"
                              >
                                重要
                              </button>
                              <button
                                onClick={() => setTagWeight(tag, 3)}
                                className={`flex-1 py-1.5 rounded-lg text-[8px] font-black transition-all border cursor-pointer ${
                                  weight === 3 
                                    ? "bg-red-500 text-white border-red-500 shadow-sm" 
                                    : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"
                                }`}
                                title="核心極重要"
                              >
                                極重要
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM ACTION BAR FOR SAVING */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 py-5 z-40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D2691E]/10 text-[#D2691E] rounded-full flex items-center justify-center">
              <Tags className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-gray-400 uppercase">選取進度</div>
              <div className="text-sm font-black text-on-surface mt-0.5">
                已選取 <span className="text-[#D2691E] font-mono text-base">{selectedCount}</span> 個居住標籤
              </div>
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto bg-[#D2691E] hover:bg-[#b25915] text-white px-12 py-4 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            {isSaving ? "正在同步偏好..." : "確認儲存租屋偏好設定"}
          </button>
        </div>
      </div>
    </main>
  );
}
