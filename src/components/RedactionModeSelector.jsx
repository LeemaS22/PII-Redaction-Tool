import React from 'react';
import { ShieldCheck, EyeOff, Hash } from 'lucide-react';

const REDACTION_MODES = [
  {
    id: 'standard',
    title: 'STANDARD',
    subtitle: 'Semantic Token',
    description: 'Replaces sensitive identifiers with entity tags.',
    example: 'Rahul Kumar → [PERSON]',
    icon: ShieldCheck,
  },
  {
    id: 'mask',
    title: 'MASK',
    subtitle: 'Contextual Masking',
    description: 'Masks inner characters while preserving format context.',
    example: 'Rahul Kumar → R**** K****',
    icon: EyeOff,
  },
  {
    id: 'strict',
    title: 'STRICT',
    subtitle: 'Complete Blackout',
    description: 'Irreversible solid redaction blocks for maximum anonymity.',
    example: 'Rahul Kumar → ████████████',
    icon: Hash,
  },
];

export default function RedactionModeSelector({ selectedMode, onSelectMode }) {
  return (
    <section aria-labelledby="redaction-mode-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3
            id="redaction-mode-heading"
            className="text-sm font-semibold text-slate-100"
          >
            Redaction Mode
          </h3>
          <p className="text-xs text-slate-400">
            Select masking strategy for detected sensitive entities.
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-2.5"
        role="radiogroup"
        aria-labelledby="redaction-mode-heading"
      >
        {REDACTION_MODES.map((mode) => {
          const isSelected = selectedMode === mode.id;
          const Icon = mode.icon;

          return (
            <div
              key={mode.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onSelectMode(mode.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onSelectMode(mode.id);
                }
              }}
              className={`group flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all duration-150 ${
                isSelected
                  ? 'border-sky-500/50 bg-sky-500/10 shadow-xs'
                  : 'border-slate-800 bg-[#111726] hover:border-slate-700 hover:bg-[#131b2e]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      isSelected
                        ? 'border-sky-500/30 bg-sky-500/20 text-sky-300'
                        : 'border-slate-700 bg-slate-800/80 text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold tracking-wider text-slate-100">
                        {mode.title}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        · {mode.subtitle}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {mode.description}
                    </p>
                  </div>
                </div>

                {/* Radio Indicator */}
                <div
                  className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isSelected
                      ? 'border-sky-400 bg-sky-400'
                      : 'border-slate-600 bg-transparent group-hover:border-slate-500'
                  }`}
                  aria-hidden="true"
                >
                  {isSelected && (
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                  )}
                </div>
              </div>

              {/* Visual example box */}
              <div className="mt-3 rounded-lg border border-slate-800/90 bg-[#090D16]/80 px-3 py-1.5 font-mono text-xs tabular-nums text-slate-300">
                <span className="text-slate-500">Example: </span>
                <span
                  className={
                    isSelected ? 'font-medium text-sky-300' : 'text-slate-300'
                  }
                >
                  {mode.example}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
