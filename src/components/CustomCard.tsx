import React, { useState, useRef, useEffect } from 'react';
import { ImagePlus, Download, Sparkles } from 'lucide-react';
import { toPng } from 'html-to-image';

export function CustomCard({ themes }: { themes: any[] }) {
  const [formData, setFormData] = useState({
    player: 'CUSTOM PLAYER',
    themeId: '',
  });
  
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageScale, setImageScale] = useState(1);
  const [imageOffsetX, setImageOffsetX] = useState(0);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const [userClubLogoUrl, setUserClubLogoUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clubLogoInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Set default theme when themes load
  useEffect(() => {
    if (themes.length > 0 && !formData.themeId) {
      setFormData(prev => ({ ...prev, themeId: themes[0].id }));
    }
  }, [themes, formData.themeId]);

  const selectedTheme = themes.find(t => t.id === formData.themeId);

  // Inject custom font if needed
  useEffect(() => {
    if (selectedTheme?.fontBase64 && selectedTheme?.fontName) {
      const styleId = `font-${selectedTheme.id}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          @font-face {
            font-family: '${selectedTheme.fontName}';
            src: url('${selectedTheme.fontBase64}') format('truetype');
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, [selectedTheme]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClubLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserClubLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = async () => {
    if (cardRef.current === null) {
      return;
    }

    try {
      // Force font load wait if using custom font
      if (selectedTheme?.fontName) {
        await document.fonts.ready;
      }
      
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
      
      const link = document.createElement('a');
      link.download = `${formData.player.replace(/\s+/g, '_')}_custom_card.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image', err);
      alert('Failed to generate image. Please try again.');
    }
  };

  const inputClasses = "w-full bg-white border-2 border-black focus:border-[#D4FF00] focus:ring-2 focus:ring-[#D4FF00] text-black px-4 py-3 outline-none transition-colors uppercase font-black text-sm";
  const labelClasses = "block text-xs font-black text-neutral-500 mb-2 uppercase tracking-widest";

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Card Creator</h2>
        <p className="text-neutral-500 font-black uppercase tracking-widest text-sm">Design your own custom card with official themes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Form Section */}
        <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-2xl font-black uppercase tracking-tighter border-b-2 border-black pb-4 mb-6">
            Card Details
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className={labelClasses}>Your Photo</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-40 border-2 border-dashed border-black bg-neutral-50 flex items-center justify-center cursor-pointer hover:bg-neutral-100 transition-colors relative overflow-hidden"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="Preview" className="h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center text-neutral-400">
                    <ImagePlus size={32} className="mb-2" />
                    <span className="text-sm font-black uppercase tracking-widest">Upload Custom Photo</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              
              {imageUrl && (
                <div className="mt-4 space-y-4 bg-neutral-50 p-4 border-2 border-black">
                  <div className="flex justify-between items-center mb-2 border-b-2 border-black pb-2">
                    <span className="text-sm font-black uppercase tracking-widest">Adjust Image</span>
                    <button 
                      onClick={() => { setImageScale(1); setImageOffsetX(0); setImageOffsetY(0); }}
                      className="text-xs font-black uppercase tracking-widest bg-black text-white px-3 py-1 hover:bg-[#D4FF00] hover:text-black transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black uppercase tracking-widest text-neutral-500">Zoom</label>
                      <input type="number" step="0.05" min="0.5" max="3" value={imageScale} onChange={e => setImageScale(Number(e.target.value))} className="w-16 bg-white border-2 border-black p-1 text-xs font-black text-center focus:outline-none focus:border-[#D4FF00]" />
                    </div>
                    <input type="range" min="0.5" max="3" step="0.05" value={imageScale} onChange={e => setImageScale(Number(e.target.value))} className="w-full accent-black" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black uppercase tracking-widest text-neutral-500">Horizontal</label>
                      <input type="number" value={imageOffsetX} onChange={e => setImageOffsetX(Number(e.target.value))} className="w-16 bg-white border-2 border-black p-1 text-xs font-black text-center focus:outline-none focus:border-[#D4FF00]" />
                    </div>
                    <div className="relative">
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-neutral-300 pointer-events-none z-0"></div>
                      <input type="range" min="-400" max="400" value={imageOffsetX} onChange={e => setImageOffsetX(Number(e.target.value))} className="w-full accent-black relative z-10 bg-transparent" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black uppercase tracking-widest text-neutral-500">Vertical</label>
                      <input type="number" value={imageOffsetY} onChange={e => setImageOffsetY(Number(e.target.value))} className="w-16 bg-white border-2 border-black p-1 text-xs font-black text-center focus:outline-none focus:border-[#D4FF00]" />
                    </div>
                    <div className="relative">
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-neutral-300 pointer-events-none z-0"></div>
                      <input type="range" min="-400" max="400" value={imageOffsetY} onChange={e => setImageOffsetY(Number(e.target.value))} className="w-full accent-black relative z-10 bg-transparent" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className={labelClasses}>Your Club Logo (Optional)</label>
              <div 
                onClick={() => clubLogoInputRef.current?.click()}
                className="w-full h-24 border-2 border-dashed border-black bg-neutral-50 flex items-center justify-center cursor-pointer hover:bg-neutral-100 transition-colors relative overflow-hidden"
              >
                {userClubLogoUrl ? (
                  <img src={userClubLogoUrl} alt="Club Logo Preview" className="h-full object-contain p-2" />
                ) : (
                  <div className="flex flex-col items-center text-neutral-400">
                    <ImagePlus size={24} className="mb-1" />
                    <span className="text-xs font-black uppercase tracking-widest">Upload Club Logo</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={clubLogoInputRef} 
                  onChange={handleClubLogoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className={labelClasses}>Player Name</label>
                <input type="text" name="player" value={formData.player} onChange={handleChange} className={inputClasses} maxLength={25} />
              </div>
              
              <div>
                <label className={labelClasses}>Card Theme</label>
                {themes.length > 0 ? (
                  <select name="themeId" value={formData.themeId} onChange={handleChange} className={inputClasses}>
                    {themes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 border-2 border-dashed border-neutral-300 text-neutral-500 text-sm font-black uppercase tracking-widest">
                    No themes available. Admin must create one.
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={handleDownload}
              className="w-full font-black uppercase tracking-widest py-4 border-2 border-black transition-colors mt-8 text-lg bg-[#D4FF00] hover:bg-black hover:text-white text-black flex justify-center items-center gap-2"
            >
              <Download size={20} /> Download Card
            </button>
          </div>
        </div>

        {/* Preview Section */}
        <div className="flex flex-col items-center justify-center sticky top-28">
          <div className="w-full max-w-sm">
            <div className="mb-4 text-center">
              <span className="text-sm font-black uppercase tracking-widest text-neutral-500 bg-neutral-100 px-4 py-2 border-2 border-black inline-flex items-center gap-2">
                <Sparkles size={16} /> Live Preview
              </span>
            </div>
            {/* Wrapper to disable clicking the preview card */}
            <div className="pointer-events-none drop-shadow-xl">
              <div ref={cardRef} className="relative aspect-[750/1050] bg-white border-2 border-black overflow-hidden flex flex-col">
                {/* User Photo (Background) */}
                {imageUrl && (
                  <img 
                    src={imageUrl} 
                    className="absolute z-0 max-w-none" 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: `translate(${imageOffsetX}px, ${imageOffsetY}px) scale(${imageScale})`
                    }}
                  />
                )}
                
                {/* Theme Overlay */}
                {selectedTheme?.overlayImageUrl && (
                  <img src={selectedTheme.overlayImageUrl} className="absolute inset-0 w-full h-full object-cover z-10" />
                )}

                {/* Club Logo */}
                {(userClubLogoUrl || selectedTheme?.clubLogoUrl) && (
                  <img 
                    src={userClubLogoUrl || selectedTheme?.clubLogoUrl} 
                    className="absolute object-contain z-20" 
                    style={{
                      width: `${selectedTheme?.clubLogoSize ?? 80}px`,
                      height: `${selectedTheme?.clubLogoSize ?? 80}px`,
                      top: `${selectedTheme?.clubLogoTop ?? 6}%`,
                      left: `${selectedTheme?.clubLogoLeft ?? 6}%`
                    }}
                  />
                )}

                {/* Edition Logo */}
                {selectedTheme?.editionLogoUrl && (
                  <img 
                    src={selectedTheme.editionLogoUrl} 
                    className="absolute object-contain z-20" 
                    style={{
                      width: `${selectedTheme.editionLogoSize ?? 80}px`,
                      height: `${selectedTheme.editionLogoSize ?? 80}px`,
                      top: `${selectedTheme.editionLogoTop ?? 6}%`,
                      left: `${selectedTheme.editionLogoLeft ?? 80}%`
                    }}
                  />
                )}

                {/* User Name */}
                <div 
                  className="absolute left-0 right-0 flex justify-center z-20"
                  style={{ bottom: `${selectedTheme?.fontPositionBottom ?? 5}%` }}
                >
                  <span 
                    style={{ 
                      fontFamily: selectedTheme?.fontName ? `'${selectedTheme.fontName}', sans-serif` : 'inherit',
                      color: selectedTheme?.fontColor || '#ffffff',
                      fontSize: selectedTheme?.fontSize ? `${selectedTheme.fontSize}px` : '24px',
                      transform: `scaleX(${selectedTheme?.fontScaleX ?? 1}) scaleY(${selectedTheme?.fontScaleY ?? 1})`,
                      transformOrigin: 'bottom center'
                    }}
                    className="uppercase whitespace-nowrap"
                  >
                    {formData.player}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
