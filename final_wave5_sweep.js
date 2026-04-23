const fs = require('fs');
const path = require('path');

const files = [
    'frontend/app/register/student/page.tsx',
    'frontend/app/register/professor/page.tsx',
    'frontend/app/forgot-password/page.tsx',
    'frontend/app/admin/login/page.tsx',
    'frontend/app/login/page.tsx'
];

const jargonMap = {
    'TERMINAL': 'LOGIN',
    'TERMINUS': 'PAGE',
    'PROTOCOL': '', // Remove the word protocol where it feels like filler
    'COMMUNICATION ADDRESS': 'EMAIL ADDRESS',
    'INSTITUTIONAL VERIFICATION PROXY': 'UPLOAD INSTITUTIONAL ID',
    'INSTITUTIONAL COMMUNICATION ADDRESS': 'EMAIL ADDRESS',
    'GOVERNANCE PENDING': 'APPROVAL PENDING',
    'ADMINISTRATIVE CORE': 'ADMINISTRATION',
    'ACCESS REGISTRY': 'FINISH REGISTRATION',
    'ADMINISTRATIVE ACCESS KEY': 'PASSWORD',
    'PRIMARY PASSKEY': 'PASSWORD',
    'SECURE ACCESS KEY': 'PASSWORD',
    'CONFIRM ACCESS KEY': 'CONFIRM PASSWORD',
    'CONFIRM ALIGNMENT': 'CONFIRM PASSWORD',
    'COMMIT REGISTRY': 'REGISTER',
    'COMMIT PASSKEY': 'UPDATE PASSWORD',
    'FACULTY PROFILE? ACCESS LOGIN': 'FACULTY ACCOUNT? SIGN IN', // Handle the replace logic carefully
    'RE-VERIFIED': 'VERIFIED',
    'PASSKEY': 'PASSWORD',
    'ESTABLISH YOUR SECURE PASSWORD': 'SET YOUR PASSWORD',
    'ESTABLISH YOUR ADMINISTRATIVE PASSWORD': 'SET YOUR PASSWORD',
    'SYNCHRONIZATION FAILURE': 'CONNECTION ERROR',
    'MODIFY TARGET EMAIL ADDRESS': 'CHANGE EMAIL',
    'PROCEED TO LOGIN': 'GO TO LOGIN',
    'RETURN TO LOGIN': 'BACK TO LOGIN',
    'BACK TO LOGIN': 'BACK TO LOGIN',
    'SIGN IN TO LOGIN': 'SIGN IN'
};

const bgColors = {
    'bg-slate-50': 'bg-transparent',
    'bg-slate-100': 'bg-transparent',
    'bg-white/50': 'identity-glass'
};

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace jargon
    Object.entries(jargonMap).forEach(([oldWord, newWord]) => {
        const regex = new RegExp(oldWord, 'gi');
        content = content.replace(regex, newWord);
    });

    // Replace backgrounds
    Object.entries(bgColors).forEach(([oldColor, newColor]) => {
        content = content.split(oldColor).join(newColor);
    });

    // Clean up empty ' PROTOCOL' or double spaces
    content = content.replace(/  +/g, ' ');
    content = content.replace(/ \./g, '.');

    fs.writeFileSync(file, content);
});

console.log('Final Jargon & Background Sweep Complete.');
