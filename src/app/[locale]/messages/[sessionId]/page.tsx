"use client";

import { use, useState, useEffect } from "react";
import ChatWindow from "@/components/ChatWindow";
import { Link } from "@/i18n/routing";
import { ChevronLeft, Building2, MapPin, User, Loader2 } from "lucide-react";
import { useLocale } from "next-intl";

export default function ChatSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const locale = useLocale();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We need to fetch the session details to show the listing info
    fetch("/api/chat/sessions")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          const s = res.data.find((x: any) => x.id === sessionId);
          setSession(s);
        }
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!session) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      Session not found
    </div>
  );

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
        {/* Sidebar: Listing Summary */}
        <div className="md:w-1/3 flex flex-col gap-6">
          <Link href="/messages" className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors text-sm font-bold">
            <ChevronLeft className="w-5 h-5" />
            Back to Messages
          </Link>

          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100">
            <img 
              src={session.listing.images?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"} 
              alt={session.listing.title} 
              className="w-full h-40 rounded-[1.5rem] object-cover mb-6"
            />
            <h3 className="text-xl font-black mb-2">{session.listing.title}</h3>
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-6">
              <MapPin className="w-3 h-3" />
              {session.listing.address}
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-50">
              <Link 
                href={`/listings/${session.listingId}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all text-xs font-bold"
              >
                <Building2 className="w-4 h-4" />
                View Listing Detail
              </Link>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl text-xs font-bold text-gray-500">
                <User className="w-4 h-4" />
                {session.users.find((u: any) => u.id !== session.users[0]?.id)?.name || "Partner"}
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="md:w-2/3">
          <ChatWindow sessionId={sessionId} locale={locale} />
        </div>
      </div>
    </div>
  );
}
