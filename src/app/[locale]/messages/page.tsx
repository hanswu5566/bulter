"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, User, Loader2, ChevronRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function MessagesPage() {
  const t = useTranslations("Navbar");
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/chat/sessions")
      .then(res => res.json())
      .then(res => {
        if (res.success) setSessions(res.data);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
          <div className="p-4 bg-primary text-white rounded-3xl shadow-xl">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black">{t("messages")}</h1>
            <p className="text-gray-500">Manage your conversations with landlords or tenants</p>
          </div>
        </div>

        <div className="space-y-4">
          {sessions.length > 0 ? sessions.map((session) => (
            <Link 
              key={session.id} 
              href={`/messages/${session.id}`}
              className="block group"
            >
              <motion.div 
                whileHover={{ y: -4, shadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }}
                className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex gap-6 items-center transition-all"
              >
                <div className="relative">
                  <img 
                    src={session.listing.images?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"} 
                    alt={session.listing.title} 
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-surface"
                  />
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full p-1 shadow-lg overflow-hidden border-2 border-surface">
                    <img 
                      src={session.users[0]?.image || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"} 
                      alt="user"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">{session.listing.title}</h3>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {session.messages[0] ? new Date(session.messages[0].createdAt).toLocaleDateString() : "New Session"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{session.listing.address}</p>
                  
                  <div className="flex items-center gap-2">
                    {session.messages[0] ? (
                      <p className="text-sm text-gray-600 line-clamp-1 italic">
                        "{session.messages[0].content}"
                      </p>
                    ) : (
                      <span className="text-xs text-primary font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Start your conversation
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-6 h-6 text-gray-200 group-hover:text-primary transition-colors" />
              </motion.div>
            </Link>
          )) : (
            <div className="bg-white/50 border-2 border-dashed border-gray-100 rounded-[2.5rem] p-20 text-center text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No messages yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
