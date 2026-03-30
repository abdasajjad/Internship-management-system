const pdfParseModule = require('pdf-parse');

// pdf-parse may export either a function or a default function depending on build format.
const pdfParse = typeof pdfParseModule === 'function'
    ? pdfParseModule
    : pdfParseModule?.default;
const PDFParseClass = pdfParseModule?.PDFParse;

/**
 * Extract text from a PDF buffer
 * @param {Buffer} buffer - The PDF file buffer
 * @returns {Promise<string>} Extracted text from PDF
 */
exports.extractPdfText = async (buffer) => {
    try {
        // v1 API: pdfParse(buffer)
        if (typeof pdfParse === 'function') {
            const data = await pdfParse(buffer);
            return data?.text || '';
        }

        // v2 API: new PDFParse({ data: buffer }).getText()
        if (typeof PDFParseClass === 'function') {
            const parser = new PDFParseClass({ data: buffer });
            try {
                const result = await parser.getText();
                return result?.text || '';
            } finally {
                await parser.destroy();
            }
        }

        throw new Error('pdf-parse module did not expose a compatible parser API');
    } catch (err) {
        console.error('Error parsing PDF:', err);
        throw new Error('Failed to extract PDF text: ' + err.message);
    }
};

/**
 * Extract and clean PDF text for analysis
 * @param {Buffer} buffer - The PDF file buffer
 * @returns {Promise<string>} Cleaned text
 */
exports.extractAndCleanPdfText = async (buffer) => {
    const text = await exports.extractPdfText(buffer);
    // Remove extra whitespace and newlines
    const cleaned = text
        .replace(/\s+/g, ' ')
        .trim();
    return cleaned;
};
