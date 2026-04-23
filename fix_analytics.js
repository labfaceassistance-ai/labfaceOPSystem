const fs = require('fs');
const file = 'frontend/app/professor/dashboard/tabs/AnalyticsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = {
  // Structure & Borders
  'bg-slate-800/40': 'bg-white/60',
  'bg-slate-700/60': 'bg-slate-100',
  'bg-slate-700/40': 'bg-slate-100',
  'bg-slate-800': 'bg-white',
  'bg-slate-700': 'bg-slate-100',
  'border-slate-700/30': 'border-slate-200',
  'border-slate-700/50': 'border-slate-200',
  'border-slate-700': 'border-slate-200',
  'bg-identity-navy': 'bg-white',
  'bg-identity-navy/20': 'bg-white/20',

  // Typography
  'text-white': 'text-identity-navy',
  'text-slate-200': 'text-slate-700',
  'text-slate-300': 'text-slate-700',
  'text-slate-400': 'text-slate-500',
  'text-slate-500': 'text-slate-400',
  'text-slate-600': 'text-slate-400',

  // Chart.js Specific Colors
  'rgba(92, 180, 228, 0.08)': 'rgba(4, 28, 60, 0.05)',
  'rgba(92,180,228,0.05)': 'rgba(4,28,60,0.03)',

  // Badges / Accents
  'text-red-400': 'text-red-500',
  'border-red-500/30': 'border-red-500/10',
  'text-amber-400': 'text-amber-500',
  'border-amber-500/30': 'border-amber-500/10',
  'text-emerald-400': 'text-emerald-500',
  'border-emerald-500/20': 'border-emerald-500/10',
  'text-amber-300': 'text-amber-500',
  'border-amber-400/20': 'border-amber-500/10'
};

for (const [oldClass, newClass] of Object.entries(replacements)) {
  if (content.includes(oldClass)) {
    console.log(`Replacing ${oldClass} with ${newClass}`);
    content = content.replaceAll(oldClass, newClass);
  }
}

// Special overrides for buttons
content = content.replaceAll(
  'className="flex-1 bg-white hover:bg-slate-800 text-identity-navy', 
  'className="flex-1 bg-identity-navy text-white hover:bg-identity-navy/90'
);
content = content.replaceAll(
  'className="w-full bg-identity-navy hover:bg-identity-navy/90 text-identity-navy', 
  'className="w-full bg-identity-navy hover:bg-identity-navy/90 text-white'
);
content = content.replaceAll(
  'bg-white hover:bg-slate-100 text-identity-navy transition-colors',
  'bg-identity-navy hover:bg-identity-navy/90 text-white transition-colors'
);


fs.writeFileSync(file, content);
console.log('Update Complete.');
