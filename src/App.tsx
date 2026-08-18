import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Grid3X3, 
  WalletCards, 
  RefreshCw, 
  Flame, 
  DollarSign, 
  ArrowUpDown, 
  SlidersHorizontal, 
  Sparkles, 
  X, 
  ChevronRight, 
  ChevronDown, 
  Trophy, 
  Heart, 
  ShoppingCart, 
  Award, 
  Medal, 
  Users, 
  Menu, 
  Filter, 
  Plus, 
  Tag, 
  ShoppingBag,
  Layers,
  Check,
  Shield,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cardsDatabase } from './data';
import { CardItem } from './components/CardItem';
import { CardPreviewPage } from './components/CardPreviewPage';
import { AdminForm } from './components/AdminForm';
import { ManageShop } from './components/ManageShop';
import { PackShop } from './components/PackShop';
import { UserAuth } from './components/UserAuth';
import { CustomCard } from './components/CustomCard';
import { UserProfile } from './components/UserProfile';
import { WalletModal } from './components/WalletModal';
import { Marketplace } from './components/Marketplace';
import { LeaderboardAndEvents } from './components/LeaderboardAndEvents';
import { PublicProfileModal } from './components/PublicProfileModal';
import { FootballCard, Pack } from './types';
import { formatCurrency, getDefaultStock } from './lib/utils';
import { db, auth, onAuthStateChanged, collection, doc, setDoc, getDoc, User, deleteDoc, onSnapshot, getDocs, increment, updateDoc, addDoc } from './lib/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'database' | 'vault' | 'favorites' | 'marketplace' | 'leaderboard' | 'admin' | 'manage' | 'shop' | 'custom' | 'profile'>('database');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterRarity, setFilterRarity] = useState('');
  const [filterEdition, setFilterEdition] = useState('');
  
  // Price filter states
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [pricePreset, setPricePreset] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'year-desc' | 'year-asc' | 'player-asc'>('default');
  
  // Mobile drawer & filter tray states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFilterTrayOpen, setIsFilterTrayOpen] = useState(false);

  // Public profile modal viewing target
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const [selectedCard, setSelectedCard] = useState<FootballCard | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [vaultIds, setVaultIds] = useState<Set<string>>(new Set());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isBuyingCard, setIsBuyingCard] = useState(false);
  const [cards, setCards] = useState<FootballCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [themes, setThemes] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load user's vault (owned), favorites, and wallet balance
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Support both new vaultIds and legacy collectionIds
            const vIds = data.vaultIds || data.collectionIds || [];
            const fIds = data.favoriteIds || [];
            setVaultIds(new Set(vIds));
            setFavoriteIds(new Set(fIds));
            setWalletBalance(data.walletBalance || 0);
          } else {
            setVaultIds(new Set());
            setFavoriteIds(new Set());
            setWalletBalance(0);
          }
        });
        return () => unsubscribeUser();
      } else {
        setVaultIds(new Set());
        setFavoriteIds(new Set());
        setWalletBalance(0);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setLoadingCards(true);
    const cardsRef = collection(db, 'cards');
    const unsubscribeCards = onSnapshot(cardsRef, (snapshot) => {
      const loadedCards: FootballCard[] = [];
      snapshot.forEach(doc => {
        loadedCards.push({ id: doc.id, ...doc.data() } as FootballCard);
      });
      setCards(loadedCards);
      setLoadingCards(false);
    }, (error) => {
      console.error("Error fetching cards:", error);
      setLoadingCards(false);
    });

    const packsRef = collection(db, 'packs');
    const unsubscribePacks = onSnapshot(packsRef, (snapshot) => {
      const loadedPacks: Pack[] = [];
      snapshot.forEach(doc => {
        loadedPacks.push({ id: doc.id, ...doc.data() } as Pack);
      });
      setPacks(loadedPacks);
    }, (error) => {
      console.error("Error fetching packs:", error);
    });

    const themesRef = collection(db, 'themes');
    const unsubscribeThemes = onSnapshot(themesRef, (snapshot) => {
      const loadedThemes: any[] = [];
      snapshot.forEach(doc => {
        loadedThemes.push({ id: doc.id, ...doc.data() });
      });
      setThemes(loadedThemes);
    }, (error) => {
      console.error("Error fetching themes:", error);
    });

    return () => {
      unsubscribeCards();
      unsubscribePacks();
      unsubscribeThemes();
    };
  }, []);

  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle Vault Updates (Cards bought or packed)
  const saveVaultToFirebase = async (newVault: Set<string>) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        email: user.email,
        vaultIds: Array.from(newVault),
        collectionIds: Array.from(newVault) // sync legacy key
      }, { merge: true });
    } catch (error) {
      console.error("Error saving vault:", error);
    }
  };

  // Handle Favorites Toggle (User manually marks any card as favorite)
  const handleToggleFavorite = async (cardId: string) => {
    if (!user) {
      setToastMessage("Please sign in to add cards to your favorites.");
      return;
    }
    const next = new Set<string>(favoriteIds);
    const wasFavorite = next.has(cardId);
    if (wasFavorite) {
      next.delete(cardId);
      setToastMessage("Removed from Favorites.");
    } else {
      next.add(cardId);
      setToastMessage("❤️ Added to Favorites!");
    }
    setFavoriteIds(next);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        email: user.email,
        favoriteIds: Array.from(next)
      }, { merge: true });
    } catch (error) {
      console.error("Error saving favorites:", error);
    }
  };

  // Cards drawn from booster pack -> automatically placed in Vault
  const handleCardsDrawn = (drawnCards: FootballCard[]) => {
    setVaultIds(prev => {
      const next = new Set<string>(prev);
      let added = false;
      drawnCards.forEach(c => {
        if (!next.has(c.id)) {
          next.add(c.id);
          added = true;
        }
      });
      if (added) {
        saveVaultToFirebase(next);
      }
      return next;
    });
  };

  // Buy single card directly from database -> added to Vault
  const handleBuyDirectCard = async (card: FootballCard) => {
    if (!user) {
      setToastMessage("Please sign in to purchase cards.");
      switchTab('profile');
      return;
    }

    const currentStock = getDefaultStock(card);
    if (currentStock <= 0) {
      setToastMessage("Sorry, this card is currently out of stock.");
      return;
    }

    if (walletBalance < card.currentPrice) {
      setToastMessage("Insufficient wallet balance. Please top up.");
      setIsWalletOpen(true);
      return;
    }

    setIsBuyingCard(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const cardRef = doc(db, 'cards', card.id);

      // 1. Deduct balance and add card to user's Vault
      const nextVault = new Set(vaultIds);
      nextVault.add(card.id);

      await setDoc(userRef, {
        email: user.email,
        walletBalance: increment(-card.currentPrice),
        vaultIds: Array.from(nextVault),
        collectionIds: Array.from(nextVault)
      }, { merge: true });

      // 2. Decrement stock from database
      await setDoc(cardRef, {
        stock: Math.max(0, currentStock - 1)
      }, { merge: true });

      // 3. Record transaction
      const txRef = collection(db, 'transactions');
      await addDoc(txRef, {
        userId: user.uid,
        userEmail: user.email || 'Anonymous',
        type: 'card_purchase',
        amount: card.currentPrice,
        description: `Purchased card: ${card.player} (${card.rarity})`,
        timestamp: Date.now()
      });

      setVaultIds(nextVault);
      setToastMessage(`🎉 Successfully bought ${card.player} and saved to your Vault!`);
    } catch (err: any) {
      console.error("Purchase error:", err);
      setToastMessage(`Purchase failed: ${err.message || 'Please try again.'}`);
    } finally {
      setIsBuyingCard(false);
    }
  };

  const handleAddCard = async (newCard: FootballCard) => {
    try {
      const { id, ...cardData } = newCard;
      const cardRef = doc(collection(db, 'cards'), id);
      await setDoc(cardRef, cardData);
      setActiveTab('database');
      setToastMessage("Card published successfully!");
    } catch (error: any) {
      console.error("Error adding card:", error);
      setToastMessage(`Error adding card: ${error.message || String(error)}`);
    }
  };

  const handleSelectCard = (card: FootballCard) => {
    setSelectedCard(card);
  };

  const switchTab = (tab: 'database' | 'vault' | 'favorites' | 'marketplace' | 'leaderboard' | 'admin' | 'manage' | 'shop' | 'custom' | 'profile' | 'collection') => {
    setSelectedCard(null);
    setIsMobileMenuOpen(false);
    if (tab === 'collection') {
      setActiveTab('vault');
    } else {
      setActiveTab(tab as any);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterTeam('');
    setFilterPosition('');
    setFilterRarity('');
    setFilterEdition('');
    setMinPrice('');
    setMaxPrice('');
    setPricePreset('all');
    setSortBy('default');
  };

  // Filtering cards
  const filteredCards = cards.filter(card => {
    if (!card.imageUrl) return false;
    
    const player = card.player || '';
    const team = card.team || '';
    const q = searchQuery.toLowerCase().trim();
    
    // Check search query (matches player, team, set, position, year, card number, or price number)
    let matchesSearch = true;
    if (q) {
      const cleanedPriceQuery = q.replace(/[$৳,]/g, '').trim();
      const isNumericQuery = !isNaN(Number(cleanedPriceQuery)) && cleanedPriceQuery.length > 0;
      
      matchesSearch = player.toLowerCase().includes(q) || 
                      team.toLowerCase().includes(q) ||
                      (card.set || '').toLowerCase().includes(q) ||
                      (card.year || '').toString().includes(q) ||
                      (card.cardNumber || '').toLowerCase().includes(q) ||
                      (card.position || '').toLowerCase().includes(q) ||
                      (isNumericQuery && card.currentPrice.toString().includes(cleanedPriceQuery));
    }
    
    const matchesTeam = filterTeam ? card.team === filterTeam : true;
    const matchesPosition = filterPosition ? card.position === filterPosition : true;
    const matchesRarity = filterRarity ? card.rarity === filterRarity : true;
    const matchesEdition = filterEdition ? card.edition === filterEdition : true;

    // Price preset filter
    let matchesPricePreset = true;
    if (pricePreset === 'under50') matchesPricePreset = card.currentPrice < 50;
    else if (pricePreset === '50to200') matchesPricePreset = card.currentPrice >= 50 && card.currentPrice <= 200;
    else if (pricePreset === '200to1000') matchesPricePreset = card.currentPrice >= 200 && card.currentPrice <= 1000;
    else if (pricePreset === '1000plus') matchesPricePreset = card.currentPrice >= 1000;

    // Custom price bounds
    let matchesMinPrice = true;
    if (minPrice !== '' && !isNaN(Number(minPrice))) {
      matchesMinPrice = card.currentPrice >= Number(minPrice);
    }

    let matchesMaxPrice = true;
    if (maxPrice !== '' && !isNaN(Number(maxPrice))) {
      matchesMaxPrice = card.currentPrice <= Number(maxPrice);
    }
    
    const allMatches = matchesSearch && matchesTeam && matchesPosition && matchesRarity && matchesEdition && matchesPricePreset && matchesMinPrice && matchesMaxPrice;

    if (activeTab === 'vault') {
      return allMatches && vaultIds.has(card.id);
    }
    if (activeTab === 'favorites') {
      return allMatches && favoriteIds.has(card.id);
    }
    return allMatches;
  });

  // Sorting cards
  const sortedCards = [...filteredCards].sort((a, b) => {
    if (sortBy === 'price-asc') {
      return a.currentPrice - b.currentPrice;
    }
    if (sortBy === 'price-desc') {
      return b.currentPrice - a.currentPrice;
    }
    if (sortBy === 'year-desc') {
      return b.year - a.year;
    }
    if (sortBy === 'year-asc') {
      return a.year - b.year;
    }
    if (sortBy === 'player-asc') {
      return a.player.localeCompare(b.player);
    }
    return 0;
  });

  let vaultValue = 0;
  vaultIds.forEach(id => {
    const card = cards.find(c => c.id === id);
    vaultValue += (card?.currentPrice || 0);
  });

  const totalMarketCap = cards.filter(card => !!card.imageUrl).reduce((total, card) => total + card.currentPrice, 0);

  const uniqueTeams = Array.from(new Set(cards.map(c => c.team).filter(Boolean))).sort();
  const uniquePositions = Array.from(new Set(cards.map(c => c.position).filter(Boolean))).sort();
  const uniqueRarities = Array.from(new Set(cards.map(c => c.rarity).filter(Boolean))).sort();
  const uniqueEditions = Array.from(new Set(cards.map(c => c.edition).filter(Boolean))).sort();

  const activeFiltersCount = (searchQuery ? 1 : 0) + 
    (filterTeam ? 1 : 0) + 
    (filterPosition ? 1 : 0) + 
    (filterRarity ? 1 : 0) + 
    (filterEdition ? 1 : 0) + 
    (minPrice !== '' || maxPrice !== '' || pricePreset !== 'all' ? 1 : 0) + 
    (sortBy !== 'default' ? 1 : 0);

  const hasActiveFilters = activeFiltersCount > 0;
  const isAdminUser = user?.email === 'grakibg@gmail.com' || user?.email === 'wwwrakibcom071@gmail.com' || user?.email === '1@1.com';

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans uppercase selection:bg-[#D4FF00] selection:text-black">
      {/* Header (Responsive for PC & Phone) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
          
          {/* Logo & Desktop Nav */}
          <div className="flex items-center gap-3 lg:gap-8 min-w-0">
            <div 
              onClick={() => switchTab('database')}
              className="flex items-center gap-1.5 cursor-pointer group shrink-0"
            >
              <div className="w-8 h-8 bg-black text-[#D4FF00] border-2 border-black flex items-center justify-center font-black text-sm group-hover:bg-[#D4FF00] group-hover:text-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                AC
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-black tracking-tighter text-black uppercase leading-none group-hover:text-neutral-700 transition-colors">
                  ARTCARD
                </span>
                <span className="hidden sm:inline-block text-[8px] font-black tracking-widest text-neutral-500 uppercase mt-0.5">
                  COLLECTIVE HUB
                </span>
              </div>
            </div>
            
            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-black tracking-wider text-neutral-600 uppercase">
              <button 
                onClick={() => switchTab('database')}
                className={`px-3 py-2 border-b-2 transition-all ${
                  activeTab === 'database' && !selectedCard ? 'text-black border-black bg-neutral-100' : 'border-transparent hover:text-black hover:bg-neutral-50'
                }`}
              >
                DATABASE
              </button>
              <button 
                onClick={() => switchTab('marketplace')}
                className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition-all ${
                  activeTab === 'marketplace' && !selectedCard ? 'text-black border-black bg-neutral-100' : 'border-transparent hover:text-black hover:bg-neutral-50'
                }`}
              >
                <ShoppingCart size={13} />
                MARKET
              </button>
              <button 
                onClick={() => switchTab('vault')}
                className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition-all ${
                  activeTab === 'vault' && !selectedCard ? 'text-black border-black bg-neutral-100' : 'border-transparent hover:text-black hover:bg-neutral-50'
                }`}
              >
                <Trophy size={13} />
                VAULT ({vaultIds.size})
              </button>
              <button 
                onClick={() => switchTab('leaderboard')}
                className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition-all ${
                  activeTab === 'leaderboard' && !selectedCard ? 'text-black border-black bg-neutral-100' : 'border-transparent hover:text-black hover:bg-neutral-50'
                }`}
              >
                <Medal size={13} />
                LEADERBOARD
              </button>
              <button 
                onClick={() => switchTab('shop')}
                className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition-all ${
                  activeTab === 'shop' && !selectedCard ? 'text-black border-black bg-neutral-100' : 'border-transparent hover:text-black hover:bg-neutral-50'
                }`}
              >
                <Sparkles size={13} />
                SHOP
              </button>
              <button 
                onClick={() => switchTab('custom')}
                className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition-all ${
                  activeTab === 'custom' && !selectedCard ? 'text-black border-black bg-neutral-100' : 'border-transparent hover:text-black hover:bg-neutral-50'
                }`}
              >
                <Palette size={13} />
                CUSTOM
              </button>
              <button 
                onClick={() => switchTab('favorites')}
                className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition-all ${
                  activeTab === 'favorites' && !selectedCard ? 'text-black border-black bg-neutral-100' : 'border-transparent hover:text-black hover:bg-neutral-50'
                }`}
              >
                <Heart size={13} className={favoriteIds.size > 0 ? "text-red-500 fill-red-500" : "text-neutral-400"} />
                FAVS ({favoriteIds.size})
              </button>
              {isAdminUser && (
                <>
                  <button 
                    onClick={() => switchTab('admin')}
                    className={`px-2.5 py-1.5 text-[11px] font-black border border-black transition-all ${
                      activeTab === 'admin' && !selectedCard ? 'bg-[#D4FF00] text-black' : 'bg-neutral-100 hover:bg-neutral-200'
                    }`}
                  >
                    + ADD CARD
                  </button>
                  <button 
                    onClick={() => switchTab('manage')}
                    className={`px-2.5 py-1.5 text-[11px] font-black border border-black transition-all ${
                      activeTab === 'manage' && !selectedCard ? 'bg-[#D4FF00] text-black' : 'bg-neutral-100 hover:bg-neutral-200'
                    }`}
                  >
                    MANAGE
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Right Header: Wallet Balance, Portfolio & User Profile */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Wallet Quick Balance & Top-Up Button */}
            <button
              onClick={() => {
                if (!user) {
                  switchTab('profile');
                } else {
                  setIsWalletOpen(true);
                }
              }}
              className="flex items-center gap-1 sm:gap-2 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
              title="Click to manage ARTCOIN wallet balance"
            >
              <DollarSign size={13} strokeWidth={3} className="shrink-0" />
              <span>{user ? formatCurrency(walletBalance) : 'TOP UP ৳'}</span>
            </button>

            {/* Vault Portfolio (Desktop only) */}
            <div className="hidden xl:flex flex-col items-end">
              <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-black leading-none mb-0.5">Vault Value</span>
              <span className="text-xs font-black text-black bg-neutral-100 px-2 py-0.5 border border-black">{formatCurrency(vaultValue)}</span>
            </div>

            {/* Profile Avatar / Auth */}
            <UserAuth 
              user={user} 
              onOpenProfile={() => switchTab('profile')} 
              isProfileActive={activeTab === 'profile' && !selectedCard} 
            />

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 border-2 border-black bg-white hover:bg-neutral-100 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
              title="Open Navigation Menu"
            >
              <Menu size={18} />
            </button>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Mobile Navigation */}
        <div className="-mx-4 px-4 sm:-mx-6 sm:px-6 mb-8 overflow-hidden">
          <div className="md:hidden flex gap-2.5 overflow-x-auto pb-4 pt-1 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button 
              onClick={() => switchTab('database')}
              className={`shrink-0 snap-start px-4 py-2.5 text-xs font-black tracking-widest transition-all uppercase border-2 border-black whitespace-nowrap ${
                activeTab === 'database' && !selectedCard ? 'bg-black text-[#D4FF00] shadow-[3px_3px_0px_0px_#D4FF00] -translate-y-0.5' : 'bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-50'
              }`}
            >
              DATABASE
            </button>
            <button 
              onClick={() => switchTab('marketplace')}
              className={`shrink-0 snap-start px-4 py-2.5 text-xs font-black tracking-widest transition-all uppercase border-2 border-black whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'marketplace' && !selectedCard ? 'bg-black text-[#D4FF00] shadow-[3px_3px_0px_0px_#D4FF00] -translate-y-0.5' : 'bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-50'
              }`}
            >
              <ShoppingCart size={14} /> MARKETPLACE
            </button>
            <button 
              onClick={() => switchTab('vault')}
              className={`shrink-0 snap-start px-4 py-2.5 text-xs font-black tracking-widest transition-all uppercase border-2 border-black whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'vault' && !selectedCard ? 'bg-black text-[#D4FF00] shadow-[3px_3px_0px_0px_#D4FF00] -translate-y-0.5' : 'bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-50'
              }`}
            >
              <Trophy size={14} /> VAULT ({vaultIds.size})
            </button>
            <button 
              onClick={() => switchTab('leaderboard')}
              className={`shrink-0 snap-start px-4 py-2.5 text-xs font-black tracking-widest transition-all uppercase border-2 border-black whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'leaderboard' && !selectedCard ? 'bg-black text-[#D4FF00] shadow-[3px_3px_0px_0px_#D4FF00] -translate-y-0.5' : 'bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-50'
              }`}
            >
              <Medal size={14} /> LEADERBOARD
            </button>
            <button 
              onClick={() => switchTab('favorites')}
              className={`shrink-0 snap-start px-4 py-2.5 text-xs font-black tracking-widest transition-all uppercase border-2 border-black whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'favorites' && !selectedCard ? 'bg-black text-white shadow-[3px_3px_0px_0px_red] -translate-y-0.5' : 'bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-50'
              }`}
            >
              <Heart size={14} className="text-red-500 fill-red-500" /> FAVORITES ({favoriteIds.size})
            </button>
            <button 
              onClick={() => switchTab('shop')}
              className={`shrink-0 snap-start px-4 py-2.5 text-xs font-black tracking-widest transition-all uppercase border-2 border-black whitespace-nowrap ${
                activeTab === 'shop' && !selectedCard ? 'bg-black text-[#D4FF00] shadow-[3px_3px_0px_0px_#D4FF00] -translate-y-0.5' : 'bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-50'
              }`}
            >
              SHOP
            </button>
            <button 
              onClick={() => switchTab('custom')}
              className={`shrink-0 snap-start px-4 py-2.5 text-xs font-black tracking-widest transition-all uppercase border-2 border-black whitespace-nowrap ${
                activeTab === 'custom' && !selectedCard ? 'bg-black text-[#D4FF00] shadow-[3px_3px_0px_0px_#D4FF00] -translate-y-0.5' : 'bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-50'
              }`}
            >
              CUSTOM
            </button>
            {(user?.email === 'grakibg@gmail.com' || user?.email === 'wwwrakibcom071@gmail.com' || user?.email === '1@1.com') && (
              <>
                <button 
                  onClick={() => switchTab('admin')}
                  className={`shrink-0 snap-start px-4 py-2.5 text-xs font-black tracking-widest transition-all uppercase border-2 border-black whitespace-nowrap ${
                    activeTab === 'admin' && !selectedCard ? 'bg-[#D4FF00] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'bg-neutral-200 text-black'
                  }`}
                >
                  ADD CARD
                </button>
                <button 
                  onClick={() => switchTab('manage')}
                  className={`shrink-0 snap-start px-4 py-2.5 text-xs font-black tracking-widest transition-all uppercase border-2 border-black whitespace-nowrap ${
                    activeTab === 'manage' && !selectedCard ? 'bg-[#D4FF00] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'bg-neutral-200 text-black'
                  }`}
                >
                  MANAGE
                </button>
              </>
            )}
          </div>
        </div>

        {selectedCard ? (
          <CardPreviewPage
            card={selectedCard}
            allCards={cards}
            inVault={vaultIds.has(selectedCard.id)}
            isFavorite={favoriteIds.has(selectedCard.id)}
            onToggleFavorite={() => handleToggleFavorite(selectedCard.id)}
            onBack={() => setSelectedCard(null)}
            onSelectRelatedCard={(relCard) => handleSelectCard(relCard)}
            userEmail={user?.email}
            walletBalance={walletBalance}
            onBuyCard={handleBuyDirectCard}
            onOpenWallet={() => setIsWalletOpen(true)}
            isBuying={isBuyingCard}
          />
        ) : activeTab === 'profile' ? (
          <UserProfile
            user={user}
            cards={cards}
            vaultIds={vaultIds}
            favoriteIds={favoriteIds}
            onSelectCard={handleSelectCard}
            onNavigateTab={(tab) => switchTab(tab)}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : activeTab === 'marketplace' ? (
          <Marketplace
            user={user}
            walletBalance={walletBalance}
            allCards={cards}
            vaultIds={vaultIds}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenAuth={() => switchTab('profile')}
            onSelectCard={handleSelectCard}
            onViewUserProfile={(uid) => setViewingUserId(uid)}
            onToast={(msg) => setToastMessage(msg)}
          />
        ) : activeTab === 'leaderboard' ? (
          <LeaderboardAndEvents
            user={user}
            walletBalance={walletBalance}
            allCards={cards}
            vaultIds={vaultIds}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenAuth={() => switchTab('profile')}
            onViewUserProfile={(uid) => setViewingUserId(uid)}
            onSelectCard={handleSelectCard}
            onToast={(msg) => setToastMessage(msg)}
          />
        ) : activeTab === 'admin' ? (
          (user?.email === 'grakibg@gmail.com' || user?.email === 'wwwrakibcom071@gmail.com' || user?.email === '1@1.com') ? (
            <div className="max-w-2xl mx-auto space-y-8">
              <AdminForm onAdd={handleAddCard} totalCards={cards.filter(c => !!c.imageUrl).length} totalMarketCap={totalMarketCap} existingCards={cards} />
            </div>
          ) : (
            <div className="text-center py-20 font-black tracking-widest text-neutral-500 uppercase">
               Access Denied
            </div>
          )
        ) : activeTab === 'manage' ? (
          (user?.email === 'grakibg@gmail.com' || user?.email === 'wwwrakibcom071@gmail.com' || user?.email === '1@1.com') ? (
            <ManageShop cards={cards} packs={packs} themes={themes} />
          ) : (
            <div className="text-center py-20 font-black tracking-widest text-neutral-500 uppercase">
               Access Denied
            </div>
          )
        ) : activeTab === 'shop' ? (
          <PackShop 
            cards={cards} 
            packs={packs} 
            user={user}
            walletBalance={walletBalance}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenAuth={() => switchTab('profile')}
            onCardsDrawn={handleCardsDrawn} 
          />
        ) : activeTab === 'custom' ? (
          <CustomCard themes={themes} />
        ) : (
          <>
            {/* Search, Price & Filters Section */}
            <div className="mb-10 space-y-4 max-w-5xl">
              {/* Primary Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search size={20} className="text-black" />
                </div>
                <input
                  type="text"
                  placeholder="SEARCH PLAYERS, TEAMS, SETS, OR PRICE (E.G. ৳500)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border-2 border-black rounded-none py-4 pl-12 pr-12 text-xs sm:text-sm font-black text-black placeholder-neutral-500 focus:outline-none focus:ring-4 focus:ring-[#D4FF00]/50 transition-colors uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-4 flex items-center text-neutral-400 hover:text-black"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Price Preset Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1 mr-1">
                  <span className="font-black text-xs text-black">৳</span> PRICE:
                </span>
                {[
                  { id: 'all', label: 'ALL PRICES' },
                  { id: 'under50', label: 'UNDER ৳50' },
                  { id: '50to200', label: '৳50 - ৳200' },
                  { id: '200to1000', label: '৳200 - ৳1,000' },
                  { id: '1000plus', label: '৳1,000+' }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setPricePreset(preset.id);
                      setMinPrice('');
                      setMaxPrice('');
                    }}
                    className={`px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider border-2 border-black transition-all ${
                      pricePreset === preset.id && minPrice === '' && maxPrice === ''
                        ? 'bg-black text-[#D4FF00] shadow-[2px_2px_0px_0px_#D4FF00]'
                        : 'bg-white text-black hover:bg-[#D4FF00]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Advanced Filter Row (Custom Min/Max Price + Select Dropdowns) */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {/* Min / Max Price Inputs */}
                <div className="flex items-center gap-1.5 bg-neutral-100 p-1 border-2 border-black">
                  <span className="text-[10px] font-black uppercase px-1 text-neutral-500">CUSTOM ৳:</span>
                  <input
                    type="number"
                    placeholder="MIN ৳"
                    value={minPrice}
                    onChange={(e) => {
                      setMinPrice(e.target.value);
                      setPricePreset('all');
                    }}
                    className="w-20 bg-white border border-black p-1.5 text-xs font-black uppercase focus:outline-none focus:bg-[#D4FF00]"
                  />
                  <span className="text-xs font-bold text-neutral-400">-</span>
                  <input
                    type="number"
                    placeholder="MAX ৳"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(e.target.value);
                      setPricePreset('all');
                    }}
                    className="w-20 bg-white border border-black p-1.5 text-xs font-black uppercase focus:outline-none focus:bg-[#D4FF00]"
                  />
                </div>

                {/* Sort Selector */}
                <div className="flex items-center gap-1">
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white border-2 border-black p-2 text-xs font-black uppercase tracking-widest focus:outline-none focus:bg-[#D4FF00]"
                  >
                    <option value="default">SORT: DEFAULT</option>
                    <option value="price-asc">PRICE: LOW TO HIGH</option>
                    <option value="price-desc">PRICE: HIGH TO LOW</option>
                    <option value="year-desc">YEAR: NEWEST FIRST</option>
                    <option value="year-asc">YEAR: OLDEST FIRST</option>
                    <option value="player-asc">PLAYER: A TO Z</option>
                  </select>
                </div>

                {/* Team */}
                <select 
                  value={filterTeam} 
                  onChange={(e) => setFilterTeam(e.target.value)}
                  className="bg-white border-2 border-black p-2 text-xs font-black uppercase tracking-widest focus:outline-none focus:bg-[#D4FF00]"
                >
                  <option value="">ALL TEAMS</option>
                  {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                {/* Position */}
                <select 
                  value={filterPosition} 
                  onChange={(e) => setFilterPosition(e.target.value)}
                  className="bg-white border-2 border-black p-2 text-xs font-black uppercase tracking-widest focus:outline-none focus:bg-[#D4FF00]"
                >
                  <option value="">ALL POSITIONS</option>
                  {uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                {/* Rarity */}
                <select 
                  value={filterRarity} 
                  onChange={(e) => setFilterRarity(e.target.value)}
                  className="bg-white border-2 border-black p-2 text-xs font-black uppercase tracking-widest focus:outline-none focus:bg-[#D4FF00]"
                >
                  <option value="">ALL RARITIES</option>
                  {uniqueRarities.map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                {/* Edition */}
                <select 
                  value={filterEdition} 
                  onChange={(e) => setFilterEdition(e.target.value)}
                  className="bg-white border-2 border-black p-2 text-xs font-black uppercase tracking-widest focus:outline-none focus:bg-[#D4FF00]"
                >
                  <option value="">ALL EDITIONS</option>
                  {uniqueEditions.map(e => <option key={e} value={e}>{e}</option>)}
                </select>

                {/* Clear / Reset Filter button */}
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 bg-black text-[#D4FF00] border-2 border-black px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                  >
                    <X size={14} /> RESET FILTERS
                  </button>
                )}
              </div>
            </div>

            {/* Tab Header Info */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-black pb-4 gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter text-black flex items-center gap-3">
                  {activeTab === 'database' && 'CARD DATABASE'}
                  {activeTab === 'vault' && (
                    <>
                      <Trophy size={36} /> MY CARD VAULT (OWNED)
                    </>
                  )}
                  {activeTab === 'favorites' && (
                    <>
                      <Heart size={36} className="text-red-500 fill-red-500" /> MY FAVORITES
                    </>
                  )}
                </h1>
                <p className="text-neutral-500 mt-2 text-xs font-black uppercase tracking-widest">
                  {activeTab === 'database' && `SHOWING ${sortedCards.length} OF ${cards.filter(c => !!c.imageUrl).length} CARDS`}
                  {activeTab === 'vault' && `YOU OWN ${vaultIds.size} CARDS IN YOUR VAULT VALUED AT ${formatCurrency(vaultValue)}.`}
                  {activeTab === 'favorites' && `YOU HAVE SAVED ${favoriteIds.size} FAVORITE CARDS.`}
                </p>
              </div>
            </div>

            {/* Grid */}
            {loadingCards ? (
              <div className="flex justify-center py-32">
                 <RefreshCw size={48} className="text-neutral-300 animate-spin" />
              </div>
            ) : sortedCards.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
                {sortedCards.map(card => (
                  <CardItem 
                    key={card.id} 
                    card={card} 
                    inVault={vaultIds.has(card.id)}
                    isFavorite={favoriteIds.has(card.id)}
                    onToggleFavorite={(e, id) => handleToggleFavorite(id)}
                    onClick={(c) => handleSelectCard(c)} 
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-black bg-neutral-100 p-6">
                {activeTab === 'vault' ? (
                  <>
                    <Trophy size={48} className="text-black mb-6" />
                    <h3 className="text-2xl font-black text-black mb-4 uppercase tracking-widest">YOUR VAULT IS EMPTY</h3>
                    <p className="text-neutral-500 max-w-md text-xs font-black uppercase tracking-widest mb-6">
                      {user 
                        ? "YOU HAVEN'T PURCHASED OR DRAWN ANY CARDS YET. BUY FROM THE DATABASE OR OPEN BOOSTER PACKS TO FILL YOUR VAULT." 
                        : "PLEASE SIGN IN TO VIEW YOUR CARD VAULT."}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => switchTab('shop')}
                        className="bg-[#D4FF00] text-black border-2 border-black px-6 py-3 font-black text-xs uppercase tracking-widest hover:bg-black hover:text-[#D4FF00] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      >
                        OPEN PACKS
                      </button>
                      <button
                        onClick={() => switchTab('database')}
                        className="bg-black text-[#D4FF00] border-2 border-black px-6 py-3 font-black text-xs uppercase tracking-widest hover:bg-neutral-800 shadow-[4px_4px_0px_0px_#D4FF00]"
                      >
                        BROWSE DATABASE
                      </button>
                    </div>
                  </>
                ) : activeTab === 'favorites' ? (
                  <>
                    <Heart size={48} className="text-red-500 mb-6" />
                    <h3 className="text-2xl font-black text-black mb-4 uppercase tracking-widest">NO FAVORITES SAVED</h3>
                    <p className="text-neutral-500 max-w-md text-xs font-black uppercase tracking-widest mb-6">
                      CLICK THE HEART ICON ON ANY CARD TO SAVE IT TO YOUR FAVORITES WISHLIST.
                    </p>
                    <button
                      onClick={() => switchTab('database')}
                      className="bg-black text-white hover:bg-[#D4FF00] hover:text-black border-2 border-black px-6 py-3 font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    >
                      BROWSE CARDS
                    </button>
                  </>
                ) : (
                  <>
                    <WalletCards size={48} className="text-black mb-6" />
                    <h3 className="text-2xl font-black text-black mb-4 uppercase tracking-widest">NO CARDS FOUND</h3>
                    <p className="text-neutral-500 max-w-md text-xs font-black uppercase tracking-widest mb-6">
                      NO CARDS MATCH YOUR CURRENT SEARCH OR PRICE CRITERIA.
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="bg-black text-[#D4FF00] border-2 border-black px-6 py-3 font-black text-xs uppercase tracking-widest hover:bg-neutral-800 shadow-[4px_4px_0px_0px_#D4FF00]"
                      >
                        CLEAR ALL FILTERS
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-14 shrink-0 bg-white border-t-2 border-black flex items-center justify-between px-8 text-[10px] uppercase font-black tracking-widest text-neutral-600">
        <div className="flex gap-8">
          <span className="flex items-center gap-2"><div className="w-2 h-2 bg-[#D4FF00] border border-black"></div> MARKET ONLINE</span>
          <span>INDEX: <span className="text-black font-bold">+1.2%</span></span>
        </div>
        <div className="hidden sm:block">© 2024 ARTCARD COLLECTIVE • SECURE NODE #1192-A</div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 font-black text-sm tracking-widest uppercase border-2 border-[#D4FF00] shadow-[4px_4px_0px_0px_#D4FF00] animate-in slide-in-from-bottom-5 fade-in duration-300">
          {toastMessage}
        </div>
      )}

      {/* Wallet Top-Up Modal */}
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        user={user}
        walletBalance={walletBalance}
      />

      {/* Public Profile View Modal */}
      <PublicProfileModal
        userId={viewingUserId}
        onClose={() => setViewingUserId(null)}
        allCards={cards}
        currentUserId={user?.uid}
        onSelectCard={handleSelectCard}
      />
    </div>
  );
}
