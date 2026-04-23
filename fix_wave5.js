const fs = require('fs');

const files = [
    'frontend/app/register/student/page.tsx',
    'frontend/app/register/professor/page.tsx',
    'frontend/app/forgot-password/page.tsx',
    'frontend/app/admin/login/page.tsx',
    'frontend/app/login/page.tsx'
];

const jargonReplacements = {
    'Protocols Initializing...': 'Loading...',
    'CONTINUE PROTOCOL': 'CONTINUE',
    'EXECUTE VALIDATION': 'VALIDATE',
    'COMMIT REGISTRATION': 'REGISTER',
    'ALREADY ENROLLED? SIGN IN TO TERMINAL': 'ALREADY HAVE AN ACCOUNT? SIGN IN',
    'Integrity Secured': 'Registration Complete',
    'Your identity protocol has been successfully committed to the LabFace Core.': 'Your account has been successfully created.',
    'ENTER OPERATIONS TERMINAL': 'GO TO LOGIN',
    'MAINTAIN ACTIVE SESSION': 'REMEMBER ME',
    'SIGN IN TO TERMINAL': 'SIGN IN',
    'bg-slate-50': 'bg-white',
    // Exclude 'min-h-screen bg-slate-50 flex items-center justify-center bg-slate-50' replacing with transparent 
    // but wait, the auth pages don't have bg-slate-50 overriding backgrounds heavily, 
    // EXCEPT the root loader might have it. I'll replace `min-h-screen flex items-center justify-center bg-slate-50` with bg-transparent.
    'bg-slate-50 flex flex-col': 'bg-transparent flex flex-col',
    'bg-slate-50 flex items-center': 'bg-transparent flex flex-center'
};

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');

    for (const [oldWord, newWord] of Object.entries(jargonReplacements)) {
        if (content.includes(oldWord)) {
            content = content.replaceAll(oldWord, newWord);
        }
    }

    fs.writeFileSync(file, content);
}

// Special fixes for Forgot Password and Privacy Policy
const fixFile = (filePath, callback) => {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = callback(content);
        fs.writeFileSync(filePath, content);
    }
};

fixFile('frontend/app/forgot-password/page.tsx', content => {
    return content.replaceAll('bg-slate-50', 'bg-transparent').replaceAll('bg-white/50', 'identity-glass');
});

console.log('Wave 5 Update Complete.');
