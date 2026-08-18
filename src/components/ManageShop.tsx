import React, { useState, useEffect } from 'react';
import { FootballCard, Pack } from '../types';
import { Edit2, Trash2, X, Check, Search, Plus, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { db, doc, deleteDoc, updateDoc, setDoc, collection, getDocs } from '../lib/firebase';
import { formatCurrency } from '../lib/utils';
import { cardsDatabase } from '../data';

interface ManageShopProps {
  cards: FootballCard[];
  packs: Pack[];
  themes: any[];
}

export function ManageShop({ cards, packs, themes }: ManageShopProps) {
  const [activeTab, setActiveTab] = useState<'cards' | 'packs' | 'themes'>('cards');
  
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
  
  // Themes State
  const [editingTheme, setEditingTheme] = useState<any | null>(null);
  const [themeEditForm, setThemeEditForm] = useState<any>({});
  
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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
    { id: 'starter', name: 'STARTER PACK', size: 3, price: 250, color: 'bg-white' },
    { id: 'pro', name: 'PRO PACK', size: 5, price: 500, color: 'bg-[#D4FF00]' },
    { id: 'elite', name: 'ELITE PACK', size: 7, price: 1200, color: 'bg-black text-white' }
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
    setEditForm(card);
  };

  const handleSaveCard = async () => {
    if (!editingCard) return;
    setIsSaving(true);
    try {
      const cardRef = doc(db, "cards", editingCard.id);
      const updatedForm = { ...editForm };
      updatedForm.currentPrice = Number(updatedForm.currentPrice);
      updatedForm.year = Number(updatedForm.year);
      
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
      [name]: name === 'year' || name === 'currentPrice' ? Number(value) : value
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
      price: 10,
      color: 'bg-white',
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

  const handlePackImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_WIDTH = 750;
          const MAX_HEIGHT = 1050;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setPackEditForm(prev => ({ ...prev, coverPhotoUrl: compressedDataUrl }));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Theme Handlers
  const handleEditTheme = (theme: any) => {
    setEditingTheme(theme);
    setThemeEditForm(theme);
  };

  const handleCreateTheme = () => {
    const newTheme = {
      id: `theme_${Date.now()}`,
      name: 'NEW THEME',
      overlayImageUrl: '',
      clubLogoUrl: '',
      clubLogoSize: 80,
      clubLogoTop: 6,
      clubLogoLeft: 6,
      editionLogoUrl: '',
      editionLogoSize: 80,
      editionLogoTop: 6,
      editionLogoLeft: 80,
      fontBase64: '',
      fontName: 'CustomFont',
      fontColor: '#ffffff',
      fontSize: 48,
      fontPositionBottom: 5,
      fontScaleX: 1,
      fontScaleY: 1,
    };
    setEditingTheme(newTheme);
    setThemeEditForm(newTheme);
  };

  const handleSaveTheme = async () => {
    if (!editingTheme) return;
    setIsSaving(true);
    try {
      const themeRef = doc(db, "themes", editingTheme.id);
      await setDoc(themeRef, themeEditForm, { merge: true });
      setEditingTheme(null);
    } catch (error) {
      console.error("Error updating theme:", error);
      alert("Failed to update theme.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTheme = async (theme: any) => {
    if (window.confirm(`Are you sure you want to delete ${theme.name}?`)) {
      try {
        await deleteDoc(doc(db, "themes", theme.id));
      } catch (error) {
        console.error("Error deleting theme:", error);
        alert("Failed to delete theme.");
      }
    }
  };

  const handleChangeTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setThemeEditForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleThemeImageChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThemeEditForm((prev: any) => ({ ...prev, [fieldName]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
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
        return setDoc(doc(db, 'cards', id), cardData);
      });
      await Promise.all(cardAdds);
      
      // 3. Delete all packs
      const packsSnap = await getDocs(collection(db, 'packs'));
      const packDeletes = packsSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(packDeletes);
      
      // 4. Insert default packs
      const defaultPacks = [
        { id: 'standard', name: 'Standard Pack', price: 10, size: 5, color: 'bg-neutral-100', probability: { base: 0.8, silver: 0.15, gold: 0.04, shield: 0.01 } },
        { id: 'premium', name: 'Premium Pack', price: 25, size: 5, color: 'bg-neutral-200', probability: { base: 0.6, silver: 0.25, gold: 0.1, shield: 0.05 } },
        { id: 'elite', name: 'Elite Pack', price: 100, size: 3, color: 'bg-black text-white', probability: { base: 0.3, silver: 0.4, gold: 0.2, shield: 0.1 } }
      ];
      const packAdds = defaultPacks.map(pack => setDoc(doc(db, 'packs', pack.id), pack));
      await Promise.all(packAdds);
      
      alert("Database reset successfully.");
      setConfirmReset(false);
    } catch (err) {
      console.error(err);
      alert("Failed to reset database.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-red-50 border-2 border-red-500 p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[8px_8px_0px_0px_rgba(239,68,68,1)]">
        <div>
          <h3 className="text-xl font-black text-red-600 uppercase tracking-tighter flex items-center gap-2">
            <AlertTriangle size={24} /> Danger Zone
          </h3>
          <p className="text-red-700 font-bold text-sm tracking-widest uppercase mt-2">
            Reset database to default demo data. This removes all custom cards and packs. Users are not affected.
          </p>
        </div>
        <button
          onClick={handleResetDatabase}
          disabled={isResetting}
          className={`shrink-0 px-6 py-3 font-black uppercase tracking-widest border-2 border-red-600 transition-colors ${
            confirmReset ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-white text-red-600 hover:bg-red-50'
          }`}
        >
          {isResetting ? 'Resetting...' : confirmReset ? 'Are you sure?' : 'Reset Database'}
        </button>
      </div>

      <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b-2 border-black pb-6">
          <h2 className="text-3xl font-black uppercase tracking-tighter">Shop Admin Panel</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-6 py-2 font-black uppercase tracking-widest border-2 border-black transition-colors ${
                activeTab === 'cards' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setActiveTab('packs')}
              className={`px-6 py-2 font-black uppercase tracking-widest border-2 border-black transition-colors ${
                activeTab === 'packs' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              Physical Packs
            </button>
            <button
              onClick={() => setActiveTab('themes')}
              className={`px-6 py-2 font-black uppercase tracking-widest border-2 border-black transition-colors ${
                activeTab === 'themes' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              Themes
            </button>
          </div>
        </div>
        
        {activeTab === 'cards' && (
          <div>
            <div className="flex flex-col mb-6 gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xl font-black uppercase tracking-widest">Manage Inventory</h3>
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
              <div className="flex flex-wrap gap-4">
                <select 
                  value={filterTeam} 
                  onChange={(e) => setFilterTeam(e.target.value)}
                  className="bg-neutral-100 border-2 border-black py-2 px-4 text-xs font-black text-black focus:outline-none focus:bg-white transition-colors uppercase tracking-widest"
                >
                  <option value="">ALL TEAMS</option>
                  {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select 
                  value={filterPosition} 
                  onChange={(e) => setFilterPosition(e.target.value)}
                  className="bg-neutral-100 border-2 border-black py-2 px-4 text-xs font-black text-black focus:outline-none focus:bg-white transition-colors uppercase tracking-widest"
                >
                  <option value="">ALL POSITIONS</option>
                  {uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select 
                  value={filterYear} 
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="bg-neutral-100 border-2 border-black py-2 px-4 text-xs font-black text-black focus:outline-none focus:bg-white transition-colors uppercase tracking-widest"
                >
                  <option value="">ALL YEARS</option>
                  {uniqueYears.map(y => <option key={y} value={y.toString()}>{y}</option>)}
                </select>
                <select 
                  value={filterSet} 
                  onChange={(e) => setFilterSet(e.target.value)}
                  className="bg-neutral-100 border-2 border-black py-2 px-4 text-xs font-black text-black focus:outline-none focus:bg-white transition-colors uppercase tracking-widest"
                >
                  <option value="">ALL SETS</option>
                  {uniqueSets.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select 
                  value={filterRarity} 
                  onChange={(e) => setFilterRarity(e.target.value)}
                  className="bg-neutral-100 border-2 border-black py-2 px-4 text-xs font-black text-black focus:outline-none focus:bg-white transition-colors uppercase tracking-widest"
                >
                  <option value="">ALL RARITIES</option>
                  {uniqueRarities.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-neutral-50">
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-neutral-500 w-16">Card</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-neutral-500">Player</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-neutral-500">Team</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-neutral-500">Price</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-neutral-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCards.map(card => (
                    <tr key={card.id} className="border-b-2 border-neutral-100 hover:bg-neutral-50 transition-colors">
                      <td className="p-4">
                        {card.imageUrl ? (
                          <img src={card.imageUrl} alt={card.player} className="w-12 h-16 object-cover border-2 border-black" />
                        ) : (
                          <div className={`w-12 h-16 border-2 border-black bg-gradient-to-tr ${card.imageGradient || 'from-neutral-100 to-neutral-200'} flex items-center justify-center`}>
                            <ImageIcon size={16} className="text-neutral-400" />
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-bold">{card.player}</td>
                      <td className="p-4 text-neutral-600">{card.team}</td>
                      <td className="p-4 font-black">{formatCurrency(card.currentPrice)}</td>
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => handleEditCard(card)}
                          className="p-2 border-2 border-black hover:bg-[#D4FF00] transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCard(card)}
                          className="p-2 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCards.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-neutral-500 font-bold uppercase tracking-widest">
                        No cards found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'packs' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h3 className="text-xl font-black uppercase tracking-widest">Manage Physical Packs</h3>
              <button
                onClick={handleCreatePack}
                className="flex items-center gap-2 bg-[#D4FF00] text-black border-2 border-black px-4 py-2 font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors text-sm"
              >
                <Plus size={16} /> New Pack
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentPacks.map(pack => (
                <div key={pack.id} className={`${pack.color} border-4 border-black p-6 flex flex-col items-center text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
                  {pack.coverPhotoUrl ? (
                    <img src={pack.coverPhotoUrl} alt={pack.name} className="w-32 aspect-[750/1050] object-cover mb-4 border-2 border-black bg-white" />
                  ) : (
                    <div className="w-32 aspect-[750/1050] bg-neutral-200 border-2 border-black mb-4 flex items-center justify-center">
                      <ImageIcon size={32} className="text-neutral-400" />
                    </div>
                  )}
                  <h4 className="text-xl font-black uppercase tracking-tighter mb-1">{pack.name}</h4>
                  <p className="text-sm font-black uppercase tracking-widest opacity-80 mb-4">{pack.size} Cards • {formatCurrency(pack.price)}</p>
                  
                  <div className="flex gap-2 w-full mt-auto">
                    <button 
                      onClick={() => handleEditPack(pack)}
                      className="flex-1 flex justify-center p-2 border-2 border-black bg-white text-black hover:bg-[#D4FF00] transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeletePack(pack)}
                      className="flex-1 flex justify-center p-2 border-2 border-black bg-white text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'themes' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h3 className="text-xl font-black uppercase tracking-widest">Custom Card Themes</h3>
              <button 
                onClick={handleCreateTheme}
                className="flex items-center gap-2 bg-black text-white px-4 py-2 font-black uppercase tracking-widest hover:bg-[#D4FF00] hover:text-black transition-colors"
              >
                <Plus size={16} /> New Theme
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {themes.map(theme => (
                <div key={theme.id} className="border-2 border-black p-4 flex flex-col items-center text-center bg-white">
                  {theme.overlayImageUrl ? (
                    <img src={theme.overlayImageUrl} alt={theme.name} className="w-32 aspect-[750/1050] object-contain border-2 border-black mb-4 bg-neutral-100" />
                  ) : (
                    <div className="w-32 aspect-[750/1050] bg-neutral-200 border-2 border-black mb-4 flex items-center justify-center">
                      <ImageIcon size={32} className="text-neutral-400" />
                    </div>
                  )}
                  <h4 className="text-xl font-black uppercase tracking-tighter mb-4">{theme.name}</h4>
                  
                  <div className="flex gap-2 w-full mt-auto">
                    <button 
                      onClick={() => handleEditTheme(theme)}
                      className="flex-1 flex justify-center p-2 border-2 border-black bg-white text-black hover:bg-[#D4FF00] transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteTheme(theme)}
                      className="flex-1 flex justify-center p-2 border-2 border-black bg-white text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {themes.length === 0 && (
                <div className="col-span-full py-12 text-center text-neutral-500 font-bold uppercase tracking-widest">
                  No themes found. Create one to get started.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Card Modal */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl border-4 border-black relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setEditingCard(null)}
              className="absolute top-4 right-4 bg-black text-white w-8 h-8 flex items-center justify-center hover:bg-[#D4FF00] hover:text-black transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-8 space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Edit Card: {editingCard.player}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Player Name</label>
                  <input type="text" name="player" value={editForm.player || ''} onChange={handleChangeCard} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Team</label>
                  <input type="text" name="team" value={editForm.team || ''} onChange={handleChangeCard} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Position</label>
                  <input type="text" name="position" value={editForm.position || ''} onChange={handleChangeCard} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Year</label>
                  <input type="number" name="year" value={editForm.year || ''} onChange={handleChangeCard} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Current Price</label>
                  <input type="number" name="currentPrice" value={editForm.currentPrice || ''} onChange={handleChangeCard} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Set</label>
                  <input type="text" name="set" value={editForm.set || ''} onChange={handleChangeCard} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Edition</label>
                  <input type="text" name="edition" value={editForm.edition || ''} onChange={handleChangeCard} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Rarity</label>
                  <input type="text" name="rarity" value={editForm.rarity || ''} onChange={handleChangeCard} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Card Number</label>
                  <input type="text" name="cardNumber" value={editForm.cardNumber || ''} onChange={handleChangeCard} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                </div>
              </div>
              
              <button 
                onClick={handleSaveCard}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 bg-[#D4FF00] hover:bg-black hover:text-white text-black border-2 border-black py-4 font-black uppercase tracking-widest transition-colors"
              >
                {isSaving ? 'Saving...' : <><Check size={20} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Pack Modal */}
      {editingPack && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-xl border-4 border-black relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setEditingPack(null)}
              className="absolute top-4 right-4 bg-black text-white w-8 h-8 flex items-center justify-center hover:bg-[#D4FF00] hover:text-black transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-8 space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Edit Pack</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Cover Photo</label>
                  <div className="flex items-center gap-4">
                    {packEditForm.coverPhotoUrl ? (
                      <img src={packEditForm.coverPhotoUrl} alt="Preview" className="w-16 aspect-[750/1050] object-cover border-2 border-black" />
                    ) : (
                      <div className="w-16 aspect-[750/1050] border-2 border-black bg-neutral-100 flex items-center justify-center">
                        <ImageIcon className="text-neutral-400" />
                      </div>
                    )}
                    <label className="cursor-pointer bg-black text-white px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-[#D4FF00] hover:text-black transition-colors border-2 border-black">
                      Upload Image
                      <input type="file" accept="image/*" onChange={handlePackImageChange} className="hidden" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Pack Name</label>
                  <input type="text" name="name" value={packEditForm.name || ''} onChange={handleChangePack} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Price (৳)</label>
                    <input type="number" step="1" name="price" value={packEditForm.price || ''} onChange={handleChangePack} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Number of Cards</label>
                    <input type="number" name="size" value={packEditForm.size || ''} onChange={handleChangePack} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Background Color Classes (Tailwind)</label>
                  <input type="text" name="color" value={packEditForm.color || ''} onChange={handleChangePack} placeholder="e.g. bg-white, bg-[#D4FF00], bg-black text-white" className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                </div>
              </div>
              
              <button 
                onClick={handleSavePack}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 bg-[#D4FF00] hover:bg-black hover:text-white text-black border-2 border-black py-4 font-black uppercase tracking-widest transition-colors"
              >
                {isSaving ? 'Saving...' : <><Check size={20} /> Save Pack</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Theme Modal */}
      {editingTheme && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-xl border-4 border-black relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setEditingTheme(null)}
              className="absolute top-4 right-4 bg-black text-white w-8 h-8 flex items-center justify-center hover:bg-[#D4FF00] hover:text-black transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-8 space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Edit Theme</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Theme Name</label>
                  <input type="text" name="name" value={themeEditForm.name || ''} onChange={handleChangeTheme} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                </div>
                
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Overlay Image (Transparent PNG)</label>
                  <div className="flex flex-col gap-2">
                    {themeEditForm.overlayImageUrl && (
                      <img src={themeEditForm.overlayImageUrl} alt="Overlay" className="h-24 object-contain border-2 border-black bg-neutral-100" />
                    )}
                    <input type="file" accept="image/png" onChange={(e) => handleThemeImageChange(e, 'overlayImageUrl')} className="w-full" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Club Logo</label>
                  <div className="flex flex-col gap-2 mb-4">
                    {themeEditForm.clubLogoUrl && (
                      <img src={themeEditForm.clubLogoUrl} alt="Club Logo" className="h-16 object-contain border-2 border-black bg-neutral-100" />
                    )}
                    <input type="file" accept="image/*" onChange={(e) => handleThemeImageChange(e, 'clubLogoUrl')} className="w-full" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-black text-neutral-500 mb-1">Size (px)</label>
                      <input type="number" name="clubLogoSize" value={themeEditForm.clubLogoSize ?? 80} onChange={(e) => setThemeEditForm((prev: any) => ({ ...prev, clubLogoSize: Number(e.target.value) }))} className="w-full bg-neutral-100 border-2 border-black p-2 text-sm font-bold focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-neutral-500 mb-1">Top (%)</label>
                      <input type="number" name="clubLogoTop" value={themeEditForm.clubLogoTop ?? 6} onChange={(e) => setThemeEditForm((prev: any) => ({ ...prev, clubLogoTop: Number(e.target.value) }))} className="w-full bg-neutral-100 border-2 border-black p-2 text-sm font-bold focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-neutral-500 mb-1">Left (%)</label>
                      <input type="number" name="clubLogoLeft" value={themeEditForm.clubLogoLeft ?? 6} onChange={(e) => setThemeEditForm((prev: any) => ({ ...prev, clubLogoLeft: Number(e.target.value) }))} className="w-full bg-neutral-100 border-2 border-black p-2 text-sm font-bold focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Edition Logo</label>
                  <div className="flex flex-col gap-2 mb-4">
                    {themeEditForm.editionLogoUrl && (
                      <img src={themeEditForm.editionLogoUrl} alt="Edition Logo" className="h-16 object-contain border-2 border-black bg-neutral-100" />
                    )}
                    <input type="file" accept="image/*" onChange={(e) => handleThemeImageChange(e, 'editionLogoUrl')} className="w-full" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-black text-neutral-500 mb-1">Size (px)</label>
                      <input type="number" name="editionLogoSize" value={themeEditForm.editionLogoSize ?? 80} onChange={(e) => setThemeEditForm((prev: any) => ({ ...prev, editionLogoSize: Number(e.target.value) }))} className="w-full bg-neutral-100 border-2 border-black p-2 text-sm font-bold focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-neutral-500 mb-1">Top (%)</label>
                      <input type="number" name="editionLogoTop" value={themeEditForm.editionLogoTop ?? 6} onChange={(e) => setThemeEditForm((prev: any) => ({ ...prev, editionLogoTop: Number(e.target.value) }))} className="w-full bg-neutral-100 border-2 border-black p-2 text-sm font-bold focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-neutral-500 mb-1">Left (%)</label>
                      <input type="number" name="editionLogoLeft" value={themeEditForm.editionLogoLeft ?? 80} onChange={(e) => setThemeEditForm((prev: any) => ({ ...prev, editionLogoLeft: Number(e.target.value) }))} className="w-full bg-neutral-100 border-2 border-black p-2 text-sm font-bold focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Font File (.ttf, .woff, .woff2)</label>
                  <input type="file" accept=".ttf,.woff,.woff2,font/*" onChange={(e) => handleThemeImageChange(e, 'fontBase64')} className="w-full mb-2" />
                  <input type="text" name="fontName" value={themeEditForm.fontName || ''} onChange={handleChangeTheme} placeholder="Font Name (e.g. MyCustomFont)" className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white mb-2" />
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Font Color</label>
                  <div className="flex gap-2 items-center mb-2">
                    <input type="color" name="fontColor" value={themeEditForm.fontColor || '#ffffff'} onChange={handleChangeTheme} className="w-12 h-12 p-1 bg-neutral-100 border-2 border-black cursor-pointer" />
                    <input type="text" name="fontColor" value={themeEditForm.fontColor || '#ffffff'} onChange={handleChangeTheme} placeholder="e.g. #ffffff" className="flex-1 bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                  </div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Font Size</label>
                  <input type="number" name="fontSize" value={themeEditForm.fontSize || 48} onChange={(e) => setThemeEditForm((prev: any) => ({ ...prev, fontSize: Number(e.target.value) }))} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white mb-2" />
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Font Position (Bottom %)</label>
                  <input type="number" name="fontPositionBottom" value={themeEditForm.fontPositionBottom ?? 5} onChange={(e) => setThemeEditForm((prev: any) => ({ ...prev, fontPositionBottom: Number(e.target.value) }))} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white mb-2" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Stretch X (1.0 = normal)</label>
                      <input type="number" step="0.1" name="fontScaleX" value={themeEditForm.fontScaleX ?? 1} onChange={(e) => setThemeEditForm((prev: any) => ({ ...prev, fontScaleX: Number(e.target.value) }))} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Stretch Y (1.0 = normal)</label>
                      <input type="number" step="0.1" name="fontScaleY" value={themeEditForm.fontScaleY ?? 1} onChange={(e) => setThemeEditForm((prev: any) => ({ ...prev, fontScaleY: Number(e.target.value) }))} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleSaveTheme}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 bg-[#D4FF00] hover:bg-black hover:text-white text-black border-2 border-black py-4 font-black uppercase tracking-widest transition-colors"
              >
                {isSaving ? 'Saving...' : <><Check size={20} /> Save Theme</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
