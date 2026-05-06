"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, MapPin, Calendar, 
  ShieldCheck, AlertTriangle, ArrowLeft, Loader2,
  ChevronLeft, ChevronRight, Building2, Ruler, 
  CreditCard, Zap, Waves, Home, Check,
  Heart, Share2, ShieldAlert, Map, Scale, BarChart3, FileText
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { use } from "react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export default function ListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("ListingDetail");
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("text"); // 'text', 'map', 'gov', 'price'

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setListing(res.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const handleUpdate = (e: any) => {
      if (e.detail?.butlerInsight) {
        setListing((prev: any) => ({
          ...prev,
          butlerInsight: e.detail.butlerInsight
        }));
      }
    };
    window.addEventListener('listing-updated', handleUpdate);
    return () => window.removeEventListener('listing-updated', handleUpdate);
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-[#FFFDD0] flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-[#D2691E]" />
    </div>
  );

  if (!listing) return (
    <div className="min-h-screen bg-[#FFFDD0] flex items-center justify-center text-[#333333]">
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

  const verdictStyle = butlerInsight?.verdict?.status ? getVerdictStyles(butlerInsight.verdict.status) : getVerdictStyles("推薦");

  return (
    <div className="min-h-screen bg-[#FFFDD0] text-[#333333] font-sans">
      {/* Hero Section with Overlapping Content */}
      <div className="relative h-[40vh] md:h-[50vh] bg-[#333333]">
        <div className="absolute inset-0">
          <img 
            src={images[currentImageIndex]} 
            alt="Hero image" 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FFFDD0] via-transparent to-black/30" />
        </div>

        {/* Floating Nav */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
          <Link href="/" className="bg-white/90 p-3 rounded-full shadow-lg hover:bg-[#D2691E] hover:text-white transition-all duration-300">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex gap-3">
            <button className="bg-white/90 p-3 rounded-full shadow-lg hover:bg-red-50 transition-all duration-300">
              <Heart className="w-5 h-5 text-red-500" />
            </button>
            <button className="bg-white/90 p-3 rounded-full shadow-lg hover:bg-gray-50 transition-all duration-300">
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Counter */}
        <div className="absolute bottom-24 right-6 bg-black/60 text-white px-4 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm border border-white/20 z-20">
          {currentImageIndex + 1} / {images.length}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-30">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column (DOMINANT: AI Butler Report with 4 Tabs) */}
          <div className="lg:col-span-2 space-y-8">
            
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
                      <h1 className={`font-black text-2xl ${verdictStyle.text} font-serif`}>管家防坑診斷報告</h1>
                    </div>
                  </div>
                  <span className={`px-5 py-1.5 rounded-full text-sm font-black uppercase border-2 ${verdictStyle.border} ${verdictStyle.bg} ${verdictStyle.text} text-center`}>
                    {butlerInsight.verdict?.status || "未知"}
                  </span>
                </div>

                {/* Summary */}
                <div className={`p-5 rounded-xl ${verdictStyle.bg} text-lg font-bold leading-relaxed ${verdictStyle.text} mb-6 border ${verdictStyle.border} font-serif`}>
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
                    <Map className="w-4 h-4" /> 地圖隱患
                  </button>
                  <button 
                    onClick={() => setActiveTab("gov")}
                    className={`pb-3 px-4 text-sm font-black transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === "gov" ? 'border-[#D2691E] text-[#D2691E]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    <Scale className="w-4 h-4" /> 政府防線
                  </button>
                  <button 
                    onClick={() => setActiveTab("price")}
                    className={`pb-3 px-4 text-sm font-black transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === "price" ? 'border-[#D2691E] text-[#D2691E]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    <BarChart3 className="w-4 h-4" /> 實價比對
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

                      {/* Highlights Proof */}
                      {butlerInsight.highlightLines && butlerInsight.highlightLines.length > 0 && (
                        <div className="pt-4 border-t border-gray-100 mt-4">
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">擷取之文字鐵證</div>
                          <div className="space-y-2">
                            {butlerInsight.highlightLines.map((line: string, idx: number) => (
                              <div key={idx} className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                                "{line}"
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Tab 2: Map Insights (Simulated Google Maps) */}
                  {activeTab === "map" && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">📍 Google Maps 周邊感官地雷偵測</div>
                        <div className="space-y-4">
                          {butlerInsight.mapsThreats && butlerInsight.mapsThreats.length > 0 ? (
                            butlerInsight.mapsThreats.map((threat: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-bold text-[#333333]">{threat.name} ({threat.keyword})</p>
                                  <p className="text-xs text-gray-500 mt-0.5">類型：{threat.type}，距離：{threat.distance}，地址：{threat.vicinity}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-green-600 font-bold flex items-center gap-2">
                              <Check className="w-4 h-4" /> 方圓 100 公尺內未發現明顯地圖嫌惡設施。
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Real Map Iframe */}
                      <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm mt-4">
                        <iframe
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          style={{ border: 0 }}
                          src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(listing.address || "台北市")}`}
                          allowFullScreen
                        ></iframe>
                      </div>
                    </motion.div>
                  )}

                  {/* Tab 3: Gov Data (Simulated Government Data) */}
                  {activeTab === "gov" && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">⚖️ 台灣政府公開資訊安全防線</div>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-[#333333]">土壤液化高潛勢區 (中央地調所)</p>
                              <p className="text-xs text-gray-500 mt-0.5">本房源位於台北盆地土壤液化高潛勢區，雖然不代表立刻有危險，但看房時請務必檢查地下室或一樓牆面是否有明顯斜裂縫。</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-[#333333]">無違建查報紀錄 (台北市建管處)</p>
                              <p className="text-xs text-gray-500 mt-0.5">經查詢，本建築物目前無公開列管的違建拆除紀錄。</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Tab 4: Real Price (Simulated Real Price Registration) */}
                  {activeTab === "price" && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">📊 內政部實價登錄比對 (盤子指數)</div>
                        
                        <div className="text-center py-4">
                          <div className="text-xs text-gray-400 mb-1">本房源單價溢價率</div>
                          <div className="text-4xl font-black text-red-500 font-serif">+ 25.3%</div>
                          <div className="text-xs text-red-500 font-bold mt-1">⚠️ 盤子指數：高度</div>
                        </div>

                        <div className="space-y-2 border-t border-gray-200 pt-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">本案開價</span>
                            <span className="font-bold">NT$ 106,900</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">西門商圈同型態均價</span>
                            <span className="text-gray-500 font-bold">NT$ 85,300</span>
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                          * 數據取自內政部實價登錄近半年西門站周邊 500 公尺內，同為「整層住家」型態之租賃成交案例。
                        </p>
                      </div>
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
              <div className="text-4xl font-black text-[#D2691E] font-serif mb-6">
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
                <Link 
                  href={`/listings/${listing.id}/booking`}
                  className="w-full border-2 border-[#D2691E] text-[#D2691E] text-center py-4 rounded-xl font-bold hover:bg-[#FFFDD0] transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                >
                  <Calendar className="w-4 h-4" />
                  {t('book_viewing')}
                </Link>
              </div>
            </div>

            {/* 2. Minimized Listing Details (MOVED HERE) */}
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-[#D2691E]/5 border border-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-black text-[#333333] font-serif">房源原始基礎資料</h2>
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
