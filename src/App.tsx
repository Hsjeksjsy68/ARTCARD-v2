import React, { useState, useEffect } from 'react';
import { Search, Library, Grid3X3, WalletCards, RefreshCw, Flame, DollarSign, ArrowUpDown, SlidersHorizontal, Sparkles, X, ChevronRight } from 'lucide-react';
import { cardsDatabase } from './data';
import { CardItem } from './components/CardItem';
import { CardPreviewPage } from './components/CardPreviewPage';
import { AdminForm } from './components/AdminForm';
import { ManageShop } from './components/ManageShop';
import { PackShop } from './components/PackShop';
import { UserAuth } from './components/UserAuth';
import { CustomCard } from './components/CustomCard';
import { UserProfile } from './components/UserProfile';
import { FootballCard, Pack } from './types';
import { formatCurrency } from './lib/utils';
import { db, auth, onAuthStateChanged, collection, doc, setDoc, getDoc, User, deleteDoc, onSnapshot, getDocs, increment } from './lib/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'database' | 'collection' | 'admin' | 'manage' | 'shop' | 'custom' | 'profile'>('database');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterRarity, setFilterRarity] = useState('');
  const [filterEdition, setFilterEdition] = useState('');
  
  // Price filter states
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [pricePreset, setPricePreset] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'most-searched' | 'price-asc' | 'price-desc' | 'year-desc' | 'year-asc' | 'player-asc'>('default');
  
  // Search counts from Firestore
  const [searchCounts, setSearchCounts] = useState<Record<string, number>>({});

  const [selectedCard, setSelectedCard] = useState<FootballCard | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [collectionIds, setCollectionIds] = useState<Set<string>>(new Set());
  const [cards, setCards] = useState<FootballCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [themes, setThemes] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load user's collection
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setCollectionIds(new Set(docSnap.data().collectionIds || []));
          } else {
            setCollectionIds(new Set());
          }
        });
        return () => unsubscribeUser();
      } else {
        setCollectionIds(new Set());
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

    // Real-time listener for search tracking
    const searchesRef = collection(db, 'searches');
    const unsubscribeSearches = onSnapshot(searchesRef, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        counts[docSnap.id] = data.count || 0;
      });
      setSearchCounts(counts);
    }, (error) => {
      console.error("Error fetching searches:", error);
    });

    return () => {
      unsubscribeCards();
      unsubscribePacks();
      unsubscribeThemes();
      unsubscribeSearches();
    };
  }, []);

  // Helper to record search / view count for a card
  const recordCardSearch = async (cardId: string) => {
    if (!cardId) return;
    try {
      const searchRef = doc(db, 'searches', cardId);
      await setDoc(searchRef, {
        cardId,
        count: increment(1),
        lastSearchedAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.warn("Search record error:", e);
    }
  };

  // Debounced search tracking when user searches in input
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return;
    const timer = setTimeout(() => {
      const q = searchQuery.toLowerCase().trim();
      const matched = cards.filter(c => {
        if (!c.imageUrl) return false;
        return (c.player || '').toLowerCase().includes(q) ||
               (c.team || '').toLowerCase().includes(q) ||
               (c.set || '').toLowerCase().includes(q);
      });
      // Increment count for up to top 3 matching cards
      matched.slice(0, 3).forEach(card => {
        recordCardSearch(card.id);
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [searchQuery, cards]);

  const saveCollectionToFirebase = async (newCollection: Set<string>) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        email: user.email,
        collectionIds: Array.from(newCollection)
      }, { merge: true });
    } catch (error) {
      console.error("Error saving collection:", error);
    }
  };

  const handleCardsDrawn = (drawnCards: FootballCard[]) => {
    setCollectionIds(prev => {
      const next = new Set<string>(prev);
      let added = false;
      drawnCards.forEach(c => {
        if (!next.has(c.id)) {
          next.add(c.id);
          added = true;
        }
      });
      if (added) {
        saveCollectionToFirebase(next);
      }
      return next;
    });
  };

  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleToggleCollection = (cardId: string) => {
    if (!user) {
      setToastMessage("Please sign in to manage your collection.");
      return;
    }
    setCollectionIds(prev => {
      const next = new Set<string>(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      saveCollectionToFirebase(next);
      return next;
    });
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
    recordCardSearch(card.id);
    setSelectedCard(card);
  };

  const switchTab = (tab: 'database' | 'collection' | 'admin' | 'manage' | 'shop' | 'custom' | 'profile') => {
    setSelectedCard(null);
    setActiveTab(tab);
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

  // Merge cards with real-time searchCounts
  const cardsWithStats = cards.map(card => ({
    ...card,
    searchCount: searchCounts[card.id] || 0
  }));

  // Filtering cards
  const filteredCards = cardsWithStats.filter(card => {
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

    if (activeTab === 'collection') {
      return allMatches && collectionIds.has(card.id);
    }
    return allMatches;
  });

  // Sorting cards
  const sortedCards = [...filteredCards].sort((a, b) => {
    if (sortBy === 'most-searched') {
      return (b.searchCount || 0) - (a.searchCount || 0);
    }
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

  // Top Most Searched Cards for the Trending Shelf in the feed
  const topSearchedCards = [...cardsWithStats]
    .filter(c => !!c.imageUrl && (c.searchCount || 0) > 0)
    .sort((a, b) => (b.searchCount || 0) - (a.searchCount || 0))
    .slice(0, 6);

  let collectionValue = 0;
  collectionIds.forEach(id => {
    const card = cards.find(c => c.id === id);
    collectionValue += (card?.currentPrice || 0);
  });

  const totalMarketCap = cards.filter(card => !!card.imageUrl).reduce((total, card) => total + card.currentPrice, 0);

  const uniqueTeams = Array.from(new Set(cards.map(c => c.team).filter(Boolean))).sort();
  const uniquePositions = Array.from(new Set(cards.map(c => c.position).filter(Boolean))).sort();
  const uniqueRarities = Array.from(new Set(cards.map(c => c.rarity).filter(Boolean))).sort();
  const uniqueEditions = Array.from(new Set(cards.map(c => c.edition).filter(Boolean))).sort();

  const hasActiveFilters = searchQuery !== '' || filterTeam !== '' || filterPosition !== '' || filterRarity !== '' || filterEdition !== '' || minPrice !== '' || maxPrice !== '' || pricePreset !== 'all' || sortBy !== 'default';

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans uppercase overflow-hidden selection:bg-[#D4FF00] selection:text-black">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <h1 className="text-3xl font-black tracking-tighter text-black uppercase">ARTCARD</h1>
            
            <nav className="hidden md:flex gap-8 text-sm font-black tracking-widest text-neutral-500 uppercase mt-1">
              <button 
                onClick={() => switchTab('database')}
                className={`transition-colors py-2 border-b-4 ${
                  activeTab === 'database' && !selectedCard ? 'text-black border-black' : 'border-transparent hover:text-black hover:border-black'
                }`}
              >
                DATABASE
              </button>
              <button 
                onClick={() => switchTab('collection')}
                className={`transition-colors py-2 border-b-4 ${
                  activeTab === 'collection' && !selectedCard ? 'text-black border-black' : 'border-transparent hover:text-black hover:border-black'
                }`}
              >
                FAVORITES
              </button>
              <button 
                onClick={() => switchTab('shop')}
                className={`transition-colors py-2 border-b-4 ${
                  activeTab === 'shop' && !selectedCard ? 'text-black border-black' : 'border-transparent hover:text-black hover:border-black'
                }`}
              >
                SHOP
              </button>
              <button 
                onClick={() => switchTab('custom')}
                className={`transition-colors py-2 border-b-4 ${
                  activeTab === 'custom' && !selectedCard ? 'text-black border-black' : 'border-transparent hover:text-black hover:border-black'
                }`}
              >
                CUSTOM CARD
              </button>
              {(user?.email === 'grakibg@gmail.com' || user?.email === 'wwwrakibcom071@gmail.com' || user?.email === '1@1.com') && (
                <>
                  <button 
                    onClick={() => switchTab('admin')}
                    className={`transition-colors py-2 border-b-4 ${
                      activeTab === 'admin' && !selectedCard ? 'text-black border-black' : 'border-transparent hover:text-black hover:border-black'
                    }`}
                  >
                    ADD CARD
                  </button>
                  <button 
                    onClick={() => switchTab('manage')}
                    className={`transition-colors py-2 border-b-4 ${
                      activeTab === 'manage' && !selectedCard ? 'text-black border-black' : 'border-transparent hover:text-black hover:border-black'
                    }`}
                  >
                    MANAGE SHOP
                  </button>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-black mb-1">Portfolio Value</span>
              <span className="text-sm font-black text-black bg-white px-3 py-1 border-2 border-black">{formatCurrency(collectionValue)}</span>
            </div>
            <UserAuth 
              user={user} 
              onOpenProfile={() => switchTab('profile')} 
              isProfileActive={activeTab === 'profile' && !selectedCard} 
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Mobile Navigation */}
        <div className="-mx-4 px-4 sm:-mx-6 sm:px-6 mb-8 overflow-hidden">
          <div className="md:hidden flex gap-3 overflow-x-auto pb-6 pt-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button 
              onClick={() => switchTab('database')}
              className={`shrink-0 snap-start px-6 py-3 text-xs font-black tracking-widest transition-all uppercase border-2 border-black whitespace-nowrap ${
                activeTab === 'database' && !selectedCard ? 'bg-black text-[#D4FF00] shadow-[4px_4px_0px_0px_#D4FF00] -translate-y-1' : 'bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-50 active:translate-y-0 active:shadow-none'
              }`}
            >
              DATABASE
            </button>
            <button 
              onClick={() => switchTab('collection')}
              className={`shrink-0 snap-start px-6 py-3 text-xs font-black tracking-widest transition-all uppercase border-2 border-black whitespace-nowrap ${
                activeTab === 'collection' && !selectedCard ? 'bg-black text-[#D4FF00] shadow-[4px_4px_0px_0px_#D4FF00] -translate-y-1' : 'bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-50 active:translate-y-0 active:shadow-none'
              }`}
            >
              FAVORITES
            </button>
            <button 
              onClick={() => switchTab('shop')}
              className={`shrink-0 snap-start px-6 py-3 text-xs font-black tracking-widest transition-all uppercase border-2 border-black whitespace-nowrap ${
                activeTab === 'shop' && !selectedCard ? 'bg-black text-[#D4FF00] shadow-[4px_4px_0px_0px_#D4FF00] -translate-y-1' : 'bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-50 active:translate-y-0 active:shadow-none'
              }`}
            >
              SHOP
            </button>
            <button 
              onClick={() => switchTab('custom')}
              className={`shrink-0 snap-start px-6 py-3 text-xs font-black tracking-widest transition-all uppercase border-2 border-black whitespace-nowrap ${
                activeTab === 'custom' && !selectedCard ? 'bg-black text-[#D4FF00] shadow-[4px_4px_0px_0px_#D4FF00] -translate-y-1' : 'bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-50 active:translate-y-0 active:shadow-none'
              }`}
            >
              CUSTOM CARD
            </button>
            {(user?.email === 'grakibg@gmail.com' || user?.email === 'wwwrakibcom071@gmail.com' || user?.email === '1@1.com') && (
              <>
                <button 
                  onClick={() => switchTab('admin')}
                  className={`shrink-0 snap-start px-6 py-3 text-xs font-black tracking-widest transition-all uppercase border-2 border-black whitespace-nowrap ${
                    activeTab === 'admin' && !selectedCard ? 'bg-[#D4FF00] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1' : 'bg-neutral-200 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-300 active:translate-y-0 active:shadow-none'
                  }`}
                >
                  ADD CARD
                </button>
                <button 
                  onClick={() => switchTab('manage')}
                  className={`shrink-0 snap-start px-6 py-3 text-xs font-black tracking-widest transition-all uppercase border-2 border-black whitespace-nowrap ${
                    activeTab === 'manage' && !selectedCard ? 'bg-[#D4FF00] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1' : 'bg-neutral-200 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-300 active:translate-y-0 active:shadow-none'
                  }`}
                >
                  MANAGE SHOP
                </button>
              </>
            )}
          </div>
        </div>

        {selectedCard ? (
          <CardPreviewPage
            card={selectedCard}
            allCards={cards}
            inCollection={collectionIds.has(selectedCard.id)}
            onToggleCollection={handleToggleCollection}
            onBack={() => setSelectedCard(null)}
            onSelectRelatedCard={(relCard) => handleSelectCard(relCard)}
            userEmail={user?.email}
          />
        ) : activeTab === 'profile' ? (
          <UserProfile
            user={user}
            cards={cards}
            collectionIds={collectionIds}
            onSelectCard={handleSelectCard}
            onNavigateTab={(tab) => switchTab(tab)}
            onToggleCollection={handleToggleCollection}
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
          <PackShop cards={cards} packs={packs} onCardsDrawn={handleCardsDrawn} />
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
                      // clear custom min/max when clicking preset
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
                    <option value="most-searched">🔥 SORT: MOST SEARCHED</option>
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

            {/* 🔥 Most Searched Cards Showcase Section (Shown in Database tab) */}
            {activeTab === 'database' && topSearchedCards.length > 0 && (
              <div className="mb-12 bg-neutral-50 border-2 border-black p-4 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b-2 border-black">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-black text-[#D4FF00] border-2 border-black">
                      <Flame size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-black flex items-center gap-2">
                        MOST SEARCHED CARDS
                        <span className="text-[10px] bg-[#D4FF00] text-black px-2 py-0.5 border border-black font-black uppercase">
                          TRENDING NOW
                        </span>
                      </h2>
                      <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                        TOP POPULAR CARDS BASED ON LIVE COLLECTOR SEARCHES
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSortBy('most-searched')}
                    className={`shrink-0 px-3 py-1.5 text-xs font-black uppercase tracking-widest border-2 border-black transition-all ${
                      sortBy === 'most-searched' 
                        ? 'bg-black text-[#D4FF00] shadow-[2px_2px_0px_0px_#D4FF00]' 
                        : 'bg-white hover:bg-[#D4FF00] text-black'
                    }`}
                  >
                    VIEW ALL TRENDING →
                  </button>
                </div>

                {/* Horizontal Scrolling Trending Shelf */}
                <div className="flex gap-4 overflow-x-auto pb-3 pt-1 snap-x [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-black">
                  {topSearchedCards.map((card, index) => (
                    <div 
                      key={`top-${card.id}`} 
                      onClick={() => handleSelectCard(card)}
                      className="shrink-0 w-36 sm:w-44 bg-white border-2 border-black p-2.5 cursor-pointer hover:border-[#D4FF00] hover:-translate-y-1 transition-all group shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <div className="relative aspect-[750/1050] bg-neutral-100 border border-black overflow-hidden mb-2">
                        <img src={card.imageUrl} alt={card.player} className="w-full h-full object-cover" />
                        <div className="absolute top-1 left-1 bg-black text-[#D4FF00] text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 border border-black">
                          #{index + 1} 🔥
                        </div>
                      </div>
                      <div className="text-[9px] text-neutral-500 font-black uppercase truncate">{card.team}</div>
                      <div className="text-xs sm:text-sm font-black text-black uppercase truncate group-hover:text-[#668000]">{card.player}</div>
                      <div className="flex items-center justify-between mt-1 text-[10px] font-black">
                        <span className="text-black">{formatCurrency(card.currentPrice)}</span>
                        <span className="text-[9px] text-neutral-600 bg-neutral-200 px-1 py-0.2">
                          {card.searchCount} {card.searchCount === 1 ? 'SEARCH' : 'SEARCHES'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab Header Info */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-black pb-4 gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter text-black">
                  {activeTab === 'database' ? 'CARD DATABASE' : 'MY FAVORITES'}
                </h1>
                <p className="text-neutral-500 mt-2 text-xs font-black uppercase tracking-widest">
                  {activeTab === 'database' 
                    ? `SHOWING ${sortedCards.length} OF ${cards.filter(c => !!c.imageUrl).length} CARDS${sortBy === 'most-searched' ? ' • RANKED BY POPULARITY 🔥' : ''}` 
                    : `YOU OWN ${collectionIds.size} CARDS VALUED AT ${formatCurrency(collectionValue)}.`
                  }
                </p>
              </div>

              {sortBy === 'most-searched' && (
                <div className="bg-black text-[#D4FF00] px-3 py-1.5 text-xs font-black uppercase tracking-widest border-2 border-black flex items-center gap-1.5 self-start sm:self-auto">
                  <Flame size={14} /> SORTED BY MOST SEARCHED
                </div>
              )}
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
                    inCollection={collectionIds.has(card.id)}
                    onClick={(c) => handleSelectCard(c)} 
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-black bg-neutral-100">
                <WalletCards size={48} className="text-black mb-6" />
                <h3 className="text-2xl font-black text-black mb-4 uppercase tracking-widest">NO CARDS FOUND</h3>
                <p className="text-neutral-500 max-w-md text-xs font-black uppercase tracking-widest mb-6">
                  {activeTab === 'collection' 
                    ? (user ? "YOU HAVEN'T ADDED ANY CARDS TO YOUR COLLECTION YET. BROWSE THE DATABASE TO START COLLECTING." : "PLEASE SIGN IN TO VIEW YOUR COLLECTION.")
                    : "NO CARDS MATCH YOUR SEARCH OR PRICE CRITERIA."}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="bg-black text-[#D4FF00] border-2 border-black px-6 py-3 font-black text-xs uppercase tracking-widest hover:bg-neutral-800 shadow-[4px_4px_0px_0px_#D4FF00]"
                  >
                    CLEAR ALL FILTERS
                  </button>
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
    </div>
  );
}
