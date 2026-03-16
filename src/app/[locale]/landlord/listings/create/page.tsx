"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  PlusCircle, Sparkles, Link as LinkIcon, 
  Loader2, CheckCircle, ArrowLeft, 
  Building2, CreditCard, Sofa, FileText, 
  MapPin, ShieldCheck, Ruler, Waves, Zap,
  Image as ImageIcon, X
} from "lucide-react";

type CreateMode = "CHOICE" | "MANUAL" | "IMPORT";

export default function CreateListingPage() {
  const [mode, setMode] = useState<CreateMode>("CHOICE");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importInput, setImportInput] = useState("");
  const [error, setError] = useState("");

  const [listing, setListing] = useState<any>({
    title: "",
    price: 0,
    address: "",
    description: "",
    images: [],
    features: {
      type: "獨立套房",
      size: "",
      floor: "",
      totalFloor: "",
      deposit: "兩個月",
      managementFee: 0,
      electricity: "台水台電",
      water: "台水台電",
      soundproofing: "水泥隔間",
      pets: "deny",
      petType: "不限", // "不限", "貓", "狗", "其他"
      otherPetType: "",
      tax: "allow",
      gender: "all",
      cooking: "allow",
      balcony: "none",
      appliances: [], // ["冷氣", "冰箱", "洗衣機"]
      furniture: []
    }
  });

  // --- Butler Communication ---
  useEffect(() => {
    const handleRequest = () => {
      window.dispatchEvent(new CustomEvent('butler-data-response', { detail: listing }));
    };
    window.addEventListener('butler-request-data', handleRequest);
    return () => window.removeEventListener('butler-request-data', handleRequest);
  }, [listing]);

  const handleImport = async () => {
    if (!importInput.trim()) return;
    setLoading(true);
    try {
      const isUrl = importInput.startsWith("http");
      const res = await fetch("/api/listings/migrate", {
        method: "POST",
        body: JSON.stringify(isUrl ? { url: importInput } : { text: importInput }),
        headers: { "Content-Type": "application/json" },
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error);
      
      // Ensure all fields have fallback values to avoid null/undefined in controlled inputs
      const importedData = resData.data;
      const cleanedData = {
        ...listing, // Keep default values
        ...importedData,
        title: importedData.title || "",
        address: importedData.address || "",
        description: importedData.description || "",
        price: importedData.price || 0,
        images: importedData.images || [],
        features: {
          ...listing.features,
          ...(importedData.features || {}),
          size: importedData.features?.size || "",
          floor: importedData.features?.floor || "",
          totalFloor: importedData.features?.totalFloor || "",
          electricity: importedData.features?.electricity || "",
          water: importedData.features?.water || "",
          description: importedData.features?.description || ""
        }
      };
      
      setListing(cleanedData);
      setMode("MANUAL");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const newImageUrls: string[] = [];

    try {
      for (const file of files) {
        // 1. Get signed URL
        const res = await fetch("/api/storage/upload-url", {
          method: "POST",
          body: JSON.stringify({ fileName: file.name, contentType: file.type }),
        });
        const { data } = await res.json();
        const { uploadUrl, publicUrl } = data;

        // 2. Upload to GCS
        await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        newImageUrls.push(publicUrl);
      }

      setListing((prev: any) => ({
        ...prev,
        images: [...prev.images, ...newImageUrls]
      }));
    } catch (err) {
      console.error("Upload failed:", err);
      alert("圖片上傳失敗");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        body: JSON.stringify(listing),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("儲存失敗");
      window.location.href = "/listings";
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const toggleFeature = (category: string, item: string) => {
    const list = listing.features[category] || [];
    const newList = list.includes(item) 
      ? list.filter((i: string) => i !== item) 
      : [...list, item];
    setListing({
      ...listing,
      features: { ...listing.features, [category]: newList }
    });
  };

  const setAsCover = (index: number) => {
    const newImages = [...listing.images];
    const [selectedImg] = newImages.splice(index, 1);
    newImages.unshift(selectedImg);
    setListing({ ...listing, images: newImages });
  };

  const removeImage = (index: number) => {
    const newImages = [...listing.images];
    newImages.splice(index, 1);
    setListing({ ...listing, images: newImages });
  };

  return (
    <main className="min-h-screen bg-surface p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          
          {/* CHOICE STAGE */}
          {mode === "CHOICE" && (
            <motion.div key="choice" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="text-center py-12">
              <h1 className="text-5xl font-black text-on-surface mb-4">發布您的精選房源</h1>
              <p className="text-gray-500 mb-16 text-lg">選擇最適合您的上架方式，讓 AI 協助處理繁瑣細節。</p>
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <button onClick={() => setMode("MANUAL")} className="butler-card bg-white p-12 hover:border-primary transition-all group flex flex-col items-center text-center gap-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <PlusCircle className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">手動精確輸入</h3>
                    <p className="text-sm text-gray-400">完整填寫 591 級別的詳細規格</p>
                  </div>
                </button>
                <button onClick={() => setMode("IMPORT")} className="butler-card bg-primary/[0.02] border-2 border-primary/20 p-12 hover:border-primary transition-all group flex flex-col items-center text-center gap-6 relative overflow-hidden">
                  <div className="absolute top-4 right-4 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full">RECOMMENDED</div>
                  <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Sparkles className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">AI 快速匯入</h3>
                    <p className="text-sm text-gray-400">貼上網址或描述文字自動填表</p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* IMPORT STAGE */}
          {mode === "IMPORT" && (
            <motion.div key="import" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} className="max-w-2xl mx-auto py-12">
              <button onClick={() => setMode("CHOICE")} className="flex items-center gap-2 text-gray-400 font-bold mb-8 hover:text-on-surface cursor-pointer">
                <ArrowLeft className="w-4 h-4" /> 返回選擇
              </button>
              <div className="text-center mb-12">
                <h1 className="text-3xl font-black mb-2 text-on-surface">AI 智慧解析上架</h1>
                <p className="text-gray-500 text-sm">支援 591、Facebook 貼文文字或任何網址</p>
              </div>
              <div className="butler-card bg-white p-8 space-y-6">
                <textarea
                  rows={8}
                  value={importInput}
                  onChange={(e) => setImportInput(e.target.value)}
                  placeholder="在此貼上房源網址，或是複製整段房源描述內容..."
                  className="w-full p-6 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary transition-all text-sm leading-relaxed"
                />
                <button onClick={handleImport} disabled={loading || !importInput.trim()} className="w-full bg-primary text-white py-5 rounded-2xl font-black shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                  開始解析並填表
                </button>
              </div>
              {loading && <div className="mt-12 text-center animate-pulse text-primary font-bold">管家正在提取房源細節...</div>}
            </motion.div>
          )}

          {/* MANUAL FORM STAGE - THE PRO FORM */}
          {mode === "MANUAL" && (
            <motion.div key="manual" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="grid md:grid-cols-3 gap-12 py-12">
              
              {/* Main Content */}
              <div className="md:col-span-2 space-y-12">
                <header className="flex justify-between items-center">
                  <div>
                    <button onClick={() => setMode("CHOICE")} className="flex items-center gap-2 text-gray-400 font-bold mb-2 hover:text-on-surface cursor-pointer">
                      <ArrowLeft className="w-4 h-4" /> 返回
                    </button>
                    <h1 className="text-4xl font-black text-on-surface">完善房源細節</h1>
                  </div>
                  <div className="bg-success/10 text-success px-4 py-2 rounded-2xl flex items-center gap-2 text-sm font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    AI 輔助優化中
                  </div>
                </header>

                {/* Section 1: Basic Info */}
                <section className="space-y-8 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Building2 className="text-primary w-6 h-6" />
                    <h2 className="text-xl font-bold">房屋基本狀況</h2>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">房源標題 (吸引房客的第一眼)</label>
                      <input value={listing.title} onChange={(e) => setListing({...listing, title:e.target.value})} placeholder="例如：大安區景觀陽台套房，近捷運 3 分鐘" className="w-full p-4 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-lg" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">物件型態</label>
                        <select value={listing.features.type} onChange={(e) => setListing({...listing, features: {...listing.features, type:e.target.value}})} className="w-full p-4 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary appearance-none">
                          <option>獨立套房</option>
                          <option>分租套房</option>
                          <option>雅房</option>
                          <option>整層住家</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">坪數 (坪)</label>
                        <input value={listing.features.size} onChange={(e) => setListing({...listing, features: {...listing.features, size:e.target.value}})} placeholder="例如：8" className="w-full p-4 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">房源地址</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input value={listing.address} onChange={(e) => setListing({...listing, address:e.target.value})} placeholder="例如：台北市大安區信義路三段..." className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section: Images */}
                <section className="space-y-8 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="text-primary w-6 h-6" />
                      <h2 className="text-xl font-bold">房源照片</h2>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">第一張照片將自動成為房源封面</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {listing.images.map((img: string, idx: number) => (
                      <div 
                        key={idx} 
                        className={`relative aspect-square rounded-2xl overflow-hidden group border-2 transition-all cursor-pointer ${idx === 0 ? 'border-primary shadow-md' : 'border-gray-100'}`}
                        onClick={() => setAsCover(idx)}
                      >
                        <img 
                          src={img} 
                          alt={`房源照片 ${idx + 1}`} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                        
                        {/* Status Badges */}
                        {idx === 0 && (
                          <div className="absolute top-2 left-2 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg">
                            COVER 封面
                          </div>
                        )}
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          {idx !== 0 && <span className="text-white text-[10px] font-black bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">設為封面</span>}
                        </div>

                        {/* Remove Button */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(idx);
                          }}
                          className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-all cursor-pointer relative">
                      {uploading ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                      ) : (
                        <>
                          <PlusCircle className="w-8 h-8" />
                          <span className="text-xs font-bold">新增照片</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        hidden 
                        multiple 
                        accept="image/*" 
                        disabled={uploading}
                        onChange={handleFileUpload} 
                      />
                    </label>
                  </div>
                  {listing.images.length === 0 && !uploading && (
                    <p className="text-sm text-gray-400 text-center py-4">目前無照片，解析 591 網址可自動擷取。</p>
                  )}
                </section>

                {/* Section 2: Financials */}
                <section className="space-y-8 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="text-primary w-6 h-6" />
                    <h2 className="text-xl font-bold">費用與規則</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">每月租金 (TWD)</label>
                      <input type="number" value={listing.price} onChange={(e) => setListing({...listing, price:parseInt(e.target.value)})} className="w-full p-4 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary text-xl font-black text-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">押金模式</label>
                      <select value={listing.features.deposit} onChange={(e) => setListing({...listing, features: {...listing.features, deposit:e.target.value}})} className="w-full p-4 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary">
                        <option>兩個月</option>
                        <option>一個月</option>
                        <option>面議</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">電費計法</label>
                      <input value={listing.features.electricity} onChange={(e) => setListing({...listing, features: {...listing.features, electricity:e.target.value}})} placeholder="例如：台水台電 或 每度 5 元" className="w-full p-4 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">寵物公約</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex bg-gray-50 p-1 rounded-xl h-fit">
                          <button onClick={() => setListing({...listing, features: {...listing.features, pets: 'allow'}})} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${listing.features.pets === 'allow' ? 'bg-white shadow text-primary' : 'text-gray-400'}`}>可寵</button>
                          <button onClick={() => setListing({...listing, features: {...listing.features, pets: 'deny'}})} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${listing.features.pets === 'deny' ? 'bg-white shadow text-primary' : 'text-gray-400'}`}>禁寵</button>
                        </div>
                        
                        <AnimatePresence>
                          {listing.features.pets === 'allow' && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="space-y-4"
                            >
                              <div className="flex flex-wrap gap-2">
                                {["不限", "貓", "狗", "其他"].map(type => {
                                  const isSelected = listing.features.petType === type;
                                  return (
                                    <button
                                      key={type}
                                      onClick={() => {
                                        setListing({...listing, features: {...listing.features, petType: type}});
                                      }}
                                      className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                                        isSelected 
                                          ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                                          : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                                      }`}
                                    >
                                      {type}
                                    </button>
                                  );
                                })}
                              </div>
                              
                              <AnimatePresence>
                                {listing.features.petType === "其他" && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                  >
                                    <input 
                                      value={listing.features.otherPetType || ""} 
                                      onChange={(e) => setListing({...listing, features: {...listing.features, otherPetType: e.target.value}})}
                                      placeholder="請輸入其他寵物類型（如：兔子、鳥...）"
                                      className="w-full p-3 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
                                    />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 3: Assets & Equipment */}
                <section className="space-y-8 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Zap className="text-primary w-6 h-6" />
                    <h2 className="text-xl font-bold">設備與家具</h2>
                  </div>
                  
                  <div className="space-y-8">
                    {/* Appliances Category */}
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-4 block">家電設備</label>
                      <div className="flex flex-wrap gap-3">
                        {["冷氣", "冰箱", "洗衣機", "電視", "熱水器", "微波爐", "飲水機", "吸塵器", "空氣清淨機"].map(item => (
                          <button
                            key={item}
                            onClick={() => toggleFeature('appliances', item)}
                            className={`px-6 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                              listing.features.appliances.includes(item)
                                ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Furniture Category */}
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-4 block">家具配置</label>
                      <div className="flex flex-wrap gap-3">
                        {["床舖", "衣櫃", "書桌", "沙發", "茶几", "餐桌椅", "書架", "鞋櫃"].map(item => (
                          <button
                            key={item}
                            onClick={() => toggleFeature('furniture', item)}
                            className={`px-6 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                              (listing.features.furniture || []).includes(item)
                                ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Building/Others Category */}
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-4 block">公共設施與其他</label>
                      <div className="flex flex-wrap gap-3">
                        {["電梯", "陽台", "網路", "第四台", "天然瓦斯", "管理員", "垃圾代收", "車位", "健身房"].map(item => (
                          <button
                            key={item}
                            onClick={() => toggleFeature('others', item)}
                            className={`px-6 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                              (listing.features.others || []).includes(item)
                                ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 4: Description */}
                <section className="space-y-4 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FileText className="text-primary w-6 h-6" />
                      <h2 className="text-xl font-bold">房源介紹</h2>
                    </div>
                    <div className="flex bg-gray-50 p-1 rounded-xl">
                      <button 
                        onClick={() => setListing({...listing, _showPreview: false})} 
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!listing._showPreview ? 'bg-white shadow text-primary' : 'text-gray-400'}`}
                      >
                        編輯
                      </button>
                      <button 
                        onClick={() => setListing({...listing, _showPreview: true})} 
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${listing._showPreview ? 'bg-white shadow text-primary' : 'text-gray-400'}`}
                      >
                        預覽
                      </button>
                    </div>
                  </div>

                  {listing._showPreview ? (
                    <div 
                      className="w-full p-6 rounded-xl bg-gray-50 min-h-[150px] text-sm leading-relaxed listing-description overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: listing.description || "尚未輸入內容" }}
                    />
                  ) : (
                    <textarea 
                      value={listing.description} 
                      onChange={(e) => setListing({...listing, description:e.target.value})} 
                      rows={8} 
                      placeholder="描述您的房源特色，或直接將 591 的描述貼上，管家會協助優化排版..." 
                      className="w-full p-6 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary text-sm leading-relaxed" 
                    />
                  )}
                </section>
              </div>

              {/* STICKY SIDEBAR */}
              <div className="md:col-span-1">
                <div className="sticky top-24 space-y-6">
                  <div className="bg-primary p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                    <Waves className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 rotate-12" />
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" /> 上架預覽
                    </h3>
                    <div className="space-y-4 border-b border-white/20 pb-6 mb-6">
                      <div className="text-xs opacity-70 font-bold uppercase">標題</div>
                      <div className="text-sm font-bold line-clamp-2">{listing.title || "未填寫"}</div>
                      <div className="text-xs opacity-70 font-bold uppercase">預估月租</div>
                      <div className="text-2xl font-black">NT$ {listing.price?.toLocaleString()}</div>
                    </div>
                    <button onClick={handleSave} disabled={loading || !listing.title || uploading} className="w-full bg-white text-primary py-5 rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                      確認發布房源
                    </button>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-loose">
                      發布後 AI 管家將自動<br/>開始為您尋找最合適的房客
                    </p>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
