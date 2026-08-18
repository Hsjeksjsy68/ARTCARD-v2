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
  ShieldAlert
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
    setPackEditForm(pack);
  };

  const handleCreatePack = () => {
    const newPack: Pack = {
      id: `pack_${Date.now()}`,
      name: 'NEW PACK',
      size: 5,
      price: 500,
      color: 'bg-white',
      rarityOdds: { base: 60, silver: 30, gold: 9, shield: 1 }
    };
    setEditingPack(newPack);
    setPackEditForm(newPack);
  };

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

  const handleChangePack = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase tracking-widest">MANAGE PACK CONFIGURATIONS</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Configure digital pack prices, drop rate odds, and cards per pack.
                </p>
              </div>
              <button
                onClick={handleCreatePack}
                className="flex items-center gap-2 bg-[#D4FF00] hover:bg-black hover:text-white text-black border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <Plus size={16} /> ADD NEW PACK
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentPacks.map((pack) => {
                const odds = pack.rarityOdds || { base: 60, silver: 30, gold: 9, shield: 1 };
                return (
                  <div key={pack.id} className="border-4 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase bg-black text-white px-2 py-0.5">
                          {pack.size} CARDS
                        </span>
                        <span className="text-xl font-black">{formatCurrency(pack.price)}</span>
                      </div>
                      <h4 className="text-2xl font-black uppercase">{pack.name}</h4>
                      <p className="text-xs font-bold text-neutral-600 mt-1">{pack.description || 'Standard digital collectible pack.'}</p>
                      
                      <div className="mt-4 bg-neutral-100 p-3 border border-black text-[10px] font-black space-y-1">
                        <div className="text-neutral-500">DROP RATE ODDS:</div>
                        <div className="grid grid-cols-2 gap-1 font-mono">
                          <div>BASE: {odds.base}%</div>
                          <div>SILVER: {odds.silver}%</div>
                          <div>GOLD: {odds.gold}%</div>
                          <div className="text-[#849a00]">1-OF-1: {odds.shield}%</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-6 border-t-2 border-black mt-6">
                      <button
                        onClick={() => handleEditPack(pack)}
                        className="flex-1 py-2 bg-neutral-100 hover:bg-black hover:text-white border-2 border-black font-black uppercase text-xs transition-colors"
                      >
                        EDIT PACK
                      </button>
                      <button
                        onClick={() => handleDeletePack(pack)}
                        className="p-2 bg-red-100 hover:bg-red-600 hover:text-white border-2 border-red-600 text-red-600 transition-colors"
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
          <div className="bg-white w-full max-w-xl border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] my-8">
            <div className="bg-black text-white p-5 flex items-center justify-between border-b-4 border-black">
              <h3 className="text-xl font-black uppercase text-[#D4FF00]">
                CONFIGURE PACK
              </h3>
              <button
                onClick={() => setEditingPack(null)}
                className="bg-white text-black hover:bg-[#D4FF00] p-1.5 border-2 border-black font-black"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSavePack(); }} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">PACK NAME</label>
                  <input
                    type="text"
                    name="name"
                    value={packEditForm.name || ''}
                    onChange={handleChangePack}
                    className="w-full bg-neutral-50 border-2 border-black p-2 font-black text-xs uppercase"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">PRICE (৳)</label>
                    <input
                      type="number"
                      name="price"
                      value={packEditForm.price || 0}
                      onChange={handleChangePack}
                      className="w-full bg-neutral-50 border-2 border-black p-2 font-black text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">CARDS PER PACK</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      name="size"
                      value={packEditForm.size || 5}
                      onChange={handleChangePack}
                      className="w-full bg-neutral-50 border-2 border-black p-2 font-black text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Drop Odds Configuration */}
                <div className="border-2 border-black p-4 bg-neutral-50 space-y-3">
                  <span className="block text-[10px] font-black uppercase text-neutral-600">
                    DROP RATE ODDS DISTRIBUTION (%)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-500">BASE %</label>
                      <input
                        type="number"
                        value={packEditForm.rarityOdds?.base ?? 60}
                        onChange={(e) => handlePackOddsChange('base', Number(e.target.value))}
                        className="w-full bg-white border border-black p-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-500">SILVER %</label>
                      <input
                        type="number"
                        value={packEditForm.rarityOdds?.silver ?? 30}
                        onChange={(e) => handlePackOddsChange('silver', Number(e.target.value))}
                        className="w-full bg-white border border-black p-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-500">GOLD %</label>
                      <input
                        type="number"
                        value={packEditForm.rarityOdds?.gold ?? 9}
                        onChange={(e) => handlePackOddsChange('gold', Number(e.target.value))}
                        className="w-full bg-white border border-black p-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-500">1-OF-1 %</label>
                      <input
                        type="number"
                        value={packEditForm.rarityOdds?.shield ?? 1}
                        onChange={(e) => handlePackOddsChange('shield', Number(e.target.value))}
                        className="w-full bg-white border border-black p-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingPack(null)}
                  className="flex-1 py-3 bg-white border-2 border-black font-black uppercase text-xs"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] border-2 border-black font-black uppercase text-xs transition-colors"
                >
                  {isSaving ? 'SAVING...' : 'SAVE PACK'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
