import React, { useState } from 'react';
import { FootballCard, Pack } from '../types';
import { PackageOpen, X, Sparkles, Truck, CreditCard, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PackShopProps {
  cards: FootballCard[];
  packs: Pack[];
  onCardsDrawn?: (drawnCards: FootballCard[]) => void;
}

export function PackShop({ cards, packs }: PackShopProps) {
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [orderState, setOrderState] = useState<'idle' | 'form' | 'processing' | 'success'>('idle');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    zipCode: '',
    cardNumber: '',
    expiry: '',
    cvc: ''
  });

  const defaultPacks: Pack[] = [
    { id: 'starter', name: 'STARTER PACK', size: 3, price: 250, color: 'bg-white' },
    { id: 'pro', name: 'PRO PACK', size: 5, price: 500, color: 'bg-[#D4FF00]' },
    { id: 'elite', name: 'ELITE PACK', size: 7, price: 1200, color: 'bg-black text-white' }
  ];

  const displayPacks = packs.length > 0 ? packs : defaultPacks;

  const handleOrderClick = (pack: Pack) => {
    window.open("https://primestock-nu.vercel.app/brand/LpPWLHDoAbhRcgREFFpwgOizU8B3", "_blank");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderState('processing');
    
    // Simulate order processing
    setTimeout(() => {
      setOrderState('success');
    }, 2000);
  };

  const handleClose = () => {
    setSelectedPack(null);
    setOrderState('idle');
    setFormData({
      name: '',
      address: '',
      city: '',
      zipCode: '',
      cardNumber: '',
      expiry: '',
      cvc: ''
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-8">
      <div className="text-center space-y-4">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Physical Shop</h2>
        <p className="text-neutral-500 font-black uppercase tracking-widest text-sm">Order physical card packs delivered to your door</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {displayPacks.map(pack => (
          <div 
            key={pack.id}
            className={`${pack.color || 'bg-white'} border-4 border-black p-8 flex flex-col items-center text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer group`}
            onClick={() => handleOrderClick(pack)}
          >
            {pack.coverPhotoUrl ? (
              <img src={pack.coverPhotoUrl} alt={pack.name} className="w-48 aspect-[750/1050] object-cover mb-6 border-2 border-black group-hover:scale-105 transition-transform bg-white" />
            ) : (
              <div className="w-48 aspect-[750/1050] bg-neutral-200 border-2 border-black mb-6 flex flex-col items-center justify-center group-hover:scale-105 transition-transform">
                <PackageOpen size={48} className={`mb-2 ${pack.color?.includes('bg-black') ? 'text-white' : pack.id === 'elite' ? 'text-[#D4FF00]' : 'text-black'}`} />
              </div>
            )}
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">{pack.name}</h3>
            <p className={`text-sm font-black uppercase tracking-widest mb-8 opacity-80`}>
              Contains {pack.size} Physical Cards
            </p>
            <button 
              className={`w-full py-4 font-black uppercase tracking-widest border-2 mt-auto ${
                pack.color?.includes('bg-black')
                  ? 'bg-white text-black hover:bg-[#D4FF00] hover:border-black border-black'
                  : 'bg-black text-white hover:bg-[#D4FF00] hover:text-black border-black'
              } transition-colors`}
            >
              ORDER
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedPack && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto"
          >
            <div className="bg-white w-full max-w-2xl border-4 border-black relative my-8">
              {orderState !== 'processing' && orderState !== 'success' && (
                <button 
                  onClick={handleClose}
                  className="absolute top-4 right-4 bg-black text-white w-8 h-8 flex items-center justify-center hover:bg-[#D4FF00] hover:text-black transition-colors z-10"
                >
                  <X size={20} />
                </button>
              )}
              
              <div className="p-8">
                {orderState === 'form' && (
                  <>
                    <div className="mb-8 border-b-2 border-black pb-6 flex items-center gap-6">
                      {selectedPack.coverPhotoUrl && (
                        <img src={selectedPack.coverPhotoUrl} alt={selectedPack.name} className="w-16 aspect-[750/1050] object-cover border-2 border-black" />
                      )}
                      <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Checkout</h2>
                        <p className="text-neutral-500 font-black uppercase tracking-widest text-sm">
                          Ordering: {selectedPack.name} - ${selectedPack.price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleSubmitOrder} className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                          <Truck size={16} /> Shipping Details
                        </h3>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Full Name</label>
                          <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Street Address</label>
                          <input required type="text" name="address" value={formData.address} onChange={handleChange} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">City</label>
                            <input required type="text" name="city" value={formData.city} onChange={handleChange} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">ZIP Code</label>
                            <input required type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-6 border-t-2 border-black">
                        <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                          <CreditCard size={16} /> Payment Info
                        </h3>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Card Number</label>
                          <input required type="text" name="cardNumber" placeholder="0000 0000 0000 0000" value={formData.cardNumber} onChange={handleChange} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">Expiry</label>
                            <input required type="text" name="expiry" placeholder="MM/YY" value={formData.expiry} onChange={handleChange} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">CVC</label>
                            <input required type="text" name="cvc" placeholder="123" value={formData.cvc} onChange={handleChange} className="w-full bg-neutral-100 border-2 border-black p-3 text-sm font-bold focus:outline-none focus:bg-white" />
                          </div>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full bg-black text-white py-4 font-black uppercase tracking-widest hover:bg-[#D4FF00] hover:text-black border-2 border-black transition-colors mt-8"
                      >
                        Place Order - ${selectedPack.price.toFixed(2)}
                      </button>
                    </form>
                  </>
                )}

                {orderState === 'processing' && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 border-4 border-black border-t-[#D4FF00] rounded-full animate-spin mb-8"></div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Processing Order...</h2>
                    <p className="text-neutral-500 font-black uppercase tracking-widest mt-2">Please do not close this window</p>
                  </div>
                )}

                {orderState === 'success' && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle size={80} className="text-[#D4FF00] mb-6" />
                    <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">Order Confirmed!</h2>
                    <p className="text-neutral-500 font-black uppercase tracking-widest mb-8 max-w-md">
                      Your {selectedPack.name} is being prepared and will be shipped to {formData.address}, {formData.city} {formData.zipCode} shortly.
                    </p>
                    <button 
                      onClick={handleClose}
                      className="bg-black text-white px-8 py-4 font-black uppercase tracking-widest hover:bg-[#D4FF00] hover:text-black border-2 border-black transition-colors"
                    >
                      Back to Shop
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
