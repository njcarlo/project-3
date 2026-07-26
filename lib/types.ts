export type CatalogItemStatus = "pending" | "approved" | "rejected";

export type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "super_rare"
  | "secret_rare";

export interface CatalogSeries {
  id: string;
  name: string;
  releaseDate: string;
  description: string;
  coverImageUrl: string;
  itemCount: number;
  status: "seed" | "community" | "verified";
}

export interface PriceAggregateSnapshot {
  avg: number;
  median: number;
  sampleCount: number;
  lastUpdated: number;
}

export interface CatalogItem {
  id: string;
  seriesId: string;
  seriesName: string;
  number: string;
  name: string;
  rarity: Rarity;
  imageUrl: string;
  notes: string;
  createdBy: string;
  status: CatalogItemStatus;
  lastPriceAggregate: PriceAggregateSnapshot | null;
  createdAt: number;
  updatedAt: number;
}

export type ItemCondition = "mint" | "good" | "played" | "damaged";

// A "session" is one arcade visit/play session where a user spent money and
// pulled a batch of tags — Mezastar is pay-per-play with random pulls, so
// cost is naturally tracked per session rather than per tag.
export interface CollectionSession {
  id: string;
  label: string;
  date: string | null;
  cost: number | null;
  currency: "JPY" | "USD";
  notes: string;
  createdAt: number;
}

export interface UserCollectionItem {
  id: string;
  catalogItemId: string;
  quantity: number;
  condition: ItemCondition;
  acquiredDate: string | null;
  acquiredPriceUser: number | null;
  sessionId: string | null;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export type PriceSubmissionType = "paid" | "estimated_value";
export type PriceSubmissionStatus = "active" | "excluded";

export interface PriceSubmission {
  id: string;
  catalogItemId: string;
  submittedBy: string;
  price: number;
  currency: "JPY" | "USD";
  type: PriceSubmissionType;
  sourceNote: string;
  submittedAt: number;
  flagged: boolean;
  status: PriceSubmissionStatus;
}

export interface PriceAggregate {
  catalogItemId: string;
  avg: number;
  median: number;
  min: number;
  max: number;
  sampleCount: number;
  last90dSampleCount: number;
  lastUpdated: number;
  history: { date: string; avg: number; median: number }[];
}

export type UserRole = "user" | "admin";

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  bio: string;
  role: UserRole;
  showcaseItemIds: string[];
  stats: { totalItems: number; totalValue: number };
  createdAt: number;
}

export interface TradeSideItem {
  catalogItemId: string;
  quantity: number;
  valueAtProposal: number;
}

export type TradeStatus = "proposed" | "accepted" | "declined" | "countered";

export interface Trade {
  id: string;
  initiatorUid: string;
  counterpartyUid: string;
  initiatorItems: TradeSideItem[];
  counterpartyItems: TradeSideItem[];
  fairnessScore: number;
  status: TradeStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Post {
  id: string;
  authorUid: string;
  title: string;
  body: string;
  relatedCatalogItemIds: string[];
  imageUrls: string[];
  createdAt: number;
  commentCount: number;
}

export interface Comment {
  id: string;
  authorUid: string;
  body: string;
  createdAt: number;
}
