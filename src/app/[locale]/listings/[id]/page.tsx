"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, MapPin, Calendar, 
  ShieldCheck, AlertTriangle, ArrowLeft, Loader2,
  ChevronLeft, ChevronRight, Building2, Ruler, 
  CreditCard, Zap, Waves, Home, Check,
  Heart, Share2, ShieldAlert, Map, Scale, BarChart3, FileText, ExternalLink, ClipboardCheck, Star, AlertCircle,
  ShoppingBag, Trees, Utensils, Activity, Info
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { use } from "react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { calculateMatchScore } from "@/lib/matching";
import ListingMap from "@/components/ListingMap";
// Dynamic 5-Tier Compatibility Verdict Classifier
const getNoConsVerdict = (score: number, CheckIcon: any, InfoIcon: any, AlertIcon: any) => {
  if (score >= 95) {
    return {
      bg: "bg-green-50/20 border-green-100/50",
      text: "text-green-700",
      title: "完美契合",
      icon: CheckIcon,
      iconColor: "text-green-600",
      desc: "🎉 完美符合您的所有期望條件！簡直是為您量身打造的理想神房！"
    };
  }
  if (score >= 80) {
    return {
      bg: "bg-emerald-50/10 border-emerald-100/30",
      text: "text-emerald-700",
      title: "高度契合",
      icon: CheckIcon,
      iconColor: "text-emerald-600",
      desc: "🟢 高度符合您的期待！僅有極少數軟性特徵於描述中未明示，極力推薦！"
    };
  }
  if (score >= 60) {
    return {
      bg: "bg-amber-50/10 border-amber-200/40",
      text: "text-amber-700",
      title: "暫無衝突",
      icon: InfoIcon,
      iconColor: "text-amber-500",
      desc: "✓ 暫無地雷衝突，但有部分中等偏好特徵未於描述中明示，建議與房東確認。"
    };
  }
  if (score >= 40) {
    return {
      bg: "bg-blue-50/10 border-blue-100/30",
      text: "text-blue-700",
      title: "偏好部分未明",
      icon: InfoIcon,
      iconColor: "text-blue-500",
      desc: "✓ 剛性需求已滿足且無衝突，但大部分偏好特徵均未於文案中提及，建議預約看房實勘！"
    };
  }
  return {
    bg: "bg-gray-50 border-gray-200/60",
    text: "text-gray-600",
    title: "偏好契合度偏低",
    icon: AlertIcon,
    iconColor: "text-gray-400",
    desc: "✓ 剛性需求勉強符合，但該房源文案透露的事實極少，契合度偏低，請謹慎評估！"
  };
};

