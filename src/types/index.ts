export type UserRole = "TENANT" | "LANDLORD";

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  aiTags: any | null;
  trustSummary: string | null;
}

export interface ListingFeatures {
  floor?: string;
  size?: string;
  type?: string;
  facilities?: string[];
  deposit?: string;
  utilities?: string;
  soundproofing?: string;
  appliances?: string;
  pets?: string;
  tax?: string;
  verifiedFacts?: Record<string, boolean>;
}

export interface ButlerInsight {
  highlights: string[];
  risks: string[];
  summary: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string | null;
  address: string;
  price: number;
  images: string[];
  marketTags: any | null;
  features: ListingFeatures | null;
  rawScrapedData: any | null;
  butlerInsight: ButlerInsight | null;
  landlordId: string;
  matchScore?: number;
}

export interface InspectionReport {
  id: string;
  listingId: string;
  tenantId: string;
  checklistData: Record<string, boolean> | null;
  photos: string[];
  aiSummary: string | null;
  status: "IN_PROGRESS" | "COMPLETED";
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  userId: string;
  createdAt: Date;
}
