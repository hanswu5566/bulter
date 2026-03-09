"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, Users, Sparkles, ChevronRight, 
  MapPin, Loader2, CheckCircle2, MessageCircle,
  Pencil, Trash2, AlertTriangle
} from "lucide-react";
import { Link } from "@/i18n/routing";

export default function MyListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchListings = () => {
    setLoading(true);
    fetch("/api/landlord/listings")
      .then(res => res.json())
      .then(res => {
        if (res.success) setListings(res.data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此房源嗎？此動作無法復原。")) return;
    
    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setListings(listings.filter(l => l.id !== id));
      } else {
        alert("刪除失敗");
      }
    } catch (err) {
      alert("發生錯誤");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <main className="min-h-screen bg-surface p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-on-surface mb-2">我的房源管理</h1>
            <p className="text-gray-500">管理您的物件，並查看 AI 管家為您匹配的候選房客。</p>
          </div>
          <Link 
            href="/landlord/listings/create"
            className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            上架新物件
          </Link>
        </header>

        {listings.length > 0 ? (
          <div className="space-y-12">
            {listings.map((item) => (
              <section key={item.id} className="grid lg:grid-cols-3 gap-8">
                
                {/* Left: Listing Summary */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-xl sticky top-24">
                    <div className="h-48 relative group">
                      <img src={item.images?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"} className="w-full h-full object-cover" alt="" />
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-primary border border-primary/10">已上架</div>
                      
                      {/* Action Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button className="bg-white text-on-surface p-3 rounded-2xl hover:bg-primary hover:text-white transition-all shadow-lg cursor-pointer">
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="bg-white text-error p-3 rounded-2xl hover:bg-error hover:text-white transition-all shadow-lg cursor-pointer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-black mb-2">{item.title}</h3>
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-4">
                        <MapPin className="w-3 h-3" /> {item.address}
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-50 pt-4">
                        <span className="text-2xl font-black text-on-surface">NT$ {item.price.toLocaleString()}</span>
                        <Link href={`/listings/${item.id}`} className="text-xs font-bold text-primary hover:underline">查看公開頁</Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Recommended Tenants */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-on-surface">管家精選推薦房客</h2>
                  </div>

                  <div className="space-y-4">
                    {item.matches && item.matches.length > 0 ? item.matches.map((match: any, idx: number) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6"
                      >
                        {/* Avatar */}
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-gray-50">
                          {match.image ? <img src={match.image} className="w-full h-full object-cover" /> : <Users className="text-gray-300 w-8 h-8" />}
                        </div>

                        {/* Details */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-on-surface">{match.name}</span>
                            <div className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">
                              {match.matchScore}% 契合
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {match.tags?.map((tag: string) => (
                              <span key={tag} className="text-[9px] font-bold text-gray-400 border border-gray-100 px-1.5 py-0.5 rounded">#{tag}</span>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded-lg border-l-4 border-primary/20">
                            「{match.reason}」
                          </p>
                        </div>

                        {/* Actions */}
                        <button className="bg-on-surface text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-primary transition-all flex items-center gap-2 cursor-pointer">
                          <MessageCircle className="w-4 h-4" /> 邀請看房
                        </button>
                      </motion.div>
                    )) : (
                      <div className="py-12 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                        <p className="text-sm text-gray-400 font-bold">管家正在搜尋合適房客中...</p>
                      </div>
                    )}
                  </div>
                </div>

              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
             <h3 className="text-xl font-bold">目前尚無房源</h3>
             <p className="text-gray-400 mt-2">點擊右上方按鈕開始上架您的第一個物件。</p>
          </div>
        )}
      </div>
    </main>
  );
}
