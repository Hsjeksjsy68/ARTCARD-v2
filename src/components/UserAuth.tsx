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
              className={`flex items-center gap-2.5 px-3 py-1.5 border-2 border-black transition-all ${
                isProfileActive
                  ? 'bg-black text-[#D4FF00] shadow-[3px_3px_0px_0px_#D4FF00]'
                  : 'bg-white hover:bg-[#D4FF00] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
              }`}
              title="Open Collector Profile"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  className="w-7 h-7 border border-black object-cover shrink-0"
                />
              ) : (
                <div className="w-7 h-7 bg-[#D4FF00] text-black border border-black flex items-center justify-center font-black shrink-0">
                  <UserIcon size={14} />
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-[100px] sm:max-w-[130px] leading-tight">
                  {user.displayName || user.email?.split('@')[0] || 'PROFILE'}
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500 leading-none">
                  {isProfileActive ? 'ACTIVE VIEW' : 'VIEW PROFILE'}
                </span>
              </div>
            </button>

            {/* Quick Sign Out */}
            <button
              onClick={handleLogout}
              className="p-2 border-2 border-black bg-white hover:bg-neutral-100 text-neutral-700 hover:text-black transition-colors"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowAuthModal(true)}
            className="text-xs sm:text-sm font-black text-black bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] px-3 sm:px-4 py-2 border-2 border-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5"
          >
            <LogIn size={16} /> Sign In
          </button>
        )}
      </div>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </>
  );
}
