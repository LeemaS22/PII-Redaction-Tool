import React from 'react';
import { Check } from 'lucide-react';

export const DETECTION_OPTION_ITEMS = [
  { id: 'person', label: 'Person Names', note: 'NLP' },
  { id: 'email', label: 'Email Addresses' },
  { id: 'phone', label: 'Phone Numbers' },
  { id: 'aadhaar', label: 'Aadhaar Numbers' },
  { id: 'pan', label: 'PAN Numbers' },
  { id: 'upi', label: 'UPI IDs' },
  { id: 'dl', label: 'Driving License Numbers' },
  { id: 'voter', label: 'Voter ID Numbers' },
  { id: 'card', label: 'Credit/Debit Cards' },
  { id: 'bank', label: 'Bank Accounts' },
  { id: 'medical', label: 'Medical Record IDs' },
  { id: 'emp', label: 'Employee IDs' },
  { id: 'vehicle', label: 'Vehicle Registration' },
  { id: 'address', label: 'Addresses', note: 'NLP' },
  { id: 'dob', label: 'Dates of Birth' },
  { id: 'ip', label: 'IP Addresses' },
  { id: 'passport', label: 'Passport Numbers' },
];

export default function DetectionOptions({ options, onToggleOption, onToggleAll }) {
  const allSelected = DETECTION_OPTION_ITEMS.every((item) => options[item.id]);

  return (
    <section aria-labelledby="detection-options-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3
            id="detection-options-heading"
            className="text-sm font-semibold text-slate-100"
          >
            Detection Options
          </h3>
          <p className="text-xs text-slate-400">
            Entity classifications targeted during scanning.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggleAll(!allSelected)}
          className="text-xs font-medium text-sky-400 transition-colors hover:text-sky-300"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-800 bg-[#111726] p-4 sm:grid-cols-2">
        {DETECTION_OPTION_ITEMS.map((item) => {
          const isChecked = Boolean(options[item.id]);

          return (
            <label
              key={item.id}
              className="flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-slate-800/60"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    isChecked
                      ? 'border-sky-500 bg-sky-500 text-slate-950'
                      : 'border-slate-600 bg-slate-800 text-transparent'
                  }`}
                >
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleOption(item.id)}
                  className="sr-only"
                  aria-label={item.label}
                />
                <span className="truncate text-xs font-medium text-slate-200">
                  {item.label}
                </span>
              </div>

              {item.note && (
                <span className="shrink-0 text-[10px] text-slate-500 font-mono">
                  {item.note}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </section>
  );
}
