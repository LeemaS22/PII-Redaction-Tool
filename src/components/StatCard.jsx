import React from 'react';
import {
  FileText,
  ScanSearch,
  Eraser,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { motion } from 'framer-motion';

const ICON_MAP = {
  FileText: FileText,
  ScanSearch: ScanSearch,
  Eraser: Eraser,
  ShieldCheck: ShieldCheck,
};

const ACCENT_STYLES = {
  sky: {
    iconWrap: 'border-sky-500/25 bg-sky-500/10 text-sky-400',
    topGlow: 'from-sky-500/15 via-transparent to-transparent',
  },
  amber: {
    iconWrap: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
    topGlow: 'from-amber-500/15 via-transparent to-transparent',
  },
  indigo: {
    iconWrap: 'border-indigo-500/25 bg-indigo-500/10 text-indigo-400',
    topGlow: 'from-indigo-500/15 via-transparent to-transparent',
  },
  emerald: {
    iconWrap: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
    topGlow: 'from-emerald-500/15 via-transparent to-transparent',
  },
};

export default function StatCard({
  title,
  value,
  sublabel,
  trend,
  trendDirection = 'up',
  trendContext = 'vs previous period',
  iconName = 'FileText',
  accentColor = 'sky',
  index = 0,
}) {
  const IconComponent = ICON_MAP[iconName] || FileText;
  const accent = ACCENT_STYLES[accentColor] || ACCENT_STYLES.sky;
  const isUp = trendDirection === 'up';

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="relative overflow-hidden rounded-xl border border-slate-800/90 bg-[#111726] p-5 transition-colors duration-150 hover:border-slate-700/90"
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${accent.topGlow}`}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-xs font-medium text-slate-400">{title}</h3>
          <div className="mt-2 font-mono text-3xl font-semibold tracking-tight text-slate-100 tabular-nums">
            {value}
          </div>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${accent.iconWrap}`}
        >
          <IconComponent className="h-5 w-5" />
        </div>
      </div>

      {sublabel && (
        <p className="relative mt-2 truncate text-xs text-slate-400">
          {sublabel}
        </p>
      )}

      <div className="relative mt-4 flex items-center gap-1.5 border-t border-slate-800/70 pt-3 text-xs">
        {isUp ? (
          <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        )}
        <span
          className={`font-mono font-semibold tabular-nums ${
            isUp ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {trend}
        </span>
        <span className="text-slate-500" aria-hidden="true">
          ·
        </span>
        <span className="truncate text-slate-400">{trendContext}</span>
      </div>
    </motion.article>
  );
}
