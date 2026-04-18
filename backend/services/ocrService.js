const { PDFDocument, PDFName, PDFRawStream } = require('pdf-lib');
const Tesseract = require('tesseract.js');
const PDFParser = require('pdf2json');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * OCR Service for extracting text from Certificate of Registration (COR) images
 */
class OCRService {
    /**
     * Extract text from base64 image or PDF using Tesseract OCR or PDF parser
     * @param {string} base64Image - Base64 encoded image or PDF data
     * @returns {Promise<string>} Extracted text
     */
    /**
     * Preprocess image for better OCR accuracy
     * Applies: grayscale, denoise, sharpen, contrast enhancement
     */
    async preprocessImage(buffer) {
        try {
            // Try to use sharp if available
            let sharp;
            try {
                sharp = require('sharp');
            } catch (e) {
                console.warn('[OCR Preprocess] Sharp not installed, skipping preprocessing');
                return buffer;
            }
            
            // Refined preprocessing for clear documentation
            const processed = await sharp(buffer)
                .grayscale()                    // Convert to grayscale
                .normalize()                    // Normalize contrast
                .modulate({ brightness: 1.1, contrast: 1.25 }) // Slightly more contrast
                .sharpen({                      // Gentler sharpening to avoid artifacts
                    sigma: 0.8,
                    m1: 0.5,
                    m2: 1.5
                })
                .resize({ width: 2600, withoutEnlargement: true }) // Higher resolution
                .toBuffer();
            
            console.log('[OCR Preprocess] Image processed with sharp (gentle mode)');
            return processed;
        } catch (err) {
            console.warn('[OCR Preprocess] Error during preprocessing:', err.message);
            console.warn('[OCR Preprocess] Using original image');
            return buffer; // Return original if preprocessing fails
        }
    }

    /**
     * Run multiple OCR passes with different settings and return best result
     */
    async recognizeWithMultiplePasses(buffer, requestId = 'unknown') {
        const logPrefix = `[OCR Debug ${requestId}]`;
        const results = [];
        
        console.log(`${logPrefix} === Starting OCR multi-pass ===`);
        
        // Pass 1: Default settings
        try {
            console.log(`${logPrefix} OCR Pass 1: Default settings...`);
            const result1 = await Tesseract.recognize(buffer, 'eng', {
                logger: info => {
                    if (info.status === 'recognizing text') {
                        console.log(`${logPrefix} Pass 1 progress: ${(info.progress * 100).toFixed(1)}%`);
                    }
                }
            });
            const text1 = result1.data.text;
            const conf1 = result1.data.confidence;
            results.push({ text: text1, confidence: conf1, pass: 1 });
            console.log(`${logPrefix} Pass 1 complete. Confidence: ${conf1}%`);
            console.log(`${logPrefix} Pass 1 first 300 chars:`, text1.substring(0, 300));
            
            // Log student ID patterns in this pass
            const idPatterns1 = text1.match(/20\d{2}[-\s.]?\d{4,5}/g) || [];
            console.log(`${logPrefix} Pass 1 ID patterns:`, idPatterns1);
        } catch (e) {
            console.warn(`${logPrefix} Pass 1 failed:`, e.message);
        }
        
        // Pass 2: Whitelist mode - focus on student ID characters only
        try {
            console.log(`${logPrefix} OCR Pass 2: Whitelist mode...`);
            const result2 = await Tesseract.recognize(buffer, 'eng', {
                logger: info => {
                    if (info.status === 'recognizing text') {
                        console.log(`${logPrefix} Pass 2 progress: ${(info.progress * 100).toFixed(1)}%`);
                    }
                },
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-'
            });
            const text2 = result2.data.text;
            const conf2 = result2.data.confidence;
            results.push({ text: text2, confidence: conf2, pass: 2 });
            console.log(`${logPrefix} Pass 2 complete. Confidence: ${conf2}%`);
            console.log(`${logPrefix} Pass 2 first 300 chars:`, text2.substring(0, 300));
            
            // Log student ID patterns in this pass
            const idPatterns2 = text2.match(/20\d{2}[-\s.]?\d{4,5}/g) || [];
            console.log(`${logPrefix} Pass 2 ID patterns:`, idPatterns2);
        } catch (e) {
            console.warn(`${logPrefix} Pass 2 failed:`, e.message);
        }
        
        // Pass 4: Page Segment Mode 1 (Auto orientation/Osd)
        try {
            console.log(`${logPrefix} OCR Pass 4: Auto Layout (psm=1)...`);
            const result4 = await Tesseract.recognize(buffer, 'eng', {
                logger: info => {
                    if (info.status === 'recognizing text') {
                        console.log(`${logPrefix} Pass 4 progress: ${(info.progress * 100).toFixed(1)}%`);
                    }
                },
                psm: 1
            });
            const text4 = result4.data.text;
            const conf4 = result4.data.confidence;
            results.push({ text: text4, confidence: conf4, pass: 4 });
            console.log(`${logPrefix} Pass 4 complete. Confidence: ${conf4}%`);
        } catch (e) {
            console.warn(`${logPrefix} Pass 4 failed:`, e.message);
        }
        
        // Select best result based on confidence
        if (results.length === 0) {
            throw new Error('All OCR passes failed');
        }
        
        const bestResult = results.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
        );
        
        console.log(`${logPrefix} === OCR Multi-pass complete ===`);
        console.log(`${logPrefix} Total passes: ${results.length}`);
        console.log(`${logPrefix} Best result: Pass ${bestResult.pass} with ${bestResult.confidence}% confidence`);
        
        // Combine all results for maximum text coverage
        const combinedText = results.map(r => r.text).join(' \n ');
        
