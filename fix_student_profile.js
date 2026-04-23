const fs = require('fs');
const file = 'frontend/app/student/profile/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = {
  // Convert opaque slate-50 blocks into glassmorphism to allow the 4-layer background to show
  'bg-slate-50/50': 'identity-glass',
  'bg-slate-50': 'bg-white', // Inputs and solid blocks become crisp white
  'border border-slate-100': 'border border-identity-sky/10',
  'border-slate-100': 'border-slate-200'
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
console.log('Student profile update complete.');
