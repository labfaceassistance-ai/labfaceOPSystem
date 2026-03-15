const fs = require('fs');
const path = require('path');
const ocrService = require('./services/ocrService');

async function debugCOR() {
    try {
        const filePath = 'c:\\Users\\John Lloyd\\Capstone\\LabFace\\RegistrationCertificate (7).pdf';

        console.log(`Reading file: ${filePath}`);
        if (!fs.existsSync(filePath)) {
            console.error('File not found!');
            return;
        }

        const buffer = fs.readFileSync(filePath);
        const base64Image = 'data:application/pdf;base64,' + buffer.toString('base64');

        console.log('Extracting text...');
        const extractedText = await ocrService.extractTextFromImage(base64Image);

        // Normalize for easier debugging
        const normalized = extractedText.replace(/\s+/g, ' ').toUpperCase();

        let output = `--- FULL EXTRACTION ---\n${extractedText}\n\n`;
        output += `--- NORMALIZED ---\n${normalized}\n\n`;

        // Find Student ID Position
        const robustIdPattern = /20[0-9O]{2}[-\s.]?[0-9O]{5}[-\s.]?[A-Z]{2}[-\s.]?[0-9O]/i;
        const studentIdMatch = normalized.match(robustIdPattern);

        if (studentIdMatch) {
            output += `Student ID Found: ${studentIdMatch[0]} at index ${studentIdMatch.index}\n`;
            const start = Math.max(0, studentIdMatch.index - 300);
            const context = normalized.substring(start, studentIdMatch.index + 50);
            output += `--- CONTEXT AROUND ID ---\n${context}\n\n`;
        } else {
            output += 'Student ID NOT found via regex.\n\n';
        }

        // Run Extraction
        const name = ocrService.extractName(extractedText);
        output += `Extracted Name from Logic: "${name}"\n`;

        fs.writeFileSync('extracted.txt', output);
        console.log('Extraction complete. Check extracted.txt');

    } catch (error) {
        console.error('Error:', error);
    }
}

debugCOR();
