"use client";

import React, { useState, useEffect } from "react";
import { APIProvider, Map, Marker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { Maximize2, Minimize2 } from "lucide-react";

interface MapItem {
  name: string;
  type: string;
  distance: string;
  vicinity?: string;
  keyword: string;
  lat?: number;
  lng?: number;
  a1?: number;
  a2?: number;
  isHotspot?: boolean;
}

interface ListingMapProps {
  apiKey: string;
  listingAddress: string;
  listingLat: number;
  listingLng: number;
  conveniences?: MapItem[];
  threats?: MapItem[];
  hotspots?: any[];
  mode?: "amenities" | "safety";
  commuteAddress?: string; // 🚇 Personal commute address passed from profile settings
}

// 🚇 Headless Subcomponent to calculate and render dynamic Google Directions route polylines
function CommuteRouteDirections({
  listingLat,
  listingLng,
  commuteAddress,
  commuteMode
}: {
  listingLat: number;
  listingLng: number;
  commuteAddress: string;
  commuteMode: "transit" | "driving" | "scooter";
}) {
  const map = useMap();
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);

  // Initialize DirectionsRenderer with dynamic color based on commuteMode
  useEffect(() => {
    if (!map) return;

    const routeColor = commuteMode === "transit" ? "#3B82F6" : commuteMode === "driving" ? "#10B981" : "#F59E0B";

    const renderer = new window.google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true, // Keep our gorgeous custom terracotta and safety pins intact!
      polylineOptions: {
        strokeColor: routeColor,
        strokeWeight: 5,
        strokeOpacity: 0.8
      }
    });

    setDirectionsRenderer(renderer);
    return () => {
      renderer.setMap(null);
    };
  }, [map, commuteMode]);

  // Fetch route polylines from Google Directions Service in real-time
  useEffect(() => {
    if (!map || !directionsRenderer || !commuteAddress) return;

    const directionsService = new window.google.maps.DirectionsService();
    const origin = { lat: listingLat, lng: listingLng };

    const request: any = {
      origin,
      destination: commuteAddress,
      travelMode: commuteMode === "transit"
        ? window.google.maps.TravelMode.TRANSIT
        : window.google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: false
    };

    // normal driving avoiding highways and tolls strictly simulates two_wheeler/scooter routing in Taiwan!
    if (commuteMode === "scooter") {
      request.avoidHighways = true;
      request.avoidTolls = true;
    }

    directionsService.route(request, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK && result) {
        directionsRenderer.setDirections(result);
        
        // Fit bounds to center the route and make both listing and destination visible
        if (result.routes?.[0]?.bounds) {
          map.fitBounds(result.routes[0].bounds);
        }
      } else {
        console.error("Google Directions Service query failed:", status);
      }
    });
  }, [map, directionsRenderer, commuteAddress, commuteMode, listingLat, listingLng]);

  return null;
}