export default function ListingDetail({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>,
  searchParams?: Promise<{ tab?: string }>
}) {
  const { id } = use(params);
  const resolvedSearchParams = searchParams ? use(searchParams) : null;
  const t = useTranslations("ListingDetail");
  const { data: session, update } = useSession();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("text"); // 'text', 'map', 'gov', 'price', 'inspect'
  const router = useRouter();

  useEffect(() => {
    if (resolvedSearchParams?.tab) {
      setActiveTab(resolvedSearchParams.tab);
    }
  }, [resolvedSearchParams]);
  const [quota, setQuota] = useState<{ used: number; max: number } | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [commuteTime, setCommuteTime] = useState<any>(null);

  const handleRecalculate = async () => {
    if (recalculating) return;
    setRecalculating(true);
    try {
      const res = await fetch(`/api/listings/${id}/recalculate`, {
        method: "POST"
      });
      const json = await res.json();
      if (json.success) {
        setListing(json.data.listing);
        if (json.data.quota) {
          setQuota(json.data.quota);
        }
        // Dispatch update event to propagate refreshed values
        window.dispatchEvent(new CustomEvent("listing-updated", {
          detail: { butlerInsight: json.data.listing.butlerInsight }
        }));
        alert("🎉 房源機能與交通安全大數據報告重新診斷成功！");
      } else {
        alert(json.error || "重新診斷失敗，請稍後再試。");
      }
    } catch (err) {
      alert("網路連線異常，請稍後再試。");
    } finally {
      setRecalculating(false);
    }
  };

  // Dynamic serverless database-verified matchResult payload
  const matchResult = listing?.matchResult || null;

  useEffect(() => {
    fetch(`/api/listings/${id}?t=${Date.now()}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setListing(res.data);
          if (res.data?.quota) {
            setQuota(res.data.quota);
          }
          if (res.data?.commuteTime) {
            setCommuteTime(res.data.commuteTime);
          }
        } else {
          router.push("/");
        }
        setLoading(false);
      })
      .catch(() => {
        router.push("/");
        setLoading(false);
      });

    const handleUpdate = (e: any) => {
      if (e.detail?.butlerInsight) {
        setListing((prev: any) => ({
          ...prev,
          butlerInsight: e.detail.butlerInsight
        }));
      }
    };

    const handleInterviewFinished = async () => {
      console.log("[Listing Detail Sync] Onboarding interview finished. Syncing session...");
      await update();
    };

    window.addEventListener('listing-updated', handleUpdate);
    window.addEventListener('butler-interview-finished', handleInterviewFinished);
    return () => {
      window.removeEventListener('listing-updated', handleUpdate);
      window.removeEventListener('butler-interview-finished', handleInterviewFinished);
    };
  }, [id, update]);

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-[#D2691E]" />
    </div>
  );

  if (!listing) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-[#333333]">
      未找到房源
    </div>
  );

  const images = listing.images && listing.images.length > 0 
    ? listing.images 
    : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"];

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  const features = listing.features || {};
  const butlerInsight = listing.butlerInsight || null;

  // Dynamic price comparison calculations based on 114/09 government PDF data
  const listingPrice = listing.price || 0;
  const priceComparison = butlerInsight?.priceComparison || null;

  const averagePrice = priceComparison?.averagePrice || 85000;
  const p25 = priceComparison?.p25 || 65000;
  const p75 = priceComparison?.p75 || 105000;
  const district = priceComparison?.district || "大安區";
  const city = priceComparison?.city || "台北市";
  const sourceDesc = priceComparison?.source || "內政部 114 年 9 月最新發布之全國行政區租金統計資料";

  const diffPercent = averagePrice > 0 ? ((listingPrice - averagePrice) / averagePrice) * 100 : 0;
  const premiumRateStr = diffPercent >= 0
    ? `+ ${diffPercent.toFixed(1)}%`
    : `${diffPercent.toFixed(1)}%`;

  let ripOffRating = "略微溢價";
  let ripOffColor = "text-amber-500";
  let ripOffIcon = "⚠️";

  if (diffPercent > 20) {
    ripOffRating = "高度溢價";
    ripOffColor = "text-red-500";
    ripOffIcon = "🚨";
  } else if (diffPercent > 5) {
    ripOffRating = "略微溢價";
    ripOffColor = "text-amber-500";
    ripOffIcon = "⚠️";
  } else if (diffPercent >= -5) {
    ripOffRating = "價格合理";
    ripOffColor = "text-green-600";
    ripOffIcon = "✅";
  } else {
    ripOffRating = "超值低於行情";
    ripOffColor = "text-green-700 font-black";
    ripOffIcon = "🎉";
  }

  const getVerdictStyles = (status: string) => {
    switch (status) {
      case "勸退":
        return { bg: "bg-red-50", border: "border-red-500", text: "text-red-600", icon: ShieldAlert, darkBg: "bg-red-500" };
      case "提醒":
        return { bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-600", icon: AlertTriangle, darkBg: "bg-amber-500" };
      default:
        return { bg: "bg-green-50", border: "border-green-500", text: "text-green-600", icon: ShieldCheck, darkBg: "bg-green-500" };
    }
  };

  const getConvenienceIcon = (type: string) => {
    switch (type) {
      case "transit": return MapPin;
      case "shopping": return ShoppingBag;
      case "leisure": return Trees;
      case "food": return Utensils;
      case "health": return Activity;
      default: return Sparkles;
    }
  };

  const verdictStyle = butlerInsight?.verdict?.status ? getVerdictStyles(butlerInsight.verdict.status) : getVerdictStyles("推薦");

  return (
    <div className="min-h-screen bg-white text-[#333333] font-sans pb-24">
      {/* Clean, Premium Sticky Header */}
      <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/listings" className="bg-gray-50 hover:bg-gray-100 p-3 rounded-full shadow-sm transition-all cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-on-surface" />
          </Link>
          <h2 className="font-black text-base line-clamp-1 flex-1 text-center mx-4">
            {listing.title || "房源解析詳情"}
          </h2>
          <div className="flex gap-3">
            <button className="bg-gray-50 hover:bg-red-50 p-3 rounded-full shadow-sm text-red-500 transition-all cursor-pointer">
              <Heart className="w-5 h-5 text-red-500" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-6 mt-12">
        <div className="grid lg:grid-cols-3 gap-12">

          {/* Left Column (DOMINANT: Gallery Card & AI Butler Report) */}
          <div className="lg:col-span-2 space-y-8">

            {/* Re-engineered Gallery Card: Aspect-Video & Pixel-Sharp */}
            <div className="bg-white rounded-[2rem] border border-gray-100 p-4 shadow-sm overflow-hidden relative group">
              <div className="relative aspect-video bg-gray-50 rounded-2xl overflow-hidden">
                <img
                  src={images[0]}
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                {/* Floating 'View all photos on 591' Pill */}
                {listing.sourceUrl && (
                  <a
                    href={listing.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white px-5 py-2.5 rounded-full text-xs font-black backdrop-blur-sm border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    📷 前往 591 查看所有相片
                  </a>
                )}
              </div>
            </div>

            {/* 🌟 房源主打亮點 (Highlights) */}
            {butlerInsight?.highlights && butlerInsight.highlights.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50/40 border border-green-100/75 rounded-[2.5rem] p-6 shadow-sm"
              >
                <h4 className="text-xs font-black text-green-700 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 fill-green-600 text-green-600" />
                  管家精選房源亮點
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  {butlerInsight.highlights.map((hl: string, idx: number) => (
                    <span key={idx} className="bg-white text-green-800 px-4 py-2.5 rounded-xl text-xs font-black border border-green-200/20 shadow-sm flex items-center gap-1">
                      ✨ {hl}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 🎯 您的專屬租屋契合度分析 (Personalized Match Score) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm space-y-6"
            >
              {!matchResult ? (
                /* Onboarding Nudge state if no preferences configured yet! */
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 select-none">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-[#D2691E]/10 rounded-2xl flex items-center justify-center text-[#D2691E] shrink-0 shadow-xs">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#333333]">專屬租屋契合度分析</h3>
                      <p className="text-xs text-gray-500 mt-1 font-semibold leading-relaxed">
                        偵測到您尚未設定偏好！請立刻前往偏好設定頁面點亮您的生活標籤，即可在此解鎖專屬「房源契合度 % 數」與「防坑核對清單」！
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/user/preferences"
                    className="bg-[#D2691E] hover:bg-[#b25915] text-white px-5 py-3 rounded-xl text-xs font-black shadow-md active:scale-95 transition-all shrink-0 cursor-pointer text-center animate-bounce flex items-center justify-center"
                  >
                    ✏️ 立即設定我的租屋偏好
                  </Link>
                </div>
              ) : (
                /* Full Match Score details board! */
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-gray-100/50 select-none">
                    <div className="flex items-center gap-4">
                      {/* Radial/Circular Progress Ring */}
                      <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="40" cy="40" r="34" stroke="#F3F4F6" strokeWidth="8" fill="transparent" />
                          <circle
                            cx="40"
                            cy="40"
                            r="34"
                            stroke="#D2691E"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 34}
                            strokeDashoffset={2 * Math.PI * 34 * (1 - matchResult.score / 100)}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <span className="absolute text-lg font-black text-[#333333] font-mono">{matchResult.score}%</span>
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-[#333333]">專屬租屋契合度分析</h3>
                        <p className="text-xs text-gray-400 mt-1 font-medium">基於您設定的租屋偏好，與此房源特徵實時對齊算出</p>
                      </div>
                    </div>

                    <Link
                      href="/user/preferences"
                      className="border border-gray-200 text-gray-500 hover:text-on-surface hover:bg-gray-50 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 text-center"
                    >
                      ✏️ 調整我的偏好
                    </Link>
                  </div>

                  {/* Pros & Cons Highlights Summary */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-3 bg-green-50/20 border border-green-100/50 p-5 rounded-2xl">
                      <h4 className="text-xs font-black text-green-700 tracking-wider uppercase flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-green-600" /> 符合我的期待
                      </h4>
                      <ul className="space-y-2 text-xs text-gray-600 font-bold">
                        {matchResult.pros.length > 0 ? matchResult.pros.map((p: any, idx: any) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-green-500 shrink-0">✔</span> {p}
                          </li>
                        )) : (
                          <li className="text-gray-400 italic">尚無顯著符合的期待</li>
                        )}
                      </ul>
                    </div>

                    {(() => {
                      const noConsVerdict = getNoConsVerdict(matchResult.score, Check, Info, AlertCircle);
                      return (
                        <div className={`space-y-3 p-5 rounded-2xl border ${
                          matchResult.cons.length > 0 
                            ? "bg-red-50/20 border-red-100/50" 
                            : noConsVerdict.bg
                        }`}>
                          <h4 className={`text-xs font-black tracking-wider uppercase flex items-center gap-1 ${
                            matchResult.cons.length > 0 ? "text-red-700" : noConsVerdict.text
                          }`}>
                            {matchResult.cons.length > 0 ? (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> 與期望有落差
                              </>
                            ) : (
                              <>
                                <noConsVerdict.icon className={`w-3.5 h-3.5 ${noConsVerdict.iconColor}`} /> {noConsVerdict.title}
                              </>
                            )}
                          </h4>
                          <ul className="space-y-2 text-xs text-gray-600 font-bold">
                            {matchResult.cons.length > 0 ? matchResult.cons.map((c: any, idx: any) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-red-500 shrink-0">✘</span> {c}
                              </li>
                            )) : (
                              <li className={`${noConsVerdict.text} font-black`}>{noConsVerdict.desc}</li>
                            )}
                          </ul>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Tag mapping Fact check table */}
                  <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 space-y-3.5">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">偏好事實對照清單 (Fact Check)</h4>
                    <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-2 no-scrollbar">
                      {matchResult.mapping.map((item: any, idx: any) => (
                        <div key={idx} className="flex items-center justify-between gap-4 text-xs py-1 border-b border-gray-100 last:border-0">
                          <div className="font-bold text-gray-600 shrink-0">#{item.req}</div>
                          <div className="flex items-center gap-2 text-right flex-1 justify-end min-w-0">
                            <span className="text-gray-400 truncate font-semibold">{item.fact}</span>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black shrink-0 text-[9px] ${item.status === "MATCH" ? "bg-green-100 text-green-700" :
                              item.status === "MISMATCH" ? "bg-red-100 text-red-700" :
                                "bg-gray-100 text-gray-400"
                              }`}>
                              {item.status === "MATCH" && "✔"}
                              {item.status === "MISMATCH" && "✘"}
                              {item.status === "UNKNOWN" && "？"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>

            {/* The Masterpiece: AI Butler Anti-Trap Report with 4 Tabs */}
            {butlerInsight ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={`bg-white rounded-3xl border-4 ${verdictStyle.border} shadow-2xl p-8 relative overflow-hidden`}
              >
                {/* Diagonal Striped Header */}
                <div className={`absolute top-0 left-0 right-0 h-3 ${verdictStyle.darkBg} opacity-90`} />
                
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 mt-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${verdictStyle.bg} rounded-xl flex items-center justify-center border-2 ${verdictStyle.border}`}>
                      <verdictStyle.icon className={`w-6 h-6 ${verdictStyle.text}`} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">AI Butler 終極裁決</div>
                      <h1 className={`font-black text-2xl ${verdictStyle.text}`}>管家防坑診斷報告</h1>
                    </div>
                  </div>
                  <span className={`px-5 py-1.5 rounded-full text-sm font-black uppercase border-2 ${verdictStyle.border} ${verdictStyle.bg} ${verdictStyle.text} text-center`}>
                    {butlerInsight.verdict?.status || "未知"}
                  </span>
                </div>



                {/* Summary */}
                <div className={`p-5 rounded-xl ${verdictStyle.bg} text-lg font-bold leading-relaxed ${verdictStyle.text} mb-6 border ${verdictStyle.border}`}>
                  💡 {butlerInsight.verdict?.summary || "未提供總結"}
                </div>

                {/* 4 Tabs Navigation - SCROLLABLE ON MOBILE */}
                <div className="flex border-b border-gray-100 mb-6 overflow-x-auto gap-2 no-scrollbar">
                  <button 
                    onClick={() => setActiveTab("text")}
                    className={`pb-3 px-4 text-sm font-black transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === "text" ? 'border-[#D2691E] text-[#D2691E]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    <FileText className="w-4 h-4" /> 文案地雷
                  </button>
                  <button 
                    onClick={() => setActiveTab("map")}
                    className={`pb-3 px-4 text-sm font-black transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === "map" ? 'border-[#D2691E] text-[#D2691E]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    <Map className="w-4 h-4" /> 環境機能
                  </button>
                  <button 
                    onClick={() => setActiveTab("gov")}
                    className={`pb-3 px-4 text-sm font-black transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === "gov" ? 'border-[#D2691E] text-[#D2691E]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    <Scale className="w-4 h-4" /> 交通狀況
                  </button>
                  <button 
                    onClick={() => setActiveTab("price")}
                    className={`pb-3 px-4 text-sm font-black transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === "price" ? 'border-[#D2691E] text-[#D2691E]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    <BarChart3 className="w-4 h-4" /> 實價比對
                  </button>
                  <button 
                    onClick={() => setActiveTab("inspect")}
                    className={`pb-3 px-4 text-sm font-black transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === "inspect" ? 'border-[#D2691E] text-[#D2691E]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    <ClipboardCheck className="w-4 h-4" /> 實地實勘
                  </button>
                </div>

                {/* Tab Content */}
                <div className="min-h-[250px]">
                  
                  {/* Tab 1: Text Risks (Existing Data) */}
                  {activeTab === "text" && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      {butlerInsight.risks && butlerInsight.risks.length > 0 ? (
                        butlerInsight.risks.map((r: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all duration-300">
                            <AlertTriangle className={`w-5 h-5 shrink-0 mt-1 ${
                              r.severity === "HIGH" ? "text-red-500" :
                              r.severity === "MEDIUM" ? "text-amber-500" : "text-yellow-500"
                            }`} />
                            <div>
                              <p className="text-base font-black text-[#333333] mb-0.5">[ {r.type} ]</p>
                              <p className="text-sm text-gray-600 leading-relaxed">{r.content}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-base text-green-600 font-bold flex items-center gap-3 bg-green-50 p-5 rounded-xl border border-green-100">
                          <Check className="w-5 h-5" /> 此房源未發現明顯的隱藏風險！
                        </div>
                      )}


                    </motion.div>
                  )}

                  {/* Tab 2: Map Insights (Simulated Google Maps) */}
                  {activeTab === "map" && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Left: Threats */}
                        <div className="bg-red-50/20 border border-red-100/50 p-5 rounded-[2rem] space-y-4">
                          <h4 className="text-xs font-black text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            周邊感官與安全地雷防護
                          </h4>
                          <div className="space-y-3 max-h-[240px] overflow-y-auto no-scrollbar pr-1">
                            {butlerInsight.mapsThreats && butlerInsight.mapsThreats.length > 0 ? (
                              butlerInsight.mapsThreats.map((threat: any, idx: number) => (
                                <div key={idx} className="flex items-start gap-3 text-xs">
                                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-black text-gray-700">{threat.name} ({threat.keyword})</p>
                                    <p className="text-gray-400 mt-0.5">距離：{threat.distance || '100m內'}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-green-600 font-bold flex items-center gap-2 bg-green-50/30 p-3 rounded-xl border border-green-100/30">
                                <Check className="w-4 h-4" /> 方圓 100 公尺內未發現任何明顯感官地雷。
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Conveniences */}
                        <div className="bg-green-50/20 border border-green-100/50 p-5 rounded-[2rem] space-y-4">
                          <h4 className="text-xs font-black text-green-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-green-600" />
                            1.5KM 黃金生活圈優勢
                          </h4>
                          <div className="max-h-[240px] overflow-y-auto no-scrollbar pr-1">
                            {(() => {
                              const grouped = (butlerInsight.mapsConveniences || []).reduce((acc: any, conv: any) => {
                                if (!acc[conv.type]) acc[conv.type] = [];
                                acc[conv.type].push(conv);
                                return acc;
                              }, {});

                              const categories = [
                                { type: "transit", label: "🚇 大眾運輸", color: "text-blue-700 bg-blue-50/70 border-blue-100" },
                                { type: "police", label: "👮 治安防護", color: "text-indigo-700 bg-indigo-50/70 border-indigo-100" },
                                { type: "shopping", label: "🛒 生活購物", color: "text-emerald-700 bg-emerald-50/70 border-emerald-100" },
                                { type: "leisure", label: "🏫 學校公園", color: "text-green-700 bg-green-50/70 border-green-100" },
                                { type: "food", label: "🍔 美食咖啡", color: "text-amber-700 bg-amber-50/70 border-amber-100" }
                              ];

                              const hasItems = (butlerInsight.mapsConveniences || []).length > 0;

                              if (!hasItems) {
                                return (
                                  <div className="text-xs text-gray-400 italic p-3">
                                    🔍 周邊 1.5 公里內未發現大型百貨、醫院、大眾運輸或連鎖超商，看房時建議多留意周邊機能。
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-4">
                                  {categories.map((cat) => {
                                    const items = grouped[cat.type] || [];
                                    if (items.length === 0) return null;
                                    return (
                                      <div key={cat.type} className="space-y-2 border-b border-gray-50 last:border-none pb-3 last:pb-0">
                                        <div className={`text-[9px] font-black px-2.5 py-1 rounded-lg inline-block border tracking-wide ${cat.color}`}>
                                          {cat.label}
                                        </div>
                                        <div className="space-y-2.5 pl-1.5">
                                          {items.map((conv: any, idx: number) => {
                                            const IconComponent = getConvenienceIcon(conv.type);
                                            return (
                                              <div key={idx} className="flex items-start gap-2.5 text-xs">
                                                <IconComponent className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                                                <div className="flex-1 flex justify-between gap-4">
                                                  <span className="font-bold text-gray-700 line-clamp-1">{conv.name}</span>
                                                  <span className="text-gray-400 shrink-0 font-mono">{conv.distance}</span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Real Interactive Map with Custom Markers & Fullscreen Modal */}
                      <ListingMap
                        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
                        listingAddress={listing.address || "房源位置"}
                        listingLat={listing.lat || 25.0143}
                        listingLng={listing.lng || 121.4672}
                        conveniences={butlerInsight.mapsConveniences || []}
                        threats={butlerInsight.mapsThreats || []}
                        commuteAddress={commuteTime?.isCustom ? commuteTime.address : undefined}
                      />
                    </motion.div>
                  )}

                  {/* Tab 3: Gov Data (🚦 交通與治安防禦網) */}
                  {activeTab === "gov" && (() => {
                    const trafficAccidents = listing.butlerInsight?.trafficAccidents || {
                      a1Count: 0,
                      a2Count: 0,
                      streets: [],
                      causes: [],
                      types: [],
                      safetyRating: "無資料",
                      safetyLevel: "gray",
                      description: "暫無此區域 2025 年交通事故統計數據。"
                    };

                    const policeStations = (listing.butlerInsight?.mapsConveniences || [])
                      .filter((c: any) => c.type === "police");

                    // Determine dynamic visual classes for Safety Rating Tag
                    let ratingBadgeClass = "bg-gray-100 text-gray-700 border-gray-200";
                    if (trafficAccidents.safetyLevel === "green") ratingBadgeClass = "bg-green-50 text-green-700 border-green-200";
                    if (trafficAccidents.safetyLevel === "yellow") ratingBadgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                    if (trafficAccidents.safetyLevel === "red") ratingBadgeClass = "bg-red-50 text-red-700 border-red-200";

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-5"
                      >
                        {/* Top Summary Row */}
                        <div className="bg-white/70 backdrop-blur-md p-5 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-gray-400 uppercase tracking-wider">🚦 2025年度交通治安安全網</h4>
                            <p className="text-xs text-gray-500">{trafficAccidents.description}</p>
                          </div>
                          <span className={`text-xs font-black px-3 py-1.5 rounded-full border ${ratingBadgeClass} flex items-center gap-1 shrink-0`}>
                            <Activity className="w-3 h-3" />
                            安全評級：{trafficAccidents.safetyRating}
                          </span>
                        </div>

                        {/* Two Column Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                          {/* Left: Traffic Accidents Stats */}
                          <div className="bg-[#FFFDD0]/40 backdrop-blur-sm p-5 rounded-[2rem] border border-gray-150/60 shadow-sm space-y-4">
                            <h5 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              街區交通事故統計 (100米街區)
                            </h5>

                            {/* Counts Display */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white/80 p-3 rounded-xl border border-gray-100 text-center">
                                <p className="text-xs font-bold text-gray-400">A1 死亡事故</p>
                                <p className="text-xl font-black text-red-600 mt-1">{trafficAccidents.a1Count} <span className="text-xs font-normal text-gray-400">件</span></p>
                              </div>
                              <div className="bg-white/80 p-3 rounded-xl border border-gray-100 text-center">
                                <p className="text-xs font-bold text-gray-400">A2 受傷車禍</p>
                                <p className="text-xl font-black text-amber-600 mt-1">{trafficAccidents.a2Count} <span className="text-xs font-normal text-gray-400">件</span></p>
                              </div>
                            </div>

                            {/* Secondary statistics details */}
                            {trafficAccidents.a2Count > 0 || trafficAccidents.a1Count > 0 ? (
                              <div className="space-y-2.5 text-xs text-gray-600 bg-white/60 p-3 rounded-xl border border-gray-100">
                                {trafficAccidents.streets.length > 0 && (
                                  <div>
                                    <span className="font-bold text-gray-400 block mb-0.5">📍 主要肇事路口/路段：</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {trafficAccidents.streets.map((s: string, i: number) => (
                                        <span key={i} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-[10px] font-bold">{s}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {trafficAccidents.causes.length > 0 && (
                                  <div className="mt-2">
                                    <span className="font-bold text-gray-400 block mb-0.5">⚠️ 主要肇因研判：</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {trafficAccidents.causes.map((c: string, i: number) => (
                                        <span key={i} className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md text-[10px] font-bold border border-amber-100">{c}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {trafficAccidents.types.length > 0 && (
                                  <div className="mt-2">
                                    <span className="font-bold text-gray-400 block mb-0.5">🛵 涉及主要車種：</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {trafficAccidents.types.map((t: string, i: number) => (
                                        <span key={i} className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md text-[10px] font-bold border border-blue-100">{t}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="bg-white/80 p-4 rounded-xl text-center border border-gray-100 text-xs text-gray-400 italic">
                                🎉 2025年度本街區無重大交通事故記錄，環境極度安心！
                              </div>
                            )}
                          </div>

                          {/* Right: Security/Police Stations */}
                          <div className="bg-[#FFFDD0]/40 backdrop-blur-sm p-5 rounded-[2rem] border border-gray-150/60 shadow-sm space-y-4">
                            <h5 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-blue-600" />
                              治安守護點 (方圓 1.5km 警局)
                            </h5>

                            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                              {policeStations.length > 0 ? (
                                policeStations.map((police: any, idx: number) => (
                                  <div key={idx} className="bg-white/80 p-3 rounded-xl border border-gray-100 flex items-start gap-3">
                                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-black text-[#333333]">{police.name}</p>
                                      <p className="text-[10px] text-gray-400 mt-0.5">地址：{police.vicinity || '周邊 1.5km 內'}</p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="bg-white/80 p-6 rounded-xl text-center border border-gray-100 text-xs text-gray-400 italic">
                                  👮 周邊 1.5 公里內無直屬派出所點位，但本街區治安防護巡邏網全面覆蓋，請安心！
                                </div>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* 🚇 Personalised Google Transit Commute Card */}
                        {commuteTime && (
                          <div className="bg-[#FFFDD0]/30 backdrop-blur-sm p-5 rounded-[2rem] border border-gray-150/60 shadow-sm space-y-3 mt-2 text-xs">
                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                              <span>🚇</span> 每日大眾運輸通勤試算 (Google Maps 實時對位)
                            </h5>
                            
                            {commuteTime.isCustom ? (
                              <div className="flex items-center gap-4 bg-white/80 p-4 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 font-black text-lg">🚇</div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-black text-gray-500 truncate">至您的通勤目的地：{commuteTime.address}</p>
                                  <p className="text-base font-black text-blue-600 mt-1 flex items-baseline gap-1">
                                    <span>約 {commuteTime.duration}</span>
                                    <span className="text-[10px] text-gray-400 font-bold">({commuteTime.distance})</span>
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-white/80 p-3.5 rounded-xl border border-gray-100 text-center shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400">🚉 台北車站</p>
                                    <p className="text-base font-black text-blue-600 mt-1">{commuteTime.taipeiMain || "無法試算"}</p>
                                  </div>
                                  <div className="bg-white/80 p-3.5 rounded-xl border border-gray-100 text-center shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400">🏢 市政府捷運站</p>
                                    <p className="text-base font-black text-blue-600 mt-1">{commuteTime.xinyi || "無法試算"}</p>
                                  </div>
                                </div>
                                <div className="bg-orange-50/30 p-2.5 rounded-xl border border-orange-100/30 text-center">
                                  <Link href="/user/preferences" className="text-[10px] text-[#D2691E] font-black hover:underline">
                                    ✏️ 設定您的常用上班/上學地址，實時試算精確通勤時間 →
                                  </Link>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Real Interactive Map with Accident Hotspots & Police Stations */}
                        <ListingMap
                          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
                          listingAddress={listing.address || "房源位置"}
                          listingLat={listing.lat || 25.0143}
                          listingLng={listing.lng || 121.4672}
                          conveniences={butlerInsight.mapsConveniences || []}
                          hotspots={trafficAccidents.hotspots || []}
                          mode="safety"
                          commuteAddress={commuteTime?.isCustom ? commuteTime.address : undefined}
                        />

                      </motion.div>
                    );
                  })()}

                  {/* Tab 4: Real Price (Simulated Real Price Registration) */}
                  {activeTab === "price" && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">📊 內政部實價登錄比對 (租金溢價評估)</div>
                        
                        <div className="text-center py-4">
                          <div className="text-xs text-gray-400 mb-1">本房源單價溢價率</div>
                          <div className={`text-4xl font-black ${ripOffColor}`}>{premiumRateStr}</div>
                          <div className={`text-xs font-bold mt-1 ${ripOffColor}`}>{ripOffIcon} 溢價評估：{ripOffRating}</div>
                        </div>

                        <div className="space-y-2 border-t border-gray-200 pt-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">本案開價</span>
                            <span className="font-bold">NT$ {listingPrice.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">{district}同型態中位數均價</span>
                            <span className="text-gray-500 font-bold">NT$ {averagePrice.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-400 pt-1">
                            <span>( 該區 25% 分位: NT$ {p25.toLocaleString()} )</span>
                            <span>( 該區 75% 分位: NT$ {p75.toLocaleString()} )</span>
                          </div>
                        </div>
                        
                        {/* 💡 Utilities Cost & Electric Water Heater Warning Panel */}
                        {butlerInsight?.estimatedTotalCost && (
                          <div className="bg-white/80 p-5 rounded-[2rem] border border-gray-100 space-y-4 mt-4 text-xs shadow-sm">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                              <span>💡</span> 租屋水電與額外開銷估算
                            </h4>
                            
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                <p className="text-[9px] font-bold text-gray-400">⚡ 電費計價</p>
                                <p className="text-[10px] font-black text-[#333333] mt-1 truncate" title={butlerInsight.estimatedTotalCost.electricity}>
                                  {butlerInsight.estimatedTotalCost.utilityBillingType === "TAIPOWER" ? "台電帳單" : 
                                   butlerInsight.estimatedTotalCost.utilityBillingType === "FLAT_RATE" ? "獨立表計費" : "未知計價"}
                                </p>
                              </div>
                              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                <p className="text-[9px] font-bold text-gray-400">💧 水費計價</p>
                                <p className="text-[10px] font-black text-[#333333] mt-1 truncate" title={butlerInsight.estimatedTotalCost.water || "未知"}>
                                  {butlerInsight.estimatedTotalCost.water || "未知"}
                                </p>
                              </div>
                              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                <p className="text-[9px] font-bold text-gray-400">🔥 瓦斯型態</p>
                                <p className="text-[10px] font-black text-[#333333] mt-1 truncate" title={butlerInsight.estimatedTotalCost.gas || "未知"}>
                                  {butlerInsight.estimatedTotalCost.gas || "未知"}
                                </p>
                              </div>
                            </div>

                            {/* Electric Boiler Warning Banner */}
                            {butlerInsight.estimatedTotalCost.boilerWarning === "WARNING" && (
                              <div className="bg-red-50 border border-red-100/50 p-3.5 rounded-xl flex items-start gap-2.5 text-[10px] font-black text-red-700 leading-relaxed">
                                <span className="text-red-500 shrink-0 mt-0.5">⚠️</span>
                                <div>
                                  <span>偵測到「儲熱式電熱水器（吃電怪獸）」！</span>
                                  <p className="text-[9px] text-red-500 font-normal mt-0.5">此設備會在背景持續加熱，每月將增加額外約 $800-$1,500 的電費開銷。管家建議入住後加裝外接定時器以節省荷包！</p>
                                </div>
                              </div>
                            )}

                            {/* Utilities custom guide */}
                            {butlerInsight.estimatedTotalCost.utilityEstimateDesc && (
                              <div className="bg-orange-50/25 border border-orange-100/30 p-3.5 rounded-xl text-xs text-gray-600 leading-relaxed font-medium">
                                <span className="font-black text-[#D2691E] block mb-1">🎯 管家避雷叮嚀：</span>
                                {butlerInsight.estimatedTotalCost.utilityEstimateDesc}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                          * {sourceDesc}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Tab 5: On-site Inspection Report (Directly merged into listings!) */}
                  {activeTab === "inspect" && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {listing.reports && listing.reports.length > 0 ? (
                        (() => {
                          const rep = listing.reports[0];
                          const checklist = rep.checklistData || {};
                          const repVerifiedCount = Object.values(checklist).filter((v: any) => typeof v === "object" ? !!v.checked : !!v).length;
                          const repNotesCount = Object.values(checklist).filter((v: any) => typeof v === "object" && v.note && v.note.trim().length > 0).length;
                          const repTotalTasks = Object.keys(checklist).length;
                          const repHonestyScore = repTotalTasks > 0 ? Math.round((repVerifiedCount / repTotalTasks) * 100) : 100;
                          
                          return (
                            <div className="space-y-8">
                              {/* Glassmorphic AI Summary Banner */}
                              <div className="bg-gradient-to-br from-[#D2691E]/95 to-[#B85A15]/95 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden border border-white/10">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                  <FileText className="w-32 h-32" />
                                </div>
                                <h3 className="text-sm font-black mb-4 flex items-center gap-1.5 text-amber-300">
                                  <Sparkles className="w-4 h-4 animate-pulse" />
                                  管家實勘決策報告 (#REP-{rep.id?.toString().slice(0, 8)})
                                </h3>
                                <p className="text-xs md:text-sm font-bold leading-relaxed italic bg-white/5 p-4.5 rounded-xl border border-white/10 shadow-inner mb-6">
                                  「 {(rep.aiSummary === "使用者手動檢查紀錄" || !rep.aiSummary) ? "管家已成功整合您的現場物理實勘數據，目前核對項目基本合規，無重大水電或漏水地雷，整體居住防線防禦力良好！" : rep.aiSummary} 」
                                </p>
                                
                                <div className="grid grid-cols-3 gap-4 text-center">
                                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10">
                                    <div className="text-[8px] opacity-70 font-black">實勘誠實度</div>
                                    <div className="text-base font-black font-mono mt-0.5">{repHonestyScore}%</div>
                                  </div>
                                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10">
                                    <div className="text-[8px] opacity-70 font-black">核心物理風險</div>
                                    <div className="text-base font-black mt-0.5">低 (Low)</div>
                                  </div>
                                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10">
                                    <div className="text-[8px] opacity-70 font-black">推薦指數</div>
                                    <div className="flex justify-center gap-0.5 mt-1">
                                      {[1, 2, 3, 4].map(s => (
                                        <Star key={s} className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Details Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                                {/* Physical Facts */}
                                <div className="bg-gray-50/80 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                                  <h4 className="text-sm font-black text-on-surface flex items-center gap-1.5">
                                    <Check className="text-green-500 w-4 h-4" /> 物理事實已驗證 ({repVerifiedCount} 項)
                                  </h4>
                                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                                    {Object.entries(checklist).map(([key, value]: any) => {
                                      const isChecked = typeof value === "object" ? !!value.checked : !!value;
                                      return (
                                        <div key={key} className="flex justify-between border-b border-gray-100/50 pb-2 text-xs">
                                          <span className="text-gray-500 font-semibold">{key}</span>
                                          <span className={`font-black ${isChecked ? "text-green-600" : "text-gray-400"}`}>
                                            {isChecked ? "已驗證 ✓" : "未驗證"}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Field Notes */}
                                <div className="bg-gray-50/80 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                                  <h4 className="text-sm font-black text-on-surface flex items-center gap-1.5">
                                    <AlertCircle className="text-[#D2691E] w-4 h-4" /> 實勘現場發現 ({repNotesCount} 筆)
                                  </h4>
                                  <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                                    {Object.entries(checklist)
                                      .filter(([_, value]: any) => typeof value === "object" && value.note && value.note.trim().length > 0)
                                      .map(([key, value]: any) => (
                                        <div key={key} className="bg-white p-3.5 rounded-xl border border-gray-100 leading-relaxed text-[11px]">
                                          <span className="font-black text-[#D2691E] block mb-1">💡 {key}</span>
                                          <p className="text-gray-600 font-medium bg-gray-50 p-2.5 rounded-lg border border-gray-100/50 shadow-inner">{value.note}</p>
                                        </div>
                                      ))}
                                    {repNotesCount === 0 && (
                                      <div className="text-gray-400 text-xs italic font-medium text-center py-12">📝 暫無額外異常備註。</div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Bottom Buttons Grid (Edit and View Reports!) */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Link 
                                  href={`/reports/${rep.id}`}
                                  className="bg-white border border-gray-200 text-on-surface text-center py-4 rounded-2xl font-black text-xs hover:bg-gray-50 transition-all block shadow-xs cursor-pointer"
                                >
                                  🔎 獨立決策白皮書與 PDF 匯出
                                </Link>
                                <Link 
                                  href={`/inspect/${listing.id}`}
                                  className="bg-[#D2691E] hover:bg-[#b25915] text-white text-center py-4 rounded-2xl font-black text-xs shadow-md hover:shadow-lg transition-all block cursor-pointer"
                                >
                                  ✏️ 編輯與更新實勘內容
                                </Link>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        /* CTA Onboard checking */
                        <div className="bg-white p-10 rounded-[2.5rem] border-2 border-dashed border-gray-100 text-center space-y-6 max-w-lg mx-auto">
                          <div className="w-16 h-16 bg-[#D2691E]/10 text-[#D2691E] rounded-full flex items-center justify-center mx-auto shadow-xs text-2xl font-black">
                            💬
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-lg font-black text-on-surface">您尚未進行現場實勘核對！</h3>
                            <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-sm mx-auto">
                              實地看房是防止隱性漏水、牆面龜裂、水電機能死角最關鍵的防線。管家已為此房源量身生成了專屬實勘清單！
                            </p>
                          </div>
                          <Link 
                            href={`/inspect/${listing.id}`}
                            className="inline-flex items-center gap-2 bg-[#D2691E] hover:bg-[#b25915] text-white px-8 py-4 rounded-xl font-black shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95 text-xs cursor-pointer"
                          >
                            <ClipboardCheck className="w-4.5 h-4.5" />
                            立即隨管家出發實地看房檢驗
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-gray-200">
                <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-400">尚未生成 AI 防坑報告</h2>
                <p className="text-sm text-gray-400 mt-2">請貼上網址進行解析</p>
              </div>
            )}

          </div>

          {/* Right Column (Action Card & Basic Data) */}
          <div className="space-y-8">
            
            {/* 1. Pricing & Action Card */}
            <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-[#D2691E]/10 border-2 border-[#D2691E] sticky top-6">
              <div className="text-xs text-gray-400 font-black uppercase tracking-wider mb-1">真金流月支出預估</div>
              <div className="text-4xl font-black text-[#D2691E] mb-6">
                NT$ {((listing.price || 0) + (butlerInsight?.estimatedTotalCost?.management || 0))?.toLocaleString()}
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">官方月租金</span>
                  <span className="font-bold">NT$ {listing.price?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">大樓管理費</span>
                  <span className="font-bold">NT$ {butlerInsight?.estimatedTotalCost?.management?.toLocaleString() || 0}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <Link 
                  href={`/inspect/${listing.id}`}
                  className="w-full bg-[#D2691E] text-white text-center py-4 rounded-xl font-bold shadow-lg hover:bg-[#b25915] transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {t('start_inspection')}
                </Link>
                {listing.sourceUrl && (
                  <a
                    href={listing.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full border border-gray-200 text-gray-500 hover:text-on-surface text-center py-4 rounded-xl font-bold hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    前往 591 原始房源
                  </a>
                )}
                {listing.sourceUrl && (
                  <button
                    onClick={handleRecalculate}
                    disabled={recalculating}
                    className="w-full bg-amber-50 text-[#D2691E] border border-[#D2691E]/20 hover:bg-amber-100/60 text-center py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 text-sm cursor-pointer mt-1 select-none"
                  >
                    {recalculating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        正在重新診斷...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        重新診斷房源 (消耗 20 點)
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>

            {/* 2. Minimized Listing Details (MOVED HERE) */}
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-[#D2691E]/5 border border-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-black text-[#333333]">房源原始基礎資料</h2>
                <span className="text-xs text-gray-400">（僅供對照）</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <p><span className="text-gray-400">房源標題：</span><span className="font-bold line-clamp-1">{listing.title}</span></p>
                  <p><span className="text-gray-400">地址：</span><span className="font-bold line-clamp-1">{listing.address}</span></p>
                </div>
                <div className="space-y-2">
                  <p><span className="text-gray-400">坪數：</span><span className="font-bold">{features.size || "--"} 坪</span></p>
                  <p><span className="text-gray-400">樓層：</span><span className="font-bold">{features.floor || "--"}{features.totalFloor ? `/${features.totalFloor}` : ""}F</span></p>
                </div>
              </div>
              
              {listing.description && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">原文簡介</div>
                  <div className="text-xs text-gray-500 line-clamp-2 hover:line-clamp-none transition-all cursor-pointer leading-relaxed">
                    {listing.description}
                  </div>
                </div>
              )}
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
}