        return {
            text: bestResult.text,
            combinedText: combinedText,
            confidence: bestResult.confidence,
            bestPass: bestResult.pass,
            allResults: results,
            source: 'ocr' // Default for image-based OCR
        };
    }

    /**
     * Universal text normalization for OCR results.
     * Handles Unicode dashes (em-dash, en-dash, etc.), control characters, and common OCR slips.
     * @param {string} text - The raw text to normalize
     * @param {Object} options - Normalization options
     * @returns {string} Normalized text
     */
    universalNormalize(text, options = {}) {
        if (!text) return '';
        
        const { 
            toUpperCase = true, 
            removeSeparators = false, 
            preserveSpanish = true,
            stripWhitespace = false
        } = options;

        let normalized = text.toString();
        
        // 1. Handle Unicode normalization (NFKD decomposes accented characters)
        normalized = normalized.normalize("NFKD");
        
        if (toUpperCase) {
            normalized = normalized.toUpperCase();
        }

        // 2. Uniform Dash Handling: Replace all Unicode dashes with a standard hyphen
        // Covers: Hyphen-minus (U+002D), Hyphen (U+2010), Non-breaking hyphen (U+2011), 
        // Figure dash (U+2012), En dash (U+2013), Em dash (U+2014), Horizontal bar (U+2015)
        normalized = normalized.replace(/[\u002d\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-');

        // 3. Control Character Cleanup
        // Remove non-printable characters (U+0000 to U+001F) and soft hyphens (U+00AD)
        normalized = normalized.replace(/[\u0000-\u001F\u007F-\u009F\u00AD]/g, ' ');

        // 4. Common OCR Slip Character Normalization (Only for alphanumeric contexts)
        // We only do this if specifically requested or in non-Spanish contexts to avoid breaking names
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

        // 5. Separator Handling
        if (removeSeparators) {
            normalized = normalized.replace(/[^A-Z0-9]/g, '');
        } else {
            // Standardize whitespace
            normalized = normalized.replace(/\s+/g, stripWhitespace ? '' : ' ');
        }

        return normalized.trim();
    }

    /**
     * Centralized normalization for Student IDs
     * Handles Unicode dashes, non-printable characters, and common OCR errors
     */
    normalizeStudentId(id) {
        return this.universalNormalize(id, {
            removeSeparators: true,
            preserveSpanish: false
        });
    }

    /**
     * OCR-aware student ID normalization.
     * Maps ALL visually-similar characters to a single canonical form so that
     * what the user typed and what Tesseract read are compared on equal footing.
     *
     * Key confusions handled:
     *   L ↔ 4   (L looks like 4 in matrix fonts)
     *   Q ↔ 0   (Q and O look like 0)
     *   O ↔ 0
     *   I ↔ 1   (I looks like 1)
     *   B ↔ 8
     *   S ↔ 5
     *   G ↔ 6
     *   Z ↔ 2
     *   T ↔ 7
     */
    ocrNormalizeStudentId(id) {
        if (!id) return '';
        return id
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')   // strip hyphens/spaces
            // Map ambiguous chars → canonical digit/letter
            .replace(/[OQ]/g, '0')        // O,Q → 0
            .replace(/[IL]/g, '1')        // I,L → 1
            .replace(/[Z]/g, '2')         // Z  → 2
            .replace(/[S]/g, '5')         // S  → 5
            .replace(/[G]/g, '6')         // G  → 6
            .replace(/[T]/g, '7')         // T  → 7 (less common, keep)
            .replace(/[B]/g, '8')         // B  → 8
            // Map digit lookalikes → canonical digit
            .replace(/4/g, '1')           // 4 ← treated same as L(→1) in campus codes
            .replace(/6/g, '6');          // already canonical
    }

    /**
     * Normalization for student names (preserves Spanish characters)
     */
    normalizeName(text) {
        return this.universalNormalize(text, {
            preserveSpanish: true,
            stripWhitespace: false
        });
    }

    /**
     * Sanitizes extracted text from PDF to remove non-printable control characters
     */
    sanitizeExtractedText(text) {
        if (!text) return '';
        // Remove non-printable characters (U+0000 to U+001F) and other PDF artifacts
        return text.replace(/[\u0000-\u001F\u007F-\u009F\u00AD]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async extractTextFromImage(base64Image, requestId = 'unknown') {
        const logPrefix = `[OCR Debug ${requestId}]`;
        
        try {
            console.log(`${logPrefix} === Starting text extraction ===`);
            
            // Check if it's a PDF
            if (base64Image.startsWith('data:application/pdf')) {
                console.log(`${logPrefix} File type: PDF`);
                
                // Remove data URL prefix and convert to buffer
                const pdfData = base64Image.replace(/^data:application\/pdf;base64,/, '');
                const buffer = Buffer.from(pdfData, 'base64');
                console.log(`${logPrefix} PDF buffer size: ${buffer.length} bytes`);

                // Create temporary file
                const tempFilePath = path.join(os.tmpdir(), `cor_${Date.now()}.pdf`);
                fs.writeFileSync(tempFilePath, buffer);

                // Parse PDF
                const pdfParser = new PDFParser();

                const extractedText = await new Promise((resolve, reject) => {
                    pdfParser.on('pdfParser_dataReady', (pdfData) => {
                        try {
                            // Extract text from all pages
                            let fullText = '';
                            if (pdfData.Pages) {
                                pdfData.Pages.forEach((page, pageIdx) => {
                                    if (page.Texts) {
                                        page.Texts.forEach(text => {
                                            if (text.R) {
                                                text.R.forEach(r => {
                                                    if (r.T) {
                                                        fullText += decodeURIComponent(r.T) + ' ';
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    console.log(`${logPrefix} Page ${pageIdx + 1} text length: ${fullText.length - (fullText.lastIndexOf(' ', fullText.length - 2) + 1)} chars`);
                                });
                            }

                            // Clean up temp file
                            try {
                                fs.unlinkSync(tempFilePath);
                            } catch (e) {
                                console.warn(`${logPrefix} Failed to delete temp file:`, e);
                            }

                            resolve(fullText);
                        } catch (error) {
                            reject(error);
                        }
                    });

                    pdfParser.on('pdfParser_dataError', (error) => {
                        // Clean up temp file
                        try {
                            fs.unlinkSync(tempFilePath);
                        } catch (e) {
                            console.warn(`${logPrefix} Failed to delete temp file:`, e);
                        }
                        reject(error);
                    });

                    pdfParser.loadPDF(tempFilePath);
                });

                console.log(`${logPrefix} PDF text extraction complete. Total length: ${extractedText.length} chars`);
                console.log(`${logPrefix} First 800 chars:`, extractedText.substring(0, 800));
                console.log(`${logPrefix} Looking for Student ID pattern...`);
                
                // Log all potential ID patterns found
                const idPatterns = extractedText.match(/20\d{2}[-\s.]?\d{4,5}/g) || [];
                console.log(`${logPrefix} Potential ID patterns found:`, idPatterns);

                if (!extractedText || extractedText.trim().length < 50) {
                    console.log('Empty text detected. Attempting to extract images from PDF (Scanned PDF Fallback)...');

                    try {
                        const pdfDoc = await PDFDocument.load(buffer);
                        const context = pdfDoc.context;
                        const indirectObjects = context.enumerateIndirectObjects();

                        let largestImageBuffer = null;
                        let largestImageSize = 0;

                        // Find the largest image in the PDF (likely the scanned document)
                        for (const [ref, obj] of indirectObjects) {
                            if (obj instanceof PDFRawStream) {
                                const dict = obj.dict;
                                const subtype = dict.get(PDFName.of('Subtype'));

                                if (subtype === PDFName.of('Image')) {
                                    const data = obj.contents;
                                    if (data.length > largestImageSize) {
                                        largestImageSize = data.length;
                                        largestImageBuffer = data;
                                    }
                                }
                            }
                        }

                        if (largestImageBuffer) {
                            console.log(`${logPrefix} Found scanned image (${largestImageSize} bytes)`);
                            
                            // Save image for debugging
                            const debugImagePath = path.join(os.tmpdir(), `ocr_debug_${requestId}_image.jpg`);
                            fs.writeFileSync(debugImagePath, largestImageBuffer);
                            console.log(`${logPrefix} Saved image to: ${debugImagePath}`);

                            // Preprocess image for better OCR
                            console.log(`${logPrefix} Starting image preprocessing...`);
                            const preprocessedBuffer = await this.preprocessImage(largestImageBuffer);
                            
                            // Run multiple OCR passes and get best result
                            console.log(`${logPrefix} Running multiple OCR passes...`);
                            const ocrResult = await this.recognizeWithMultiplePasses(preprocessedBuffer, requestId);
                            
                            return { 
                                text: ocrResult.combinedText, 
                                source: 'scanned_pdf' 
                            };
                        } else {
                            throw new Error('No text or images found in PDF.');
                        }
                    } catch (fallbackError) {
                        console.error('Fallback OCR failed:', fallbackError);
                        throw new Error('No text found in PDF. If this is a scanned document, please upload it as an Image (JPG/PNG) instead. Details: ' + fallbackError.message);
                    }
                }

                return { 
                    text: this.sanitizeExtractedText(extractedText), 
                    source: 'digital' 
                };
            }

            // Handle images with Tesseract OCR
            console.log(`${logPrefix} File type: Image`);
            
            const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(imageData, 'base64');
            console.log(`${logPrefix} Image buffer size: ${buffer.length} bytes`);

            // Preprocess and Recognize
            const preprocessed = await this.preprocessImage(buffer);
            const ocrResult = await this.recognizeWithMultiplePasses(preprocessed, requestId);
            
            return { 
                text: ocrResult.combinedText, 
                source: 'ocr' 
            };
        } catch (error) {
            console.error('Text extraction error:', error);
            throw new Error('Failed to extract text from document: ' + error.message);
        }
    }

    /**
     * Extract student number from COR text
     * Looks for patterns like: 2024-00322-LQ-0 (full format) or 2024-12345 (partial)
     * Handles common OCR errors: 0->O, 1->I/l, etc.
     * @param {string} text - Extracted text from COR
     * @param {Object} studentData - Student data for guided extraction
     * @returns {string|null} Student number or null if not found
     */
    extractStudentNumber(text, studentData = null) {
        const calculateIDSimilarity = (s1, s2) => {
            const n1 = this.normalizeStudentId(s1);
            const n2 = this.normalizeStudentId(s2);
            let matches = 0;
            const len = Math.min(n1.length, n2.length);
            for (let i = 0; i < len; i++) {
                if (n1[i] === n2[i]) matches++;
            }
            return matches / Math.max(n1.length, n2.length);
        };

        // Normalize text for ID searching (OCR slips allowed, separators preserved for regex)
        const normalized = this.universalNormalize(text, { preserveSpanish: false });
        const candidates = [];
        const expectedId = studentData && studentData.studentId ? this.normalizeStudentId(studentData.studentId) : null;

        // 1. Guided Strategy (Strategy 1)
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
                            const terminalDigit = campusMatch[2].toString().replace(/[OQ]/g, '0').replace(/[IL]/g, '1');
                            formattedCandidate = `${expectedYear}-${paddedNumber}-${campusCode}-${terminalDigit}`;
                            score = calculateIDSimilarity(formattedCandidate, expectedId) * 100;
                        }
                        candidates.push({ formatted: formattedCandidate, score });
                    }
                }
            }
        }

        // 2. Generic Regex Patterns
        // Patterns are simplified because text is already normalized for OCR slips (0, 1, 7, etc.)
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
            if (Math.abs(year - nextPart) <= 1) continue; // Skip year ranges

            const padded = p2Match[2].padStart(5, '0');
            const formatted = `${p2Match[1]}-${padded}`;
            const score = expectedId ? calculateIDSimilarity(formatted, expectedId) * 90 : 40; // Penalty for missing parts
            candidates.push({ formatted, score });
        }

        if (candidates.length > 0) {
            candidates.sort((a, b) => b.score - a.score);
            const best = candidates[0];
            console.log(`[COR Debug] Global best match: ${best.formatted} (score: ${best.score.toFixed(1)})`);
            return best.formatted;
        }

        console.log('[COR Debug] No student ID pattern matched');
        return null;
    }

    /**
     * Extract name from COR text
     * Uses reverse search - find student ID first, then extract name before it
     * @param {string} text - Extracted text from COR
     * @param {Object} studentData - Student data for guided search
     * @returns {string|null} Name or null if not found
     */
    extractName(text, studentData = null) {
        // ID-Normalization for finding the anchor (OCR slips allowed)
        const idNormalizedText = this.universalNormalize(text, { preserveSpanish: false });
        
        // Name-Normalization (Preserve Spanish letters, cleanup PDF artifacts)
        const nameNormalizedText = this.normalizeName(text);

        // Strategy 1: Find student ID first, then look backwards for name (Standard PUP Format)
        // Campus code is [A-Z0-9]{2} (not [A-Z]{2}) because OCR may read LQ as 40, IT as 17, etc.
        const robustIdPattern = /\b20\d{2}[-\s._]?\d{4,5}[-\s._]?[A-Z0-9]{2}[-\s._]?[\dOQIL]\b/i;
        const studentIdMatch = idNormalizedText.match(robustIdPattern);

        if (studentIdMatch) {
            const studentIdPos = studentIdMatch.index;
            // Look at the 150 characters before the student ID (increased from 100)
            const beforeId = nameNormalizedText.substring(Math.max(0, studentIdPos - 150), studentIdPos);

            // Pattern A: "LASTNAME, FIRSTNAME" (Standard)
            // Allow for some intervening text like "Student Number:" or "Student No" at the end of the string
            // Added \. to character class to support "Ma." 
            // Changed ,\s+ to ,\s* to be flexible with spaces
            const namePatternA = /([A-ZÑÁÉÍÓÚÜ\-\.']+(?:\s+[A-ZÑÁÉÍÓÚÜ\-\.']+){0,3}),\s*([A-ZÑÁÉÍÓÚÜ\-\.']+(?:\s+[A-ZÑÁÉÍÓÚÜ\-\.']+){0,4})(?:\s+(?:Student\s+(?:No|Number|ID)|No\.|ID\s*:?))?\s*$/i;
            const matchA = beforeId.match(namePatternA);

            if (matchA) {
                const lastName = matchA[1].trim();
                const firstName = matchA[2].trim();
                if (this.isValidName(lastName) && this.isValidName(firstName)) {
                    return `${lastName}, ${firstName}`;
                }
            }

            // Pattern B: "First Middle Last" (No comma, but before ID)
            // Heuristic: 2-5 words before ID, assuming no labels
            // Added \. and , to character class for maximum robustness
            const namePatternB = /([A-ZÑÁÉÍÓÚÜ\-\.',]+(?:\s+[A-ZÑÁÉÍÓÚÜ\-\.',]+){1,5})(?:\s+(?:Student\s+(?:No|Number|ID)|No\.|ID\s*:?))?\s*$/i;
            const matchB = beforeId.match(namePatternB);
            if (matchB) {
                const potentialName = matchB[1].trim();
                // Check if it looks like a name (at least 2 words)
                if (potentialName.split(' ').length >= 2 && this.isValidName(potentialName)) {
                    return potentialName; // Return as is, fuzzy matcher handles format
                }
            }
        }

        // Strategy 2: Look for explicit "Name:" labels
        const labelPatterns = [
            /Name\s*:\s*([A-ZÑÁÉÍÓÚÜ\-\.',\s]+?)(?=\s+(?:Student|Course|Year|Section|Date|$))/i,
            /Student\s+Name\s*:\s*([A-ZÑÁÉÍÓÚÜ\-\.',\s]+?)(?=\s+(?:Student|Course|Year|Section|Date|$))/i
        ];

        for (const pattern of labelPatterns) {
            const match = nameNormalizedText.match(pattern);
            if (match) {
                const extracted = match[1].trim();
                if (extracted.length > 3 && this.isValidName(extracted)) {
                    return extracted;
                }
            }
        }

        // Strategy 3: Direct Search for Student Data (Fallback)
        if (studentData) {
            const { firstName, lastName } = studentData;
            const firstNameNorm = firstName.toUpperCase();
            const lastNameNorm = lastName.toUpperCase();

            // Check if both First and Last names are present in the text
            // We search in the 'beforeId' chunk if available, otherwise in the first 1000 chars
            let searchArea = nameNormalizedText;

            // Re-find Student ID position to narrow search
            const studentIdMatchF = idNormalizedText.match(robustIdPattern);

            if (studentIdMatchF) {
                const studentIdPos = studentIdMatchF.index;
                searchArea = nameNormalizedText.substring(Math.max(0, studentIdPos - 300), studentIdPos);
            } else {
                searchArea = nameNormalizedText.substring(0, 1500); // Fallback to start of document
            }

            // Simple containment check
            if (searchArea.includes(lastNameNorm) && searchArea.includes(firstNameNorm)) {
                console.log('Fallback: Found user name in COR via direct search');
                // Construct a valid name string so validation passes
                return `${lastName}, ${firstName}`;
            }
        }

        return null;
    }

    /**
     * Helper to check if extracted text looks like a valid name (not garbage/labels)
     */
    isValidName(text) {
        if (!text || text.length < 2) return false;
        const keywords = ['CERTIFICATE', 'REGISTRATION', 'OF', 'THE', 'UNIVERSITY', 'POLYTECHNIC', 'PHILIPPINES', 'STUDENT', 'NUMBER', 'ID', 'COPY', 'OFFICIAL'];
        const words = text.split(/[\s,]+/);
        // If more than 50% of words are keywords, it's likely not a name
        const keywordCount = words.filter(w => keywords.includes(w.toUpperCase())).length;
        return keywordCount < words.length * 0.5;
    }

    /**
     * Validate name match - more flexible matching
     * Compares extracted name with provided student data
     * @param {string} extractedName - Name from COR
     * @param {Object} studentData - Student data with firstName, middleName, lastName
     * @returns {boolean} True if names match
     */
    validateNameMatch(extractedName, studentData) {
        if (!extractedName) return false;

        // Build expected name variations
        const { firstName, middleName, lastName } = studentData;

        // Normalize for comparison - preserve Spanish characters (ñ, á, é, í, ó, ú, ü)
        // Also handle "Ma." abbreviation -> expand to MARIA for robust matching
        const normalize = (str) => {
            if (!str) return '';
            let normalized = str.normalize("NFKD") // Decompose fancy characters
                .toUpperCase()
                .replace(/[^A-ZÑÁÉÍÓÚÜ\s-\.]/g, '')  // Keep letters, ñ, accented vowels, spaces, hyphens, periods
                .replace(/\s+/g, ' ')
                .trim();

            // Expand "MA." or "MA " at start of name to "MARIA"
            // Use word boundary to avoid replacing inside names like "MANUEL"
            normalized = normalized.replace(/\bMA\.\s?/g, 'MARIA ').replace(/\bMA\s/g, 'MARIA ');

            // Remove remaining periods
            return normalized.replace(/\./g, '').trim();
        };

        const extractedNorm = normalize(extractedName);

        // Build possible name formats
        const possibleFormats = [
            // Standard Formats
            `${lastName}, ${firstName} ${middleName}`,
            `${lastName}, ${firstName}`, // Middle name omitted/optional
            `${firstName} ${middleName} ${lastName}`,
            `${firstName} ${lastName}`,

            // Relaxed Formats (No comma, common in OCR errors or specific layouts)
            `${lastName} ${firstName} ${middleName}`,
            `${lastName} ${firstName}`,
            `${firstName} ${lastName} ${middleName}`, // Uncommon but possible

            // Just Last and First (if middle name is in data but not in COR or failed to extract)
            `${lastName} ${firstName}`
        ].map(normalize);



        // Check if extracted name matches any format
        for (const format of possibleFormats) {
            if (extractedNorm === format) {
                return true;
            }
        }

        // Check Last Name presence (Containment Check)
        // We define a local helper to strip accents/punctuation
        const localNormalize = (str) => str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents (e.g. ñ -> n)
            .replace(/[,\.]/g, '') // Remove punctuation for comparison
            .replace(/[-]/g, ' ')   // Treat hyphens as spaces
            .replace(/[^a-z0-9\s]/g, '') // Keep alphanumeric and spaces only
            .replace(/\s+/g, ' ')
            .trim();

        const checkContainment = (fullText, part) => {
            if (!part) return true;
            const fullTextWords = localNormalize(fullText).split(' ');
            const partWords = localNormalize(part).split(' ');

            // Check if ALL significant words of `part` (User) are present in `fullText` (Extracted)
            return partWords.filter(w => w.length > 2).every(partWord =>
                fullTextWords.some(extractedWord => {
                    // 1. Exact or inclusion match
                    if (extractedWord === partWord || extractedWord.includes(partWord) || partWord.includes(extractedWord)) return true;
                    
                    // 2. Fuzzy match for common OCR slips (max 1 char diff for names > 4 chars)
                    if (partWord.length > 4) {
                        let diffs = 0;
                        const len = Math.min(partWord.length, extractedWord.length);
                        for(let i=0; i<len; i++) {
                            if(partWord[i] !== extractedWord[i]) diffs++;
                        }
                        // Add length difference as errors
                        diffs += Math.abs(partWord.length - extractedWord.length);
                        if (diffs <= 1) return true;
                    }
                    return false;
                })
            );
        };

        const hasLastName = checkContainment(extractedName, lastName);
        const hasFirstName = checkContainment(extractedName, firstName);

        // Middle Name: Only check if provided by user
        let hasMiddleName = true;
        if (middleName) {
            hasMiddleName = checkContainment(extractedName, middleName);
        }

        if (hasLastName && hasFirstName && hasMiddleName) {
            return true;
        }

        // --- DEBUG LOGGING FOR FAILED VALIDATION ---
        console.log('--- NAME MATCH DEBUG ---');
        console.log('Extracted Raw:', extractedName);
        console.log('User First:', firstName, '-> Found?', hasFirstName);
        console.log('User Last:', lastName, '-> Found?', hasLastName);
        console.log('User Middle:', middleName, '-> Found?', hasMiddleName);
        console.log('Normalized Extracted:', localNormalize(extractedName));
        console.log('Normalized Last:', localNormalize(lastName));
        console.log('Normalized First:', localNormalize(firstName));
        console.log('------------------------');

        return false;
    }

    /**
     * Fuzzy match two names (handles different formats)
     * @param {string} name1 - First name
     * @param {string} name2 - Second name
     * @returns {boolean} True if names match
     */
    fuzzyNameMatch(name1, name2) {
        if (!name1 || !name2) return false;

        // Normalize: lowercase, remove extra spaces, remove punctuation (keeping alphanumeric only for robust comparison)
        const normalize = (str) => str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents (e.g. ñ -> n)
            .replace(/[,\.]/g, '') // Remove punctuation for comparison
            .replace(/[-]/g, ' ')   // Treat hyphens as spaces
            .replace(/[^a-z0-9\s]/g, '') // Keep alphanumeric and spaces only
            .replace(/\s+/g, ' ')
            .trim();

        const n1 = normalize(name1);
        const n2 = normalize(name2);

        // Direct match
        if (n1 === n2) return true;

        // Split into words and check if all words from one name appear in the other
        const words1 = n1.split(' ');
        const words2 = n2.split(' ');

        // Check if all significant words (length > 2) match
        const significantWords1 = words1.filter(w => w.length > 2);
        const significantWords2 = words2.filter(w => w.length > 2);

        const allWordsMatch = significantWords1.every(word =>
            significantWords2.some(w => w.includes(word) || word.includes(w))
        );

        return allWordsMatch;
    }

    /**
     * Fuzzy match for course names
     * @param {string} course1 - First course name
     * @param {string} course2 - Second course name
     * @returns {boolean} True if courses match
     */
    fuzzyMatch(course1, course2) {
        if (!course1 || !course2) return false;

        // Master map of course codes to their canonical full names.
        // Both sides (user input AND COR extract) are normalized through this map
        // so that 'BSIT' and 'Bachelor of Science in Information Technology' are equal.
        const COURSE_MAP = {
            'bsit': 'bachelor of science in information technology',
            'bs it': 'bachelor of science in information technology',
            'bs information technology': 'bachelor of science in information technology',
            'bachelor of science in information technology': 'bachelor of science in information technology',
            'bsoa': 'bachelor of science in office administration',
            'bs oa': 'bachelor of science in office administration',
            'bs office administration': 'bachelor of science in office administration',
            'bachelor of science in office administration': 'bachelor of science in office administration',
            'dit': 'diploma in information technology',
            'diploma in it': 'diploma in information technology',
            'diploma in information technology': 'diploma in information technology',
        };

        const expandCourse = (str) => {
            if (!str) return '';
            const normalized = str.toLowerCase()
                .replace(/bachelor\s+of\s+science\s+in/gi, 'bachelor of science in')
                .replace(/\s+/g, ' ')
                .trim();
            return COURSE_MAP[normalized] || normalized;
        };

        const c1 = expandCourse(course1);
        const c2 = expandCourse(course2);

        // Direct match after expansion
        if (c1 === c2) return true;
        if (c1.includes(c2) || c2.includes(c1)) return true;

        // Word-by-word intersection check for long names
        const words1 = c1.split(' ');
        const words2 = c2.split(' ');
        const intersect = words1.filter(w => w.length > 3 && words2.includes(w));
        if (intersect.length >= 2) return true;

        return false;
    }


    /**
     * Verify Certificate of Registration
     * @param {string} corImage - Base64 encoded COR image
     * @param {Object} studentData - Student data to verify against
     * @param {Object} activePeriod - Current active academic period
     * @param {string} requestId - Request ID for debug tracing
     * @returns {Promise<Object>} Verification result
     */
    async verifyCOR(corImage, rawStudentData, activePeriod = null, requestId = 'unknown') {
        const logPrefix = `[COR Verify ${requestId}]`;
        console.log(`${logPrefix} Starting COR verification`);
        
        // Sanitize middle name (handle N/A, NA, etc.)
        const studentData = { ...rawStudentData };
        if (studentData.middleName) {
            const lowerMiddle = studentData.middleName.toLowerCase().replace(/[\s\.]/g, '');
            if (['na', 'n/a', 'none', '-', 'null'].includes(lowerMiddle)) {
                studentData.middleName = '';
            }
        }

        try {
            // 1. Extract Text & Detect Source
            const { text: extractedText, source } = await this.extractTextFromImage(corImage, requestId);
            
            console.log(`${logPrefix} Extraction Source: ${source}`);
            console.log(`${logPrefix} Extracted COR text length: ${extractedText.length} chars`);
            console.log(`${logPrefix} First 500 chars:`, extractedText.substring(0, 500));

            // Extract student number (pass studentData for better matching)
            console.log(`${logPrefix} Extracting student number...`);
            const extractedStudentNumber = this.extractStudentNumber(extractedText, studentData);
            console.log(`${logPrefix} Extracted student ID: ${extractedStudentNumber}`);

            // Extract name
            const extractedName = this.extractName(extractedText, studentData);

            // Extract Course & Year
            const extractedCourse = this.extractCourse(extractedText);
            const extractedYear = this.extractYear(extractedText);

            // Extract Section, Academic Year, and Term
            const extractedSection = this.extractSection(extractedText);
            const extractedAY = this.extractAcademicYear(extractedText);
            const extractedTerm = this.extractTerm(extractedText);

            // Build full name from student data (LASTNAME, Firstname Middlename format)
            const fullName = studentData.middleName
                ? `${studentData.lastName}, ${studentData.firstName} ${studentData.middleName}`
                : `${studentData.lastName}, ${studentData.firstName}`;

            // Normalize both sides using standard helper
            const normalizedExtracted = this.normalizeStudentId(extractedStudentNumber);
            const normalizedProvided  = this.normalizeStudentId(studentData.studentId);

            // OCR-aware comparison: map visually-similar chars (L↔4, Q↔0, etc.)
            // to the same canonical form on BOTH sides before comparing.
            const ocrExtracted = this.ocrNormalizeStudentId(extractedStudentNumber);
            const ocrProvided  = this.ocrNormalizeStudentId(studentData.studentId);

            // Debug logging
            console.log('[COR Debug] Student ID Comparison:');
            console.log('  Extracted from COR:', extractedStudentNumber, '-> Normalized:', normalizedExtracted, '-> OCR-canonical:', ocrExtracted);
            console.log('  Provided by user  :', studentData.studentId,   '-> Normalized:', normalizedProvided,  '-> OCR-canonical:', ocrProvided);
            console.log('  Exact match:', normalizedExtracted === normalizedProvided);
            console.log('  OCR-aware match:', ocrExtracted === ocrProvided);

            // Pass if either exact OR OCR-aware comparison matches
            const studentNumberMatch = (
                (normalizedExtracted === normalizedProvided && normalizedExtracted.length >= 8) ||
                (ocrExtracted === ocrProvided && ocrExtracted.length >= 6)
            );

            // Validate name using robust matching
            const nameMatch = this.validateNameMatch(extractedName, studentData);

            // Validate Course
            const courseMatch = extractedCourse && studentData.course ?
                this.fuzzyMatch(extractedCourse, studentData.course) : undefined;

            // Validate Year
            const yearMatch = extractedYear && studentData.yearLevel ?
                extractedYear.toString() === studentData.yearLevel.toString()
                : undefined;

            // Validate Academic Period (Year & Semester)
            const academicPeriodMatch = this.fuzzyAcademicPeriodMatch(extractedAY, extractedTerm, activePeriod);

            // Check if document looks like a COR (Expanded indicators for PUP)
            const corKeywords = [
                'certificate', 'registration', 'enrollment', 'semester', 'subject', 'program',
                'polytechnic', 'university', 'philippines', 'quezon', 'branch', 'campus',
                'description', 'units', 'load', 'assessment', 'official'
            ];
            const hasCORIndicators = corKeywords.some(kw => new RegExp(kw, 'i').test(extractedText));

            // For debugging: get normalized text that extractName sees
            const normalizedText = extractedText.replace(/\s+/g, ' ').toUpperCase();

            const validations = {
                source, // Track if digital or ocr
                studentNumberMatch,
                nameMatch,
                hasCORIndicators,
                courseMatch,
                yearMatch,
                academicPeriodMatch,
                studentId: studentData.studentId, // Store what user entered
                studentFirstName: studentData.firstName,
                studentLastName: studentData.lastName,
                extractedStudentNumber,
                normalizedExtracted,
                normalizedProvided,
                extractedName,
                extractedCourse,
                extractedYear,
                extractedSection,
                extractedAY,
                extractedTerm,
                extractedText: extractedText.substring(0, 1000), // Store first 1000 chars for audit
                normalizedText: normalizedText.substring(0, 500) // For debugging name extraction
            };

            // Calculate confidence score and get mismatches
            console.log(`${logPrefix} Calculating confidence score...`);
            const confidenceResult = this.calculateConfidenceScore(validations);
            console.log(`${logPrefix} Confidence score: ${confidenceResult.confidence}%, Passed: ${confidenceResult.passed}`);
            console.log(`${logPrefix} Mismatches:`, confidenceResult.mismatches.map(m => `${m.field}: ${m.found} vs ${m.expected}`));
            console.log(`${logPrefix} Verification result: ${confidenceResult.passed ? 'PASSED' : 'FAILED'}`);

            return {
                valid: confidenceResult.passed,
                confidence: confidenceResult.confidence,
                mismatches: confidenceResult.mismatches,
                suggestions: confidenceResult.suggestions,
                reason: confidenceResult.passed ? 'COR verified successfully' : `COR verification failed - confidence too low (${confidenceResult.confidence}%). ${this.getFailureReason(validations)}`,
                details: {
                    ...validations,
                    confidenceBreakdown: confidenceResult
                }
            };
        } catch (error) {
            console.error(`${logPrefix} COR verification error:`, error);
            return {
                valid: false,
                confidence: 0,
                reason: 'Failed to process COR document: ' + error.message,
                error: error.message,
                details: {
                    errorType: error.name,
                    errorStack: error.stack
                }
            };
        }
    }

    /**
     * Calculate confidence score and identify mismatches
     * @param {Object} validations - Validation results
     * @returns {Object} { confidence, passed, mismatches[], suggestions[] }
     */
    calculateConfidenceScore(validations) {
        const source = validations.source || 'ocr'; // Default to ocr if unknown
        
        // Field weights (total = 100)
        let weights = {
            studentId: 40,
            name: 30,
            corIndicators: 15,
            academicPeriod: 10,
            courseYear: 5
        };

        // If source is digital, we can trust the extraction more
        // We boost the weight of anchor fields (ID/Name) for Digital docs 
        // to reward high-fidelity digital matches
        if (source === 'digital') {
            weights = {
                studentId: 45,
                name: 35,
                corIndicators: 10,
                academicPeriod: 5,
                courseYear: 5
            };
        }

        let totalScore = 0;
        const mismatches = [];
        const suggestions = [];

        // 1. Student Number Match (40 points) - fuzzy matching supported
        if (validations.studentNumberMatch) {
            totalScore += weights.studentId;
        } else if (validations.extractedStudentNumber && validations.studentId) {
            // Fuzzy match scoring for the confidence total
            const normalizedExtracted = validations.extractedStudentNumber.replace(/-/g, '');
            const normalizedProvided = validations.studentId.replace(/-/g, '');
            
            let matchingChars = 0;
            const len = Math.min(normalizedExtracted.length, normalizedProvided.length);
            for (let i = 0; i < len; i++) {
                if (normalizedExtracted[i] === normalizedProvided[i]) matchingChars++;
            }
            
            const similarity = matchingChars / Math.max(normalizedExtracted.length, normalizedProvided.length);
            let partialScore = 0;
            if (similarity >= 0.8) {
                partialScore = 30; // High fuzzy match
                suggestions.push("We found a student ID very similar to yours. Please check if there's a typo in your ID input.");
            } else if (similarity >= 0.6) {
                partialScore = 15; // Low fuzzy match
            }
            
            totalScore += partialScore;
            mismatches.push({
                field: 'studentId',
                fieldLabel: 'Student ID',
                expected: validations.studentId,
                found: validations.extractedStudentNumber,
                score: partialScore,
                maxScore: weights.studentId,
                fuzzy: true
            });
        } else {
            mismatches.push({
                field: 'studentId',
                fieldLabel: 'Student ID',
                expected: validations.studentId || 'unknown',
                found: validations.extractedStudentNumber || 'not found',
                score: 0,
                maxScore: weights.studentId
            });
        }

        // 2. Name Match (30 points)
        if (validations.nameMatch) {
            totalScore += weights.name;
        } else {
            mismatches.push({
                field: 'name',
                fieldLabel: 'Name',
                expected: `${validations.studentLastName}, ${validations.studentFirstName}`,
                found: validations.extractedName || 'not found',
                score: 0,
                maxScore: weights.name
            });
        }

        // 3. COR Indicators (15 points)
        if (validations.hasCORIndicators) {
            totalScore += weights.corIndicators;
        } else {
            mismatches.push({
                field: 'corIndicators',
                fieldLabel: 'COR Document Indicators',
                expected: 'Certificate/Registration keywords',
                found: 'not detected',
                score: 0,
                maxScore: weights.corIndicators
            });
        }

        // 4. Academic Period (10 points)
        if (validations.academicPeriodMatch !== false) {
            totalScore += weights.academicPeriod;
        } else {
            mismatches.push({
                field: 'academicPeriod',
                fieldLabel: 'Academic Period',
                expected: 'Current active period',
                found: `${validations.extractedAY || 'unknown'} ${validations.extractedTerm || ''}`,
                score: 0,
                maxScore: weights.academicPeriod
            });
        }

        // 5. Course/Year (5 points combined)
        const courseYearMatch = (validations.courseMatch !== false) && (validations.yearMatch !== false);
        if (courseYearMatch) {
            totalScore += weights.courseYear;
        } else {
            const issues = [];
            if (validations.courseMatch === false) issues.push(`course: ${validations.extractedCourse || 'not found'}`);
            if (validations.yearMatch === false) issues.push(`year: ${validations.extractedYear || 'not found'}`);
            
            mismatches.push({
                field: 'courseYear',
                fieldLabel: 'Course/Year',
                expected: 'Matches profile',
                found: issues.join(', ') || 'mismatch',
                score: 0,
                maxScore: weights.courseYear
            });
        }

        // Generate suggestions based on mismatches
        if (mismatches.some(m => m.field === 'studentId')) {
            suggestions.push('Upload a clearer image where your Student ID is clearly visible');
            suggestions.push('Ensure the ID numbers are not blurry or cut off');
        }
        if (mismatches.some(m => m.field === 'name')) {
            suggestions.push('Make sure your full name is visible on the COR');
            suggestions.push('Try uploading a JPG/PNG instead of PDF for better clarity');
        }
        if (mismatches.some(m => m.field === 'corIndicators')) {
            suggestions.push('Ensure you uploaded a Certificate of Registration (COR), not another document');
        }
        if (suggestions.length === 0) {
            suggestions.push('Try uploading a clearer, higher-resolution image');
            suggestions.push('Ensure the entire COR is visible and well-lit');
        }

        // Source-based confidence adjustment
        // If digital extraction matches Student ID, we give a "Trust Boost" 
        // because digital extract doesn't hallucinate like OCR.
        if (source === 'digital' && validations.studentNumberMatch) {
            totalScore = Math.min(100, totalScore + 10);
        }

        return {
            score: totalScore,
            maxScore: 100,
            confidence: totalScore,
            source: source,
            mismatches,
            suggestions,
            passed: totalScore >= 70
        };
    }

    /**
     * Get human-readable failure reason
     * @param {Object} validations - Validation results
     * @returns {string} Failure reason
     */
    getFailureReason(validations) {
        if (!validations.studentNumberMatch) {
            const extracted = validations.extractedStudentNumber || 'Not found';
            const provided = validations.studentId || 'Unknown';
            return `Student ID mismatch. The OCR found "${extracted}" on the document, but you entered "${provided}". Please ensure you entered your ID exactly as it appears on your COR.`;
        }
        if (!validations.nameMatch) {
            if (!validations.extractedName) {
                return 'Name not detected. Please ensure your full name is clearly visible on the COR.';
            }
            return `Name mismatch. We found "${validations.extractedName}" on the document, but it doesn't match your profile.`;
        }
        if (!validations.hasCORIndicators) {
            return 'Document not recognized. The uploaded file does not appear to be a Ceremony/Certificate of Registration.';
        }
        if (validations.extractedCourse && validations.courseMatch === false) {
            return `Course mismatch. Found "${validations.extractedCourse}" but you are registered for "${validations.course || 'a different course'}".`;
        }
        if (validations.extractedYear && validations.yearMatch === false) {
            return `Year Level mismatch. Found "${validations.extractedYear}" but you entered "${validations.yearLevel || 'a different year'}".`;
        }
        if (validations.academicPeriodMatch === false) {
            return `Academic Period mismatch. Document is for ${validations.extractedAY || 'Unknown'} ${validations.extractedTerm || ''}, which does not match the active enrollment period.`;
        }
        return 'Verification failed. Please ensure the document is clear and all information matches your profile.';
    }

    /**
     * Extract course from COR text
     * @param {string} text - Extracted text
     * @returns {string|null} Matches full course name
     */
    extractCourse(text) {
        // Priority 1: Look for "PROGRAM DESCRIPTION:" field (PUP COR format)
        const programDescPattern = /PROGRAM\s+DESCRIPTION:\s*([^\n\r(]+)/i;
        const match = text.match(programDescPattern);

        if (match) {
            let program = match[1].trim();

            console.log('Program description found:', program);

            // Normalize to full course name
            if (/BACHELOR.*INFORMATION\s+TECHNOLOGY/i.test(program)) {
                return 'Bachelor of Science in Information Technology';
            }
            if (/BACHELOR.*OFFICE\s+ADMINISTRATION/i.test(program)) {
                return 'Bachelor of Science in Office Administration';
            }
            if (/DIPLOMA.*INFORMATION\s+TECHNOLOGY/i.test(program)) {
                return 'Diploma in Information Technology';
            }

            return program;
        }

        // Fallback to existing pattern matching
        const patterns = [
            /Bachelor of Science in Information Technology/i,
            /BS Information Technology/i,
            /BSIT/i,
            /Diploma in Information Technology/i,
            /Diploma in IT/i,
            /DIT/i,
            /Bachelor of Science in Office Administration/i,
            /BS Office Administration/i,
            /BSOA/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const matched = match[0].toLowerCase();
                // Normalize to full name
                if (matched.includes('information technology') && matched.includes('bachelor')) return 'Bachelor of Science in Information Technology';
                if (matched.includes('office administration')) return 'Bachelor of Science in Office Administration';
                if (matched.includes('diploma') || matched === 'dit') return 'Diploma in Information Technology';
                if (matched === 'bsit') return 'Bachelor of Science in Information Technology';
                if (matched === 'bsoa') return 'Bachelor of Science in Office Administration';

                return match[0];
            }
        }
        return null;
    }

    /**
     * Extract year level from COR text
     * @param {string} text - Extracted text
     * @returns {string|null} Year level as string
     */
    extractYear(text) {
        // Priority 1: Look for "YEAR LEVEL:" field (PUP COR format)
        const yearLevelPattern = /YEAR\s+LEVEL:\s*([^\n\r]+)/i;
        const match = text.match(yearLevelPattern);

        if (match) {
            const yearText = match[1].trim().toLowerCase();
            console.log('Year level found:', yearText);

            if (yearText.includes('first') || yearText.includes('1st')) return '1';
            if (yearText.includes('second') || yearText.includes('2nd')) return '2';
            if (yearText.includes('third') || yearText.includes('3rd')) return '3';
            if (yearText.includes('fourth') || yearText.includes('4th')) return '4';
        }

        // Fallback to existing pattern matching
        const patterns = [
            /\b(1st|First)\s+Year\b/i,
            /\b(2nd|Second)\s+Year\b/i,
            /\b(3rd|Third)\s+Year\b/i,
            /\b(4th|Fourth)\s+Year\b/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const y = match[1].toLowerCase();
                if (y.startsWith('1') || y === 'first') return '1';
                if (y.startsWith('2') || y === 'second') return '2';
                if (y.startsWith('3') || y === 'third') return '3';
                if (y.startsWith('4') || y === 'fourth') return '4';
            }
        }
        return null;
    }

    /**
     * Extract section from COR text
     * @param {string} text - Extracted text
     * @returns {string|null} Section number
     */
    extractSection(text) {
        // Look for "SECTION:" field (PUP COR format)
        const sectionPattern = /SECTION:\s*(\d+)/i;
        const match = text.match(sectionPattern);

        if (match) {
            console.log('Section found:', match[1]);
            return match[1];
        }

        // Alternative pattern: "Section" followed by number
        const altPattern = /Section\s+(\d+)/i;
        const altMatch = text.match(altPattern);

        if (altMatch) {
            console.log('Section found (alt pattern):', altMatch[1]);
            return altMatch[1];
        }

        return null;
    }

    /**
     * Map lookalike characters to digits (O->0, S->5, Z->2, I/L->1)
     * Specifically for year/number contexts in OCR images.
     */
    mapOCRDigits(text) {
        if (!text) return '';
        return text.toUpperCase()
            .replace(/[OQ]/g, '0')
            .replace(/[S]/g, '5')
            .replace(/[Z]/g, '2')
            .replace(/[IL]/g, '1')
            .replace(/[G]/g, '6')
            .replace(/[T]/g, '7')
            .replace(/[B]/g, '8');
    }

    /**
     * Extract academic year from COR text
     * @param {string} text - Extracted text
     * @returns {string|null} Academic year (e.g., "2526" or "20252026")
     */
    extractAcademicYear(text) {
        // Robust patterns for A.Y. (supports A.Y., A. Y., Academic Year, etc.)
        // Supports 2526, 2025-2026, 2025-26, etc.
        const ayPatterns = [
            /A\.?\s*Y\.?\s*:?\s*([A-Z0-9\-\/]{4,10})/i, // Standard A.Y.: label
            /Academic\s+Year\s*:?\s*([A-Z0-9\-\/]{4,10})/i,
            /S\.Y\.\s*:?\s*([A-Z0-9\-\/]{4,10})/i,
            /School\s+Year\s*:?\s*([A-Z0-9\-\/]{4,10})/i
        ];

        for (const pattern of ayPatterns) {
            const match = text.match(pattern);
            if (match) {
                let yearStr = match[1].trim();
                // Preserve original digits but map OCR lookalikes (e.g. 2S26 -> 2526)
                // We keep only digits for the final normalized form
                const normalizedDigits = this.mapOCRDigits(yearStr).replace(/[^0-9]/g, ''); 
                
                // If we got precisely 4 digits (e.g. 2526) or 8 digits (20252026), use it
                if (normalizedDigits.length === 4 || normalizedDigits.length === 8) {
                    console.log('Academic year found (robust):', normalizedDigits);
                    return normalizedDigits;
                }
                
                // If we got something else, try to find the first 4-digit or 8-digit block
                const blocks = normalizedDigits.match(/(\d{8}|\d{4})/);
                if (blocks) {
                    console.log('Academic year found (block):', blocks[0]);
                    return blocks[0];
                }
            }
        }

        // Generic fallback search for year-like patterns (20XX-20YY or 2526) near A.Y. keyword
        const anchorPos = text.search(/A\.?Y\.?|Academic\s+Year/i);
        if (anchorPos !== -1) {
            const surrounding = text.substring(anchorPos, Math.min(text.length, anchorPos + 50));
            const yearMatch = surrounding.match(/(\d[A-Z0-9]{3,7})/i);
            if (yearMatch) {
                const normalized = this.mapOCRDigits(yearMatch[1]).replace(/[^0-9]/g, '');
                if (normalized.length === 4 || normalized.length === 8) {
                    return normalized;
                }
            }
        }

        return null;
    }

    /**
     * Extract term/semester from COR text
     * @param {string} text - Extracted text
     * @returns {string|null} Term (e.g., "First Semester", "Second Semester")
     */
    extractTerm(text) {
        // Look for "TERM:" field with variable spacing/colons
        const termPatterns = [
            /TERM\s*:?\s*([^\n\r]+)/i,
            /Semester\s*:?\s*([^\n\r]+)/i
        ];

        for (const pattern of termPatterns) {
            const match = text.match(pattern);
            if (match) {
                const term = match[1].trim();
                // Clean up any trailing labels that might have been caught
                const cleaned = term.split(/\s+(?:COURSE|YEAR|SECTION|DATE|A\.Y)/i)[0].trim();
                console.log('Term found (robust):', cleaned);
                return cleaned;
            }
        }

        // Search for keywords directly if labels failed
        const keywords = ['First Semester', '1st Semester', 'Second Semester', '2nd Semester', 'Summer', 'Midyear'];
        for (const kw of keywords) {
            if (new RegExp(kw, 'i').test(text)) {
                return kw;
            }
        }

        return null;
    }

    /**
     * Fuzzy match academic period (handles format differences like 2526 vs 2025-2026)
     * @param {string} extractedAY - Extracted Academic Year
     * @param {string} extractedTerm - Extracted Term/Semester
     * @param {Object} activePeriod - Current active academic period from DB
     * @returns {boolean} True if they match or if extraction failed (lenient)
     */
    fuzzyAcademicPeriodMatch(extractedAY, extractedTerm, activePeriod) {
        if (!activePeriod) return true; // Default to true if no active period set for comparison

        // 1. Validate Academic Year
        const activeAY = activePeriod.schoolYear;
        let ayMatch = true;

        if (extractedAY && activeAY) {
            const extDigits = extractedAY.replace(/\D/g, ''); // "2526"
            const activeDigits = activeAY.replace(/\D/g, ''); // "20252026"

            if (extDigits === activeDigits) {
                ayMatch = true;
            } else if (extDigits.length === 4 && activeDigits.length === 8) {
                // Short form match check (e.g., "2526" vs "20252026")
                const activeShort = activeAY.split(/[^\d]+/).map(y => y.slice(-2)).join('');
                ayMatch = (extDigits === activeShort);
            } else {
                ayMatch = activeAY.includes(extractedAY) || extractedAY.includes(activeAY);
            }
        }

        // 2. Validate Term/Semester
        const activeTerm = activePeriod.semester;
        let termMatch = true;

        if (extractedTerm && activeTerm) {
            const normalize = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
            const nExt = normalize(extractedTerm);
            const nActive = normalize(activeTerm);

            if (nExt.includes(nActive) || nActive.includes(nExt)) {
                termMatch = true;
            } else {
                // Check common variations (1st vs First)
                const isFirst = (s) => s.includes('1st') || s.includes('first');
                const isSecond = (s) => s.includes('2nd') || s.includes('second');
                const isSummer = (s) => s.includes('summer') || s.includes('midyear');

                if (isFirst(nExt) && isFirst(nActive)) termMatch = true;
                else if (isSecond(nExt) && isSecond(nActive)) termMatch = true;
                else if (isSummer(nExt) && isSummer(nActive)) termMatch = true;
                else termMatch = false;
            }
        }

        return ayMatch && termMatch;
    }
}

module.exports = new OCRService();
