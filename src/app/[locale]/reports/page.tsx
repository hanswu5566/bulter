"use client";

import { motion } from "framer-motion";
import { 
  FileText, Sparkles, Calendar, MapPin, 
  ChevronRight, Loader2, ClipboardCheck 
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { useSession } from "next-auth/react";

export default function ReportsList() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "TENANT";
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inspect/report")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setReports(res.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <main className="min-h-screen bg-surface p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-on-surface mb-2">
            {role === "LANDLORD" ? "收到房源檢驗" : "我的實勘報告"}
          </h1>
          <p className="text-gray-500">
            {role === "LANDLORD" 
              ? "查看房客對您房源的實地檢驗記錄與 AI 建議。" 
              : "查看您過去對所有房源的實地檢驗與管家分析。"}
          </p>
        </header>

        {reports.length > 0 ? (
          <div className="space-y-6">
            {reports.map((report, idx) => (
              <Link key={report.id} href={`/reports/${report.id}`}>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all flex flex-col md:flex-row items-start md:items-center gap-6 group"
                >
                  {/* Avatar or Icon */}
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-all overflow-hidden">
                    {role === "LANDLORD" && report.tenant?.image ? (
                      <img src={report.tenant.image} alt="Tenant" className="w-full h-full object-cover" />
                    ) : (
                      <ClipboardCheck className="w-7 h-7" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-on-surface">
                        {report.listing?.title || "未命名房源"}
                      </h3>
                      {role === "LANDLORD" && (
                        <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-400 uppercase">
                          檢驗人: {report.tenant?.name || "匿名房客"}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 font-medium">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {report.listing?.address}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(report.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 border-gray-50 pt-4 md:pt-0">
                    <div className="text-right hidden md:block">
                      <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Score</div>
                      <div className="text-xl font-black text-on-surface">92%</div>
                    </div>
                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-white transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-gray-200" />
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">尚無實勘報告</h3>
            <p className="text-gray-400 text-sm mb-8">當您完成房源實地檢查後，管家的分析報告會出現在這裡。</p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
            >
              去透視房源
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
