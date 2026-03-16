"use client";

import { useState, useRef, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  PlusCircle, Sparkles, Link as LinkIcon, 
  Loader2, CheckCircle, ArrowLeft, 
  Building2, CreditCard, Sofa, FileText, 
  MapPin, ShieldCheck, Ruler, Waves, Zap,
  Image as ImageIcon, X
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      petType: "不限",
      otherPetType: "",
      tax: "allow",
      gender: "all",
      cooking: "allow",
      balcony: "none",
      appliances: [],
      furniture: [],
      others: []
    }
  });

  // 1. 載入原始資料
  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          const data = res.data;
          setListing({
            ...data,
            features: {
              ...listing.features,
              ...(data.features || {})
            }
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // --- Butler Communication ---
  useEffect(() => {
    const handleRequest = () => {
      window.dispatchEvent(new CustomEvent('butler-data-response', { detail: listing }));
    };
    window.addEventListener('butler-request-data', handleRequest);
    return () => window.removeEventListener('butler-request-data', handleRequest);
  }, [listing]);

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
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PUT",
        body: JSON.stringify(listing),
        headers: { "Content-Type": "application/json" },
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error);
      router.push("/landlord/listings");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
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

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <main className="min-h-screen bg-surface p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="grid md:grid-cols-3 gap-12 py-12">
          
          {/* Main Content */}
          <div className="md:col-span-2 space-y-12">
            <header className="flex justify-between items-center">
              <div className="flex items-center gap-6">
                <Link href="/landlord/listings" className="p-3 bg-white rounded-full shadow-sm hover:shadow-md transition-all">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-4xl font-black text-on-surface">完善房源細節</h1>
              </div>
              <div className="bg-success/10 text-success px-4 py-2 rounded-2xl flex items-center gap-2 text-sm font-bold">
                <ShieldCheck className="w-4 h-4" />
                AI 輔助編輯中
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
                    {idx === 0 && (                      <div className="absolute top-2 left-2 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg">
                        COVER 封面
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {idx !== 0 && <span className="text-white text-[10px] font-black bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">設為封面</span>}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(idx);
                      }}
                      className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
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
                  <input type="file" hidden multiple accept="image/*" disabled={uploading} onChange={handleFileUpload} />
                </label>
              </div>
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
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {["不限", "貓", "狗", "其他"].map(type => (
                              <button key={type} onClick={() => setListing({...listing, features: {...listing.features, petType: type}})} className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${listing.features.petType === type ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}>{type}</button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Equipment */}
            <section className="space-y-8 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="text-primary w-6 h-6" />
                <h2 className="text-xl font-bold">設備與家具</h2>
              </div>
              <div className="space-y-8">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-4 block">家電設備</label>
                  <div className="flex flex-wrap gap-3">
                    {["冷氣", "冰箱", "洗衣機", "電視", "熱水器", "微波爐", "飲水機"].map(item => (
                      <button key={item} onClick={() => toggleFeature('appliances', item)} className={`px-6 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${listing.features.appliances.includes(item) ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}>{item}</button>
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
              </div>
              <textarea value={listing.description} onChange={(e) => setListing({...listing, description:e.target.value})} rows={8} placeholder="描述您的房源特色..." className="w-full p-6 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary text-sm leading-relaxed" />
            </section>
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-primary p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <Waves className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 rotate-12" />
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> 編輯預覽</h3>
                <div className="space-y-4 border-b border-white/20 pb-6 mb-6">
                  <div className="text-xs opacity-70 font-bold uppercase">標題</div>
                  <div className="text-sm font-bold line-clamp-2">{listing.title || "未填寫"}</div>
                  <div className="text-xs opacity-70 font-bold uppercase">租金</div>
                  <div className="text-2xl font-black">NT$ {listing.price?.toLocaleString()}</div>
                </div>
                <button onClick={handleSave} disabled={saving || !listing.title || uploading} className="w-full bg-white text-primary py-5 rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                  {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                  儲存修改並更新
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
