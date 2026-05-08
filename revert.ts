import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/bg-white\b/g, 'bg-[#0a0f1d]')
                 .replace(/bg-slate-50\b/g, 'bg-white/[0.02]')
                 .replace(/border-slate-100\b/g, 'border-white/5')
                 .replace(/border-slate-200\b/g, 'border-white/10')
                 .replace(/text-slate-800\b/g, 'text-white')
                 .replace(/text-slate-900\b/g, 'text-white')
                 .replace(/text-slate-700\b/g, 'text-slate-300')
                 .replace(/text-slate-600\b/g, 'text-slate-400')
                 .replace(/bg-emerald-50\b/g, 'bg-emerald-500/10')
                 .replace(/border-emerald-100\b/g, 'border-emerald-500/20')
                 .replace(/bg-emerald-600\b/g, 'bg-emerald-500')
                 .replace(/text-emerald-600\b/g, 'text-emerald-500')
                 .replace(/bg-purple-50\b/g, 'bg-purple-500/10')
                 .replace(/border-purple-100\b/g, 'border-purple-500/20')
                 .replace(/bg-purple-600\b/g, 'bg-purple-500')
                 .replace(/text-purple-600\b/g, 'text-purple-500')
                 .replace(/bg-amber-50\b/g, 'bg-amber-500/10')
                 .replace(/border-amber-100\b/g, 'border-amber-500/20')
                 .replace(/bg-amber-600\b/g, 'bg-amber-500')
                 .replace(/text-amber-600\b/g, 'text-amber-500')
                 .replace(/bg-red-50\b/g, 'bg-red-500/10')
                 .replace(/border-red-100\b/g, 'border-red-500/20')
                 .replace(/bg-red-600\b/g, 'bg-red-500')
                 .replace(/text-red-600\b/g, 'text-red-500')
                 .replace(/text-\[\#d4af37\]\b/g, 'text-amber-500')
                 .replace(/border-\[\#d4af37\]\b/g, 'border-amber-500')
                 .replace(/bg-\[\#d4af37\]\b/g, 'bg-amber-500')
                 .replace(/bg-\[\#f5f5f5\]\b/g, 'bg-[#020617]')
                 .replace(/border-\[\#020617\]\b/g, 'border-[#020617]');

fs.writeFileSync('src/App.tsx', content);
