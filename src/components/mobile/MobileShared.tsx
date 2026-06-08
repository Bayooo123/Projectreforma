'use client';

import React, { useState, useEffect } from 'react';
import './mobile.css';

// ── Icons ─────────────────────────────────────────────────────────────
const PATHS: Record<string, string> = {
  home:      'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5',
  file:      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  gavel:     'M14 13l-7.5 7.5a2.1 2.1 0 0 1-3-3L11 10M13.5 6.5l4 4M9.5 10.5l6-6M15.5 4.5l4 4M11.5 18.5h8',
  scale:     'M12 3v18M7 7h10M5 21h14M6.5 7 4 13h5zM17.5 7 15 13h5z',
  naira:     'M6 4v16M18 4v16M6 5l12 14M4 9.5h16M4 14.5h16',
  chart:     'M3 3v18h18M8 14v3M13 9v8M18 5v12',
  shield:    'M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6zM9.5 12l2 2 3.5-4',
  users:     'M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22 19v-2a4 4 0 0 0-3-3.8M16 2.2A4 4 0 0 1 16 9.8',
  inbox:     'M22 12h-6l-2 3h-4l-2-3H2M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5a2 2 0 0 0-1.8-1H7.3a2 2 0 0 0-1.8 1z',
  terminal:  'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM7 9l3 3-3 3M13 15h4',
  grid:      'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  plus:      'M12 5v14M5 12h14',
  search:    'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  bell:      'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  chevR:     'M9 6l6 6-6 6',
  chevL:     'M15 6l-6 6 6 6',
  chevD:     'M6 9l6 6 6-6',
  cal:       'M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  pin:       'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  clock:     'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  check:     'M20 6 9 17l-5-5',
  checkc:    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 12l2.5 2.5 4.5-5',
  alert:     'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
  trUp:      'M22 7 13.5 15.5l-4-4L2 19M16 7h6v6',
  trDown:    'M22 17 13.5 8.5l-4 4L2 5M16 17h6v-6',
  more:      'M5 12h.01M12 12h.01M19 12h.01',
  dots:      'M12 5h.01M12 12h.01M12 19h.01',
  x:         'M18 6 6 18M6 6l12 12',
  arrowUR:   'M7 17 17 7M7 7h10v10',
  folder:    'M4 20h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-7.6l-2-2.2H4a1 1 0 0 0-1 1V19a1 1 0 0 0 1 1z',
  spark:     'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
  filter:    'M3 5h18l-7 8v6l-4 2v-8z',
  download:  'M12 3v12M7 11l5 4 5-4M5 21h14',
  doc:       'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
  building:  'M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h6v6H9z',
  globe:     'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z',
  map:       'M9 3 3 5v16l6-2 6 2 6-2V3l-6 2zM9 3v16M15 5v16',
  receipt:   'M4 3v18l2.5-1.5L9 21l2.5-1.5L14 21l2.5-1.5L19 21V3l-2.5 1.5L14 3l-2.5 1.5L9 3 6.5 4.5zM8 8h8M8 12h8',
  wallet:    'M3 7a2 2 0 0 1 2-2h13v3M3 7v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M3 7h16M17 12h.01a2 2 0 0 1 0 4H21v-4z',
  user:      'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  refresh:   'M21 12a9 9 0 1 1-2.6-6.3M21 4v4h-4',
};

export function Icon({ n, s = 22, c = 'currentColor', sw = 1.9, fill = 'none', style }: { n: string, s?: number, c?: string, sw?: number, fill?: string, style?: React.CSSProperties }) {
  if (!PATHS[n]) return null;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={c}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {PATHS[n].split('M').filter(Boolean).map((d, i) => <path key={i} d={'M' + d} />)}
    </svg>
  );
}

// ── Status pill ───────────────────────────────────────────────────────
export function Pill({ kind, children }: { kind: string, children: React.ReactNode }) {
  return <span className={`rm-pill ${kind}`}><span className="d" />{children}</span>;
}

// ── currency ──────────────────────────────────────────────────────────
export const ngn = (n: number) => '₦' + Number(n).toLocaleString('en-NG');
export const ngnShort = (n: number) => n >= 1e6 ? '₦' + (n/1e6).toFixed(1) + 'M' : n >= 1e3 ? '₦' + Math.round(n/1e3) + 'K' : '₦' + n;

// ── Donut chart ───────────────────────────────────────────────────────
export function Donut({ data, size = 132, thick = 16 }: { data: { value: number, color: string }[], size?: number, thick?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thick) / 2, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size/2} ${size/2})`}>
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const seg = (
            <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
              stroke={d.color} strokeWidth={thick}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off}
              strokeLinecap="butt" />
          );
          off += len; return seg;
        })}
      </g>
    </svg>
  );
}

// ── Sparkline / area ──────────────────────────────────────────────────
export function AreaChart({ data, h = 132, color = '#059669' }: { data: { amount: number, month: string }[], h?: number, color?: string }) {
  const W = 320, PAD = 10;
  const max = Math.max(...data.map(d => d.amount), 1);
  const pts = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - d.amount / max) * (h - PAD * 2 - 18),
    ...d,
  }));
  const line = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M ${pts[0].x},${h-18} ` + pts.map(p => `L ${p.x},${p.y}`).join(' ') + ` L ${pts[pts.length-1].x},${h-18} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0,.5,1].map((t,i)=>(<line key={i} x1={PAD} y1={PAD+t*(h-PAD*2-18)} x2={W-PAD} y2={PAD+t*(h-PAD*2-18)} stroke="#E2E8F0" strokeWidth="1" />))}
      <path d={area} fill="url(#ag)" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {pts.map((p,i)=>(<circle key={i} cx={p.x} cy={p.y} r="3" fill="#fff" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />))}
      {pts.map((p,i)=>(<text key={i} x={p.x} y={h-2} fontSize="9" fill="#94A3B8" textAnchor="middle" fontFamily="IBM Plex Sans">{p.month}</text>))}
    </svg>
  );
}

export function BottomSheet({ title, isOpen, onClose, children }: { title: string, isOpen: boolean, onClose: () => void, children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <>
      <div className={`rm-sheet-scrim show`} onClick={onClose} />
      <div className={`rm-sheet show`}>
        <div className="rm-sheet-grab" />
        <div className="rm-sheet-head">
          <h3>{title}</h3>
          <button className="rm-icon-btn" style={{ width:34, height:34 }} onClick={onClose}><Icon n="x" s={18} /></button>
        </div>
        {children}
      </div>
    </>
  );
}
