"use client";

import { 
  User, ArrowLeftRight, LogIn, LogOut, 
  Settings, List, PlusCircle, ClipboardCheck,
  Compass, LayoutDashboard, Loader2
} from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmationModal from "./ConfirmationModal";

// --- Custom Butler Icon (Matching the FAB style) ---
const ButlerIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="7" r="4" />
    <path d="M5 21v-2a7 7 0 0 1 7-7 7 7 0 0 1 7 7v2" />
    <path d="M10 14.5l2 1 2-1v2l-2-1-2 1v-2z" fill="currentColor" stroke="none" />
    <path d="M10 14.5l2 1 2-1-2 1-2-1z" fill="currentColor" />
  </svg>
);

export default function Navbar() {
  const { data: session, update, status } = useSession();
  const t = useTranslations("Navbar");
  const commonT = useTranslations("Common");
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const role = (session?.user as any)?.role || "TENANT";

  const handleRoleSwitch = async () => {
    setIsSwitching(true);
    const newRole = role === "TENANT" ? "LANDLORD" : "TENANT";
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
        headers: { "Content-Type": "application/json" },
      });
      const resData = await res.json();
      
      if (resData.success) {
        // Update session and wait for it to finish
        await update({ role: newRole });
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to update role", err);
    } finally {
      setIsSwitching(false);
    }
  };

  const toggleRole = async () => {
    if (isSwitching) return;
    
    // Check if AI Butler has messages
    if ((window as any).__BUTLER_HAS_MESSAGES__) {
      setShowConfirmModal(true);
      return;
    }

    await handleRoleSwitch();
  };

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* LEFT: Branding & Public Nav */}
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                <ButlerIcon className="text-white w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl tracking-tight text-on-surface leading-none">{t('brand_name')}</span>
                <span className="text-[10px] font-bold text-primary tracking-[0.2em] mt-1 hidden sm:block">{t('brand_subtitle')}</span>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              <Link 
                href="/listings" 
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                  isActive('/listings') ? 'bg-primary/5 text-primary' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Compass className="w-4 h-4" />
                {t('explore')}
              </Link>
            </div>
          </div>

          {/* RIGHT: Role-based Workspace & Profile */}
          <div className="flex items-center gap-4">
            {session && (
              <div className="hidden md:flex items-center bg-gray-50 p-1.5 rounded-2xl border border-gray-100 gap-1">
                {role === "TENANT" ? (
                  <Link 
                    href="/reports" 
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      isActive('/reports') ? 'bg-white shadow-sm text-on-surface' : 'text-gray-400 hover:text-on-surface'
                    }`}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    {t('reports')}
                  </Link>
                ) : (
                  <>
                    <Link 
                      href="/landlord/listings" 
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        isActive('/landlord/listings') && !isActive('/landlord/listings/create') ? 'bg-white shadow-sm text-on-surface' : 'text-gray-400 hover:text-on-surface'
                      }`}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      {t('my_listings')}
                    </Link>
                    <Link 
                      href="/landlord/listings/create" 
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        isActive('/landlord/listings/create') ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-on-surface'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      {t('import')}
                    </Link>
                  </>
                )}
              </div>
            )}

            <div className="h-6 w-px bg-gray-100 mx-2 hidden md:block"></div>

            {status === "loading" ? (
              <div className="w-10 h-10 bg-gray-50 rounded-full animate-pulse" />
            ) : session ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={toggleRole}
                  disabled={isSwitching}
                  className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-on-surface text-white text-sm font-black hover:opacity-90 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSwitching ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <ArrowLeftRight className="w-4 h-4 text-primary" />
                  )}
                  {role === "TENANT" ? t('switch_landlord') : t('switch_tenant')}
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="w-10 h-10 border-2 border-white bg-gray-100 rounded-[1.25rem] flex items-center justify-center overflow-hidden hover:ring-4 hover:ring-primary/10 transition-all cursor-pointer shadow-sm"
                  >
                    {session.user?.image ? (
                      <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-gray-500" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-[-1]" onClick={() => setIsMenuOpen(false)}></div>
                        <motion.div
                          initial={{ opacity: 0, y: 15, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 15, scale: 0.95 }}
                          className="absolute right-0 mt-4 w-60 bg-white rounded-3xl shadow-2xl border border-gray-100 p-2 overflow-hidden z-50"
                        >
                          <div className="px-5 py-4 bg-gray-50/50 rounded-2xl mb-2">
                            <div className="text-xs font-black text-on-surface truncate">{session.user?.name}</div>
                            <div className="text-[10px] text-gray-400 truncate mt-0.5">{session.user?.email}</div>
                            <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded-full uppercase tracking-tighter">
                              {role === "LANDLORD" ? 'Landlord Member' : 'Elite Tenant'}
                            </div>
                          </div>
                          
                          <Link 
                            href="/user/profile"
                            onClick={() => setIsMenuOpen(false)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                          >
                            <Settings className="w-4 h-4 text-gray-400" />
                            {t('profile')}
                          </Link>
                          
                          <button 
                            onClick={() => signOut()}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-1"
                          >
                            <LogOut className="w-4 h-4" />
                            {t('logout')}
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => signIn("google")}
                className="bg-primary text-white px-6 py-3 rounded-2xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
              >
                {t('login')}
              </button>
            )}
          </div>
        </div>
      </nav>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleRoleSwitch}
        title={commonT('warning')}
        message={t('switch_role_confirm')}
        isDanger={true}
      />
    </>
  );
}
