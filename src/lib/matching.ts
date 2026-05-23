export interface MatchResult {
  score: number;
  pros: string[];
  cons: string[];
  mapping: Array<{ req: string; fact: string; status: "MATCH" | "MISMATCH" | "UNKNOWN" }>;
}

/**
 * 100% Local, High-Performance personalized match scoring algorithm.
 * Runs in < 0.05ms with ZERO Gemini API calls and $0 TWD cost.
 * Integrates pre-evaluated objective tag evaluations from standard scraping.
 */
export function calculateMatchScore(userProfile: any, listing: any): MatchResult {
  const rawPrefs = userProfile || {};
  
  // Load the cached 37-tag evaluations generated once during scraping
  const evaluation = listing.butlerInsight?.tagEvaluation || {};
  
  let totalWeight = 0;
  let matchedWeight = 0;
  
  const pros: string[] = [];
  const cons: string[] = [];
  const mapping: MatchResult["mapping"] = [];
  
  // 1. Hard Constraints (預算, 電梯, 可寵)
  
  // A. Budget Check
  // A. Budget Range Check
  const minBudget = rawPrefs.minBudget || 0;
  const maxBudget = rawPrefs.maxBudget || rawPrefs.budgetMax || rawPrefs.budget;
  
  if (maxBudget && listing.price) {
    totalWeight += 3;
    const isWithinBudget = listing.price >= minBudget && listing.price <= maxBudget;
    mapping.push({
      req: `租金範圍 NT$ ${minBudget.toLocaleString()} ~ ${maxBudget.toLocaleString()} 元`,
      fact: `實際租金 NT$ ${listing.price.toLocaleString()} 元`,
      status: isWithinBudget ? "MATCH" : "MISMATCH"
    });
    
    if (isWithinBudget) {
      matchedWeight += 3;
      pros.push("月租金符合您的理想預算區間。");
    } else {
      if (listing.price < minBudget) {
        const isTrueCheap = listing.price < 15000; // Threshold for shared room warnings in Double Taipei area
        cons.push(isTrueCheap
          ? `月租金低於您的預算下限 NT$ ${minBudget.toLocaleString()} 元（實際租金偏低，可能為分租套房或雅房，請注意住戶安全品質）。`
          : `月租金低於您的預算下限 NT$ ${minBudget.toLocaleString()} 元（房源規格或坪數可能低於您的奢華期待）。`
        );
      } else {
        cons.push(`月租金超出您的期望預算上限 NT$ ${maxBudget.toLocaleString()} 元。`);
      }
    }
  }
  
  // B. Elevator Check
  if (rawPrefs.elevator !== null && rawPrefs.elevator !== undefined) {
    const elevatorNeeded = rawPrefs.elevator === true;
    if (elevatorNeeded) {
      totalWeight += 3;
      const hasElevator = evaluation["電梯"] === "MATCH" || listing.features?.elevator === true;
      mapping.push({
        req: "必須有電梯",
        fact: hasElevator ? "大樓附設電梯" : "無電梯，需爬樓梯",
        status: hasElevator ? "MATCH" : "MISMATCH"
      });
      
      if (hasElevator) {
        matchedWeight += 3;
        pros.push("符合「需要電梯」的剛性要求。");
      } else {
        cons.push("本房源無電梯，不符剛性要求。");
      }
    }
  }
  
  // C. Pets Check
  if (rawPrefs.pets !== null && rawPrefs.pets !== undefined) {
    const petsNeeded = rawPrefs.pets === true;
    if (petsNeeded) {
      totalWeight += 3;
      const allowPets = evaluation["可養寵物"] === "MATCH" || listing.features?.pets === "allow";
      mapping.push({
        req: "必須可養寵物",
        fact: allowPets ? "房東聲明可養寵物" : "房源明確禁止養寵物",
        status: allowPets ? "MATCH" : "MISMATCH"
      });
      
      if (allowPets) {
        matchedWeight += 3;
        pros.push("符合「可養寵物」的剛性要求。");
      } else {
        cons.push("房源禁止寵物，與剛性要求衝突。");
      }
    }
  }

  // 2. Soft Preferences (34 other tags with weights: 1, 2, 3)
  if (rawPrefs.tagsWithWeight && typeof rawPrefs.tagsWithWeight === "object") {
    Object.keys(rawPrefs.tagsWithWeight).forEach((tag: string) => {
      // Skip handled hard constraints
      if (tag === "電梯" || tag === "可養寵物") return;
      
      const weight = rawPrefs.tagsWithWeight[tag] || 1;
      totalWeight += weight;
      
      const status = evaluation[tag] || "UNKNOWN";
      const factDesc = status === "MATCH" ? `文案支持「${tag}」特徵` : 
                       status === "MISMATCH" ? `文案排斥「${tag}」特徵` : 
                       "房源描述中未特別提及";
                       
      mapping.push({
        req: tag,
        fact: factDesc,
        status: status as any
      });
      
      if (status === "MATCH") {
        matchedWeight += weight;
        pros.push(`滿足偏好：${tag}`);
      } else if (status === "MISMATCH") {
        cons.push(`不符偏好：${tag}`);
      }
    });
  } else if (rawPrefs.tags && Array.isArray(rawPrefs.tags)) {
    // Backwards compatibility fallback
    rawPrefs.tags.forEach((tag: string) => {
      if (tag === "電梯" || tag === "可養寵物") return;
      totalWeight += 2;
      
      const status = evaluation[tag] || "UNKNOWN";
      const factDesc = status === "MATCH" ? `文案支持「${tag}」` : "未提及";
      
      mapping.push({
        req: tag,
        fact: factDesc,
        status: status as any
      });
      
      if (status === "MATCH") {
        matchedWeight += 2;
        pros.push(`符合偏好：${tag}`);
      }
    });
  }
  
  // Default score is 75 if no preference is defined
  const score = totalWeight > 0 
    ? Math.round((matchedWeight / totalWeight) * 100) 
    : 75;
    
  return {
    score: Math.min(100, Math.max(0, score)),
    pros,
    cons,
    mapping
  };
}
