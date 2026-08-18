import React, { useState } from 'react';
import { User, auth, signOut } from '../lib/firebase';
import { LogOut, User as UserIcon, LogIn } from 'lucide-react';
import { AuthModal } from './AuthModal';

interface UserAuthProps {
  user: User | null;
  onOpenProfile?: () => void;
  isProfileActive?: boolean;
}

export function UserAuth({ user, onOpenProfile, isProfileActive }: UserAuthProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleLogout = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {user ? (
          <div className="flex items-center gap-2">
            {/* Direct Profile Button replacing Sign In */}
            <button
              onClick={onOpenProfile}
              className={`flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1.5 border-2 border-black transition-all ${
                isProfileActive
                  ? 'bg-black text-[#D4FF00] shadow-[2px_2px_0px_0px_#D4FF00] sm:shadow-[3px_3px_0px_0px_#D4FF00]'
                  : 'bg-white hover:bg-[#D4FF00] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
              }`}
              title="Open Collector Profile"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  className="w-6 h-6 sm:w-7 sm:h-7 border border-black object-cover shrink-0"
                />
              ) : (
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-[#D4FF00] text-black border border-black flex items-center justify-center font-black shrink-0 text-xs">
                  <UserIcon size={13} />
                </div>
              )}
              <div className="hidden xs:flex flex-col text-left">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate max-w-[70px] sm:max-w-[130px] leading-tight">
                  {user.displayName || user.email?.split('@')[0] || 'PROFILE'}
                </span>
                <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-neutral-500 leading-none">
                  {isProfileActive ? 'ACTIVE' : 'PROFILE'}
                </span>
              </div>
            </button>

            {/* Quick Sign Out */}
            <button
              onClick={handleLogout}
              className="p-1.5 sm:p-2 border-2 border-black bg-white hover:bg-neutral-100 text-neutral-700 hover:text-black transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut size={13} className="sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowAuthModal(true)}
            className="text-[11px] sm:text-xs md:text-sm font-black text-black bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] px-2.5 sm:px-4 py-1.5 sm:py-2 border-2 border-black uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
          >
            <LogIn size={14} className="sm:w-4 sm:h-4" /> 
            <span>Sign In</span>
          </button>
        )}
      </div>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </>
  );
}
