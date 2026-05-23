// --- High-Extensibility Prompt Rules Configuration (雙北在地化防坑規則) ---
export interface PromptRule {
  id: string;
  category: "FINANCIAL" | "PHYSICAL" | "LEGAL" | "SOCIAL";
  title: string;
  rules: string[];
}

export const DOUBLE_TAIPEI_RULES: PromptRule[] = [
  {
    id: "financial_compliance",
    category: "FINANCIAL",
    title: "雙北財務與費用合規地雷",
    rules: [
      "電費溢價防範：台灣台電正常住宅用電均價約每度 2-3 元。如果文案提及『電費一度 5 元、6 元、7 元』或高於 5 元，必須將其判定為財務地雷，並指出該溢價行為對房客的額外負擔。",
      "租屋補助與報稅拒絕：房客依法享有租金抵稅與申請租屋補助權利。若房東文案暗示『不可申報租屋補助、不可報稅、不可設籍』或載明『申請補助需加收租金 10%-15%』，一律判定為 HIGH 級別法律違規風險。",
      "匯款定金詐騙：掃描任何『看房前需先匯款付定金 / 訂金以保留順位』等詐騙話術，這在雙北是極高頻發的租屋詐騙，一律判定為 HIGH 級別詐騙風險，給予最高級別的勸退警告。"
    ]
  },
  {
    id: "physical_hazards",
    category: "PHYSICAL",
    title: "居住空間與雙北物理安全地雷",
    rules: [
      "頂加與違建風險：雙北老舊公寓多頂樓加蓋（頂加）。頂樓加蓋夏天高溫暴曬（AC 電費驚人）、且多為鐵皮材質防護差，更存在嚴重的消防火災逃生避難死角。文案若暗示『頂加、頂樓、露台實用、健身爬樓梯』，必須直接識別並判定為 HIGH 級別物理風險。",
      "隔音與隔間材質：台灣房東常將公寓分割為多個分租套房。若文案暗示隔音問題或隔間材質（如木板輕隔間、隔音差、限制音量），需判定為 MEDIUM/HIGH 級別的噪音與隱私地雷。",
      "地下室與完全無窗暗房：雙北精華區常見防空洞地下室或無對外窗暗房。長期居住無陽光、不通風、霉味潮濕嚴重、二氧化碳過高損害健康。文案提及『地下室、獨立安靜暗房、無對外窗』，一律判定為 HIGH 級別居住空間地雷。",
      "結構潮濕與滲漏水病變：台灣北台灣（尤其是林口、淡水、雙北山區）氣候極度潮濕。必須敏銳掃描文案是否提及『附設大容量除濕機、通風除濕、壁癌、漏水、剛粉刷剛完工』等可能遮掩壁癌與滲漏水病變的蛛絲馬跡，判定為 HIGH 級別結構風險。"
    ]
  },
  {
    id: "legal_regulatory",
    category: "LEGAL",
    title: "法律與產權安全地雷",
    rules: [
      "工業住宅與改裝辦公室：雙北工業區（如中和、汐止、內湖）有大量工業區改裝住宅。房東違法改裝為住宅，房客面臨拆除、消防不合格、無法設籍與租金補貼、水電費率高。文案若出現『工業區、乙工、一般事務所、辦公室改裝』，一律判定為 HIGH 級別法律合規地雷。",
      "代理人與二房東產權不明：識別任何『非房東本人、代理人、二房東轉租、不可看產權證明』等產權模糊暗示，判定為 MEDIUM 級別產權不明風險。"
    ]
  },
  {
    id: "social_friction",
    category: "SOCIAL",
    title: "社交自由與社交摩擦地雷",
    rules: [
      "人身自由限制與高度控制：識別文案中『房東同住、限女性、限男性、限單身、嚴格作息限制、嚴格禁訪客過夜、監視器嚴密控管公區』等涉嫌人身限制與高社交摩擦的條款，判定為 MEDIUM 級別社交風險。"
    ]
  }
];

// Future placeholder for Taichung
export const TAICHUNG_RULES: PromptRule[] = [];

// Future placeholder for Kaohsiung
export const KAOHSIUNG_RULES: PromptRule[] = [];

export function compileRulesToPrompt(address: string): string {
  let activeRules = [...DOUBLE_TAIPEI_RULES];
  
  if (address.includes("台中")) {
    activeRules = [...TAICHUNG_RULES];
  } else if (address.includes("高雄")) {
    activeRules = [...KAOHSIUNG_RULES];
  }
  
  if (activeRules.length === 0) {
    activeRules = [...DOUBLE_TAIPEI_RULES]; // Fallback
  }

  return activeRules.map(group => {
    return `【${group.title}】:\n` + group.rules.map((r, idx) => `${idx + 1}. ${r}`).join("\n");
  }).join("\n\n");
}

export function getFlatUserTags(aiTags: any): string[] {
  const rawPrefs = aiTags || {};
  const userTags: string[] = [];
  
  if (rawPrefs.maxBudget) {
    userTags.push(`預算 NT$ ${rawPrefs.maxBudget} 元以下`);
  } else if (rawPrefs.budgetMax) {
    userTags.push(`預算 NT$ ${rawPrefs.budgetMax} 元以下`);
  }

  if (rawPrefs.elevator === true) userTags.push("電梯");
  if (rawPrefs.pets === true) userTags.push("可養寵物");

  // Map tags with weights (1: Normal, 2: Important, 3: Crucial)
  if (rawPrefs.tagsWithWeight && typeof rawPrefs.tagsWithWeight === "object") {
    Object.keys(rawPrefs.tagsWithWeight).forEach((tag: string) => {
      userTags.push(tag);
    });
  } else if (rawPrefs.tags && Array.isArray(rawPrefs.tags)) {
    rawPrefs.tags.forEach((t: string) => userTags.push(t));
  }

  return userTags;
}
