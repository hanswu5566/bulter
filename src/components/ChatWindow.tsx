"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Sparkles, User, ShieldCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  senderId: string;
  content: string;
  translatedContent: any;
  createdAt: string;
  sender: { id: string; name: string; image: string; role: string };
}

export default function ChatWindow({ sessionId, locale }: { sessionId: string; locale: string }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/chat/sessions/${sessionId}/messages`)
      .then(res => res.json())
      .then(res => {
        if (res.success) setMessages(res.data);
        setLoading(false);
      });
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    
    setSending(true);
    const content = input;
    setInput("");

    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.data]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[500px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-surface/30"
      >
        {messages.map((msg) => {
          const isMe = msg.senderId === session?.user?.id;
          const translation = msg.translatedContent?.[locale];

          return (
            <div 
              key={msg.id} 
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex flex-col max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
                <div className={`flex items-center gap-2 mb-1 px-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                   <span className="text-[10px] font-bold text-gray-400">
                     {msg.sender.name || "User"}
                   </span>
                </div>
                
                <div className={`p-4 rounded-[1.5rem] shadow-sm relative group ${
                  isMe 
                    ? "bg-primary text-white rounded-tr-none" 
                    : "bg-white text-on-surface rounded-tl-none border border-gray-100"
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  
                  {/* AI Translation Overlay */}
                  {translation && translation !== msg.content && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-2 pt-2 border-t border-white/20 text-xs italic opacity-80 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      {translation}
                    </motion.div>
                  )}
                </div>
                <span className="text-[9px] text-gray-300 mt-1 px-2">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2 bg-gray-50 p-2 rounded-2xl items-center focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-3 bg-primary text-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
