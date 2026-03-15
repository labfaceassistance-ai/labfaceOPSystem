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
    async extractTextFromImage(base64Image) {
        try {
            // Check if it's a PDF
            if (base64Image.startsWith('data:application/pdf')) {
                // Remove data URL prefix and convert to buffer
                const pdfData = base64Image.replace(/^data:application\/pdf;base64,/, '');
                const buffer = Buffer.from(pdfData, 'base64');

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
                                pdfData.Pages.forEach(page => {
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
                                });
                            }

                            // Clean up temp file
                            try {
                                fs.unlinkSync(tempFilePath);
                            } catch (e) {
                                console.warn('Failed to delete temp file:', e);
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
                            console.warn('Failed to delete temp file:', e);
                        }
                        reject(error);
                    });

                    pdfParser.loadPDF(tempFilePath);
                });

                console.log('PDF text extracted:', extractedText.substring(0, 500));

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
                            console.log(`Found scanned image (${largestImageSize} bytes). Running OCR...`);

                            // Run Tesseract on the extracted image
                            const { data: { text } } = await Tesseract.recognize(
                                largestImageBuffer,
                                'eng',
                                { logger: info => console.log('Fallback OCR Progress:', info) }
                            );

                            console.log('Fallback OCR Text:', text.substring(0, 500));
                            return text;
                        } else {
                            throw new Error('No text or images found in PDF.');
                        }
                    } catch (fallbackError) {
                        console.error('Fallback OCR failed:', fallbackError);
                        throw new Error('No text found in PDF. If this is a scanned document, please upload it as an Image (JPG/PNG) instead. Details: ' + fallbackError.message);
                    }
                }

                return extractedText;
            }

            // Handle images with Tesseract OCR
            const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(imageData, 'base64');

            // Run Tesseract OCR
            const { data: { text } } = await Tesseract.recognize(
                buffer,
                'eng',
                {
                    logger: info => console.log('OCR Progress:', info)
                }
            );

            return text;
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
     * @returns {string|null} Student number or null if not found
     */
    extractStudentNumber(text) {
        // Robust Pattern: Allow 0/O, 1/I/l, 2/Z, 5/S etc.
        // YYYY (20xx) - NNNNN - XX - N
        // We focus mainly on 0->O substitution as it's the most common failure
        const robustPattern = /\b(20[0-9O]{2}[-\s.]?[0-9O]{5}[-\s.]?[A-Z]{2}[-\s.]?[0-9O])\b/i;

        const match = text.match(robustPattern);

        if (match) {
            let raw = match[1].toUpperCase();

            // Normalize: Replace O with 0
            raw = raw.replace(/O/g, '0');

            // Remove separators to get raw chars
            const clean = raw.replace(/[-\s.]/g, '');

            // Reformat to YYYY-NNNNN-XX-N
            if (clean.length === 12) {
                return clean.replace(/(\d{4})(\d{5})([A-Z]{2})(\d)/, '$1-$2-$3-$4');
            }
        }

        // Fallback to partial match (YYYY-NNNNN)
        const partialPattern = /\b(20\d{2}[-\s]?\d{5})\b/;
        const partialMatch = text.match(partialPattern);
        if (partialMatch) {
            return partialMatch[1].replace(/\s/g, '').replace(/(\d{4})(\d{5})/, '$1-$2');
        }

        return null;
    }

    /**
     * Extract name from COR text
     * Uses reverse search - find student ID first, then extract name before it
     * @param {string} text - Extracted text from COR
     * @returns {string|null} Name or null if not found
     */
    extractName(text, studentData = null) {
        // Normalize: uppercase and single spaces
        const normalized = text.replace(/\s+/g, ' ').toUpperCase();

        // Strategy 1: Find student ID first, then look backwards for name (Standard PUP Format)
        const robustIdPattern = /20[0-9O]{2}[-\s.]?[0-9O]{5}[-\s.]?[A-Z]{2}[-\s.]?[0-9O]/i;
        const studentIdMatch = normalized.match(robustIdPattern);

        if (studentIdMatch) {
            const studentIdPos = studentIdMatch.index;
            // Look at the 150 characters before the student ID (increased from 100)
            const beforeId = normalized.substring(Math.max(0, studentIdPos - 150), studentIdPos);

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
            const match = normalized.match(pattern);
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
            let searchArea = normalized;

            // Re-find Student ID position to narrow search
            const robustIdPattern = /20[0-9O]{2}[-\s.]?[0-9O]{5}[-\s.]?[A-Z]{2}[-\s.]?[0-9O]/i;
            const studentIdMatch = normalized.match(robustIdPattern);

            if (studentIdMatch) {
                const studentIdPos = studentIdMatch.index;
                searchArea = normalized.substring(Math.max(0, studentIdPos - 300), studentIdPos);
            } else {
                searchArea = normalized.substring(0, 1500); // Fallback to start of document
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
            let normalized = str.toUpperCase()
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
            // This allows extracted text to have extra words (e.g. middle name) without failing
            return partWords.filter(w => w.length > 1).every(partWord =>
                fullTextWords.some(extractedWord =>
                    // Check exact match or inclusion
                    extractedWord === partWord || extractedWord.includes(partWord) || partWord.includes(extractedWord)
                )
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

        const normalize = (str) => str.toLowerCase()
            .replace(/bachelor\s+of\s+science\s+in/gi, 'bs')
            .replace(/diploma\s+in/gi, 'dip')
            .replace(/\s+/g, ' ')
            .trim();

        const c1 = normalize(course1);
        const c2 = normalize(course2);

        // check for simple containment first
        if (c1.includes(c2) || c2.includes(c1)) return true;

        // Check for acronyms
        // Map common acronyms to their keywords
        const acronymMap = {
            'bsit': ['information', 'technology'],
            'bsoa': ['office', 'administration'],
            'dit': ['diploma', 'information', 'technology', 'dip']
        };

        const checkAcronym = (text, target) => {
            for (const [acronym, keywords] of Object.entries(acronymMap)) {
                if (text.includes(acronym)) {
                    // If text has acronym, check if target has ALL keywords
                    return keywords.every(k => target.includes(k));
                }
            }
            return false;
        };

        if (checkAcronym(c1, c2)) return true;
        if (checkAcronym(c2, c1)) return true;

        return false;
    }

    /**
     * Verify Certificate of Registration
     * @param {string} corImage - Base64 encoded COR image
     * @param {Object} studentData - Student data to verify against
     * @param {Object} activePeriod - Current active academic period
     * @returns {Promise<Object>} Verification result
     */
    async verifyCOR(corImage, rawStudentData, activePeriod = null) {
        // Sanitize middle name (handle N/A, NA, etc.)
        const studentData = { ...rawStudentData };
        if (studentData.middleName) {
            const lowerMiddle = studentData.middleName.toLowerCase().replace(/[\s\.]/g, '');
            if (['na', 'n/a', 'none', '-', 'null'].includes(lowerMiddle)) {
                studentData.middleName = '';
            }
        }

        try {
            // Extract text from COR
            const extractedText = await this.extractTextFromImage(corImage);

            console.log('Extracted COR text:', extractedText.substring(0, 500));

            // Extract student number
            const extractedStudentNumber = this.extractStudentNumber(extractedText);

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

            // Validate student number
            const studentNumberMatch = extractedStudentNumber === studentData.studentId;

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

            // Check if document looks like a COR
            const hasCORIndicators = /certificate|registration|enrollment|semester|subject|program\s+description/i.test(extractedText);

            // For debugging: get normalized text that extractName sees
            const normalizedText = extractedText.replace(/\s+/g, ' ').toUpperCase();

            const validations = {
                studentNumberMatch,
                nameMatch,
                hasCORIndicators,
                courseMatch,
                yearMatch,
                academicPeriodMatch,
                extractedStudentNumber,
                extractedName,
                extractedCourse,
                extractedYear,
                extractedSection,
                extractedAY,
                extractedTerm,
                extractedText: extractedText.substring(0, 1000), // Store first 1000 chars for audit
                normalizedText: normalizedText.substring(0, 500) // For debugging name extraction
            };

            // Determine if valid
            // Require Student ID + Name + COR Indicators + Academic Period Match
            // If Course/Year extracted, check them. If not extracted, assume okay (OCR limitation).
            const isValid = studentNumberMatch && nameMatch && hasCORIndicators &&
                (courseMatch !== false) && (yearMatch !== false) &&
                (academicPeriodMatch !== false);

            return {
                valid: isValid,
                confidence: isValid ? 0.95 : 0.3,
                reason: isValid ? 'COR verified successfully' : this.getFailureReason(validations),
                details: validations
            };

        } catch (error) {
            console.error('COR verification error:', error);
            console.error('Error stack:', error.stack);
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
     * Get human-readable failure reason
     * @param {Object} validations - Validation results
     * @returns {string} Failure reason
     */
    getFailureReason(validations) {
        if (!validations.studentNumberMatch) {
            return `Student ID mismatch. Found: ${validations.extractedStudentNumber || 'not found'}`;
        }
        if (!validations.nameMatch) {
            if (!validations.extractedName) {
                return 'Name not found in COR. Please ensure your COR is clear and readable.';
            }
            return `Name mismatch. Found: ${validations.extractedName}. (Debug: Check server logs for details)`;
        }
        if (!validations.hasCORIndicators) {
            return 'Document does not appear to be a valid Certificate of Registration';
        }
        if (validations.extractedCourse && validations.courseMatch === false) {
            return `Course mismatch. Found: ${validations.extractedCourse}`;
        }
        if (validations.extractedYear && validations.yearMatch === false) {
            return `Year Level mismatch. Found: ${validations.extractedYear}`;
        }
        if (validations.academicPeriodMatch === false) {
            return `Academic Period mismatch. Your COR is for ${validations.extractedAY || 'Unknown'} ${validations.extractedTerm || ''}, but the current active period is different.`;
        }
        return 'Verification failed. Please check that your information matches your COR.';
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
     * Extract academic year from COR text
     * @param {string} text - Extracted text
     * @returns {string|null} Academic year (e.g., "2526")
     */
    extractAcademicYear(text) {
        // Look for "A.Y.:" or "Academic Year:" field
        const ayPattern = /A\.Y\.:\s*(\d{4})/i;
        const match = text.match(ayPattern);

        if (match) {
            console.log('Academic year found:', match[1]);
            return match[1];
        }

        return null;
    }

    /**
     * Extract term/semester from COR text
     * @param {string} text - Extracted text
     * @returns {string|null} Term (e.g., "First Semester", "Second Semester")
     */
    extractTerm(text) {
        // Look for "TERM:" field
        const termPattern = /TERM:\s*([^\n\r]+)/i;
        const match = text.match(termPattern);

        if (match) {
            const term = match[1].trim();
            console.log('Term found:', term);
            return term;
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