export default function ListingMap({
  apiKey,
  listingAddress,
  listingLat,
  listingLng,
  conveniences = [],
  threats = [],
  hotspots = [],
  mode = "amenities",
  commuteAddress
}: ListingMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [commuteMode, setCommuteMode] = useState<"transit" | "driving" | "scooter">("transit");
  const [selectedItem, setSelectedItem] = useState<{
    item: MapItem;
    isThreat: boolean;
    isHotspot?: boolean;
  } | null>(null);

  const center = { lat: listingLat, lng: listingLng };
  const [mapCenter, setMapCenter] = useState(center);

  // Update map center if listing coordinate props change
  useEffect(() => {
    setMapCenter({ lat: listingLat, lng: listingLng });
  }, [listingLat, listingLng]);

  // Filter items that have valid coordinates
  const validConveniences = conveniences.filter(c => c.lat && c.lng);
  const validThreats = threats.filter(t => t.lat && t.lng);
  const validHotspots = hotspots.filter(h => h.lat && h.lng);

  // Filter markers dynamically based on the selected category filter tab
  const filteredConveniences = validConveniences.filter(c => {
    if (mode === "safety") {
      if (activeFilter === "all") return c.type === "police";
      if (activeFilter === "police") return c.type === "police";
      return false;
    }
    if (activeFilter === "all") return true;
    return c.type === activeFilter;
  });

  const filteredThreats = validThreats.filter(t => {
    if (mode === "safety") return false;
    if (activeFilter === "all") return true;
    if (activeFilter === "threat") return true;
    return false; 
  });

  const filteredHotspots = validHotspots.filter(h => {
    if (mode !== "safety") return false;
    if (activeFilter === "all") return true;
    if (activeFilter === "hotspot") return true;
    return false;
  });

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Mapping of convenience types to custom pin colors
  const getMarkerColor = (type: string, isThreat: boolean) => {
    if (isThreat) return "#EF4444"; // Red for threats
    switch (type) {
      case "police": return "#1E3A8A"; // Deep Blue
      case "transit": return "#3B82F6"; // Blue
      case "shopping": return "#10B981"; // Green
      case "leisure": return "#059669"; // Dark Green
      case "food": return "#F59E0B"; // Yellow
      case "health": return "#EC4899"; // Pink
      default: return "#10B981";
    }
  };

  const mapStyle = isFullscreen 
    ? "fixed inset-0 z-[9999] bg-white flex flex-row" 
    : "h-[400px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm mt-4 relative";

  const amenitiesFilters = [
    { id: "all", label: "全部" },
    { id: "transit", label: "🚇 交通" },
    { id: "police", label: "👮 治安" },
    { id: "shopping", label: "🛒 購物" },
    { id: "leisure", label: "🏫 學校" },
    { id: "food", label: "🍔 餐飲" },
    { id: "threat", label: "⚠️ 地雷" }
  ];

  const safetyFilters = [
    { id: "all", label: "全部" },
    { id: "hotspot", label: "🚦 肇事熱點" },
    { id: "police", label: "👮 治安警局" }
  ];

  const filters = mode === "safety" ? safetyFilters : amenitiesFilters;

  return (
    <div className={mapStyle}>
      {/* Fullscreen Toggle Button */}
      <button 
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-20 bg-white/95 p-2.5 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all border border-gray-100 text-gray-600 cursor-pointer flex items-center justify-center"
        title={isFullscreen ? "縮小地圖" : "全畫面放大"}
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>

      {/* Left/Main Area: Google Map Container */}
      <div className="flex-1 h-full w-full min-h-0 relative z-10">
        {/* Commute Transport Mode Toggles Overlay (Only if commuteAddress is set) */}
        {commuteAddress && (
          <div className="absolute top-4 left-4 z-20 flex gap-1 bg-white/90 backdrop-blur-xl p-1 rounded-xl shadow-md border border-gray-100/50 select-none">
            <button
              onClick={() => setCommuteMode("transit")}
              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
                commuteMode === "transit" ? "bg-[#3B82F6] text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              🚇 捷運公車
            </button>
            <button
              onClick={() => setCommuteMode("driving")}
              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
                commuteMode === "driving" ? "bg-[#10B981] text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              🚗 汽車自駕
            </button>
            <button
              onClick={() => setCommuteMode("scooter")}
              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
                commuteMode === "scooter" ? "bg-[#F59E0B] text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              🛵 機車通勤
            </button>
          </div>
        )}

        {/* Category Filter Bar overlay on Map */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap gap-1 bg-white/90 backdrop-blur-xl p-1.5 rounded-2xl shadow-2xl border border-gray-100/50 max-w-[92%] justify-center">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => {
                setActiveFilter(f.id);
                setSelectedItem(null); // Close popup on filter switch to prevent position offsets
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider transition-all cursor-pointer border ${
                activeFilter === f.id 
                  ? "bg-[#D2691E] text-white border-[#D2691E] shadow-sm scale-105" 
                  : "bg-white/90 text-gray-500 hover:text-[#333333] hover:bg-white border-transparent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="w-full h-full relative z-10">
          <APIProvider apiKey={apiKey}>
            {/* Dynamic polyline directions renderer */}
            {commuteAddress && listingLat && listingLng && (
              <CommuteRouteDirections
                listingLat={listingLat}
                listingLng={listingLng}
                commuteAddress={commuteAddress}
                commuteMode={commuteMode}
              />
            )}

            <Map
              center={mapCenter}
              onCenterChanged={e => setMapCenter(e.detail.center as any)}
              defaultZoom={15}
              gestureHandling="cooperative"
              disableDefaultUI={false}
            >
              {/* Listing House Marker (Center point) */}
              <Marker
                position={center}
                title={listingAddress}
                onClick={() => setSelectedItem({
                  item: { name: "🏠 您的房源位置", type: "home", distance: "0m", vicinity: listingAddress, keyword: "房源" },
                  isThreat: false
                })}
                icon={{
                  path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                  fillColor: "#D2691E",
                  fillOpacity: 1.0,
                  strokeWeight: 2,
                  strokeColor: "#FFFFFF",
                  scale: 1.8,
                  anchor: { x: 12, y: 24 } as any
                }}
              />

              {/* Conveniences Markers */}
              {filteredConveniences.map((conv, idx) => {
                const pos = { lat: conv.lat!, lng: conv.lng! };
                return (
                  <Marker
                    key={`conv-${idx}`}
                    position={pos}
                    title={conv.name}
                    onClick={() => setSelectedItem({ item: conv, isThreat: false })}
                    icon={{
                      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                      fillColor: getMarkerColor(conv.type, false),
                      fillOpacity: 0.9,
                      strokeWeight: 1.5,
                      strokeColor: "#FFFFFF",
                      scale: 1.3,
                      anchor: { x: 12, y: 24 } as any
                    }}
                  />
                );
              })}

              {/* Threats Markers (Amenities mode only) */}
              {filteredThreats.map((threat, idx) => {
                const pos = { lat: threat.lat!, lng: threat.lng! };
                return (
                  <Marker
                    key={`threat-${idx}`}
                    position={pos}
                    title={threat.name}
                    onClick={() => setSelectedItem({ item: threat, isThreat: true })}
                    icon={{
                      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                      fillColor: getMarkerColor(threat.type, true),
                      fillOpacity: 0.9,
                      strokeWeight: 1.5,
                      strokeColor: "#FFFFFF",
                      scale: 1.3,
                      anchor: { x: 12, y: 24 } as any
                    }}
                  />
                );
              })}

              {/* Accident Hotspots Markers (Only in safety mode) */}
              {filteredHotspots.map((hotspot, idx) => {
                const pos = { lat: hotspot.lat, lng: hotspot.lng };
                const isFatal = hotspot.a1 > 0;
                return (
                  <Marker
                    key={`hotspot-${idx}`}
                    position={pos}
                    title={hotspot.streets.join(" / ")}
                    onClick={() => setSelectedItem({
                      item: {
                        name: `🚦 ${hotspot.streets[0] || '易肇事街區'}`,
                        type: "hotspot",
                        distance: "本街區",
                        vicinity: hotspot.streets.join("、"),
                        keyword: isFatal ? "死亡事故熱點" : "受傷事故熱點",
                        lat: hotspot.lat,
                        lng: hotspot.lng,
                        a1: hotspot.a1,
                        a2: hotspot.a2
                      } as any,
                      isThreat: true,
                      isHotspot: true
                    })}
                    icon={{
                      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                      fillColor: isFatal ? "#EF4444" : "#F59E0B", // Red for fatal, Orange/Amber for injury
                      fillOpacity: 0.95,
                      strokeWeight: 1.5,
                      strokeColor: "#FFFFFF",
                      scale: 1.4,
                      anchor: { x: 12, y: 24 } as any
                    }}
                  />
                );
              })}

              {/* Popup InfoWindow on Click */}
              {selectedItem && (
                <InfoWindow
                  position={
                    selectedItem.item.type === "home" 
                      ? center 
                      : { lat: selectedItem.item.lat!, lng: selectedItem.item.lng! }
                  }
                  onCloseClick={() => setSelectedItem(null)}
                >
                  {selectedItem.isHotspot ? (
                    <div className="p-2 text-xs font-sans max-w-[220px] text-[#333333]">
                      <h5 className="font-black text-sm text-red-600 mb-1 flex items-center gap-1">
                        <span>🚦 街區易肇事熱點</span>
                      </h5>
                      <div className="space-y-1 mt-1 text-[10px] text-gray-600 leading-snug">
                        <p className="font-black text-gray-700">路段：{selectedItem.item.vicinity}</p>
                        <div className="flex justify-between gap-4 font-bold mt-2 border-t border-gray-100 pt-1.5">
                          <span className="text-red-500">A1 死亡：{(selectedItem.item as any).a1 || 0} 件</span>
                          <span className="text-amber-600">A2 受傷：{(selectedItem.item as any).a2 || 0} 件</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 text-xs font-sans max-w-[220px] text-[#333333]">
                      <h5 className="font-black text-sm text-on-surface mb-1">{selectedItem.item.name}</h5>
                      <div className="flex justify-between gap-4 text-[10px] text-gray-500 mb-1">
                        <span>種類：{selectedItem.item.keyword}</span>
                        <span className="font-bold text-[#D2691E]">距離：{selectedItem.item.distance}</span>
                      </div>
                      {selectedItem.item.vicinity && (
                        <p className="text-[10px] text-gray-400 leading-snug mt-1 border-t border-gray-100 pt-1">{selectedItem.item.vicinity}</p>
                      )}
                    </div>
                  )}
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        </div>
        
        {/* Exit Instruction for Fullscreen Modal */}
        {isFullscreen && (
          <div className="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center shadow-md z-20 print:hidden">
            <div>
              <h4 className="font-black text-sm text-[#333333]">{listingAddress}</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {mode === "safety" 
                  ? "2025 年度街區交通治安安全防禦網 (點擊紅色/黃色標針查看肇事數量)" 
                  : "黃金 1.5KM 生活圈機能與安全地雷地圖 (點擊按鈕篩選分類)"}
              </p>
            </div>
            <button 
              onClick={toggleFullscreen}
              className="bg-[#D2691E] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
            >
              關閉全螢幕
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Right Sidebar (Legend & POI list) - only visible when expanded */}
      {isFullscreen && (
        <div className="w-[340px] border-l border-gray-150 bg-gray-50/50 flex flex-col h-full shrink-0 z-30 overflow-hidden print:hidden">
          {/* Section 1: Pin Colors Legend */}
          <div className="p-5 bg-white border-b border-gray-100 space-y-3.5 shrink-0">
            <div>
              <h4 className="text-xs font-black text-[#333333] uppercase tracking-wider">📍 地圖大頭針圖例</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">不同顏色標記代表的地圖物件分類</p>
            </div>
            
            {mode === "safety" ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] font-bold text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: "#D2691E" }}></span>
                  <span>🏠 您的房源</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: "#1E3A8A" }}></span>
                  <span>👮 治安警局</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: "#F59E0B" }}></span>
                  <span>🚦 A2 肇事路段</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: "#EF4444" }}></span>
                  <span>🚨 A1 死亡熱點</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] font-bold text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: "#D2691E" }}></span>
                  <span>🏠 您的房源</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: "#3B82F6" }}></span>
                  <span>🚇 大眾運輸</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: "#1E3A8A" }}></span>
                  <span>👮 治安防護</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: "#10B981" }}></span>
                  <span>🛒 生活購物</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: "#059669" }}></span>
                  <span>🏫 學校公園</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: "#F59E0B" }}></span>
                  <span>🍔 美食餐飲</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: "#EF4444" }}></span>
                  <span>⚠️ 感官地雷與嫌惡設施</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Categorized scrollable List of places */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
            <div>
              <h4 className="text-xs font-black text-[#333333] uppercase tracking-wider">
                {mode === "safety" ? "🚨 交通治安警戒清單" : "🔍 周邊機能點位清單"}
              </h4>
              <p className="text-[10px] text-gray-400 mt-0.5">點選清單項目，地圖會自動對焦並彈出氣泡詳情</p>
            </div>

            <div className="space-y-2">
              {(() => {
                if (mode === "safety") {
                  const safetyList = [
                    ...filteredHotspots.map(h => ({
                      name: `🚦 ${h.streets[0] || '易肇事路口'}`,
                      type: "hotspot",
                      distance: h.a1 > 0 ? "🚨 死亡車禍" : "⚠️ 受傷事故",
                      vicinity: h.streets.join("、"),
                      keyword: h.a1 > 0 ? "死亡事故熱點" : "受傷事故熱點",
                      lat: h.lat,
                      lng: h.lng,
                      a1: h.a1,
                      a2: h.a2,
                      isThreat: true,
                      isHotspot: true
                    })),
                    ...filteredConveniences.map(c => ({ ...c, isThreat: false, isHotspot: false }))
                  ];

                  if (safetyList.length === 0) {
                    return (
                      <div className="text-xs text-gray-400 italic py-8 text-center bg-white rounded-2xl border border-gray-100">
                        此區域暫無重大行車安全事件
                      </div>
                    );
                  }

                  return safetyList.map((item, idx) => {
                    const isSelected = selectedItem?.item.name === item.name;
                    const markerColor = item.isHotspot 
                      ? (item.a1 > 0 ? "#EF4444" : "#F59E0B")
                      : "#1E3A8A";
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedItem({ item: item as any, isThreat: item.isThreat, isHotspot: item.isHotspot });
                          setMapCenter({ lat: item.lat!, lng: item.lng! });
                        }}
                        className={`p-3 bg-white border rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-all text-xs space-y-1.5 flex flex-col ${
                          isSelected ? "border-red-500 bg-red-50/5 scale-[1.01]" : "border-gray-100"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3 font-black text-[#333333]">
                          <span className="line-clamp-1 text-left">{item.name}</span>
                          <span className={`font-mono text-[8px] px-2 py-0.5 rounded-lg ${
                            item.isHotspot 
                              ? ((item as any).a1 > 0 ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50")
                              : "text-indigo-600 bg-indigo-50"
                          }`}>{item.distance}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-gray-400 font-bold">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-white" style={{ backgroundColor: markerColor }}></span>
                          <span>{item.keyword}</span>
                          {item.vicinity && <span className="truncate flex-1 text-left">| {item.vicinity}</span>}
                        </div>
                      </div>
                    );
                  });
                }

                const currentList = [
                  ...filteredConveniences.map(c => ({ ...c, isThreat: false })),
                  ...filteredThreats.map(t => ({ ...t, isThreat: true }))
                ].sort((a, b) => {
                  const distA = a.distance.includes("km") ? parseFloat(a.distance) * 1000 : parseFloat(a.distance);
                  const distB = b.distance.includes("km") ? parseFloat(b.distance) * 1000 : parseFloat(b.distance);
                  return distA - distB;
                });

                if (currentList.length === 0) {
                  return (
                    <div className="text-xs text-gray-400 italic py-8 text-center bg-white rounded-2xl border border-gray-100">
                      此分類下暫無周邊機能點位
                    </div>
                  );
                }

                return currentList.map((item, idx) => {
                  const isSelected = selectedItem?.item.name === item.name;
                  const markerColor = getMarkerColor(item.type, item.isThreat);
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedItem({ item, isThreat: item.isThreat });
                        setMapCenter({ lat: item.lat!, lng: item.lng! });
                      }}
                      className={`p-3 bg-white border rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-all text-xs space-y-1.5 flex flex-col ${
                        isSelected ? "border-[#D2691E] bg-orange-50/5 scale-[1.01]" : "border-gray-100"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3 font-black text-[#333333]">
                        <span className="line-clamp-1 text-left">{item.name}</span>
                        <span className="text-[#D2691E] font-mono text-[9px] shrink-0 bg-orange-50 px-2 py-0.5 rounded-lg">{item.distance}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-gray-400 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-white" style={{ backgroundColor: markerColor }}></span>
                        <span>{item.keyword}</span>
                        {item.vicinity && <span className="truncate flex-1 text-left">| {item.vicinity}</span>}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
