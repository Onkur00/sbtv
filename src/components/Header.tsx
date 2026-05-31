/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { EnhancedChannel } from '../types.ts';
import { playBeep } from '../utils/beep.ts';
import { UserCredential } from '../users/credentials.ts';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filteredChannels: EnhancedChannel[];
  activeChannelUrl: string | null;
  onSelectChannel: (url: string, name: string, el?: HTMLElement) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  currentUser: UserCredential | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchTerm,
  setSearchTerm,
  filteredChannels,
  activeChannelUrl,
  onSelectChannel,
  inputRef,
  currentUser,
  onLogout,
}) => {
  const isSearching = searchTerm.trim().length > 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleItemClick = (ch: EnhancedChannel, e: React.MouseEvent<HTMLDivElement>) => {
    playBeep('select');
    onSelectChannel(ch.url, ch.name, e.currentTarget);
    setSearchTerm(''); // Clear search on selecting suggestion
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, ch: EnhancedChannel) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      playBeep('select');
      onSelectChannel(ch.url, ch.name, e.currentTarget);
      setSearchTerm('');
    }
  };

  const handleLogoutClick = () => {
    playBeep('select');
    onLogout();
  };

  // Helper to escape regex special characters for highlighting search text
  const highlightText = (text: string, term: string) => {
    if (!term.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === term.toLowerCase() ? (
            <span key={index} className="bg-yellow-400 text-slate-900 font-bold px-0.5 rounded-sm">
              {part}
            </span>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <div className="sticky top-0 z-20 bg-linear-to-b from-[#0b1120] to-[#0f172a] shadow-lg pb-1">
      {/* Search Bar Section */}
      <div className="mx-5 mt-1.5 mb-1 bg-slate-900/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-yellow-400/30 flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            id="searchInput"
            ref={inputRef}
            type="text"
            className="w-full bg-slate-800 border-none py-2 px-4.5 pr-16 rounded-full text-white text-sm outline-hidden focus:ring-2 focus:ring-yellow-400 focus:bg-[#0f172a] transition-all"
            placeholder="🔍 Search channel..."
            autoComplete="off"
            value={searchTerm}
            onChange={handleInputChange}
          />
          {isSearching && (
            <span 
              id="searchCount" 
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-yellow-400 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full"
            >
              {filteredChannels.length}
            </span>
          )}
        </div>

        {/* User Pill Info / Sign out */}
        {currentUser && (
          <div className="flex items-center gap-2">
            <button
              id="logoutBtn"
              onClick={handleLogoutClick}
              className="bg-red-950/70 hover:bg-red-900 border border-red-500/30 text-rose-400 hover:text-white text-[11px] font-bold py-1.5 px-3.5 rounded-full transition-all focus-visible:outline-3 focus-visible:outline-yellow-400 cursor-pointer uppercase tracking-wider flex items-center gap-1 shadow-md shadow-red-950/20"
              title="Logout Account"
            >
              <span>🚪</span> <span className="font-mono font-black">SB LOGOUT</span>
            </button>
          </div>
        )}
      </div>

      {/* Horizontal Suggestion Strip */}
      {isSearching && filteredChannels.length > 0 && (
        <div id="horizontalStrip" className="mx-5 my-1 overflow-x-auto overflow-y-hidden whitespace-nowrap py-1 scrollbar-none">
          <div className="flex gap-2">
            {filteredChannels.map((ch) => {
              const isActive = activeChannelUrl === ch.url;
              return (
                <div
                  key={`strip-${ch.id}-${ch.category}`}
                  data-url={ch.url}
                  data-name={ch.name}
                  tabIndex={0}
                  onClick={(e) => handleItemClick(ch, e)}
                  onKeyDown={(e) => handleKeyDown(e, ch)}
                  className={`strip-item inline-flex items-center gap-1.5 bg-slate-950 px-3.5 py-1 rounded-full cursor-pointer text-xs font-semibold border-2 transition-all hover:bg-slate-800 focus-visible:outline-4 focus-visible:outline-yellow-400 outline-hidden ${
                    isActive 
                      ? 'border-yellow-400 bg-yellow-450 text-yellow-400 ring-2 ring-yellow-400' 
                      : 'border-yellow-400/30 text-white'
                  }`}
                >
                  <img 
                    src={ch.logoUrl || `https://placehold.co/40x40/1e293b/facc15?text=${ch.short[0]}`} 
                    alt={ch.name} 
                    className="w-5 h-5 rounded-full object-cover shrink-0" 
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://placehold.co/40x40/1e293b/facc15?text=${ch.short[0]}`;
                    }}
                  />
                  <span>{highlightText(ch.name, searchTerm)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
