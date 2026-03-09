"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, MapPin, Calendar, 
  ShieldCheck, AlertTriangle, ArrowLeft, Loader2,
  ChevronLeft, ChevronRight
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
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!listing) return (
    <div className="min-h-screen bg-surface flex items-center justify-center text-gray-500">
      未找到房源
    </div>
  );

  const images = listing.images && listing.images.length > 0 
    ? listing.images 
    : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const verifiedFacts = listing.features?.verifiedFacts || {};

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero Gallery Carousel */}
      <div className="h-[40vh] md:h-[60vh] bg-gray-200 relative overflow-hidden group">
        <AnimatePresence mode="wait">
          <motion.img 
            key={currentImageIndex}
            src={images[currentImageIndex]} 
            alt={`Gallery ${currentImageIndex + 1}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Back Button */}
        <Link href="/listings" className="absolute top-6 left-6 bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors z-10">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Image Counters / Indicators */}
        <div className="absolute bottom-6 right-6 bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold z-10 border border-white/20">
          {currentImageIndex + 1} / {images.length}
        </div>

        {/* Mini Indicators (Dashes) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {images.map((_, idx) => (
            <button 
              key={idx}
              onClick={() => setCurrentImageIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'w-8 bg-white shadow-lg' : 'w-2 bg-white/40'}`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-3 gap-12">
        {/* Left Column: Info */}
        <div className="lg:col-span-2">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4 leading-tight">{listing.title}</h1>
            <div className="flex items-center gap-2 text-gray-500">
              <MapPin className="w-5 h-5" />
              {listing.address}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="butler-card bg-white text-center">
              <div className="text-xs text-gray-400 font-bold mb-1">{t('rent')}</div>
              <div className="text-xl font-bold text-primary">NT$ {listing.price?.toLocaleString()}</div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">{t('description_title')}</h2>
            <div 
              className="text-gray-600 leading-relaxed whitespace-pre-wrap listing-description"
              dangerouslySetInnerHTML={{ __html: listing.description || t('description_empty') }}
            />
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">{t('verified_facts_title')}</h2>
            <div className="space-y-4">
              {Object.keys(verifiedFacts).length > 0 ? Object.entries(verifiedFacts).map(([key, value]: any) => (
                <div key={key} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                  <span className="text-gray-600">{key}</span>
                  <span className={`font-bold ${value ? "text-success" : "text-gray-400"}`}>
                    {value ? t('verified') : t('unverified')}
                  </span>
                </div>
              )) : (
                <div className="text-gray-400 text-sm italic">{t('verified_facts_empty')}</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Butler Actions */}
        <div className="space-y-8">
          {/* AI Insight Card */}
          {listing.butlerInsight && (
            <div className="bg-primary p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
              <Sparkles className="absolute -top-4 -right-4 w-24 h-24 opacity-10" />
                          <div className="flex items-center gap-3 mb-6">
                            <Sparkles className="w-8 h-8" />
                            <h3 className="font-bold text-lg">{t('butler_report_title')}</h3>
                          </div>
              
              <div className="space-y-4 text-sm leading-relaxed">
                {listing.butlerInsight.highlights?.map((h: string, idx: number) => (
                  <div key={idx} className="flex gap-3">
                    <ShieldCheck className="w-5 h-5 shrink-0 text-success" />
                    <p>{h}</p>
                  </div>
                ))}
                {listing.butlerInsight.risks?.map((r: string, idx: number) => (
                  <div key={idx} className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-orange-200" />
                    <p>{r}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 p-3 bg-white/10 rounded-xl text-[10px] text-white/70 italic text-center">
                {t('butler_report_footer')}
              </div>
            </div>
          )}

          {/* Action Card */}
          <div className="butler-card bg-white shadow-lg sticky top-24">
            <div className="text-3xl font-black mb-6">NT$ {listing.price?.toLocaleString()} <span className="text-xs font-normal text-gray-400">/ 月</span></div>
            <Link 
              href={`/inspect/${listing.id}`}
              className="block w-full bg-primary text-white text-center py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all mb-4"
            >
              {t('start_inspection')}
            </Link>
            <button className="w-full border-2 border-primary text-primary py-4 rounded-2xl font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5" />
              {t('book_viewing')}
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-4">
              {t('booking_stats', {count: 12})}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
