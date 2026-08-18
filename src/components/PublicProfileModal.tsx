import React, { useState, useEffect } from 'react';
import { db, doc, getDoc, onSnapshot, collection, query, where } from '../lib/firebase';
import { FootballCard, UserProfileData, MarketListing } from '../types';
import { CardItem } from './CardItem';
import { formatCurrency, cn } from '../lib/utils';
import { 
  X, 
  User as UserIcon, 
  Trophy, 
  Crown, 
  Star, 
  Award, 
  Sparkles, 
  Shield, 
  TrendingUp, 
  Layers, 
  Store, 
  ExternalLink,
  CheckCircle2,
  Calendar,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PublicProfileModalProps {
  userId: string | null;
  onClose: () => void;
  allCards: FootballCard[];
  onSelectCard: (card: FootballCard) => void;
  onBuyListing?: (listing: MarketListing) => void;
  currentUserId?: string | null;
}

export function PublicProfileModal({
  userId,
  onClose,
  allCards,
  onSelectCard,
  onBuyListing,
  currentUserId
}: PublicProfileModalProps) {
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [userListings, setUserListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vault' | 'market'>('vault');

  useEffect(() => {
    if (!userId) {
      setProfileData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userRef = doc(db, 'users', userId);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfileData({ uid: docSnap.id, ...docSnap.data() } as UserProfileData);
      } else {
        setProfileData({
          uid: userId,
          email: null,
          displayName: 'ArtCard Collector',
          bio: 'Active football card collector on ArtCard.',
          joinedAt: Date.now()
        });
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching user profile:", err);
      setLoading(false);
    });

    // Fetch this user's active market listings
    const listingsRef = collection(db, 'market_listings');
    const q = query(listingsRef, where('sellerId', '==', userId), where('status', '==', 'active'));
    const unsubscribeListings = onSnapshot(q, (snapshot) => {
      const items: MarketListing[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as MarketListing);
      });
      setUserListings(items);
    }, (err) => {
      console.error("Error fetching user listings:", err);
    });

    return () => {
      unsubscribeUser();
      unsubscribeListings();
    };
  }, [userId]);

  if (!userId) return null;

  const vaultIds = new Set<string>(profileData?.vaultIds || profileData?.collectionIds || []);
  const vaultCards = allCards.filter(c => vaultIds.has(c.id));
  const totalVaultValue = vaultCards.reduce((sum, c) => sum + (c.currentPrice || 0), 0);

  // Rarity counts
  const shieldCount = vaultCards.filter(c => c.rarity === '1-of-1 Shield').length;
  const goldCount = vaultCards.filter(c => c.rarity === 'Gold Autograph').length;
  const silverCount = vaultCards.filter(c => c.rarity === 'Silver Refractor').length;

  // Determine Collector Tier
  let collectorTier = 'Rookie Collector';
  let tierColor = 'bg-neutral-200 text-black';
  let tierIcon = Trophy;

  if (totalVaultValue >= 2000 || shieldCount > 0) {
    collectorTier = 'Hall of Fame Collector';
    tierColor = 'bg-black text-[#D4FF00] border-black';
    tierIcon = Crown;
  } else if (totalVaultValue >= 500 || vaultCards.length >= 10) {
    collectorTier = 'Elite Collector';
    tierColor = 'bg-[#D4FF00] text-black border-black';
    tierIcon = Award;
  } else if (totalVaultValue >= 100 || vaultCards.length >= 3) {
    collectorTier = 'Pro Collector';
    tierColor = 'bg-white text-black border-black';
    tierIcon = Star;
  }

  const featuredCard = profileData?.featuredCardId 
    ? allCards.find(c => c.id === profileData.featuredCardId)
    : (vaultCards.length > 0 ? [...vaultCards].sort((a, b) => b.currentPrice - a.currentPrice)[0] : null);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white w-full max-w-4xl border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] my-6 max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-black text-white p-5 flex items-center justify-between border-b-4 border-black shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-[#D4FF00] text-black p-2 border-2 border-black">
                <UserIcon size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase text-[#D4FF00] tracking-tight flex items-center gap-2">
                  COLLECTOR PUBLIC PROFILE
                </h2>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  COMMUNITY VAULT SHOWCASE & MARKET ACTIVITY
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="bg-white text-black hover:bg-[#D4FF00] p-1.5 border-2 border-black font-black transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-8 space-y-6 overflow-y-auto flex-1 bg-neutral-50">
            {loading ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-black uppercase tracking-widest text-neutral-500">LOADING PROFILE DATA...</p>
              </div>
            ) : (
              <>
                {/* Hero Card */}
                <div className="bg-white border-3 border-black p-5 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                      {profileData?.customAvatar || profileData?.photoURL ? (
                        <img
                          src={profileData?.customAvatar || profileData?.photoURL || ''}
                          alt="Avatar"
                          className="w-20 h-20 sm:w-24 sm:h-24 object-cover border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#D4FF00] border-3 border-black flex items-center justify-center font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0">
                          <UserIcon size={40} />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black">
                            {profileData?.displayName || profileData?.email?.split('@')[0] || 'ArtCard Collector'}
                          </h3>
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border-2 ${tierColor}`}>
                            {collectorTier}
                          </span>
                        </div>

                        {profileData?.email && (
                          <p className="text-[11px] font-mono font-bold text-neutral-500">
                            {profileData.email}
                          </p>
                        )}

                        {profileData?.bio && (
                          <p className="text-xs font-bold text-neutral-700 uppercase tracking-wide pt-1">
                            "{profileData.bio}"
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-2 text-[9px] font-black uppercase tracking-wider text-neutral-600">
                          {profileData?.favoriteTeam && (
                            <span className="bg-neutral-100 border border-black px-2 py-0.5">
                              ⚽ CLUB: {profileData.favoriteTeam}
                            </span>
                          )}
                          <span className="bg-neutral-100 border border-black px-2 py-0.5">
                            📅 MEMBER SINCE {new Date(profileData?.joinedAt || Date.now()).getFullYear()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats Pill */}
                    <div className="w-full sm:w-auto bg-black text-white p-4 border-2 border-black text-right shrink-0">
                      <div className="text-[9px] font-black uppercase tracking-widest text-[#D4FF00]">
                        PORTFOLIO VAULT VALUE
                      </div>
                      <div className="text-2xl font-black text-white tracking-tight">
                        {formatCurrency(totalVaultValue)}
                      </div>
                      <div className="text-[9px] font-bold text-neutral-400 uppercase mt-1">
                        {vaultCards.length} CARDS OWNED
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badges & Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-[9px] font-black uppercase text-neutral-500 block">TOTAL VAULT CARDS</span>
                    <span className="text-xl font-black text-black font-mono">{vaultCards.length}</span>
                  </div>

                  <div className="bg-white border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-[9px] font-black uppercase text-amber-600 block">1-OF-1 SHIELDS</span>
                    <span className="text-xl font-black text-black font-mono flex items-center gap-1">
                      <Shield size={16} className="text-[#D4FF00] fill-black" /> {shieldCount}
                    </span>
                  </div>

                  <div className="bg-white border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-[9px] font-black uppercase text-yellow-600 block">GOLD AUTOGRAPHS</span>
                    <span className="text-xl font-black text-black font-mono flex items-center gap-1">
                      <Star size={16} className="text-amber-500 fill-amber-500" /> {goldCount}
                    </span>
                  </div>

                  <div className="bg-white border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-[9px] font-black uppercase text-blue-600 block">MARKET LISTINGS</span>
                    <span className="text-xl font-black text-black font-mono flex items-center gap-1">
                      <Store size={16} className="text-blue-600" /> {userListings.length} ACTIVE
                    </span>
                  </div>
                </div>

                {/* Showcase Holy Grail Card (if any) */}
                {featuredCard && (
                  <div className="bg-black text-white border-3 border-black p-4 sm:p-5 shadow-[6px_6px_0px_0px_#D4FF00] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-2 text-center sm:text-left">
                      <span className="inline-block bg-[#D4FF00] text-black text-[9px] font-black px-2 py-0.5 border border-black uppercase">
                        👑 FEATURED SHOWCASE CARD
                      </span>
                      <h4 className="text-2xl font-black uppercase tracking-tight text-white">
                        {featuredCard.player}
                      </h4>
                      <p className="text-xs text-neutral-400 font-bold uppercase">
                        {featuredCard.team} • {featuredCard.rarity} • {formatCurrency(featuredCard.currentPrice)}
                      </p>
                    </div>

                    <div className="w-24 aspect-[750/1050] bg-white border-2 border-[#D4FF00] overflow-hidden shrink-0 cursor-pointer shadow-[3px_3px_0px_0px_rgba(212,255,0,0.5)]" onClick={() => { onSelectCard(featuredCard); onClose(); }}>
                      <img src={featuredCard.imageUrl} alt={featuredCard.player} className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                {/* Sub-tabs: Public Vault vs Active Market Listings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-black pb-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveTab('vault')}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-black transition-colors ${
                          activeTab === 'vault'
                            ? 'bg-black text-[#D4FF00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-white text-black hover:bg-neutral-100'
                        }`}
                      >
                        COLLECTOR VAULT ({vaultCards.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('market')}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-black transition-colors flex items-center gap-1.5 ${
                          activeTab === 'market'
                            ? 'bg-[#D4FF00] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-white text-black hover:bg-neutral-100'
                        }`}
                      >
                        <Store size={14} /> FOR SALE ON MARKET ({userListings.length})
                      </button>
                    </div>
                  </div>

                  {activeTab === 'vault' ? (
                    vaultCards.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {vaultCards.map(c => (
                          <div key={c.id} onClick={() => { onSelectCard(c); onClose(); }}>
                            <CardItem card={c} inVault={true} onClick={(card) => { onSelectCard(card); onClose(); }} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-white border-2 border-black text-xs font-black uppercase text-neutral-500">
                        THIS COLLECTOR HAS NO PUBLIC VAULT CARDS YET.
                      </div>
                    )
                  ) : (
                    userListings.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {userListings.map(listing => (
                          <div key={listing.id} className="bg-white border-2 border-black p-4 flex gap-4 items-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <div className="w-16 aspect-[750/1050] bg-white border-2 border-black shrink-0 overflow-hidden cursor-pointer" onClick={() => { onSelectCard(listing.card); onClose(); }}>
                              <img src={listing.card.imageUrl} alt={listing.card.player} className="w-full h-full object-cover" />
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.2 bg-black text-[#D4FF00] border border-black">
                                {listing.card.rarity}
                              </span>
                              <h5 className="text-sm font-black uppercase text-black truncate">{listing.card.player}</h5>
                              <p className="text-[10px] font-bold text-neutral-500 uppercase truncate">{listing.card.team}</p>
                              <div className="text-sm font-black text-emerald-600 font-mono pt-1">
                                {formatCurrency(listing.price)}
                              </div>
                            </div>

                            {onBuyListing && currentUserId !== listing.sellerId && (
                              <button
                                onClick={() => {
                                  onBuyListing(listing);
                                  onClose();
                                }}
                                className="bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-3 py-2 text-xs font-black uppercase tracking-wider transition-colors shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                              >
                                BUY NOW
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-white border-2 border-black text-xs font-black uppercase text-neutral-500">
                        NO ACTIVE MARKET LISTINGS RIGHT NOW.
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
