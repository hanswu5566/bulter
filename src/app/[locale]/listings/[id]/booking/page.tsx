"use client";

import { useState, use, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, CheckCircle, ChevronLeft, Loader2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("Booking");
  const router = useRouter();
  
  const [listing, setListing] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) setListing(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;
    
    setSubmitting(true);
    try {
      // Combine date and time slot into a scheduledAt date
      const scheduledAt = new Date(selectedDate);
      if (selectedTime === "afternoon") scheduledAt.setHours(14);
      else if (selectedTime === "evening") scheduledAt.setHours(19);
      else scheduledAt.setHours(10);

      const res = await fetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          listingId: id,
          landlordId: listing.landlordId,
          scheduledAt: scheduledAt.toISOString(),
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        alert("Booking failed");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!listing) return (
    <div className="min-h-screen bg-surface flex items-center justify-center text-gray-500">
      Listing not found
    </div>
  );

  const timeSlots = [
    { id: "morning", label: t("morning") },
    { id: "afternoon", label: t("afternoon") },
    { id: "evening", label: t("evening") },
  ];

  // Generate next 7 days for selection
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().split("T")[0];
  });

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-xl mx-auto">
        <Link href={`/listings/${id}`} className="flex items-center gap-2 text-gray-500 mb-8 hover:text-primary transition-colors">
          <ChevronLeft className="w-5 h-5" />
          {t("back_to_listing")}
        </Link>

        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100"
            >
              <h1 className="text-3xl font-black mb-2">{t("title")}</h1>
              <p className="text-gray-500 mb-8">{t("subtitle")}</p>

              <div className="space-y-8">
                {/* Date Selection */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold mb-4">
                    <Calendar className="w-4 h-4 text-primary" />
                    {t("select_date")}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {dates.map(date => (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all ${
                          selectedDate === date 
                            ? "border-primary bg-primary text-white" 
                            : "border-gray-50 bg-gray-50 text-gray-400 hover:border-primary/20"
                        }`}
                      >
                        {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold mb-4">
                    <Clock className="w-4 h-4 text-primary" />
                    {t("select_time")}
                  </label>
                  <div className="space-y-3">
                    {timeSlots.map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedTime(slot.id)}
                        className={`w-full p-4 rounded-2xl border-2 text-left font-bold transition-all flex justify-between items-center ${
                          selectedTime === slot.id 
                            ? "border-primary bg-primary/5 text-primary" 
                            : "border-gray-50 bg-gray-50 text-gray-400 hover:border-primary/20"
                        }`}
                      >
                        {slot.label}
                        {selectedTime === slot.id && <CheckCircle className="w-5 h-5" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  disabled={!selectedDate || !selectedTime || submitting}
                  onClick={handleSubmit}
                  className="w-full bg-primary text-white py-5 rounded-[1.5rem] font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {t("confirm_booking")}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-12 rounded-[2.5rem] shadow-xl border border-gray-100 text-center"
            >
              <div className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black mb-4">{t("booking_success")}</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                {t("booking_success_desc")}
              </p>
              <Link 
                href="/listings"
                className="inline-block bg-surface text-on-surface px-8 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-colors"
              >
                {t("back_to_listing")}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Listing Mini Card */}
        {!success && (
          <div className="mt-8 flex gap-4 p-4 bg-white/50 rounded-[2rem] border border-white/50 backdrop-blur-sm">
            <img 
              src={listing.images?.[0]} 
              alt={listing.title} 
              className="w-20 h-20 rounded-2xl object-cover"
            />
            <div className="flex flex-col justify-center">
              <h4 className="font-bold text-sm line-clamp-1">{listing.title}</h4>
              <p className="text-xs text-gray-400">{listing.address}</p>
              <p className="text-primary font-black mt-1 text-sm">NT$ {listing.price?.toLocaleString()} /月</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
