const fs = require('fs');
const file = 'frontend/app/professor/profile/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = {
  // Backgrounds & Cards
  'bg-slate-950': 'bg-transparent',
  'bg-slate-900/50': 'identity-glass',
  'bg-slate-900': 'bg-slate-50', // For disabled inputs mostly
  'bg-slate-800': 'bg-white', // Inputs & tab panels
  'bg-slate-700/50': 'bg-slate-50',
  'bg-slate-700': 'bg-slate-100',
  'bg-slate-600': 'bg-slate-200',

  // Borders
  'border-slate-800': 'border-identity-sky/10', // main card border
  'border-slate-700': 'border-slate-200',

  // Text
  'text-slate-400': 'text-slate-500',
  'text-slate-200': 'text-slate-700',
  'text-white': 'text-identity-navy',

  // Focus Rings
  'focus:ring-brand-500': 'focus:ring-identity-sky/20',
  'focus:border-brand-500': 'focus:border-identity-sky',
  'bg-brand-500': 'bg-identity-sky',
  'text-brand-500': 'text-identity-sky',
  'border-brand-500': 'border-identity-sky',
  'hover:bg-brand-400': 'hover:bg-identity-sky/90'
};

for (const [oldClass, newClass] of Object.entries(replacements)) {
  if (content.includes(oldClass)) {
    console.log(`Replacing ${oldClass} with ${newClass}`);
    content = content.replaceAll(oldClass, newClass);
  }
}

// Exception: Revert the save button text to white instead of navy since it's on a sky bg
content = content.replaceAll('bg-identity-sky text-identity-navy hover:bg-identity-sky/90', 'bg-identity-sky text-white hover:bg-identity-navy');

fs.writeFileSync(file, content);
console.log('Prof profile update complete.');
