import React, { useState, useEffect } from 'react';
import { FootballCard, UserProfileData } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  db, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  increment, 
  addDoc, 
  User 
} from '../lib/firebase';
import { 
  Trophy, 
  Crown, 
  Flame, 
  Calendar, 
  Sparkles, 
  Shield, 
  Star, 
  Award, 
  ChevronRight, 
  CheckCircle2, 
  Zap, 
  Coins, 
  Layers, 
  TrendingUp, 
  User as UserIcon,
  ExternalLink,
  Target
} from 'lucide-react';
import { motion } from 'motion/react';

interface LeaderboardAndEventsProps {
  user: User | null;
  walletBalance: number;
  allCards: FootballCard[];
  vaultIds: Set<string>;
  onOpenWallet: () => void;
  onOpenAuth: () => void;
  onViewUserProfile: (userId: string) => void;
  onSelectCard: (card: FootballCard) => void;
  onToast: (msg: string) => void;
}

interface RankedUser {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL?: string;
  customAvatar?: string;
  favoriteTeam?: string;
  vaultCardsCount: number;
  portfolioValue: number;
  shieldCount: number;
  goldCount: number;
  joinedAt?: number;
}

export function LeaderboardAndEvents({
  user,
  walletBalance,
  allCards,
  vaultIds,
  onOpenWallet,
  onOpenAuth,
  onViewUserProfile,
  onSelectCard,
  onToast
}: LeaderboardAndEventsProps) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'events'>('leaderboard');
  const [leaderboardCategory, setLeaderboardCategory] = useState<'value' | 'cards' | 'grails'>('value');
  const [allUsersData, setAllUsersData] = useState<RankedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [claimedEvents, setClaimedEvents] = useState<Set<string>>(new Set());
  const [isClaiming, setIsClaiming] = useState<string | null>(null);

  // Load community users from Firestore in real-time
  useEffect(() => {
    setLoadingUsers(true);
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const cardMap = new Map(allCards.map(c => [c.id, c]));
      const list: RankedUser[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const uVaultIds: string[] = Array.isArray(data.vaultIds) 
          ? data.vaultIds 
          : (Array.isArray(data.collectionIds) ? data.collectionIds : []);
        
        let value = 0;
        let shields = 0;
        let golds = 0;

        uVaultIds.forEach(id => {
          const card = cardMap.get(id);
          if (card) {
            value += card.currentPrice || 0;
            if (card.rarity === '1-of-1 Shield') shields++;
            if (card.rarity === 'Gold Autograph') golds++;
          }
        });

        // Claimed events if saved in user doc
        if (user && docSnap.id === user.uid && Array.isArray(data.claimedEvents)) {
          setClaimedEvents(new Set(data.claimedEvents));
        }

        list.push({
          uid: docSnap.id,
          displayName: data.displayName || data.email?.split('@')[0] || 'Collector',
          email: data.email || null,
          photoURL: data.photoURL,
          customAvatar: data.customAvatar,
          favoriteTeam: data.favoriteTeam,
          vaultCardsCount: uVaultIds.length,
          portfolioValue: value,
          shieldCount: shields,
          goldCount: golds,
          joinedAt: data.joinedAt
        });
      });

      setAllUsersData(list);
      setLoadingUsers(false);
    }, (err) => {
      console.error("Error fetching leaderboard users:", err);
      setLoadingUsers(false);
    });

    return () => unsubscribe();
  }, [allCards, user]);

  // Sort leaderboard list
  const sortedUsers = [...allUsersData].sort((a, b) => {
    if (leaderboardCategory === 'value') return b.portfolioValue - a.portfolioValue;
    if (leaderboardCategory === 'cards') return b.vaultCardsCount - a.vaultCardsCount;
    return (b.shieldCount * 5 + b.goldCount) - (a.shieldCount * 5 + a.goldCount);
  });

  const top3 = sortedUsers.slice(0, 3);
  const remainingRankings = sortedUsers.slice(3);

  // User's own cards in vault
  const userVaultCards = allCards.filter(c => vaultIds.has(c.id));
  const userTotalValue = userVaultCards.reduce((s, c) => s + (c.currentPrice || 0), 0);
  const userShieldCount = userVaultCards.filter(c => c.rarity === '1-of-1 Shield').length;
  const userUclCount = userVaultCards.filter(c => c.edition && c.edition.toLowerCase().includes('ucl')).length;

  // Community Events Definition
  const eventsList = [
    {
      id: 'event_ucl_squad',
      title: '🏆 CHAMPIONS LEAGUE SQUAD BUILDER',
      subtitle: 'Collect 3+ UCL Edition Cards in your Vault',
      reward: 1500,
      badge: 'UCL Master',
      progress: Math.min(userUclCount, 3),
      target: 3,
      isCompleted: userUclCount >= 3,
      description: 'Acquire at least 3 UEFA Champions League edition cards through pack pulls, store purchases, or the P2P transfer market.',
      icon: Trophy,
      tag: 'COLLECTION EVENT'
    },
    {
      id: 'event_vault_value_2000',
      title: '💎 HIGH ROLLER COLLECTOR',
      subtitle: 'Build a Vault Portfolio valued at 2,000+ ARTCOIN',
      reward: 1000,
      badge: 'High Roller',
      progress: Math.min(userTotalValue, 2000),
      target: 2000,
      isCompleted: userTotalValue >= 2000,
      description: 'Expand your collection with rare, holo, and signature cards to build an elite squad worth over 2,000 ARTCOIN.',
      icon: TrendingUp,
      tag: 'PORTFOLIO EVENT'
    },
    {
      id: 'event_shield_bounty',
      title: '🛡️ 1-OF-1 SHIELD GRAIL BOUNTY',
      subtitle: 'Own any 1-of-1 Shield in your Vault',
      reward: 3000,
      badge: 'Shield Sovereign',
      progress: Math.min(userShieldCount, 1),
      target: 1,
      isCompleted: userShieldCount >= 1,
      description: 'Pull from booster packs or negotiate on the transfer market to own a legendary, ultra-scarce 1-of-1 Shield card.',
      icon: Shield,
      tag: 'LEGENDARY BOUNTY'
    },
    {
      id: 'event_first_card',
      title: '⚽ ROOKIE SQUAD ONBOARDING',
      subtitle: 'Own at least 1 card in your Vault',
      reward: 250,
      badge: 'Rookie Starter',
      progress: Math.min(userVaultCards.length, 1),
      target: 1,
      isCompleted: userVaultCards.length >= 1,
      description: 'Get started on ArtCard by acquiring your very first football card.',
      icon: Zap,
      tag: 'STARTER EVENT'
    }
  ];

  // Handle Event Claim
  const handleClaimEvent = async (eventId: string, reward: number, title: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (claimedEvents.has(eventId)) {
      onToast("You have already claimed this event reward!");
      return;
    }

    setIsClaiming(eventId);

    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedClaimed = Array.from(new Set([...Array.from(claimedEvents), eventId]));

      await setDoc(userRef, {
        walletBalance: increment(reward),
        claimedEvents: updatedClaimed
      }, { merge: true });

      // Record transaction
      const txRef = collection(db, 'transactions');
      await addDoc(txRef, {
        userId: user.uid,
        userEmail: user.email,
        type: 'event_reward',
        amount: reward,
        description: `Event Reward: Claimed ${title}`,
        timestamp: Date.now()
      });

      setClaimedEvents(new Set(updatedClaimed));
      onToast(`🎉 EVENT CLAIMED! Received +${formatCurrency(reward)} bonus!`);
    } catch (err: any) {
      console.error("Claim error:", err);
      alert("Failed to claim reward. Please try again.");
    } finally {
      setIsClaiming(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-black text-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_#D4FF00] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#D4FF00] text-black px-3 py-1 text-xs font-black uppercase tracking-widest border border-black">
              <Trophy size={14} /> COMMUNITY LEADERBOARD & LIVE REWARD EVENTS
            </div>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter text-white">
              HALL OF FAME & BOUNTIES
            </h1>
            <p className="text-neutral-300 text-xs sm:text-sm font-bold uppercase tracking-wider max-w-xl">
              Compete with top football card collectors across the world, climb the leaderboard, and complete live events to earn free ARTCOIN rewards!
            </p>
          </div>

          <div className="bg-neutral-900 border-2 border-[#D4FF00] p-4 sm:p-5 flex items-center gap-4 shrink-0 shadow-[4px_4px_0px_0px_rgba(212,255,0,0.3)]">
            <div className="bg-[#D4FF00] text-black p-3 border border-black">
              <Coins size={28} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block">
                YOUR AVAILABLE ARTCOIN
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#D4FF00] tracking-tight">
                {formatCurrency(walletBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Switches */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-black pb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={cn(
              "px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-black transition-all flex items-center gap-2",
              activeTab === 'leaderboard'
                ? "bg-black text-[#D4FF00] shadow-[4px_4px_0px_0px_#D4FF00]"
                : "bg-white text-black hover:bg-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            )}
          >
            <Trophy size={16} />
            COLLECTOR LEADERBOARD ({sortedUsers.length})
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={cn(
              "px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-black transition-all flex items-center gap-2",
              activeTab === 'events'
                ? "bg-[#D4FF00] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                : "bg-white text-black hover:bg-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            )}
          >
            <Sparkles size={16} />
            LIVE COMMUNITY EVENTS ({eventsList.length})
          </button>
        </div>

        {activeTab === 'leaderboard' && (
          <div className="flex items-center gap-1.5 bg-neutral-100 border-2 border-black p-1">
            <button
              onClick={() => setLeaderboardCategory('value')}
              className={cn(
                "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors",
                leaderboardCategory === 'value' ? "bg-black text-[#D4FF00]" : "text-neutral-700 hover:text-black"
              )}
            >
              PORTFOLIO VALUE
            </button>
            <button
              onClick={() => setLeaderboardCategory('cards')}
              className={cn(
                "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors",
                leaderboardCategory === 'cards' ? "bg-black text-[#D4FF00]" : "text-neutral-700 hover:text-black"
              )}
            >
              CARDS OWNED
            </button>
            <button
              onClick={() => setLeaderboardCategory('grails')}
              className={cn(
                "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors",
                leaderboardCategory === 'grails' ? "bg-black text-[#D4FF00]" : "text-neutral-700 hover:text-black"
              )}
            >
              1-OF-1 GRAILS
            </button>
          </div>
        )}
      </div>

      {/* View 1: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-8">
          {/* Top 3 Podium Cards */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {/* 2nd Place (Silver) */}
              {top3[1] && (
                <motion.div
                  whileHover={{ y: -4 }}
                  onClick={() => onViewUserProfile(top3[1].uid)}
                  className="bg-white border-3 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between cursor-pointer order-2 md:order-1 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-slate-300 text-black px-4 py-1 text-xs font-black uppercase border-b-2 border-l-2 border-black flex items-center gap-1">
                    🥈 RANK #2
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="w-20 h-20 bg-slate-200 border-3 border-black mx-auto overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      {top3[1].customAvatar || top3[1].photoURL ? (
                        <img src={top3[1].customAvatar || top3[1].photoURL} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-black">
                          <UserIcon size={32} />
                        </div>
                      )}
                    </div>

                    <div className="text-center space-y-1">
                      <h4 className="text-lg font-black uppercase tracking-tight text-black truncate">
                        {top3[1].displayName}
                      </h4>
                      {top3[1].favoriteTeam && (
                        <p className="text-[10px] font-bold text-neutral-500 uppercase">
                          ⚽ {top3[1].favoriteTeam}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t-2 border-black/10 bg-neutral-50 -mx-6 -mb-6 p-4 text-center">
                    <span className="text-[9px] font-black uppercase text-neutral-500 block">TOTAL VAULT VALUE</span>
                    <span className="text-xl font-black text-black font-mono">
                      {formatCurrency(top3[1].portfolioValue)}
                    </span>
                    <div className="text-[9px] font-bold text-neutral-500 uppercase mt-1">
                      {top3[1].vaultCardsCount} CARDS • {top3[1].shieldCount} SHIELDS
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 1st Place (Gold Champion) */}
              {top3[0] && (
                <motion.div
                  whileHover={{ y: -6 }}
                  onClick={() => onViewUserProfile(top3[0].uid)}
                  className="bg-black text-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_#D4FF00] flex flex-col justify-between cursor-pointer order-1 md:order-2 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-[#D4FF00] text-black px-4 py-1.5 text-xs font-black uppercase border-b-2 border-l-2 border-black flex items-center gap-1">
                    👑 RANK #1 CHAMPION
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="w-24 h-24 bg-[#D4FF00] border-4 border-black mx-auto overflow-hidden shadow-[4px_4px_0px_0px_#D4FF00]">
                      {top3[0].customAvatar || top3[0].photoURL ? (
                        <img src={top3[0].customAvatar || top3[0].photoURL} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-black">
                          <UserIcon size={40} />
                        </div>
                      )}
                    </div>

                    <div className="text-center space-y-1">
                      <h4 className="text-2xl font-black uppercase tracking-tight text-[#D4FF00] truncate">
                        {top3[0].displayName}
                      </h4>
                      {top3[0].favoriteTeam && (
                        <p className="text-xs font-bold text-neutral-300 uppercase">
                          ⚽ {top3[0].favoriteTeam}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t-2 border-neutral-800 bg-neutral-900 -mx-6 -mb-6 p-4 text-center">
                    <span className="text-[9px] font-black uppercase text-[#D4FF00] block">TOP VAULT VALUE</span>
                    <span className="text-2xl font-black text-white font-mono">
                      {formatCurrency(top3[0].portfolioValue)}
                    </span>
                    <div className="text-[9px] font-bold text-neutral-400 uppercase mt-1">
                      {top3[0].vaultCardsCount} CARDS • {top3[0].shieldCount} 1-OF-1 SHIELDS
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 3rd Place (Bronze) */}
              {top3[2] && (
                <motion.div
                  whileHover={{ y: -4 }}
                  onClick={() => onViewUserProfile(top3[2].uid)}
                  className="bg-white border-3 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between cursor-pointer order-3 md:order-3 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-amber-600 text-white px-4 py-1 text-xs font-black uppercase border-b-2 border-l-2 border-black flex items-center gap-1">
                    🥉 RANK #3
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="w-20 h-20 bg-amber-100 border-3 border-black mx-auto overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      {top3[2].customAvatar || top3[2].photoURL ? (
                        <img src={top3[2].customAvatar || top3[2].photoURL} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-black">
                          <UserIcon size={32} />
                        </div>
                      )}
                    </div>

                    <div className="text-center space-y-1">
                      <h4 className="text-lg font-black uppercase tracking-tight text-black truncate">
                        {top3[2].displayName}
                      </h4>
                      {top3[2].favoriteTeam && (
                        <p className="text-[10px] font-bold text-neutral-500 uppercase">
                          ⚽ {top3[2].favoriteTeam}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t-2 border-black/10 bg-neutral-50 -mx-6 -mb-6 p-4 text-center">
                    <span className="text-[9px] font-black uppercase text-neutral-500 block">TOTAL VAULT VALUE</span>
                    <span className="text-xl font-black text-black font-mono">
                      {formatCurrency(top3[2].portfolioValue)}
                    </span>
                    <div className="text-[9px] font-bold text-neutral-500 uppercase mt-1">
                      {top3[2].vaultCardsCount} CARDS • {top3[2].shieldCount} SHIELDS
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="bg-white border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="p-4 bg-black text-white border-b-2 border-black flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#D4FF00]">
                ALL COLLECTOR RANKINGS (CLICK ANY USER TO VIEW PUBLIC PROFILE)
              </h3>
              <span className="text-[10px] font-mono text-neutral-400">
                LIVE REAL-TIME SYNC
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-b-2 border-black text-[10px] font-black uppercase text-neutral-600">
                    <th className="p-3 text-center w-16">RANK</th>
                    <th className="p-3">COLLECTOR</th>
                    <th className="p-3">FAVORITE CLUB</th>
                    <th className="p-3 text-center">VAULT CARDS</th>
                    <th className="p-3 text-center">1-OF-1 SHIELDS</th>
                    <th className="p-3 text-right">TOTAL VAULT VALUE</th>
                    <th className="p-3 text-center w-24">PROFILE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 text-xs font-bold uppercase">
                  {sortedUsers.map((u, idx) => {
                    const isCurrentUser = user && u.uid === user.uid;
                    return (
                      <tr
                        key={u.uid}
                        onClick={() => onViewUserProfile(u.uid)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-[#D4FF00]/15",
                          isCurrentUser && "bg-[#D4FF00]/25 font-black"
                        )}
                      >
                        <td className="p-3 text-center font-black font-mono">
                          {idx === 0 ? '👑 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {u.customAvatar || u.photoURL ? (
                              <img src={u.customAvatar || u.photoURL} alt="Avatar" className="w-8 h-8 object-cover border border-black" />
                            ) : (
                              <div className="w-8 h-8 bg-neutral-200 border border-black flex items-center justify-center font-black text-black text-[10px]">
                                <UserIcon size={14} />
                              </div>
                            )}
                            <div>
                              <div className="font-black text-black flex items-center gap-1.5">
                                {u.displayName}
                                {isCurrentUser && (
                                  <span className="bg-black text-[#D4FF00] text-[8px] px-1 py-0.2">YOU</span>
                                )}
                              </div>
                              {u.email && <div className="text-[9px] font-mono text-neutral-500 font-normal">{u.email}</div>}
                            </div>
                          </div>
                        </td>

                        <td className="p-3 text-neutral-700">
                          {u.favoriteTeam ? `⚽ ${u.favoriteTeam}` : '—'}
                        </td>

                        <td className="p-3 text-center font-mono font-black">
                          {u.vaultCardsCount}
                        </td>

                        <td className="p-3 text-center font-mono font-black text-amber-600">
                          {u.shieldCount > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-amber-100 px-2 py-0.5 border border-amber-300">
                              <Shield size={12} className="fill-amber-500" /> {u.shieldCount}
                            </span>
                          ) : (
                            '0'
                          )}
                        </td>

                        <td className="p-3 text-right font-black font-mono text-black text-sm">
                          {formatCurrency(u.portfolioValue)}
                        </td>

                        <td className="p-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewUserProfile(u.uid);
                            }}
                            className="bg-black text-white hover:bg-[#D4FF00] hover:text-black px-2.5 py-1 text-[9px] font-black uppercase border border-black transition-colors"
                          >
                            VIEW
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Live Community Events */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {eventsList.map((ev) => {
              const hasClaimed = claimedEvents.has(ev.id);
              const Icon = ev.icon;

              return (
                <div
                  key={ev.id}
                  className="bg-white border-3 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between space-y-6 relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="bg-black text-[#D4FF00] text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border border-black">
                        {ev.tag}
                      </span>
                      <div className="flex items-center gap-1 bg-[#D4FF00] text-black px-2.5 py-0.5 border border-black text-xs font-black">
                        <Coins size={14} /> +{formatCurrency(ev.reward)}
                      </div>
                    </div>

                    <div className="flex items-start gap-3 pt-1">
                      <div className="bg-black text-[#D4FF00] p-2.5 border-2 border-black shrink-0">
                        <Icon size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black uppercase tracking-tight text-black">{ev.title}</h4>
                        <p className="text-xs font-bold text-neutral-600 uppercase mt-0.5">{ev.subtitle}</p>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-600 font-bold uppercase tracking-wide leading-relaxed pt-1">
                      {ev.description}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span>PROGRESS</span>
                      <span className="font-mono">{ev.progress} / {ev.target}</span>
                    </div>
                    <div className="w-full h-3 bg-neutral-200 border-2 border-black overflow-hidden">
                      <div
                        className="h-full bg-[#D4FF00] transition-all"
                        style={{ width: `${Math.min(100, (ev.progress / ev.target) * 100)}%` }}
                      />
                    </div>

                    {hasClaimed ? (
                      <div className="w-full py-3 bg-emerald-100 text-emerald-900 border-2 border-emerald-500 font-black text-xs uppercase tracking-widest text-center flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} /> REWARD ALREADY CLAIMED
                      </div>
                    ) : ev.isCompleted ? (
                      <button
                        onClick={() => handleClaimEvent(ev.id, ev.reward, ev.title)}
                        disabled={isClaiming === ev.id}
                        className="w-full py-3.5 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black font-black text-xs uppercase tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
                      >
                        {isClaiming === ev.id ? (
                          'CLAIMING REWARD...'
                        ) : (
                          <>
                            <Sparkles size={16} /> CLAIM {formatCurrency(ev.reward)} REWARD NOW
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="w-full py-3 bg-neutral-100 text-neutral-500 border-2 border-neutral-300 font-black text-xs uppercase tracking-widest text-center">
                        IN PROGRESS ({Math.round((ev.progress / ev.target) * 100)}%)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
