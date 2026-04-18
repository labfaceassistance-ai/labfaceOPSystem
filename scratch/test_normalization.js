
const normalize = (str) => {
    if (!str) return '';
    let normalized = str.normalize("NFKD") // Decompose fancy characters
        .toUpperCase()
        .replace(/[^A-ZÑÁÉÍÓÚÜ\s-\.]/g, '')  // Keep letters, ñ, accented vowels, spaces, hyphens, periods
        .replace(/\s+/g, ' ')
        .trim();
    return normalized;
};

const names = [
    "John Doe",
    "𝕁𝕠𝕙𝕟 𝔻𝕠𝕖", // Mathematical Double-Struck
    "𝓙𝓸𝓱𝓷 𝓓𝓸𝓮", // Mathematical Script
    "Ｊｏｈｎ Ｄｏｅ", // Fullwidth
    "Joħn Đoe"    // Extended Latin
];

names.forEach(name => {
    console.log(`Original: ${name} -> Normalized: "${normalize(name)}"`);
});
