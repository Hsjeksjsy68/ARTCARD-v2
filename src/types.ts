export type Rarity = 'Base' | 'Silver Refractor' | 'Gold Autograph' | '1-of-1 Shield';

export interface PricePoint {
  date: string;
  price: number;
}

export interface Pack {
  id: string;
  name: string;
  size: number;
  price: number;
  color: string;
  coverPhotoUrl?: string;
  description?: string;
  editions?: string[];
  badgeText?: string;
  rarityOdds?: {
    base: number;
    silver: number;
    gold: number;
    shield: number;
  };
}

export interface CardTheme {
  id: string;
  name: string;
  overlayImageUrl: string;
  clubLogoUrl?: string;
  clubLogoSize?: number;
  clubLogoTop?: number;
  clubLogoLeft?: number;
  editionLogoUrl?: string;
  editionLogoSize?: number;
  editionLogoTop?: number;
  editionLogoLeft?: number;
  fontBase64?: string;
  fontName?: string;
  fontColor?: string;
  fontSize?: number;
  fontPositionBottom?: number;
  fontScaleX?: number;
  fontScaleY?: number;
}

export interface FootballCard {
  id: string;
  player: string;
  team: string;
  position: string;
  year: number;
  set: string;
  edition: string;
  rarity: Rarity;
  cardNumber: string;
  imageUrl?: string;
  imageGradient: string;
  priceHistory: PricePoint[];
  currentPrice: number;
  searchCount?: number;
  stock?: number;
  maxSupply?: number;
}

export interface UserProfileData {
  uid: string;
  email: string | null;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  favoriteTeam?: string;
  featuredCardId?: string;
  customAvatar?: string;
  joinedAt?: number;
  collectionIds?: string[];
  vaultIds?: string[];
  favoriteIds?: string[];
  walletBalance?: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  userEmail?: string;
  type: 'top_up' | 'buy_card' | 'buy_pack';
  amount: number;
  description: string;
  cardId?: string;
  cardName?: string;
  packId?: string;
  packName?: string;
  timestamp: number;
}
