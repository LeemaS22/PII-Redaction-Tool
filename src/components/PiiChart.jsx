import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

const BAR_COLORS = [
  '#38BDF8', // Email
  '#60A5FA', // Phone
  '#F59E0B', // Aadhaar
  '#F43F5E', // Credit Card
  '#A855F7', // Bank Account
  '#10B981', // IP Address
  '#06B6D4', // DOB
  '#6366F1', // Passport
];

function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-700 bg-[#0B0F19] p-3 text-xs shadow-xl">
      <div className="font-semibold text-slate-100">{label}</div>
      <div className="mt-1.5 space-y-1 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4 text-sky-300">
          <span>Detected:</span>
          <span className="font-semibold">{item.detected}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-emerald-400">
          <span>Redacted:</span>
          <span className="font-semibold">{item.redacted}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-400">
          <span>Share:</span>
          <span>{item.share}</span>
        </div>
      </div>
    </div>
  );
}

export default function PiiChart({ data = [] }) {
  const [metricMode, setMetricMode] = useState('detected');

  const totalInstances = data.reduce((sum, item) => sum + (item.detected || item.count || 0), 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.16 }}
      aria-labelledby="pii-distribution-heading"
      className="flex flex-col justify-between rounded-xl border border-slate-800/90 bg-[#111726] p-6 h-full"
    >
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2
              id="pii-distribution-heading"
              className="text-base font-semibold text-slate-100"
            >
              PII Entity Distribution
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Aggregated from verified MongoDB detection records
            </p>
          </div>

          {data.length > 0 && (
            <div
              className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0B0F19] p-1"
              role="group"
              aria-label="Chart display mode"
            >
              <button
                type="button"
                onClick={() => setMetricMode('detected')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  metricMode === 'detected'
                    ? 'bg-slate-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Detected Volume
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('comparison')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  metricMode === 'comparison'
                    ? 'bg-slate-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Detected vs Redacted
              </button>
            </div>
          )}
        </div>

        {data.length > 0 ? (
          <>
            <div className="mt-6 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  barGap={6}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1E293B"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="category"
                    axisLine={{ stroke: '#1E293B' }}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: '#64748B',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<CustomChartTooltip />}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.06)' }}
                  />

                  {metricMode === 'detected' ? (
                    <Bar
                      dataKey="detected"
                      name="Detected PII"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                    >
                      {data.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.category || index}`}
                          fill={BAR_COLORS[index % BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  ) : (
                    <>
                      <Bar
                        dataKey="detected"
                        name="Detected"
                        fill="#38BDF8"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={24}
                      />
                      <Bar
                        dataKey="redacted"
                        name="Redacted"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={24}
                      />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-4 sm:grid-cols-3">
              {data.map((item, idx) => (
                <div
                  key={item.category || idx}
                  className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-[#0B0F19]/60 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                      }}
                      aria-hidden="true"
                    />
                    <span className="truncate font-medium text-slate-300">
                      {item.category}
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-slate-100 tabular-nums">
                    {item.detected}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="my-12 py-10 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#0B0F19] text-slate-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-semibold text-slate-300">
              No PII Entities Recorded
            </h4>
            <p className="mx-auto max-w-xs text-[11px] text-slate-500">
              Scan documents to populate real-time entity distribution charts.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-400">
        <span>Source: MongoDB Detections Collection</span>
        <span className="font-mono text-slate-300 tabular-nums">
          Total: {totalInstances} {totalInstances === 1 ? 'instance' : 'instances'}
        </span>
      </div>
    </motion.section>
  );
}
