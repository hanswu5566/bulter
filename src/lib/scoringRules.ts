export interface TenantPreferences {
  budgetMax?: number;
  budgetMin?: number;
  regions?: string[];
  lifestyleTags?: string[]; // ["有養寵物", "需要開伙", "極度安靜", "採光要好"]
  requiredAppliances?: string[];
  preferElevator?: boolean;
}

export interface BasicUserPreferences {
  budgetMin?: number;
  budgetMax?: number;
  requiredAppliances?: string[];
  preferElevator?: boolean;
  allowPets?: boolean;
  requireBalcony?: boolean;
  tags?: string[];
}

export interface RuleScoreResult {
  score: number;
  breakdown: {
    budget: number;
    amenities: number;
    lifestyle: number;
  };
  pros: string[];
  cons: string[];
}

export const VALID_APPLIANCES = ["冷氣", "冰箱", "洗衣機", "電視", "熱水器", "天然瓦斯", "床組", "衣櫃", "沙發", "書桌"];

export function calculateRuleScore(userPrefs: BasicUserPreferences, listing: any): RuleScoreResult {
  let budgetScore = 100;
  let amenitiesScore = 100;
  let lifestyleScore = 100;
  
  const pros: string[] = [];
  const cons: string[] = [];

  // 1. 預算評分 (Budget)
  if (userPrefs.budgetMax !== undefined) {
    if (listing.price <= userPrefs.budgetMax) {
      budgetScore = 100;
      pros.push("租金符合預算");
    } else {
      // 超出預算，按比例扣分
      const excessRatio = (listing.price - userPrefs.budgetMax) / userPrefs.budgetMax;
      budgetScore = Math.max(0, 100 - Math.round(excessRatio * 100));
      cons.push("超出預算上限");
    }
  }

  // 2. 設備評分 (Amenities)
  const listingFeatures = listing.features || {};
  const listingAppliances = listingFeatures.appliances || [];
  
  if (userPrefs.requiredAppliances && userPrefs.requiredAppliances.length > 0) {
    const matched = userPrefs.requiredAppliances.filter(app => 
      listingAppliances.includes(app)
    );
    amenitiesScore = Math.round((matched.length / userPrefs.requiredAppliances.length) * 100);
    
    if (matched.length === userPrefs.requiredAppliances.length) {
      pros.push("必備設備齊全");
    } else {
      const missing = userPrefs.requiredAppliances.filter(app => !listingAppliances.includes(app));
      cons.push(`缺少設備: ${missing.join(", ")}`);
    }
  }

  // 3. 生活習慣評分 (Lifestyle)
  let lifestyleMatches = 0;
  let lifestyleTotal = 0;

  // 電梯
  if (userPrefs.preferElevator !== undefined) {
    lifestyleTotal++;
    const hasElevator = listingFeatures.elevator === true;
    if (userPrefs.preferElevator === hasElevator) {
      lifestyleMatches++;
      if (hasElevator) pros.push("有電梯，符合需求");
    } else {
      if (userPrefs.preferElevator && !hasElevator) cons.push("無電梯（偏好有電梯）");
    }
  }

  // 陽台
  if (userPrefs.requireBalcony !== undefined) {
    lifestyleTotal++;
    const hasBalcony = listingFeatures.balcony === "private" || listingFeatures.balcony === true;
    if (userPrefs.requireBalcony === hasBalcony) {
      lifestyleMatches++;
      if (hasBalcony) pros.push("有獨立陽台");
    } else {
      if (userPrefs.requireBalcony && !hasBalcony) cons.push("無獨立陽台");
    }
  }

  // 氛圍標籤匹配
  const listingAtmosphere = listingFeatures.atmosphereTags || [];
  if (userPrefs.tags && userPrefs.tags.length > 0) {
    const matchedTags = userPrefs.tags.filter(tag => 
      listingAtmosphere.includes(tag)
    );
    lifestyleTotal += userPrefs.tags.length;
    lifestyleMatches += matchedTags.length;
    
    if (matchedTags.length > 0) {
      pros.push(`符合氛圍: ${matchedTags.join(", ")}`);
    }
    const missingTags = userPrefs.tags.filter(tag => !listingAtmosphere.includes(tag));
    if (missingTags.length > 0) {
      cons.push(`缺少氛圍: ${missingTags.join(", ")}`);
    }
  }

  if (lifestyleTotal > 0) {
    lifestyleScore = Math.round((lifestyleMatches / lifestyleTotal) * 100);
  }

  // 計算加權總分 (預算 40%, 設備 30%, 生活 30%)
  const finalScore = Math.round(
    budgetScore * 0.4 + 
    amenitiesScore * 0.3 + 
    lifestyleScore * 0.3
  );

  return {
    score: finalScore,
    breakdown: {
      budget: budgetScore,
      amenities: amenitiesScore,
      lifestyle: lifestyleScore
    },
    pros,
    cons
  };
}
