/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EnhancedChannel } from '../types.ts';
import { playBeep } from '../utils/beep.ts';

interface ChannelContainerProps {
  activeCategory: string;
  filteredChannels: EnhancedChannel[];
  allChannels: EnhancedChannel[];
  searchTerm: string;
  activeChannelUrl: string | null;
  onSelectChannel: (url: string, name: string, el?: HTMLElement) => void;
}

export const ChannelContainer: React.FC<ChannelContainerProps> = ({
  activeCategory,
  filteredChannels,
  allChannels,
  searchTerm,
  activeChannelUrl,
  onSelectChannel,
}) => {
  const isSearching = searchTerm.trim().length > 0;

  // Custom key/Enter triggers for item card selection
  const handleItemClick = (ch: EnhancedChannel, e: React.MouseEvent<HTMLDivElement>) => {
    playBeep('select');
    onSelectChannel(ch.url, ch.name, e.currentTarget);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, ch: EnhancedChannel) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      playBeep('select');
      onSelectChannel(ch.url, ch.name, e.currentTarget);
    }
  };

  // Helper to highlight matching characters in name during search
  const highlightText = (text: string, term: string) => {
    if (!term.trim()) return text;
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, idx) => 
          part.toLowerCase() === term.toLowerCase() ? (
            <span key={idx} className="bg-yellow-400 text-[#0f172a] font-bold px-0.5 rounded-sm">
              {part}
            </span>
          ) : (
            <span key={idx}>{part}</span>
          )
        )}
      </>
    );
  };

  // If user is in the "all" category and is NOT searching, represent grouped carousels
  if (activeCategory === 'all' && !isSearching) {
    const categoriesList = ['News', 'Sports', 'Kids', 'Bangla', 'Hindi', 'English'];
    
    // Group all channels by their display group title mapping
    const groupedMap = new Map<string, EnhancedChannel[]>();
    for (const ch of allChannels) {
      // Find matches for group title order
      let matchedGroup = 'Other';
      for (const cat of categoriesList) {
        if (ch.original.groupTitle.toLowerCase() === cat.toLowerCase() || ch.category.toLowerCase() === cat.toLowerCase()) {
          matchedGroup = cat;
          break;
        }
      }
      
      // If none matches but group title is defined (like "Akash Go" which is bangla), we fallback to groupTitle
      if (matchedGroup === 'Other' && ch.original.groupTitle) {
        matchedGroup = ch.original.groupTitle;
      }

      if (!groupedMap.has(matchedGroup)) {
        groupedMap.set(matchedGroup, []);
      }
      groupedMap.get(matchedGroup)!.push(ch);
    }

    // Sort sections so preferred order comes first
    const headingsOrder = [...categoriesList];
    groupedMap.forEach((_, key) => {
      if (!headingsOrder.includes(key)) headingsOrder.push(key);
    });

    return (
      <div className="px-5 py-4 bg-slate-950">
        {headingsOrder.map((groupTitle) => {
          const channelsInGroup = groupedMap.get(groupTitle) || [];
          if (channelsInGroup.length === 0) return null;

          return (
            <div key={groupTitle} className="mb-8 last:mb-2 text-left">
              <h3 className="text-base font-bold text-yellow-300 mb-3 select-none tracking-wide uppercase">
                {groupTitle}
              </h3>
              
              <div 
                className="group-channel-grid flex flex-row overflow-x-auto gap-4 py-3 px-1.5 scrollbar-none whitespace-nowrap"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {channelsInGroup.map((ch) => {
                  const isActive = activeChannelUrl === ch.url;
                  return (
                    <div
                      key={`grouped-${ch.id}-${ch.category}`}
                      data-url={ch.url}
                      data-name={ch.name}
                      tabIndex={0}
                      onClick={(e) => handleItemClick(ch, e)}
                      onKeyDown={(e) => handleKeyDown(e, ch)}
                      className={`channel-logo-card shrink-0 w-22 h-22 sm:w-28 sm:h-28 p-3 bg-slate-900 rounded-3xl text-center cursor-pointer transition-all border flex items-center justify-center hover:bg-slate-855 focus-visible:outline-3 focus-visible:outline-yellow-400 outline-hidden hover:-translate-y-1 hover:scale-105 active:scale-95 ${
                        isActive 
                          ? 'border-yellow-400 bg-slate-800 ring-2 ring-yellow-400 shadow-xl scale-105 font-bold active-channel' 
                          : 'border-yellow-400/5 hover:border-yellow-400/25'
                      }`}
                    >
                      <img 
                        src={ch.logoUrl || `https://placehold.co/160x160/1e293b/facc15?text=${ch.short}`} 
                        alt={ch.name} 
                        className={`w-14 h-14 sm:w-18 sm:h-18 rounded-2xl mx-auto object-cover block transition-transform duration-300 ${
                          isActive ? 'shadow-lg shadow-yellow-400/30 scale-102 border border-yellow-400' : 'shadow-md border border-white/5'
                        }`}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `https://placehold.co/160x160/1e293b/facc15?text=${ch.short}`;
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Otherwise, render a single responsive flat grid layout
  return (
    <div className="px-5 py-4 bg-slate-950">
      {filteredChannels.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm select-none">
          😞 No channels match your selection or search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {filteredChannels.map((ch) => {
            const isActive = activeChannelUrl === ch.url;
            return (
              <div
                key={`flat-${ch.id}-${ch.category}`}
                data-url={ch.url}
                data-name={ch.name}
                tabIndex={0}
                onClick={(e) => handleItemClick(ch, e)}
                onKeyDown={(e) => handleKeyDown(e, ch)}
                className={`channel-logo-card p-3 bg-slate-900 rounded-3xl cursor-pointer transition-all border w-full aspect-square flex items-center justify-center hover:bg-slate-855 focus-visible:outline-3 focus-visible:outline-yellow-400 outline-hidden hover:-translate-y-1 hover:scale-105 active:scale-95 ${
                  isActive 
                    ? 'border-yellow-400 bg-slate-800 ring-2 ring-yellow-400 shadow-xl scale-105 font-bold active-channel' 
                    : 'border-yellow-400/5 hover:border-yellow-400/25'
                }`}
              >
                <img 
                  src={ch.logoUrl || `https://placehold.co/160x160/1e293b/facc15?text=${ch.short}`} 
                  alt={ch.name} 
                  className={`w-14 h-14 sm:w-18 sm:h-18 rounded-2xl object-cover block transition-transform duration-300 ${
                    isActive ? 'shadow-lg shadow-yellow-400/30 scale-102 border border-yellow-400' : 'shadow-md border border-white/5'
                  }`}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://placehold.co/160x160/1e293b/facc15?text=${ch.short}`;
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
