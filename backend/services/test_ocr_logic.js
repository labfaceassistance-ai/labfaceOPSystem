const ocr = require('./ocrService');

/**
 * OCR Logic Verification Suite
 * Tests universal normalization, ID extraction, and name matching.
 */

async function runTests() {
    console.log('=== LabFace OCR Logic Verification ===\n');

    const studentData = {
        studentId: '2024-00774-LQ-0',
        firstName: 'SOPHIA ARQUINO',
        lastName: 'PLAZA'
    };

    // --- TEST 1: Universal Normalization (Unicode Dashes) ---
    console.log('TEST 1: Universal Normalization (Unicode Dashes)');
    const dashVariations = [
        '2024-00774', // Standard Hyphen
        '2024\u201300774', // En Dash
        '2024\u201400774', // Em Dash
        '2024\u201500774'  // Horizontal Bar
    ];

    dashVariations.forEach(val => {
        const normalized = ocr.normalizeStudentId(val);
        const match = normalized === '202400774';
        console.log(`  [${val}] -> ${normalized} | ${match ? 'PASS' : 'FAIL'}`);
    });

    // --- TEST 2: PDF Artifact Cleanup ---
    console.log('\nTEST 2: PDF Artifact Cleanup');
    const messyText = 'PLAZA,\u0000SOPHIA\u0001ARQUINO\u00AD';
    const cleanName = ocr.normalizeName(messyText);
    const nameMatch = cleanName === 'PLAZA, SOPHIA ARQUINO';
    console.log(`  [Messy Text] -> ${cleanName} | ${nameMatch ? 'PASS' : 'FAIL'}`);

    // --- TEST 3: Global Best Match (ID Extraction) ---
    console.log('\nTEST 3: Global Best Match (ID Extraction)');
    const noisyText = `
    CEFPTIFICATE OF REGISTRATION
    POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
    QUEZON CITY BRANCH

    STUDENT INFO:
    Name: PLAZA, SOPHIA ARQUINO
    Number: 2024-07784   <-- Misread digit (8 instead of 0)
    Academic Year: 2024-2025

    Wait, here is the REAL ID in a different section:
    Student No: 2024\u201400774\u2014LQ\u20140   <-- Uses Em Dashes
    `;

    const extractedId = ocr.extractStudentNumber(noisyText, studentData);
    const idPass = extractedId === '2024-00774-LQ-0';
    console.log(`  Extracted: ${extractedId}`);
    console.log(`  Expected:  ${studentData.studentId}`);
    console.log(`  Status:    ${idPass ? 'PASS' : 'FAIL'}`);

    // --- TEST 4: Name Extraction ---
    console.log('\nTEST 4: Name Extraction');
    const extractedName = ocr.extractName(noisyText, studentData);
    const namePass = extractedName === 'PLAZA, SOPHIA ARQUINO';
    console.log(`  Extracted: ${extractedName}`);
    console.log(`  Expected:  PLAZA, SOPHIA ARQUINO`);
    console.log(`  Status:    ${namePass ? 'PASS' : 'FAIL'}`);

    console.log('\n=== Verification Complete ===');
}

runTests().catch(console.error);
