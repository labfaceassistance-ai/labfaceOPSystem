const fs = require('fs');
const file = 'frontend/app/admin/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = {
  // Convert opaque slate-50 blocks into glassmorphism to allow the 4-layer background to show
  'bg-slate-50/50': 'identity-glass',
  'bg-slate-50': 'bg-white',
  'border border-slate-100': 'border border-identity-sky/10',
  'border-slate-100': 'border-slate-200',

  // Ensure no legacy dark theme cards sneaked in
  'bg-slate-900': 'bg-identity-navy',
  'bg-slate-800': 'bg-white',
  'bg-slate-950': 'bg-transparent'
};

for (const [oldClass, newClass] of Object.entries(replacements)) {
  if (content.includes(oldClass)) {
    console.log(`Replacing ${oldClass} with ${newClass}`);
    content = content.replaceAll(oldClass, newClass);
  }
}

fs.writeFileSync(file, content);
console.log('Admin dashboard update complete.');
