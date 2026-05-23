"use client";

import { motion } from "framer-motion";
import { 
  Sparkles, MapPin, Loader2, Ruler, Building2, 
  ArrowLeft, Check, AlertTriangle, ShieldAlert, 
  ShieldCheck, BarChart3, Compass, HelpCircle, PlusCircle, Trash, ExternalLink
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ListingsPage() {
  const t = useTranslations("ListingDetail"); // Reuse ListingDetail or similar locale context
  const { data: session } = useSession();
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"score" | "price" | "date">("score");
  const [newUrl, setNewUrl] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetch("/api/listings")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setListings(res.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getVerdictStyles = (status: string) => {
    switch (status) {
      case "勸退":
        return { bg: "bg-red-50", border: "border-red-200", text: "text-red-600", icon: ShieldAlert, tagBg: "bg-red-500 text-white" };
      case "提醒":
        return { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-600", icon: AlertTriangle, tagBg: "bg-amber-500 text-white" };
      default:
        return { bg: "bg-green-50", border: "border-green-200", text: "text-green-600", icon: ShieldCheck, tagBg: "bg-green-500 text-white" };
    }
  };

  const sortedListings = [...listings].sort((a, b) => {
    if (sortBy === "score") {
      return (b.matchScore || 0) - (a.matchScore || 0);
    } else if (sortBy === "price") {
      return a.price - b.price;
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const handleQuickImport = async () => {
    if (!newUrl) return;

    if (!session) {
      signIn("google");
      return;
    }

    setImporting(true);
    try {
      const response = await fetch("/api/listings/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl })
      });
      const res = await response.json();
      if (res.success) {
        if (res.data.listing?.id) {
          setNewUrl("");
          // Refresh comparative listings
          const checkRes = await fetch("/api/listings");
          const checkData = await checkRes.json();
          if (checkData.success) {
            setListings(checkData.data);
          }
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
      setImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要將此房源移出您的比較庫嗎？這將會同時清理雲端儲存中的照片與相關實勘資料。")) return;
    
    try {
      const response = await fetch(`/api/listings/${id}`, {
        method: "DELETE"
      });
      const res = await response.json();
      if (res.success) {
        setListings(prev => prev.filter(item => item.id !== id));
      } else {
        alert("刪除失敗: " + res.error);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("連線失敗，請稍後再試。");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-[#D2691E]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-[#333333] font-sans pb-24">
      <main className="max-w-7xl mx-auto px-6 pt-12">
        
        {/* Header Section */}
        <header className="mb-12 flex flex-col md:flex-row justify-between md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 text-[#D2691E] font-black text-sm tracking-widest uppercase mb-2">
              <Compass className="w-4 h-4" />
              Tenant Collections
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-[#333333] leading-none">
              房源比較庫
            </h1>
            <p className="text-gray-500 mt-3 text-base max-w-3xl">
              這是您匯入並經由 AI Butler 解析過的所有房源清單。點選各房源可深入檢視地雷與物理實勘清單。
            </p>
            
            {/* 快速匯入輸入框 */}
            {listings.length > 0 && (
              <div className="w-full max-w-md bg-white p-1.5 rounded-2xl shadow-md border border-gray-100 flex items-center gap-2 mt-6 focus-within:border-[#D2691E] focus-within:ring-2 focus-within:ring-[#D2691E]/10 transition-all">
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="快速貼上 591 連結匯入房源..."
                  className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none text-on-surface"
                />
                <button
                  onClick={handleQuickImport}
                  disabled={importing}
                  className="bg-[#D2691E] text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-sm hover:bg-[#b25915] disabled:bg-gray-300 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  {importing ? "處理中" : "快速匯入"}
                </button>
              </div>
            )}
          </div>

          {/* Controls & Filters */}
          {listings.length > 0 && (
            <div className="flex items-center gap-3 self-start md:self-auto bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
              <span className="text-xs text-gray-400 font-black pl-3 uppercase tracking-wider">排序依據</span>
              <button 
                onClick={() => setSortBy("score")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${sortBy === "score" ? 'bg-[#D2691E] text-white' : 'text-gray-400 hover:text-on-surface'}`}
              >
                AI 適配度
              </button>
              <button 
                onClick={() => setSortBy("price")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${sortBy === "price" ? 'bg-[#D2691E] text-white' : 'text-gray-400 hover:text-on-surface'}`}
              >
                月租金
              </button>
              <button 
                onClick={() => setSortBy("date")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${sortBy === "date" ? 'bg-[#D2691E] text-white' : 'text-gray-400 hover:text-on-surface'}`}
              >
                分析時間
              </button>
            </div>
          )}
        </header>

        {sortedListings.length > 0 ? (
          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8">
            {sortedListings.map((item, idx) => {
              const verdict = item.butlerInsight?.verdict || { status: "推薦", summary: "條件優越，無明顯地雷。" };
              const vStyle = getVerdictStyles(verdict.status);
              const coverImage = item.images && item.images.length > 0 
                ? item.images[0] 
                : "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop";

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  className="bg-white/90 rounded-[2rem] border border-gray-100 hover:border-[#D2691E]/30 shadow-lg hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Image Section */}
                  <div className="relative h-52 bg-gray-100 overflow-hidden">
                    <img 
                      src={coverImage} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    
                    {/* Floating Delete Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="absolute top-4 left-4 bg-white/90 hover:bg-red-500 hover:text-white text-gray-500 p-2.5 rounded-xl shadow-lg transition-all duration-300 cursor-pointer z-10"
                    >
                      <Trash className="w-4 h-4" />
                    </button>

                    {/* Floating Verified Badge if they have completed report! */}
                    {item.latestReport && (
                      <div className="absolute top-4 left-16 bg-green-500 text-white px-3 py-1 rounded-xl text-[9px] font-black shadow-lg flex items-center gap-1 select-none">
                        <Check className="w-3 h-3" />
                        實勘已驗證
                      </div>
                    )}

                    {/* Floating AI Match Score */}
                    <div className="absolute top-4 right-4 w-14 h-14 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center border border-gray-100">
                      <div className="text-[8px] font-black text-gray-400 uppercase leading-none mb-0.5">Match</div>
                      <div className="text-base font-black text-[#D2691E] leading-none">
                        {item.matchScore || 70}%
                      </div>
                    </div>

                    {/* Price Pill */}
                    <div className="absolute bottom-4 left-4 bg-[#333333]/80 text-white px-4 py-1.5 rounded-full text-xs font-black backdrop-blur-sm border border-white/10">
                      NT$ {item.price?.toLocaleString()} / 月
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Verdict Badge */}
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase ${vStyle.tagBg}`}>
                          <vStyle.icon className="w-3 h-3" />
                          {verdict.status}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Title */}
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-black text-[#333333] line-clamp-1 group-hover:text-[#D2691E] transition-colors flex-1">
                          {item.title}
                        </h3>
                        {item.sourceUrl && (
                          <a 
                            href={item.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-[#D2691E] shrink-0 p-1 hover:bg-gray-50 rounded-lg transition-all"
                            title="開啟 591 原始房源"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      {/* Specs Row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 font-bold">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {item.address?.substring(0, 6)}...
                        </span>
                        <span className="flex items-center gap-1">
                          <Ruler className="w-3.5 h-3.5" />
                          {item.features?.size || "--"} 坪
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {item.features?.floor || "--"}F
                        </span>
                      </div>

                      {/* AI One-sentence Verdict Summary */}
                      <p className={`p-4 rounded-2xl ${vStyle.bg} ${vStyle.text} text-xs font-medium border ${vStyle.border} leading-relaxed italic`}>
                        💡 {verdict.summary}
                      </p>
                    </div>

                    {/* Bottom Buttons */}
                    <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-3">
                      <Link 
                        href={`/listings/${item.id}`}
                        className="bg-[#D2691E] text-white text-center py-3 rounded-xl text-xs font-black shadow-md hover:bg-[#b25915] transition-all flex items-center justify-center gap-1"
                      >
                        解析詳情
                      </Link>
                      {item.latestReport ? (
                        <Link 
                          href={`/reports/${item.latestReport.id}`}
                          className="bg-green-50 text-green-700 border border-green-200/60 text-center py-3 rounded-xl text-xs font-black hover:bg-green-100/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title="檢視實勘決策白皮書與一鍵生成內政部合規租約"
                        >
                          <Check className="w-3.5 h-3.5" />
                          決策白皮書/租約
                        </Link>
                      ) : (
                        <Link 
                          href={`/inspect/${item.id}`}
                          className="border border-[#D2691E] text-[#D2691E] text-center py-3 rounded-xl text-xs font-black hover:bg-gray-50 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          實地檢驗
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 max-w-3xl mx-auto">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Compass className="w-10 h-10 text-gray-200" />
            </div>
            <h3 className="text-2xl font-black text-[#333333] mb-2">尚無匯入房源</h3>
            <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
              您目前比較庫中沒有任何房源。請回到首頁，貼上 591 租屋網址，讓 AI 管家為您解析並收藏您的第一筆房源！
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 bg-[#D2691E] text-white px-8 py-4 rounded-xl font-black shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-[1.02]"
            >
              立即匯入新房源
            </Link>
          </div>
        )}

      </main>
    </div>
  );
}
