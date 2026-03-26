"use client";

import { motion } from "framer-motion";
import { Search, MapPin, Sparkles, Filter, Loader2, ChevronRight, Settings } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";

export default function ListingGallery() {
  const t = useTranslations("Listings");
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  useEffect(() => {
    fetch("/api/listings")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setListings(res.data);
        } else {
          setListings([]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="ml-2">{t('loading')}</span>
    </div>
  );
  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Search & Filter Header */}
        <div className="flex flex-col md:flex-row gap-4 mb-12 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder={t('search_placeholder')}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary outline-none bg-white"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button className="flex items-center gap-2 px-6 py-4 bg-white rounded-2xl border border-gray-100 font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors flex-1 md:flex-none cursor-pointer">
              <Filter className="w-5 h-5 text-primary" />
              {t('filter')}
            </button>
            <div className="bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex">
              <button 
                onClick={() => setViewMode("grid")}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === "grid" ? "bg-primary text-white" : "text-gray-400"}`}
              >
                {t('view_list')}
              </button>
              <button 
                onClick={() => setViewMode("map")}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === "map" ? "bg-primary text-white" : "text-gray-400"}`}
              >
                {t('view_map')}
              </button>
            </div>
          </div>
        </div>

        {/* AI Insight Bar */}
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 mb-8 flex items-center gap-3">
          <Sparkles className="text-primary w-5 h-5 shrink-0" />
          <p className="text-sm text-on-surface">
            <span className="font-bold">{t('butler_insight_title')}</span>
            {t('butler_insight_body')}
          </p>
        </div>

        {viewMode === "grid" ? (
          /* Listing Grid */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.map((listing) => (
              <div key={listing.id} className="relative group">
                <Link href={`/listings/${listing.id}`}>
                  <motion.div 
                    whileHover={{ y: -8, shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                    className="bg-card rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300"
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img 
                        src={listing.images?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"} 
                        alt={listing.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop";
                        }}
                      />
                      <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 shadow-sm border border-white/20">
                        <Sparkles className="text-primary w-4 h-4" />
                        <span className="text-xs font-black text-on-surface">{t('match_score', {score: listing.matchScore})}</span>
                      </div>
                      
                      {/* Owner Badge */}
                      {listing.isOwner && (
                        <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg">
                          我的房源
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <h3 className="text-xl font-black mb-2 text-on-surface leading-tight group-hover:text-primary transition-colors">{listing.title}</h3>
                      <div className="flex items-center gap-1.5 text-gray-400 text-sm mb-6">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="truncate">{listing.address}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-8">
                        {listing.features && Object.keys(listing.features).slice(0, 3).map(key => (
                          <span key={key} className="px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-[10px] font-bold tracking-wider uppercase border border-gray-100">
                            {key}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-gray-50 pt-6">
                        <div className="text-2xl font-black text-on-surface">
                          <span className="text-xs font-bold text-primary mr-1">NT$</span>
                          {listing.price.toLocaleString()}
                          <span className="text-[10px] font-bold text-gray-400 ml-1 uppercase tracking-tighter">{t('per_month')}</span>
                        </div>
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                {/* Direct Manage Button for Owners */}
                {listing.isOwner && (
                  <Link 
                    href="/landlord/listings"
                    className="absolute bottom-24 right-6 bg-white text-on-surface p-3 rounded-2xl shadow-2xl border border-gray-100 hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100 z-10"
                  >
                    <Settings className="w-5 h-5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Real Google Map Container Logic */
          <div className="w-full h-[70vh] bg-gray-50 rounded-[3rem] border border-gray-100 shadow-inner overflow-hidden relative">
            <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
              <Map
                style={{ width: '100%', height: '100%' }}
                defaultCenter={{ lat: 25.0330, lng: 121.5654 }}
                defaultZoom={13}
                gestureHandling={'greedy'}
                disableDefaultUI={false}
              >
                {listings.map((l, i) => (
                  <Marker 
                    key={l.id} 
                    position={{ 
                      lat: l.lat || (25.0330 + (Math.random() - 0.5) * 0.05), 
                      lng: l.lng || (121.5654 + (Math.random() - 0.5) * 0.05) 
                    }} 
                  />
                ))}
              </Map>
            </APIProvider>
            
            {/* Overlay Map UI */}
            <div className="absolute top-6 left-6 z-10 flex flex-col gap-3 pointer-events-none">
              <div className="bg-white/90 backdrop-blur p-4 rounded-3xl shadow-xl border border-white/50 max-w-xs pointer-events-auto">
                <h4 className="font-black text-sm mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI 生活圈推薦
                </h4>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  管家已為您標註區域內符合您偏好的房源。
                </p>
              </div>
            </div>

            {/* Google Map Disclaimer */}
            {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
              <div className="absolute bottom-6 right-6 z-10">
                <div className="bg-black/60 backdrop-blur px-4 py-2 rounded-full text-[9px] text-white/80 flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  請在 .env 中設定 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 以啟用完整地圖
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
