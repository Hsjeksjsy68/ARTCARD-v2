import React, { useState, useEffect } from 'react';
import { FootballCard, Pack } from '../types';
import { 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Search, 
  Plus, 
  Image as ImageIcon, 
  AlertTriangle, 
  Users, 
  Wallet, 
  PackageCheck, 
  History, 
  Layers, 
  Eye, 
  Minus, 
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Upload,
  Tag,
  Palette,
  PackageOpen,
  CheckSquare,
  Square
} from 'lucide-react';
import { db, doc, deleteDoc, updateDoc, setDoc, collection, getDocs, onSnapshot, User } from '../lib/firebase';

import { formatCurrency, getDefaultStock, getDefaultMaxSupply } from '../lib/utils';
import { cardsDatabase } from '../data';

interface ManageShopProps {
  cards: FootballCard[];
  packs: Pack[];
  themes: any[];
}

interface UserRecord {
  id: string;
  email: string;
  walletBalance?: number;
  collectionIds?: string[];
}

interface TransactionRecord {
  id: string;
  userId: string;
  userEmail?: string;
  type: string;
  amount: number;
  description: string;
  timestamp: number;
  paymentMethod?: string;
}

export function ManageShop({ cards, packs, themes }: ManageShopProps) {
  const [activeTab, setActiveTab] = useState<'cards' | 'inventory' | 'packs' | 'transactions'>('cards');
  
  // Cards State
  const [editingCard, setEditingCard] = useState<FootballCard | null>(null);
  const [editForm, setEditForm] = useState<Partial<FootballCard>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [filterTeam, setFilterTeam] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSet, setFilterSet] = useState('');
  const [filterRarity, setFilterRarity] = useState('');

  // Packs State
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [packEditForm, setPackEditForm] = useState<Partial<Pack>>({});
  const [customEditionInput, setCustomEditionInput] = useState('');
  
  // User Inventory Tracker State
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [cardHoldersSearch, setCardHoldersSearch] = useState('');
  const [selectedCardForHolders, setSelectedCardForHolders] = useState<FootballCard | null>(null);

  // Transactions State
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Fetch Users for Inventory Tracking
  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchUsers();
    } else if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: UserRecord[] = snap.docs.map(d => ({
        id: d.id,
        email: d.data().email || 'Anonymous Collector',
        walletBalance: d.data().walletBalance || 0,
        collectionIds: d.data().collectionIds || []
      }));
      setUsersList(list);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchTransactions = async () => {
    setIsLoadingTx(true);
    try {
      const snap = await getDocs(collection(db, 'transactions'));
      const list: TransactionRecord[] = snap.docs.map(d => ({
        id: d.id,
        userId: d.data().userId,
        userEmail: d.data().userEmail || 'Unknown User',
        type: d.data().type || 'tx',
        amount: d.data().amount || 0,
        description: d.data().description || 'Transaction',
        timestamp: d.data().timestamp || Date.now(),
        paymentMethod: d.data().paymentMethod
      })).sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(list);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setIsLoadingTx(false);
    }
  };

  const uniqueTeams = Array.from(new Set(cards.map(c => c.team).filter(Boolean))).sort();
  const uniquePositions = Array.from(new Set(cards.map(c => c.position).filter(Boolean))).sort();
  const uniqueYears = Array.from(new Set(cards.map(c => c.year).filter(Boolean))).sort((a, b) => b - a);
  const uniqueSets = Array.from(new Set(cards.map(c => c.set).filter(Boolean))).sort();
  const uniqueRarities = Array.from(new Set(cards.map(c => c.rarity).filter(Boolean))).sort();

  const filteredCards = cards.filter(card => {
    const matchesSearch = (card.player || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (card.team || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (card.set || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTeam = filterTeam ? card.team === filterTeam : true;
    const matchesPosition = filterPosition ? card.position === filterPosition : true;
    const matchesYear = filterYear ? card.year?.toString() === filterYear : true;
    const matchesSet = filterSet ? card.set === filterSet : true;
    const matchesRarity = filterRarity ? card.rarity === filterRarity : true;

    return matchesSearch && matchesTeam && matchesPosition && matchesYear && matchesSet && matchesRarity;
  });

  // Default packs if none exist
  const defaultPacks: Pack[] = [
    { id: 'starter', name: 'STARTER PACK', size: 3, price: 250, color: 'bg-white', rarityOdds: { base: 80, silver: 18, gold: 2, shield: 0 } },
    { id: 'pro', name: 'PRO PACK', size: 5, price: 500, color: 'bg-[#D4FF00]', rarityOdds: { base: 60, silver: 30, gold: 9, shield: 1 } },
    { id: 'elite', name: 'ELITE PACK', size: 7, price: 1200, color: 'bg-black text-white', rarityOdds: { base: 40, silver: 40, gold: 17, shield: 3 } }
  ];

  const currentPacks = packs.length > 0 ? packs : defaultPacks;

  const handleDeleteCard = async (card: FootballCard) => {
    if (window.confirm(`Are you sure you want to delete ${card.player}?`)) {
      try {
        await deleteDoc(doc(db, "cards", card.id));
        alert("Card deleted successfully.");
      } catch (error) {
        console.error("Error deleting card:", error);
        alert("Failed to delete card.");
      }
    }
  };

  const handleEditCard = (card: FootballCard) => {
    setEditingCard(card);
    setEditForm({
      ...card,
      stock: getDefaultStock(card),
      maxSupply: getDefaultMaxSupply(card)
    });
  };

  const handleQuickStockAdjust = async (card: FootballCard, delta: number) => {
    const currentStock = getDefaultStock(card);
    const newStock = Math.max(0, currentStock + delta);
    try {
      await updateDoc(doc(db, "cards", card.id), {
        stock: newStock
      });
    } catch (err) {
      console.error("Stock update failed:", err);
    }
  };

  const handleSaveCard = async () => {
    if (!editingCard) return;
    setIsSaving(true);
    try {
      const cardRef = doc(db, "cards", editingCard.id);
      const updatedForm = { ...editForm };
      updatedForm.currentPrice = Number(updatedForm.currentPrice);
      updatedForm.year = Number(updatedForm.year);
      updatedForm.stock = Number(updatedForm.stock);
      updatedForm.maxSupply = Number(updatedForm.maxSupply);
      
      if (updatedForm.currentPrice !== editingCard.currentPrice) {
        const newHistory = [...(updatedForm.priceHistory || [])];
        const nowIso = new Date().toISOString();
        newHistory.push({
          date: nowIso,
          price: updatedForm.currentPrice
        });
        updatedForm.priceHistory = newHistory;
      }
      
      await updateDoc(cardRef, updatedForm);
      setEditingCard(null);
    } catch (error) {
      console.error("Error updating card:", error);
      alert("Failed to update card.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeCard = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: name === 'year' || name === 'currentPrice' || name === 'stock' || name === 'maxSupply' 
        ? Number(value) 
        : value
    }));
  };

  // Pack Handlers
  const handleEditPack = (pack: Pack) => {
    setEditingPack(pack);
    setPackEditForm({
      ...pack,
      editions: pack.editions || []
    });
  };

  const handleCreatePack = () => {
    const newPack: Pack = {
      id: `pack_${Date.now()}`,
      name: 'NEW SPECIAL PACK',
      size: 5,
      price: 500,
      color: 'bg-[#D4FF00] text-black',
      editions: [],
      badgeText: '',
      description: 'Exclusive pack containing collectible cards with tailored drop odds.',
      rarityOdds: { base: 60, silver: 30, gold: 9, shield: 1 }
    };
    setEditingPack(newPack);
    setPackEditForm(newPack);
  };

  const handleTogglePackEdition = (editionName: string) => {
    setPackEditForm(prev => {
      const current = prev.editions || [];
      let next: string[];
      if (current.includes(editionName)) {
        next = current.filter(e => e !== editionName);
      } else {
        next = [...current, editionName];
      }
      return { ...prev, editions: next };
    });
  };

  const handleAddCustomEdition = () => {
    const trimmed = customEditionInput.trim();
    if (!trimmed) return;
    setPackEditForm(prev => {
      const current = prev.editions || [];
      if (!current.includes(trimmed)) {
        return { ...prev, editions: [...current, trimmed] };
      }
      return prev;
    });
    setCustomEditionInput('');
  };

  const handlePosterFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("Image size should be less than 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPackEditForm(prev => ({
          ...prev,
          coverPhotoUrl: result
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const packThemes = [
    { id: 'bg-[#D4FF00] text-black', name: 'Neon Lime' },
    { id: 'bg-black text-white', name: 'Midnight Black' },
    { id: 'bg-white text-black', name: 'Clean White' },
    { id: 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 text-black', name: 'Gold Foil' },
    { id: 'bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 text-white', name: 'Sapphire Frost' },
    { id: 'bg-gradient-to-br from-emerald-600 via-teal-800 to-slate-900 text-white', name: 'Emerald Cyber' },
    { id: 'bg-gradient-to-br from-purple-700 via-pink-600 to-rose-900 text-white', name: 'Holographic Violet' },
    { id: 'bg-gradient-to-br from-red-600 via-rose-700 to-black text-white', name: 'Crimson Fire' }
  ];

  const presetPosters = [
    { name: 'Champions Gold', url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop' },
    { name: 'Sapphire Stadium', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop' },
    { name: 'Neon Striker', url: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=800&auto=format&fit=crop' },
    { name: 'Arena Lights', url: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?q=80&w=800&auto=format&fit=crop' },
    { name: 'Obsidian Shield', url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop' }
  ];

  const allAvailableEditions = Array.from(new Set([
    ...cards.map(c => c.edition).filter(Boolean),
    '1st Edition',
    'Base Edition',
    'Sapphire Edition',
    'Emerald Edition',
    'Signature Edition',
    'Chrome Edition',
    'Golden Era',
    'World Cup Edition'
  ])).sort();

  const handleSavePack = async () => {
    if (!editingPack) return;
    setIsSaving(true);
    try {
      const packRef = doc(db, "packs", editingPack.id);
      await setDoc(packRef, packEditForm, { merge: true });
      setEditingPack(null);
    } catch (error) {
      console.error("Error updating pack:", error);
      alert("Failed to update pack.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePack = async (pack: Pack) => {
    if (window.confirm(`Are you sure you want to delete ${pack.name}?`)) {
      try {
        await deleteDoc(doc(db, "packs", pack.id));
      } catch (error) {
        console.error("Error deleting pack:", error);
        alert("Failed to delete pack.");
      }
    }
  };

  const handleChangePack = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPackEditForm(prev => ({
      ...prev,
      [name]: name === 'size' || name === 'price' ? Number(value) : value
    }));
  };

  const handlePackOddsChange = (rarity: 'base' | 'silver' | 'gold' | 'shield', value: number) => {
    setPackEditForm(prev => ({
      ...prev,
      rarityOdds: {
        ...(prev.rarityOdds || { base: 60, silver: 30, gold: 9, shield: 1 }),
        [rarity]: Number(value)
      }
    }));
  };

  const handleResetDatabase = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    
    setIsResetting(true);
    try {
      // 1. Delete all cards
      const cardsSnap = await getDocs(collection(db, 'cards'));
      const cardDeletes = cardsSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(cardDeletes);
      
      // 2. Insert default cards
      const cardAdds = cardsDatabase.map(card => {
        const { id, ...cardData } = card;
        return setDoc(doc(db, 'cards', id), {
          ...cardData,
          stock: getDefaultStock(card),
          maxSupply: getDefaultMaxSupply(card)
        });
      });
      await Promise.all(cardAdds);
      
      // 3. Delete all packs
      const packsSnap = await getDocs(collection(db, 'packs'));
      const packDeletes = packsSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(packDeletes);
      
      // 4. Insert default packs
      const defaultPacks = [
        { id: 'starter', name: 'STARTER PACK', price: 250, size: 3, color: 'bg-white', rarityOdds: { base: 80, silver: 18, gold: 2, shield: 0 } },
        { id: 'pro', name: 'PRO PACK', price: 500, size: 5, color: 'bg-[#D4FF00]', rarityOdds: { base: 60, silver: 30, gold: 9, shield: 1 } },
        { id: 'elite', name: 'ELITE PACK', price: 1200, size: 7, color: 'bg-black text-white', rarityOdds: { base: 40, silver: 40, gold: 17, shield: 3 } }
      ];
      const packAdds = defaultPacks.map(pack => setDoc(doc(db, 'packs', pack.id), pack));
      await Promise.all(packAdds);
      
      alert("Database reset successfully with fresh stock & packs.");
      setConfirmReset(false);
    } catch (err) {
      console.error(err);
      alert("Failed to reset database.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Danger Zone Reset Notice */}
      <div className="bg-red-50 border-2 border-red-500 p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[6px_6px_0px_0px_rgba(239,68,68,1)]">
        <div>
          <h3 className="text-xl font-black text-red-600 uppercase tracking-tighter flex items-center gap-2">
            <AlertTriangle size={24} /> Admin Database Controls
          </h3>
          <p className="text-red-700 font-bold text-xs tracking-widest uppercase mt-1">
            Reset cards, supply limits, and packs to standard demo state. User accounts and wallets are preserved.
          </p>
        </div>
        <button
          onClick={handleResetDatabase}
          disabled={isResetting}
          className={`shrink-0 px-6 py-3 font-black uppercase tracking-widest border-2 border-red-600 transition-colors text-xs ${
            confirmReset ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-white text-red-600 hover:bg-red-50'
          }`}
        >
          {isResetting ? 'Resetting...' : confirmReset ? 'CONFIRM RESET DB?' : 'RESET DATABASE'}
        </button>
      </div>

      {/* Main Admin Card */}
      <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
        {/* Navigation Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b-2 border-black pb-6">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">CONTROL ROOM & INVENTORY</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mt-0.5">
              DATABASE STOCK CONTROL & USER HOLDINGS AUDIT
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-black transition-colors ${
                activeTab === 'cards' ? 'bg-black text-[#D4FF00]' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              CARDS & STOCK ({cards.length})
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-black transition-colors flex items-center gap-1.5 ${
                activeTab === 'inventory' ? 'bg-black text-[#D4FF00]' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <Users size={14} /> USER HOLDINGS
            </button>
            <button
              onClick={() => setActiveTab('packs')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-black transition-colors ${
                activeTab === 'packs' ? 'bg-black text-[#D4FF00]' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              PACK CONFIG ({currentPacks.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-black transition-colors flex items-center gap-1.5 ${
                activeTab === 'transactions' ? 'bg-black text-[#D4FF00]' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <History size={14} /> WALLET LOGS
            </button>
          </div>
        </div>
        
        {/* TAB 1: CARDS & STOCK MANAGEMENT */}
        {activeTab === 'cards' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-widest">CARDS IN DATABASE</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Control active market prices, stock limitation, and max supply.
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-neutral-500" />
                </div>
                <input
                  type="text"
                  placeholder="SEARCH CARDS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 bg-neutral-100 border-2 border-black py-2 pl-10 pr-4 text-xs font-black text-black placeholder-neutral-500 focus:outline-none focus:bg-white transition-colors uppercase tracking-widest"
                />
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2">
              <select 
                value={filterTeam} 
                onChange={(e) => setFilterTeam(e.target.value)}
                className="bg-neutral-100 border-2 border-black py-1.5 px-3 text-xs font-black text-black focus:outline-none focus:bg-white transition-colors uppercase tracking-widest"
              >
                <option value="">ALL TEAMS</option>
                {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select 
                value={filterPosition} 
                onChange={(e) => setFilterPosition(e.target.value)}
                className="bg-neutral-100 border-2 border-black py-1.5 px-3 text-xs font-black text-black focus:outline-none focus:bg-white transition-colors uppercase tracking-widest"
              >
                <option value="">ALL POSITIONS</option>
                {uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select 
                value={filterRarity} 
                onChange={(e) => setFilterRarity(e.target.value)}
                className="bg-neutral-100 border-2 border-black py-1.5 px-3 text-xs font-black text-black focus:outline-none focus:bg-white transition-colors uppercase tracking-widest"
              >
                <option value="">ALL RARITIES</option>
                {uniqueRarities.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto border-2 border-black">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-neutral-100 text-[10px] font-black uppercase tracking-widest">
                    <th className="p-3">CARD</th>
                    <th className="p-3">TEAM / POS</th>
                    <th className="p-3">RARITY</th>
                    <th className="p-3">PRICE</th>
                    <th className="p-3 text-center">DATABASE STOCK / SUPPLY</th>
                    <th className="p-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black text-xs font-bold">
                  {filteredCards.map((card) => {
                    const stock = getDefaultStock(card);
                    const maxSupply = getDefaultMaxSupply(card);
                    const isSoldOut = stock <= 0;

                    return (
                      <tr key={card.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="p-3 flex items-center gap-3">
                          <div className="w-10 h-14 bg-neutral-200 border border-black overflow-hidden shrink-0 flex items-center justify-center">
                            {card.imageUrl ? (
                              <img src={card.imageUrl} alt={card.player} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={16} className="text-neutral-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-black uppercase">{card.player}</div>
                            <div className="text-[10px] text-neutral-500 font-mono">#{card.cardNumber} • {card.year}</div>
                          </div>
                        </td>
                        <td className="p-3 uppercase">
                          <div>{card.team}</div>
                          <div className="text-[10px] text-neutral-500">{card.position}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase border border-black ${
                            card.rarity === '1-of-1 Shield' ? 'bg-black text-[#D4FF00]' :
                            card.rarity === 'Gold Autograph' ? 'bg-amber-300 text-black' :
                            card.rarity === 'Silver Refractor' ? 'bg-slate-200 text-black' : 'bg-white text-black'
                          }`}>
                            {card.rarity}
                          </span>
                        </td>
                        <td className="p-3 font-black text-sm">
                          {formatCurrency(card.currentPrice)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-2 bg-neutral-100 border border-black p-1">
                            <button
                              onClick={() => handleQuickStockAdjust(card, -1)}
                              disabled={stock <= 0}
                              className="w-6 h-6 bg-white hover:bg-black hover:text-white border border-black flex items-center justify-center font-black disabled:opacity-30"
                            >
                              -
                            </button>
                            <span className={`font-mono font-black text-xs px-2 ${isSoldOut ? 'text-red-600' : 'text-black'}`}>
                              {stock} / {maxSupply}
                            </span>
                            <button
                              onClick={() => handleQuickStockAdjust(card, 1)}
                              className="w-6 h-6 bg-white hover:bg-black hover:text-white border border-black flex items-center justify-center font-black"
                            >
                              +
                            </button>
                          </div>
                          {isSoldOut && (
                            <span className="block text-[8px] font-black uppercase text-red-600 mt-1">
                              OUT OF STOCK
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditCard(card)}
                              className="p-1.5 bg-neutral-100 hover:bg-black hover:text-white border border-black transition-colors"
                              title="Edit Full Card Details"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCard(card)}
                              className="p-1.5 bg-red-100 hover:bg-red-600 hover:text-white border border-red-600 text-red-600 transition-colors"
                              title="Delete Card"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: USER INVENTORY & CARD OWNERSHIP TRACKER */}
        {activeTab === 'inventory' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-widest">COLLECTOR AUDIT & HOLDINGS</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Inspect which users own which cards, and track how many copies are held across the platform.
                </p>
              </div>
              <button
                onClick={fetchUsers}
                className="flex items-center gap-2 bg-neutral-100 hover:bg-black hover:text-white text-black border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors"
              >
                <RefreshCw size={14} className={isLoadingUsers ? 'animate-spin' : ''} /> REFRESH USERS
              </button>
            </div>

            {/* Quick Card Search Tool: "Who owns this card?" */}
            <div className="bg-neutral-50 border-2 border-black p-5 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-neutral-600 flex items-center gap-2">
                <Search size={16} /> CHECK CARD CIRCULATION & OWNERS
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={selectedCardForHolders?.id || ''}
                  onChange={(e) => {
                    const found = cards.find(c => c.id === e.target.value);
                    setSelectedCardForHolders(found || null);
                  }}
                  className="w-full bg-white border-2 border-black p-2.5 text-xs font-black uppercase"
                >
                  <option value="">-- SELECT A CARD TO SEE ALL CURRENT OWNERS --</option>
                  {cards.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.player} ({c.team} • {c.rarity} • {formatCurrency(c.currentPrice)})
                    </option>
                  ))}
                </select>

                {selectedCardForHolders && (
                  <div className="bg-[#D4FF00]/20 border-2 border-black p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-black uppercase block">{selectedCardForHolders.player}</span>
                      <span className="text-[10px] text-neutral-600 font-bold uppercase">
                        REMAINING SHOP STOCK: {getDefaultStock(selectedCardForHolders)} / {getDefaultMaxSupply(selectedCardForHolders)}
                      </span>
                    </div>
                    <span className="bg-black text-[#D4FF00] px-2.5 py-1 text-xs font-black">
                      {usersList.filter(u => u.collectionIds?.includes(selectedCardForHolders.id)).length} USERS HOLD THIS CARD
                    </span>
                  </div>
                )}
              </div>

              {/* Display Holders of Selected Card */}
              {selectedCardForHolders && (
                <div className="border-t-2 border-black pt-4">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                    REGISTERED USERS WITH THIS CARD IN VAULT:
                  </h5>
                  {(() => {
                    const holders = usersList.filter(u => u.collectionIds?.includes(selectedCardForHolders.id));
                    if (holders.length === 0) {
                      return <p className="text-xs font-bold text-neutral-500">No users currently own this card in their digital vault.</p>;
                    }
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {holders.map(u => (
                          <div key={u.id} className="bg-white border-2 border-black p-2.5 flex items-center justify-between">
                            <div>
                              <p className="font-black text-xs uppercase truncate">{u.email}</p>
                              <p className="text-[9px] text-neutral-500 font-mono">UID: {u.id.slice(0, 8)}...</p>
                            </div>
                            <span className="text-[9px] bg-[#D4FF00] font-black px-2 py-0.5 border border-black">
                              OWNED
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* All Users Master Table */}
            <div className="overflow-x-auto border-2 border-black">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-neutral-100 text-[10px] font-black uppercase tracking-widest">
                    <th className="p-3">USER / COLLECTOR</th>
                    <th className="p-3">WALLET BALANCE</th>
                    <th className="p-3">TOTAL CARDS IN VAULT</th>
                    <th className="p-3 text-right">INSPECT COLLECTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black text-xs font-bold">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-neutral-500">
                        {isLoadingUsers ? 'Loading registered collectors...' : 'No users found in database yet.'}
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => {
                      const userCardCount = u.collectionIds?.length || 0;
                      return (
                        <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="p-3">
                            <div className="font-black text-sm uppercase">{u.email}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">ID: {u.id}</div>
                          </td>
                          <td className="p-3 font-black text-black">
                            <span className="bg-[#D4FF00]/40 px-2 py-1 border border-black">
                              {formatCurrency(u.walletBalance || 0)}
                            </span>
                          </td>
                          <td className="p-3 font-black text-sm">
                            {userCardCount} {userCardCount === 1 ? 'Card' : 'Cards'}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedUser(u)}
                              className="px-3 py-1.5 bg-black text-[#D4FF00] hover:bg-[#D4FF00] hover:text-black border-2 border-black text-xs font-black uppercase tracking-wider transition-colors"
                            >
                              VIEW ({userCardCount})
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal: View Specific User's Collection */}
            {selectedUser && (
              <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
                <div className="bg-white w-full max-w-4xl border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] my-8">
                  <div className="bg-black text-white p-5 flex items-center justify-between border-b-4 border-black">
                    <div>
                      <h3 className="text-xl font-black uppercase text-[#D4FF00]">
                        COLLECTOR VAULT: {selectedUser.email}
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        WALLET BALANCE: {formatCurrency(selectedUser.walletBalance || 0)} • {selectedUser.collectionIds?.length || 0} CARDS OWNED
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="bg-white text-black hover:bg-[#D4FF00] p-1.5 border-2 border-black font-black"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4">
                    {(!selectedUser.collectionIds || selectedUser.collectionIds.length === 0) ? (
                      <div className="py-12 text-center text-neutral-500 font-black uppercase">
                        This user does not have any cards in their vault yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {selectedUser.collectionIds.map(cId => {
                          const cardData = cards.find(c => c.id === cId);
                          if (!cardData) {
                            return (
                              <div key={cId} className="border-2 border-black p-3 bg-neutral-100 text-xs">
                                <span className="font-mono text-neutral-500">ID: {cId}</span>
                                <p className="font-black text-neutral-400 mt-1">Card Removed or Custom</p>
                              </div>
                            );
                          }

                          return (
                            <div key={cId} className="border-2 border-black p-2 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col">
                              <div className="aspect-[750/1050] bg-neutral-100 border border-black mb-2 overflow-hidden">
                                {cardData.imageUrl ? (
                                  <img src={cardData.imageUrl} alt={cardData.player} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                                    <Sparkles size={24} className="text-neutral-500" />
                                  </div>
                                )}
                              </div>
                              <span className="text-[9px] font-black uppercase text-neutral-500">{cardData.team}</span>
                              <h5 className="text-xs font-black uppercase truncate">{cardData.player}</h5>
                              <div className="mt-auto pt-2 flex items-center justify-between border-t border-neutral-200 text-[10px] font-black">
                                <span className="text-neutral-600">{cardData.rarity}</span>
                                <span className="text-black">{formatCurrency(cardData.currentPrice)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-neutral-100 border-t-2 border-black text-right">
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="bg-black text-white hover:bg-neutral-800 px-6 py-2 text-xs font-black uppercase tracking-widest border-2 border-black"
                    >
                      CLOSE AUDIT
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PACK CONFIGURATION */}
        {activeTab === 'packs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-widest">MANAGE PACK CONFIGURATIONS</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Decide card editions, customize pack poster artwork, set prices, and configure drop odds.
                </p>
              </div>
              <button
                onClick={handleCreatePack}
                className="flex items-center justify-center gap-2 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <Plus size={16} /> ADD NEW PACK
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentPacks.map((pack) => {
                const odds = pack.rarityOdds || { base: 60, silver: 30, gold: 9, shield: 1 };
                const packEditions = pack.editions || [];
                const isAllEditions = packEditions.length === 0 || packEditions.includes('ALL');
                
                // Calculate how many cards in database match this pack's editions
                const matchingCardsCount = isAllEditions 
                  ? cards.length 
                  : cards.filter(c => c.edition && packEditions.includes(c.edition)).length;

                return (
                  <div 
                    key={pack.id} 
                    className="border-4 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between relative group"
                  >
                    <div>
                      {/* Pack Badge & Price */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-0.5 border border-black">
                            {pack.size} CARDS
                          </span>
                          {pack.badgeText && (
                            <span className="text-[9px] font-black uppercase bg-[#D4FF00] text-black px-2 py-0.5 border border-black animate-pulse">
                              {pack.badgeText}
                            </span>
                          )}
                        </div>
                        <span className="text-xl font-black">{formatCurrency(pack.price)}</span>
                      </div>

                      {/* Poster Thumbnail & Name */}
                      <div className="flex gap-4 items-start mb-4">
                        {pack.coverPhotoUrl ? (
                          <div className="w-20 aspect-[750/1050] shrink-0 border-2 border-black bg-neutral-100 overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <img 
                              src={pack.coverPhotoUrl} 
                              alt={pack.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                            />
                          </div>
                        ) : (
                          <div className="w-20 aspect-[750/1050] shrink-0 border-2 border-black bg-neutral-100 flex flex-col items-center justify-center text-neutral-400">
                            <PackageOpen size={28} />
                            <span className="text-[7px] font-black uppercase mt-1">NO POSTER</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h4 className="text-xl font-black uppercase tracking-tight truncate">{pack.name}</h4>
                          <p className="text-[11px] font-bold text-neutral-600 line-clamp-2 mt-1">
                            {pack.description || 'Standard digital collectible pack.'}
                          </p>
                        </div>
                      </div>

                      {/* Decided Editions Badge */}
                      <div className="bg-neutral-50 border-2 border-black p-2.5 mb-3 space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Tag size={10} /> INCLUDED EDITIONS:
                          </span>
                          <span className="text-black font-mono">
                            {matchingCardsCount} cards eligible
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {isAllEditions ? (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-black text-[#D4FF00] border border-black">
                              ALL EDITIONS (FULL POOL)
                            </span>
                          ) : (
                            packEditions.map(ed => (
                              <span key={ed} className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-[#D4FF00] text-black border border-black">
                                {ed}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                      
                      {/* Odds Pill */}
                      <div className="bg-neutral-100 p-2.5 border border-black text-[10px] font-black space-y-1">
                        <div className="text-neutral-500 text-[9px]">DROP RATE ODDS:</div>
                        <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                          <div>BASE: {odds.base}%</div>
                          <div>SILVER: {odds.silver}%</div>
                          <div>GOLD: {odds.gold}%</div>
                          <div className="text-lime-700">1-OF-1: {odds.shield}%</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t-2 border-black mt-4">
                      <button
                        onClick={() => handleEditPack(pack)}
                        className="flex-1 py-2 bg-neutral-100 hover:bg-[#D4FF00] hover:text-black border-2 border-black font-black uppercase text-xs transition-colors flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <Edit2 size={13} /> CONFIGURE
                      </button>
                      <button
                        onClick={() => handleDeletePack(pack)}
                        className="p-2 bg-red-100 hover:bg-red-600 hover:text-white border-2 border-red-600 text-red-600 transition-colors"
                        title="Delete Pack"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: TRANSACTIONS & WALLET ACTIVITY */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase tracking-widest">WALLET & SHOP TRANSACTIONS</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Real-time ledger of wallet top-ups, pack purchases, and database card orders.
                </p>
              </div>
              <button
                onClick={fetchTransactions}
                className="flex items-center gap-2 bg-neutral-100 hover:bg-black hover:text-white text-black border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors"
              >
                <RefreshCw size={14} className={isLoadingTx ? 'animate-spin' : ''} /> REFRESH LEDGER
              </button>
            </div>

            <div className="overflow-x-auto border-2 border-black">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-neutral-100 text-[10px] font-black uppercase tracking-widest">
                    <th className="p-3">DATE / TIME</th>
                    <th className="p-3">USER</th>
                    <th className="p-3">TYPE</th>
                    <th className="p-3">DETAILS</th>
                    <th className="p-3 text-right">AMOUNT (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black text-xs font-bold">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-neutral-500">
                        {isLoadingTx ? 'Loading transaction logs...' : 'No transactions recorded yet.'}
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-neutral-50">
                        <td className="p-3 text-[10px] font-mono text-neutral-500">
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3 font-black uppercase">
                          {tx.userEmail}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase border border-black ${
                            tx.type === 'top_up' ? 'bg-emerald-200 text-emerald-950' : 'bg-[#D4FF00] text-black'
                          }`}>
                            {tx.type === 'top_up' ? 'TOP UP' : 'PURCHASE'}
                          </span>
                        </td>
                        <td className="p-3 text-neutral-700">
                          {tx.description}
                        </td>
                        <td className={`p-3 text-right font-black text-sm ${tx.type === 'top_up' ? 'text-emerald-700' : 'text-black'}`}>
                          {tx.type === 'top_up' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Card Modal */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] my-8">
            <div className="bg-black text-white p-5 flex items-center justify-between border-b-4 border-black">
              <h3 className="text-xl font-black uppercase text-[#D4FF00]">
                EDIT CARD & SUPPLY
              </h3>
              <button
                onClick={() => setEditingCard(null)}
                className="bg-white text-black hover:bg-[#D4FF00] p-1.5 border-2 border-black font-black"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveCard(); }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">PLAYER NAME</label>
                  <input
                    type="text"
                    name="player"
                    value={editForm.player || ''}
                    onChange={handleChangeCard}
                    className="w-full bg-neutral-50 border-2 border-black p-2 font-black text-xs uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">TEAM</label>
                  <input
                    type="text"
                    name="team"
                    value={editForm.team || ''}
                    onChange={handleChangeCard}
                    className="w-full bg-neutral-50 border-2 border-black p-2 font-black text-xs uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">MARKET PRICE (৳)</label>
                  <input
                    type="number"
                    name="currentPrice"
                    value={editForm.currentPrice || 0}
                    onChange={handleChangeCard}
                    className="w-full bg-neutral-50 border-2 border-black p-2 font-black text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">RARITY</label>
                  <select
                    name="rarity"
                    value={editForm.rarity || 'Base'}
                    onChange={handleChangeCard}
                    className="w-full bg-neutral-50 border-2 border-black p-2 font-black text-xs uppercase"
                  >
                    <option value="Base">Base</option>
                    <option value="Silver Refractor">Silver Refractor</option>
                    <option value="Gold Autograph">Gold Autograph</option>
                    <option value="1-of-1 Shield">1-of-1 Shield</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">AVAILABLE STOCK</label>
                  <input
                    type="number"
                    min="0"
                    name="stock"
                    value={editForm.stock ?? 50}
                    onChange={handleChangeCard}
                    className="w-full bg-neutral-50 border-2 border-black p-2 font-black text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">MAX PRINT SUPPLY</label>
                  <input
                    type="number"
                    min="1"
                    name="maxSupply"
                    value={editForm.maxSupply ?? 50}
                    onChange={handleChangeCard}
                    className="w-full bg-neutral-50 border-2 border-black p-2 font-black text-xs"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="flex-1 py-3 bg-white border-2 border-black font-black uppercase text-xs"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] border-2 border-black font-black uppercase text-xs transition-colors"
                >
                  {isSaving ? 'SAVING...' : 'SAVE CARD CHANGES'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Pack Modal */}
      {editingPack && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] my-8 max-h-[90vh] flex flex-col">
            <div className="bg-black text-white p-5 flex items-center justify-between border-b-4 border-black shrink-0">
              <div>
                <h3 className="text-xl font-black uppercase text-[#D4FF00] flex items-center gap-2">
                  <PackageOpen size={22} /> CONFIGURE PACK & EDITIONS
                </h3>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Decide card editions, edit pack poster artwork, set pricing and drop odds.
                </p>
              </div>
              <button
                onClick={() => setEditingPack(null)}
                className="bg-white text-black hover:bg-[#D4FF00] p-1.5 border-2 border-black font-black transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSavePack(); }} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Section 1: Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-black pb-1.5">
                  <span className="bg-black text-white text-[10px] font-black px-2 py-0.5 uppercase">STEP 1</span>
                  <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900">GENERAL PACK INFO</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-neutral-600 mb-1">PACK NAME</label>
                    <input
                      type="text"
                      name="name"
                      value={packEditForm.name || ''}
                      onChange={handleChangePack}
                      className="w-full bg-neutral-50 border-2 border-black p-2 font-black text-xs uppercase"
                      placeholder="e.g. 1ST EDITION DIAMOND PACK"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-600 mb-1">BADGE / RIBBON TEXT (OPTIONAL)</label>
                    <input
                      type="text"
                      name="badgeText"
                      value={packEditForm.badgeText || ''}
                      onChange={handleChangePack}
                      className="w-full bg-neutral-50 border-2 border-black p-2 font-black text-xs uppercase"
                      placeholder="e.g. 🔥 BEST VALUE / ⚡ EXCLUSIVE"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-600 mb-1">PRICE (৳)</label>
                    <input
                      type="number"
                      name="price"
                      value={packEditForm.price || 0}
                      onChange={handleChangePack}
                      className="w-full bg-neutral-50 border-2 border-black p-2 font-black text-xs font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-600 mb-1">CARDS PER PACK</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      name="size"
                      value={packEditForm.size || 5}
                      onChange={handleChangePack}
                      className="w-full bg-neutral-50 border-2 border-black p-2 font-black text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-600 mb-1">PACK DESCRIPTION</label>
                  <textarea
                    name="description"
                    rows={2}
                    value={packEditForm.description || ''}
                    onChange={handleChangePack}
                    className="w-full bg-neutral-50 border-2 border-black p-2 font-bold text-xs"
                    placeholder="Short description displayed on the shop card..."
                  />
                </div>
              </div>

              {/* Section 2: Card Editions Decider */}
              <div className="space-y-4 border-2 border-black p-4 bg-amber-50/50">
                <div className="flex items-center justify-between border-b border-black/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-black" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-black">
                        CARD EDITIONS DECIDER
                      </h4>
                      <p className="text-[9px] font-bold text-neutral-600">
                        Choose which card edition(s) this pack will draw from when opened.
                      </p>
                    </div>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPackEditForm(prev => ({ ...prev, editions: [] }))}
                      className={`text-[9px] font-black uppercase px-2.5 py-1 border border-black transition-colors ${
                        !packEditForm.editions || packEditForm.editions.length === 0
                          ? 'bg-black text-[#D4FF00]'
                          : 'bg-white text-black hover:bg-neutral-100'
                      }`}
                    >
                      ALL EDITIONS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!packEditForm.editions || packEditForm.editions.length === 0) {
                          setPackEditForm(prev => ({ ...prev, editions: ['1st Edition'] }));
                        }
                      }}
                      className={`text-[9px] font-black uppercase px-2.5 py-1 border border-black transition-colors ${
                        packEditForm.editions && packEditForm.editions.length > 0
                          ? 'bg-[#D4FF00] text-black font-black'
                          : 'bg-white text-black hover:bg-neutral-100'
                      }`}
                    >
                      CUSTOM EDITIONS ONLY
                    </button>
                  </div>
                </div>

                {packEditForm.editions && packEditForm.editions.length > 0 ? (
                  <div className="space-y-3">
                    <span className="block text-[9px] font-black uppercase text-neutral-600">
                      SELECT INCLUDED EDITIONS FOR THIS PACK:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {allAvailableEditions.map(ed => {
                        const isSelected = (packEditForm.editions || []).includes(ed);
                        const countInDb = cards.filter(c => c.edition === ed).length;
                        return (
                          <button
                            key={ed}
                            type="button"
                            onClick={() => handleTogglePackEdition(ed)}
                            className={`p-2 border-2 border-black text-left flex items-center justify-between transition-colors text-xs font-black uppercase ${
                              isSelected ? 'bg-black text-[#D4FF00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black hover:bg-neutral-100'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              {isSelected ? <CheckSquare size={14} className="text-[#D4FF00] shrink-0" /> : <Square size={14} className="text-neutral-400 shrink-0" />}
                              <span className="truncate">{ed}</span>
                            </div>
                            <span className={`text-[9px] font-mono shrink-0 ml-1 px-1 py-0.2 border ${isSelected ? 'border-[#D4FF00]/40 text-neutral-300' : 'border-neutral-300 text-neutral-500'}`}>
                              {countInDb}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Add Custom Edition Name */}
                    <div className="flex gap-2 pt-2 border-t border-black/10">
                      <input
                        type="text"
                        value={customEditionInput}
                        onChange={(e) => setCustomEditionInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomEdition(); } }}
                        placeholder="ADD CUSTOM EDITION NAME (e.g. WORLD CUP 2026)"
                        className="flex-1 bg-white border-2 border-black p-1.5 text-xs font-black uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomEdition}
                        className="bg-black text-[#D4FF00] hover:bg-neutral-800 px-3 py-1.5 text-xs font-black uppercase border-2 border-black shrink-0"
                      >
                        + ADD
                      </button>
                    </div>

                    {/* Eligible Cards Summary Banner */}
                    <div className="bg-white border-2 border-black p-2.5 flex items-center justify-between text-xs font-black">
                      <span className="text-neutral-700 uppercase">
                        🎯 ELIGIBLE CARDS IN DATABASE:
                      </span>
                      <span className="bg-[#D4FF00] text-black px-2 py-0.5 border border-black font-mono">
                        {cards.filter(c => c.edition && (packEditForm.editions || []).includes(c.edition)).length} CARDS MATCH
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white border-2 border-black text-xs font-bold text-neutral-700 flex items-center justify-between">
                    <span className="uppercase">🌐 FULL DATABASE POOL (NO RESTRICTIONS):</span>
                    <span className="font-mono bg-black text-[#D4FF00] px-2 py-0.5 border border-black text-[11px] font-black">
                      {cards.length} TOTAL CARDS AVAILABLE
                    </span>
                  </div>
                )}
              </div>

              {/* Section 3: Pack Poster & Visual Customization */}
              <div className="space-y-4 border-2 border-black p-4 bg-blue-50/40">
                <div className="flex items-center gap-2 border-b border-black/20 pb-2">
                  <ImageIcon size={16} className="text-black" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-black">
                      PACK POSTER & COVER ARTWORK
                    </h4>
                    <p className="text-[9px] font-bold text-neutral-600">
                      Provide an image URL, upload a custom poster file, or select a preset cover.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Controls (2 cols) */}
                  <div className="md:col-span-2 space-y-3">
                    {/* Poster URL */}
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-600 mb-1">
                        POSTER IMAGE URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          name="coverPhotoUrl"
                          value={packEditForm.coverPhotoUrl || ''}
                          onChange={handleChangePack}
                          placeholder="https://example.com/pack-poster.jpg"
                          className="flex-1 bg-white border-2 border-black p-2 font-mono text-xs"
                        />
                        {packEditForm.coverPhotoUrl && (
                          <button
                            type="button"
                            onClick={() => setPackEditForm(prev => ({ ...prev, coverPhotoUrl: '' }))}
                            className="bg-red-100 hover:bg-red-600 hover:text-white text-red-600 border-2 border-red-600 px-2.5 text-xs font-black uppercase transition-colors"
                          >
                            REMOVE
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Upload Custom File */}
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-600 mb-1">
                        OR UPLOAD FROM DEVICE
                      </label>
                      <label className="flex items-center justify-center gap-2 bg-white hover:bg-neutral-100 border-2 border-black p-2.5 font-black text-xs uppercase cursor-pointer transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Upload size={14} />
                        CHOOSE POSTER IMAGE FILE
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePosterFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Preset Posters */}
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-600 mb-1.5">
                        QUICK PRESET POSTERS
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {presetPosters.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setPackEditForm(prev => ({ ...prev, coverPhotoUrl: preset.url }))}
                            className={`p-1 border-2 border-black text-center transition-all ${
                              packEditForm.coverPhotoUrl === preset.url
                                ? 'bg-black text-[#D4FF00] scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'bg-white hover:bg-neutral-100'
                            }`}
                          >
                            <img src={preset.url} alt={preset.name} className="w-full aspect-[750/1050] object-cover border border-black/40 mb-1" />
                            <span className="block text-[7px] font-black uppercase leading-tight truncate">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pack Theme Box Color */}
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-600 mb-1.5 flex items-center gap-1">
                        <Palette size={12} /> PACK FOIL BOX THEME
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {packThemes.map(theme => (
                          <button
                            key={theme.name}
                            type="button"
                            onClick={() => setPackEditForm(prev => ({ ...prev, color: theme.id }))}
                            className={`p-2 border-2 border-black text-[9px] font-black uppercase transition-all flex items-center justify-between ${theme.id} ${
                              packEditForm.color === theme.id ? 'ring-2 ring-black scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'opacity-85 hover:opacity-100'
                            }`}
                          >
                            <span className="truncate">{theme.name}</span>
                            {packEditForm.color === theme.id && <Check size={12} strokeWidth={3} className="shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Live Poster Card Preview (1 col) */}
                  <div className="flex flex-col items-center justify-center p-3 bg-white border-2 border-black">
                    <span className="text-[9px] font-black uppercase text-neutral-500 mb-2">LIVE PACK POSTER PREVIEW</span>
                    <div className={`w-36 aspect-[750/1050] ${packEditForm.color || 'bg-white'} border-3 border-black p-2 flex flex-col justify-between items-center text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden`}>
                      <div className="w-full flex justify-between items-center text-[7px] font-black uppercase">
                        <span className="bg-black text-white px-1 py-0.2">{packEditForm.size || 5} CARDS</span>
                        <span className="font-bold">{formatCurrency(packEditForm.price || 0)}</span>
                      </div>

                      {packEditForm.coverPhotoUrl ? (
                        <img
                          src={packEditForm.coverPhotoUrl}
                          alt="Poster Preview"
                          className="w-24 aspect-[750/1050] object-cover border border-black my-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
                        />
                      ) : (
                        <div className="w-20 h-24 bg-black/10 border border-black flex flex-col items-center justify-center text-neutral-500">
                          <PackageOpen size={24} />
                          <span className="text-[6px] font-black mt-0.5">NO POSTER</span>
                        </div>
                      )}

                      <div className="w-full text-center">
                        <span className="block text-[8px] font-black uppercase truncate leading-tight">
                          {packEditForm.name || 'PACK TITLE'}
                        </span>
                        {packEditForm.badgeText && (
                          <span className="inline-block text-[6px] font-black bg-[#D4FF00] text-black px-1 border border-black mt-0.5">
                            {packEditForm.badgeText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Drop Odds Configuration */}
              <div className="border-2 border-black p-4 bg-neutral-50 space-y-3">
                <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                  <span className="block text-[10px] font-black uppercase text-neutral-700">
                    DROP RATE ODDS DISTRIBUTION (%)
                  </span>
                  <span className={`text-[10px] font-mono font-black ${
                    ((packEditForm.rarityOdds?.base ?? 60) + (packEditForm.rarityOdds?.silver ?? 30) + (packEditForm.rarityOdds?.gold ?? 9) + (packEditForm.rarityOdds?.shield ?? 1)) === 100
                      ? 'text-green-600'
                      : 'text-amber-600'
                  }`}>
                    TOTAL: {(packEditForm.rarityOdds?.base ?? 60) + (packEditForm.rarityOdds?.silver ?? 30) + (packEditForm.rarityOdds?.gold ?? 9) + (packEditForm.rarityOdds?.shield ?? 1)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-neutral-500">BASE %</label>
                    <input
                      type="number"
                      value={packEditForm.rarityOdds?.base ?? 60}
                      onChange={(e) => handlePackOddsChange('base', Number(e.target.value))}
                      className="w-full bg-white border-2 border-black p-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-neutral-500">SILVER %</label>
                    <input
                      type="number"
                      value={packEditForm.rarityOdds?.silver ?? 30}
                      onChange={(e) => handlePackOddsChange('silver', Number(e.target.value))}
                      className="w-full bg-white border-2 border-black p-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-neutral-500">GOLD %</label>
                    <input
                      type="number"
                      value={packEditForm.rarityOdds?.gold ?? 9}
                      onChange={(e) => handlePackOddsChange('gold', Number(e.target.value))}
                      className="w-full bg-white border-2 border-black p-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-neutral-500">1-OF-1 %</label>
                    <input
                      type="number"
                      value={packEditForm.rarityOdds?.shield ?? 1}
                      onChange={(e) => handlePackOddsChange('shield', Number(e.target.value))}
                      className="w-full bg-white border-2 border-black p-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingPack(null)}
                  className="flex-1 py-3.5 bg-white hover:bg-neutral-100 border-2 border-black font-black uppercase text-xs transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3.5 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] border-2 border-black font-black uppercase text-xs transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                  {isSaving ? 'SAVING CONFIGURATION...' : 'SAVE PACK CONFIGURATION'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
