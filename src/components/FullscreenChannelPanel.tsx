/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { EnhancedChannel } from '../types.ts';
import { enhancedChannels } from '../data.ts';
import { playBeep } from '../utils/beep.ts';

interface FullscreenChannelPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filteredChannels: EnhancedChannel[]; // Kept for type compatibility
  activeChannelUrl: string | null;
  onSelectChannel: (url: string, name: string) => void;
}

export const FullscreenChannelPanel: React.FC<FullscreenChannelPanelProps> = ({
  isOpen,
  onClose,
  activeChannelUrl,
  onSelectChannel,
}) => {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [fsCategory, setFsCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Channels' },
    { id: 'news', label: 'News' },
    { id: 'sports', label: 'Sports' },
    { id: 'kids', label: 'Kids' },
    { id: 'bangla', label: 'Bangla' },
    { id: 'hindi', label: 'Hindi' },
    { id: 'english', label: 'English' },
  ];

  // Auto focus the active category button or first item when panel is opened
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeBtn = listRef.current.querySelector('.fs-cat-btn.bg-yellow-400') as HTMLElement;
      if (activeBtn) {
        activeBtn.focus();
      } else {
        const firstItem = listRef.current.querySelector('.fs-channel-item') as HTMLElement;
        if (firstItem) {
          firstItem.focus();
        }
      }
    }
  }, [isOpen]);

  // Dynamically filter all channels based on the overlay's selected category
  const channelsToRender = useMemo(() => {
    if (fsCategory === 'all') return enhancedChannels;
    return enhancedChannels.filter(ch => ch.category === fsCategory);
  }, [fsCategory]);

  if (!isOpen) return null;

  const handleCategoryClick = (catId: string) => {
    playBeep('select');
    setFsCategory(catId);
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, catId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      playBeep('select');
      setFsCategory(catId);
    }
  };

  const handleItemClick = (ch: EnhancedChannel) => {
    playBeep('select');
    onSelectChannel(ch.url, ch.name);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, ch: EnhancedChannel) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      playBeep('select');
      onSelectChannel(ch.url, ch.name);
      onClose();
    }
  };

  return (
    <div 
      id="fullscreenPanel" 
      className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/70 to-slate-950/10 p-5 z-50 flex flex-col justify-end gap-3 select-none transition-all duration-300 animate-slide-up"
    >
      {/* Panel Header */}
      <div className="panel-header flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10 mt-auto">
        <div className="flex items-center justify-between md:justify-start gap-4">
          {/* Title and Badge removed as per user request */}
        </div>

        {/* Categories Bar inside the overlay for complete accessibility */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full scrollbar-none whitespace-nowrap">
          {categories.map((cat) => {
            const isActive = fsCategory === cat.id;
            return (
              <button
                key={`fscat-${cat.id}`}
                onClick={() => handleCategoryClick(cat.id)}
                onKeyDown={(e) => handleCategoryKeyDown(e, cat.id)}
                className={`fs-channel-item fs-cat-btn px-4 py-1.5 rounded-full font-bold text-xs cursor-pointer transition-all shrink-0 outline-hidden focus-visible:outline-3 focus-visible:outline-yellow-400 focus-visible:scale-105 ${
                  isActive 
                    ? 'bg-yellow-400 text-slate-950 shadow-md ring-1 ring-yellow-400 font-extrabold' 
                    : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border border-white/5 backdrop-blur-md'
                }`}
                tabIndex={0}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          id="closePanelBtn"
          onClick={() => {
            playBeep('select');
            onClose();
          }}
          className="absolute top-4 right-4 text-white bg-slate-900/60 hover:bg-slate-800/80 h-8 w-8 text-sm flex items-center justify-center rounded-full cursor-pointer focus-visible:outline-3 focus-visible:outline-yellow-400 focus-visible:outline-offset-2 outline-hidden transition-colors border border-white/5 backdrop-blur-md"
          tabIndex={0}
          title="Close guide"
        >
          ✕
        </button>
      </div>

      {/* Channel Grid matching the premium dashboard */}
      <div 
        ref={listRef}
        id="fullscreenChannelList" 
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 max-h-[50vh] overflow-y-auto py-2 pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-yellow-400/40"
      >
        {channelsToRender.length === 0 ? (
          <div className="text-center text-slate-400 text-[12px] py-10 w-full col-span-full">
            ⚠️ No channels available under this match.
          </div>
        ) : (
          channelsToRender.map((ch) => {
            const isActive = activeChannelUrl === ch.url;
            return (
              <div
                key={`fscard-${ch.id}-${ch.category}`}
                data-url={ch.url}
                data-name={ch.name}
                tabIndex={0}
                onClick={() => handleItemClick(ch)}
                onKeyDown={(e) => handleKeyDown(e, ch)}
                className={`fs-channel-item fs-channel-card p-2.5 sm:p-4 rounded-2xl text-center cursor-pointer transition-all border outline-hidden flex flex-col justify-center items-center hover:-translate-y-0.5 hover:bg-white/10 hover:scale-105 focus-visible:outline-3 focus-visible:outline-yellow-400 focus-visible:scale-105 ${
                  isActive 
                    ? 'border-yellow-400 bg-yellow-400/15 shadow-xl font-bold scale-105' 
                    : 'border-white/5 bg-slate-900/40 backdrop-blur-xs'
                }`}
              >
                <img 
                  src={ch.logoUrl || `https://placehold.co/160x160/1e293b/facc15?text=${ch.short}`} 
                  alt={ch.name} 
                  className={`w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 rounded-2xl mx-auto object-cover block transition-transform duration-300 ${
                    isActive ? 'shadow-lg shadow-yellow-400/30 border border-yellow-400' : 'shadow-md border border-white/5 hover:border-white/20'
                  }`}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://placehold.co/160x160/1e293b/facc15?text=${ch.short}`;
                  }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
