/**
 * Clixhora HRMS — Shared announcement theme utilities
 *
 * Single source of truth for:
 *  - theme image paths (must match /public/themes/*.png)
 *  - AccentBanner: the decorative image strip at the top of a card
 *  - Helper classes used by icon chips, popup headers, etc.
 */

import React from 'react';
import type { AnnouncementTheme } from '../../types';

// ─── Asset paths ──────────────────────────────────────────────
// Served from /public/themes/ — Vite copies these verbatim into /dist.

export const THEME_IMAGES: Record<AnnouncementTheme, string | null> = {
  none:         null,
  red:          '/themes/theme-red.png',
  firecrackers: '/themes/theme-firecrackers.png',
  flowers:      '/themes/theme-flowers.png',
  ribbon:       '/themes/theme-ribbon.png',
  popup:        '/themes/theme-popup.png',
};

// ─── Accent-colour palette ────────────────────────────────────

export const THEME_ACCENT: Record<AnnouncementTheme, { border: string; icon: string; iconText: string; badge: string }> = {
  none:         { border: 'border-slate-200',  icon: 'bg-brand-50',   iconText: 'text-brand-600',  badge: 'bg-slate-100 text-slate-500' },
  red:          { border: 'border-red-300',    icon: 'bg-red-50',     iconText: 'text-red-600',    badge: 'bg-red-50   text-red-600' },
  firecrackers: { border: 'border-amber-300',  icon: 'bg-amber-50',   iconText: 'text-amber-600',  badge: 'bg-amber-50 text-amber-700' },
  flowers:      { border: 'border-pink-300',   icon: 'bg-pink-50',    iconText: 'text-pink-600',   badge: 'bg-pink-50  text-pink-700' },
  ribbon:       { border: 'border-purple-300', icon: 'bg-purple-50',  iconText: 'text-purple-600', badge: 'bg-purple-50 text-purple-700' },
  popup:        { border: 'border-brand-300',  icon: 'bg-brand-50',   iconText: 'text-brand-600',  badge: 'bg-brand-50 text-brand-600' },
};

// ─── Theme emoji ──────────────────────────────────────────────

export const THEME_EMOJI: Partial<Record<AnnouncementTheme, string>> = {
  firecrackers: '🎆',
  flowers:      '🌸',
  ribbon:       '🎀',
  red:          '🔴',
  popup:        '📢',
};

// ─── AccentBanner ─────────────────────────────────────────────
// Renders a decorative image strip at the top of an announcement card.
// height controls how tall the strip is; defaults suit admin list vs full page.

interface AccentBannerProps {
  theme: AnnouncementTheme;
  /** Tailwind height class for the banner strip, e.g. "h-20" or "h-28". */
  heightClass?: string;
  className?: string;
}

export const AccentBanner: React.FC<AccentBannerProps> = ({
  theme,
  heightClass = 'h-20',
  className = '',
}) => {
  const src = THEME_IMAGES[theme];
  if (!src) return null; // 'none' → no banner at all

  return (
    <div
      className={`w-full ${heightClass} overflow-hidden rounded-t-xl flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover object-center select-none pointer-events-none"
        draggable={false}
        loading="lazy"
      />
    </div>
  );
};

// ─── PopupHeader ──────────────────────────────────────────────
// The decorative header section of the Popup-theme modal.

interface PopupHeaderProps {
  theme: AnnouncementTheme;
  title: string;
}

export const PopupHeader: React.FC<PopupHeaderProps> = ({ theme, title }) => {
  const src = THEME_IMAGES[theme];
  const accent = THEME_ACCENT[theme];

  if (src) {
    return (
      <div className="relative">
        <div className="h-32 w-full overflow-hidden">
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover object-center"
            draggable={false}
          />
        </div>
        {/* Title overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4">
          <h2 className="text-base font-bold text-white leading-snug">{title}</h2>
        </div>
      </div>
    );
  }

  // Fallback for 'none' or 'popup' without an image — solid brand gradient
  return (
    <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-5 pt-5 pb-7">
      <h2 className="text-base font-bold text-white leading-snug">{title}</h2>
    </div>
  );
};
