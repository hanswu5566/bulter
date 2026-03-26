"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { 
  PlusCircle, Sparkles, Link as LinkIcon, 
  Loader2, CheckCircle, ArrowLeft, 
  Building2, CreditCard, Sofa, FileText, 
  MapPin, ShieldCheck, Ruler, Waves, Zap,
  Image as ImageIcon, X
} from "lucide-react";

type CreateMode = "CHOICE" | "MANUAL" | "IMPORT";

export default function CreateListingPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.email === "shankesleroux8988@gmail.com";
  const t = useTranslations("CreateListing");
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
      alert(t("upload_failed"));
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
      if (!res.ok) throw new Error(t("save_failed"));
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
              <h1 className="text-5xl font-black text-on-surface mb-4">{t("title")}</h1>
              <p className="text-gray-500 mb-16 text-lg">{t("subtitle")}</p>
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <button onClick={() => setMode("MANUAL")} className="butler-card bg-white p-12 hover:border-primary transition-all group flex flex-col items-center text-center gap-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <PlusCircle className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{t("manual_title")}</h3>
                    <p className="text-sm text-gray-400">{t("manual_desc")}</p>
                  </div>
                </button>
                {isAdmin && (
                  <button onClick={() => setMode("IMPORT")} className="butler-card bg-primary/[0.02] border-2 border-primary/20 p-12 hover:border-primary transition-all group flex flex-col items-center text-center gap-6 relative overflow-hidden">
                    <div className="absolute top-4 right-4 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full">{t("recommended")}</div>
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Sparkles className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2">{t("ai_title")}</h3>
                      <p className="text-sm text-gray-400">{t("ai_desc")}</p>
                    </div>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* IMPORT STAGE */}
          {mode === "IMPORT" && (
            <motion.div key="import" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} className="max-w-2xl mx-auto py-12">
              <button onClick={() => setMode("CHOICE")} className="flex items-center gap-2 text-gray-400 font-bold mb-8 hover:text-on-surface cursor-pointer">
                <ArrowLeft className="w-4 h-4" /> {t("back_to_choice")}
              </button>
              <div className="text-center mb-12">
                <h1 className="text-3xl font-black mb-2 text-on-surface">{t("ai_import_title")}</h1>
                <p className="text-gray-500 text-sm">{t("ai_import_subtitle")}</p>
              </div>
              <div className="butler-card bg-white p-8 space-y-6">
                <textarea
                  rows={8}
                  value={importInput}
                  onChange={(e) => setImportInput(e.target.value)}
                  placeholder={t("import_placeholder")}
                  className="w-full p-6 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary transition-all text-sm leading-relaxed"
                />
                <button onClick={handleImport} disabled={loading || !importInput.trim()} className="w-full bg-primary text-white py-5 rounded-2xl font-black shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                  {t("btn_start_import")}
                </button>
              </div>
              {loading && <div className="mt-12 text-center animate-pulse text-primary font-bold">{t("ai_processing")}</div>}
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
                      <ArrowLeft className="w-4 h-4" /> {t("back")}
                    </button>
                    <h1 className="text-4xl font-black text-on-surface">{t("refine_title")}</h1>
                  </div>
                  <div className="bg-success/10 text-success px-4 py-2 rounded-2xl flex items-center gap-2 text-sm font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    {t("ai_optimizing")}
                  </div>
                </header>

                {/* Section 1: Basic Info */}
                <section className="space-y-8 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Building2 className="text-primary w-6 h-6" />
                    <h2 className="text-xl font-bold">{t("basic_info")}</h2>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">{t("listing_title_label")}</label>
                      <input value={listing.title} onChange={(e) => setListing({...listing, title:e.target.value})} placeholder={t("listing_title_placeholder")} className="w-full p-4 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-lg" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">{t("object_type")}</label>
                        <select value={listing.features.type} onChange={(e) => setListing({...listing, features: {...listing.features, type:e.target.value}})} className="w-full p-4 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary appearance-none">
                          <option value="獨立套房">{t("types.studio")}</option>
                          <option value="分租套房">{t("types.shared_studio")}</option>
                          <option value="雅房">{t("types.room")}</option>
                          <option value="整層住家">{t("types.entire_house")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">{t("size_label")}</label>
                        <input value={listing.features.size} onChange={(e) => setListing({...listing, features: {...listing.features, size:e.target.value}})} placeholder={t("size_placeholder")} className="w-full p-4 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">{t("address_label")}</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input value={listing.address} onChange={(e) => setListing({...listing, address:e.target.value})} placeholder={t("address_placeholder")} className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section: Images */}
                <section className="space-y-8 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="text-primary w-6 h-6" />
                      <h2 className="text-xl font-bold">{t("photos")}</h2>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("photo_tip")}</p>
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
                          alt={`Listing Photo ${idx + 1}`} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                        
                        {/* Status Badges */}
                        {idx === 0 && (
                          <div className="absolute top-2 left-2 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg">
                            {t("cover_badge")}
                          </div>
                        )}
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          {idx !== 0 && <span className="text-white text-[10px] font-black bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">{t("set_cover")}</span>}
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
                          <span className="text-xs font-bold">{t("add_photo")}</span>
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
                    <p className="text-sm text-gray-400 text-center py-4">{t("no_photo_tip")}</p>
                  )}
                </section>

                {/* Section 2: Financials */}
                <section className="space-y-8 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="text-primary w-6 h-6" />
                    <h2 className="text-xl font-bold">{t("fees_rules")}</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">{t("rent_label")}</label>
                      <input type="number" value={listing.price} onChange={(e) => setListing({...listing, price:parseInt(e.target.value)})} className="w-full p-4 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary text-xl font-black text-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">{t("deposit_label")}</label>
                      <select value={listing.features.deposit} onChange={(e) => setListing({...listing, features: {...listing.features, deposit:e.target.value}})} className="w-full p-4 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary">
                        <option value="兩個月">{t("deposits.two_months")}</option>
                        <option value="一個月">{t("deposits.one_month")}</option>
                        <option value="面議">{t("deposits.negotiable")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">{t("electricity_label")}</label>
                      <input value={listing.features.electricity} onChange={(e) => setListing({...listing, features: {...listing.features, electricity:e.target.value}})} placeholder={t("electricity_placeholder")} className="w-full p-4 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">{t("pet_policy")}</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex bg-gray-50 p-1 rounded-xl h-fit">
                          <button onClick={() => setListing({...listing, features: {...listing.features, pets: 'allow'}})} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${listing.features.pets === 'allow' ? 'bg-white shadow text-primary' : 'text-gray-400'}`}>{t("pets_allow")}</button>
                          <button onClick={() => setListing({...listing, features: {...listing.features, pets: 'deny'}})} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${listing.features.pets === 'deny' ? 'bg-white shadow text-primary' : 'text-gray-400'}`}>{t("pets_deny")}</button>
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
                                {[
                                  { key: "none", val: "不限" },
                                  { key: "cat", val: "貓" },
                                  { key: "dog", val: "狗" },
                                  { key: "other", val: "其他" }
                                ].map(({ key, val }) => {
                                  const isSelected = listing.features.petType === val;
                                  return (
                                    <button
                                      key={key}
                                      onClick={() => {
                                        setListing({...listing, features: {...listing.features, petType: val}});
                                      }}
                                      className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                                        isSelected 
                                          ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                                          : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                                      }`}
                                    >
                                      {t(`pet_types.${key}`)}
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
                                      placeholder={t("other_pet_placeholder")}
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
                    <h2 className="text-xl font-bold">{t("assets_equipment")}</h2>
                  </div>
                  
                  <div className="space-y-8">
                    {/* Appliances Category */}
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-4 block">{t("appliances")}</label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { key: "ac", val: "冷氣" },
                          { key: "fridge", val: "冰箱" },
                          { key: "washer", val: "洗衣機" },
                          { key: "tv", val: "電視" },
                          { key: "heater", val: "熱水器" },
                          { key: "microwave", val: "微波爐" },
                          { key: "water_dispenser", val: "飲水機" },
                          { key: "vacuum", val: "吸塵器" },
                          { key: "air_purifier", val: "空氣清淨機" }
                        ].map(({ key, val }) => (
                          <button
                            key={key}
                            onClick={() => toggleFeature('appliances', val)}
                            className={`px-6 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                              listing.features.appliances.includes(val)
                                ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                            }`}
                          >
                            {t(`items.${key}`)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Furniture Category */}
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-4 block">{t("furniture")}</label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { key: "bed", val: "床舖" },
                          { key: "wardrobe", val: "衣櫃" },
                          { key: "desk", val: "書桌" },
                          { key: "sofa", val: "沙發" },
                          { key: "coffee_table", val: "茶几" },
                          { key: "dining_table", val: "餐桌椅" },
                          { key: "bookshelf", val: "書架" },
                          { key: "shoe_cabinet", val: "鞋櫃" }
                        ].map(({ key, val }) => (
                          <button
                            key={key}
                            onClick={() => toggleFeature('furniture', val)}
                            className={`px-6 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                              (listing.features.furniture || []).includes(val)
                                ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                            }`}
                          >
                            {t(`items.${key}`)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Building/Others Category */}
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-4 block">{t("others")}</label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { key: "elevator", val: "電梯" },
                          { key: "balcony", val: "陽台" },
                          { key: "internet", val: "網路" },
                          { key: "cable_tv", val: "第四台" },
                          { key: "gas", val: "天然瓦斯" },
                          { key: "manager", val: "管理員" },
                          { key: "trash", val: "垃圾代收" },
                          { key: "parking", val: "車位" },
                          { key: "gym", val: "健身房" }
                        ].map(({ key, val }) => (
                          <button
                            key={key}
                            onClick={() => toggleFeature('others', val)}
                            className={`px-6 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                              (listing.features.others || []).includes(val)
                                ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                            }`}
                          >
                            {t(`items.${key}`)}
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
                      <h2 className="text-xl font-bold">{t("description")}</h2>
                    </div>
                    <div className="flex bg-gray-50 p-1 rounded-xl">
                      <button 
                        onClick={() => setListing({...listing, _showPreview: false})} 
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!listing._showPreview ? 'bg-white shadow text-primary' : 'text-gray-400'}`}
                      >
                        {t("edit")}
                      </button>
                      <button 
                        onClick={() => setListing({...listing, _showPreview: true})} 
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${listing._showPreview ? 'bg-white shadow text-primary' : 'text-gray-400'}`}
                      >
                        {t("preview")}
                      </button>
                    </div>
                  </div>

                  {listing._showPreview ? (
                    <div 
                      className="w-full p-6 rounded-xl bg-gray-50 min-h-[150px] text-sm leading-relaxed listing-description overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: listing.description || t("empty_description") }}
                    />
                  ) : (
                    <textarea 
                      value={listing.description} 
                      onChange={(e) => setListing({...listing, description:e.target.value})} 
                      rows={8} 
                      placeholder={t("description_placeholder")} 
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
                      <ShieldCheck className="w-5 h-5" /> {t("publish_preview")}
                    </h3>
                    <div className="space-y-4 border-b border-white/20 pb-6 mb-6">
                      <div className="text-xs opacity-70 font-bold uppercase">{t("preview_title")}</div>
                      <div className="text-sm font-bold line-clamp-2">{listing.title || t("not_filled")}</div>
                      <div className="text-xs opacity-70 font-bold uppercase">{t("estimated_rent")}</div>
                      <div className="text-2xl font-black">{t("currency")} {listing.price?.toLocaleString()}</div>
                    </div>
                    <button onClick={handleSave} disabled={loading || !listing.title || uploading} className="w-full bg-white text-primary py-5 rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                      {t("btn_confirm_publish")}
                    </button>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-loose">
                      {t("publish_tip_1")}<br/>{t("publish_tip_2")}
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
