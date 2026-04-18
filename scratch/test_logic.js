/**
 * Standalone Logic Test for COR Verification
 * Tests the core normalization and extraction logic isolated from heavy dependencies.
 */

// --- LOGIC UNDER TEST (Copied from ocrService.js) ---

function universalNormalize(text, options = {}) {
    if (!text) return '';
    
    const { 
        toUpperCase = true, 
        removeSeparators = false, 
        preserveSpanish = true,
        stripWhitespace = false
    } = options;

    let normalized = text.toString();
    
    normalized = normalized.normalize("NFKD");
    
    if (toUpperCase) {
        normalized = normalized.toUpperCase();
    }

    // Uniform Dash Handling
    normalized = normalized.replace(/[\u002d\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-');

    // Control Character Cleanup
    normalized = normalized.replace(/[\u0000-\u001F\u007F-\u009F\u00AD]/g, ' ');

    // Common OCR Slip Character Normalization
    if (!preserveSpanish) {
        normalized = normalized
            .replace(/O/g, '0')
            .replace(/I/g, '1')
            .replace(/Z/g, '2')
            .replace(/S/g, '5')
            .replace(/B/g, '8')
            .replace(/G/g, '6')
            .replace(/Q/g, '0')
            .replace(/T/g, '7')
            .replace(/D/g, '0');
    }

    if (removeSeparators) {
        normalized = normalized.replace(/[^A-Z0-9]/g, '');
    } else {
        normalized = normalized.replace(/\s+/g, stripWhitespace ? '' : ' ');
    }

    return normalized.trim();
}

function normalizeStudentId(id) {
    return universalNormalize(id, {
        removeSeparators: true,
        preserveSpanish: false
    });
}

function extractStudentNumber(text, studentData = null) {
    const calculateIDSimilarity = (s1, s2) => {
        const n1 = normalizeStudentId(s1);
        const n2 = normalizeStudentId(s2);
        let matches = 0;
        const len = Math.min(n1.length, n2.length);
        for (let i = 0; i < len; i++) {
            if (n1[i] === n2[i]) matches++;
        }
        return matches / Math.max(n1.length, n2.length);
    };

    const normalized = universalNormalize(text, { preserveSpanish: false });
    const candidates = [];
    const expectedId = studentData && studentData.studentId ? normalizeStudentId(studentData.studentId) : null;

    // 1. Guided Strategy
    if (expectedId) {
        const yearMatch = expectedId.match(/^(\d{4})/);
        if (yearMatch) {
            const expectedYear = yearMatch[1];
            const yearRegex = new RegExp(`(${expectedYear})`, 'gi');
            let match;
            while ((match = yearRegex.exec(normalized)) !== null) {
                const yearPos = match.index;
                const surrounding = normalized.substring(Math.max(0, yearPos - 15), Math.min(normalized.length, yearPos + 60));
                const numberPattern = /(\d{4,5})/g;
                let numMatch;
                while ((numMatch = numberPattern.exec(surrounding)) !== null) {
                    const paddedNumber = numMatch[1].padStart(5, '0');
                    const afterNumber = surrounding.substring(numMatch.index + numMatch[1].length, numMatch.index + numMatch[1].length + 15);
                    const campusMatch = afterNumber.match(/[-\s._]?([A-Z0-9]{2})[-\s._]?([\dO0])/);
                    
                    let formattedCandidate = `${expectedYear}-${paddedNumber}`;
                    let score = calculateIDSimilarity(formattedCandidate, expectedId) * 100;

                    if (campusMatch) {
                        const campusCode = campusMatch[1].replace(/0/g, 'O').replace(/1/g, 'I');
                        const terminalDigit = campusMatch[2].replace(/O/g, '0').replace(/I/g, '1');
                        formattedCandidate = `${expectedYear}-${paddedNumber}-${campusCode}-${terminalDigit}`;
                        score = calculateIDSimilarity(formattedCandidate, expectedId) * 100;
                    }
                    candidates.push({ formatted: formattedCandidate, score });
                }
            }
        }
    }

    // 2. Generic Regex Patterns
    const fullPattern = /\b(20\d{2})[-\s._]?(\d{5})[-\s._]?([A-Z0-9]{2})[-\s._]?(\d)\b/gi;
    let p1Match;
    while ((p1Match = fullPattern.exec(normalized)) !== null) {
        const formatted = `${p1Match[1]}-${p1Match[2]}-${p1Match[3]}-${p1Match[4]}`.toUpperCase();
        const score = expectedId ? calculateIDSimilarity(formatted, expectedId) * 100 : 50;
        candidates.push({ formatted, score });
    }

    const partialPattern = /\b(20\d{2})[-\s._]?(\d{4,5})\b/gi;
    let p2Match;
    while ((p2Match = partialPattern.exec(normalized)) !== null) {
        const year = parseInt(p2Match[1]);
        const nextPart = parseInt(p2Match[2].substring(0, 4));
        if (Math.abs(year - nextPart) <= 1) continue;

        const padded = p2Match[2].padStart(5, '0');
        const formatted = `${p2Match[1]}-${padded}`;
        const score = expectedId ? calculateIDSimilarity(formatted, expectedId) * 90 : 40;
        candidates.push({ formatted, score });
    }

    if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0].formatted;
    }
    return null;
}

// --- TEST SUITE ---

async function runTests() {
    console.log('=== Standalone Logic Verification ===\n');

    const studentData = {
        studentId: '2024-00774-LQ-0',
        firstName: 'SOPHIA ARQUINO',
        lastName: 'PLAZA'
    };

    // TEST 1: Unicode Dash Normalization
    console.log('TEST 1: Unicode Dash Normalization');
    const input = '2024\u201400774\u2013LQ\u20120'; // Em, En, Figure dashes
    const output = normalizeStudentId(input);
    const pass1 = output === '202400774LQ0';
    console.log(`  [${input}] -> ${output} | ${pass1 ? 'PASS' : 'FAIL'}`);

    // TEST 2: OCR Slip Handling
    console.log('\nTEST 2: OCR Slip Handling');
    const input2 = '2O24-OO774-LQ-O'; // OS instead of 0s
    const output2 = extractStudentNumber(input2, studentData);
    const pass2 = output2 === '2024-00774-LQ-0';
    console.log(`  [${input2}] -> ${output2} | ${pass2 ? 'PASS' : 'FAIL'}`);

    // TEST 3: Invisible PDF Artifacts
    console.log('\nTEST 3: Invisible PDF Artifacts');
    const input3 = 'P L A Z A ,\u0000 S O P H I A\u0001';
    const output3 = universalNormalize(input3, { preserveSpanish: true });
    const pass3 = output3 === 'P L A Z A , S O P H I A';
    console.log(`  [Messy Name] -> ${output3} | ${pass3 ? 'PASS' : 'FAIL'}`);

    console.log('\n=== Logic Verification Complete ===');
}

runTests();
