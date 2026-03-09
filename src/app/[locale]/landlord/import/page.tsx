"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link as LinkIcon, Loader2, CheckCircle, AlertCircle, Image as ImageIcon } from "lucide-react";

export default function ImportListing() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const res = await fetch("/api/listings/migrate", {
          method: "POST",
          body: JSON.stringify({ image: reader.result }),
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResult(data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
  };

  const handleMigrate = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    
    try {
      const res = await fetch("/api/listings/migrate", {
        method: "POST",
        body: JSON.stringify({ url }),
        headers: { "Content-Type": "application/json" },
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Migration failed");
      
      setResult(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        body: JSON.stringify(result),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to save listing");
      alert("房源已成功上架！");
      window.location.href = "/listings";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">零摩擦房源遷移</h1>
        <p className="text-gray-600 mb-8">貼上 591 網址，管家將自動為您處理繁瑣的資料輸入。</p>

        <div className="butler-card mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://rent.591.com.tw/rent-detail-..."
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-gray-200 outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
              <button
                onClick={handleMigrate}
                disabled={loading || !url}
                className="bg-primary text-white px-8 py-4 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                URL 解析
              </button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">或</span></div>
            </div>

            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={loading}
              className="w-full border-2 border-dashed border-gray-200 py-6 rounded-xl flex flex-col items-center gap-2 hover:border-primary transition-colors text-gray-500 hover:text-primary group"
            >
              <ImageIcon className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <span className="font-bold">上傳 591 App 截圖進行辨識</span>
              <input 
                type="file" 
                ref={imageInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
              />
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="butler-card bg-white"
          >
            <div className="flex items-center gap-2 text-success font-bold mb-4">
              <CheckCircle className="w-6 h-6" />
              解析成功！請確認資料
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">標題</label>
                <input 
                  type="text" 
                  value={result.title} 
                  onChange={(e) => setResult({...result, title: e.target.value})}
                  className="w-full text-lg font-medium border-b border-gray-100 focus:border-primary outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">月租金</label>
                  <input 
                    type="number" 
                    value={result.price} 
                    onChange={(e) => setResult({...result, price: parseInt(e.target.value)})}
                    className="w-full text-xl font-bold text-primary border-b border-gray-100 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">地址</label>
                  <input 
                    type="text" 
                    value={result.address} 
                    onChange={(e) => setResult({...result, address: e.target.value})}
                    className="w-full text-sm border-b border-gray-100 focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Detailed Structure from PRD 4.2.2 */}
              <div className="space-y-6 pt-4">
                <section>
                  <h3 className="text-sm font-black text-on-surface mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary rounded-full"></span>
                    金流與合約
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      placeholder="押金模式 (例: 兩個月)" 
                      className="text-xs p-3 bg-gray-50 rounded-xl border-none outline-none"
                      onChange={(e) => setResult({...result, features: {...result.features, deposit: e.target.value}})}
                    />
                    <input 
                      placeholder="水電計費 (例: 台水台電)" 
                      className="text-xs p-3 bg-gray-50 rounded-xl border-none outline-none"
                      onChange={(e) => setResult({...result, features: {...result.features, utilities: e.target.value}})}
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-black text-on-surface mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary rounded-full"></span>
                    空間與設施
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      placeholder="隔音材質" 
                      className="text-xs p-3 bg-gray-50 rounded-xl border-none outline-none"
                      onChange={(e) => setResult({...result, features: {...result.features, soundproofing: e.target.value}})}
                    />
                    <input 
                      placeholder="家電品牌" 
                      className="text-xs p-3 bg-gray-50 rounded-xl border-none outline-none"
                      onChange={(e) => setResult({...result, features: {...result.features, appliances: e.target.value}})}
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-black text-on-surface mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary rounded-full"></span>
                    生活規則
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <select 
                      className="text-xs p-3 bg-gray-50 rounded-xl border-none outline-none"
                      onChange={(e) => setResult({...result, features: {...result.features, pets: e.target.value}})}
                    >
                      <option value="">寵物公約</option>
                      <option value="allow">可寵</option>
                      <option value="deny">禁寵</option>
                      <option value="negotiable">可議</option>
                    </select>
                    <select 
                      className="text-xs p-3 bg-gray-50 rounded-xl border-none outline-none"
                      onChange={(e) => setResult({...result, features: {...result.features, tax: e.target.value}})}
                    >
                      <option value="">報稅/租補</option>
                      <option value="allow">可報稅</option>
                      <option value="deny">不可報稅</option>
                    </select>
                  </div>
                </section>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">AI 提取特徵</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {result.features && Object.entries(result.features).map(([key, value]: any) => (
                    <span key={key} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                      {key}: {String(value)}
                    </span>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold mt-4 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                確認上架房源
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
