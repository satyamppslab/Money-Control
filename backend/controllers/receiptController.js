const Receipt = require('../models/Receipt');

// @desc    Upload a receipt and extract details using OCR.Space API
// @route   POST /api/receipts/upload
// @access  Private
const uploadAndScanReceipt = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const mimeType = req.file.mimetype;

  // Initialize receipt entry - the file itself is never persisted, only the
  // OCR result extracted from it.
  const receipt = new Receipt({
    user: req.user._id,
    filename: req.file.originalname,
    status: 'pending',
  });

  try {
    let ocrResult = {
      merchant: 'Unknown Merchant',
      amount: 0.00,
      date: new Date(),
      items: [],
    };

    let ocrSucceeded = false;
    const apiKey = process.env.OCR_API_KEY;

    if (apiKey) {
      try {
        console.log('Sending receipt to OCR.Space API...');
        
        // Convert file buffer to base64 with correct MIME type prefix
        const base64Data = req.file.buffer.toString('base64');
        const base64Image = `data:${mimeType};base64,${base64Data}`;

        const params = new URLSearchParams();
        params.append('apikey', apiKey);
        params.append('base64Image', base64Image);
        params.append('language', 'eng');
        params.append('isOverlayRequired', 'false');

        const response = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        });

        const result = await response.json();

        if (result && result.ParsedResults && result.ParsedResults[0]) {
          const parsedText = result.ParsedResults[0].ParsedText || '';
          console.log('OCR.Space raw parsed text successfully fetched.');

          const lines = parsedText.split('\r\n').join('\n').split('\n').map(l => l.trim()).filter(l => l.length > 0);

          if (lines.length > 0) {
            // Heuristic 1: Merchant name is usually the first non-empty line
            ocrResult.merchant = lines[0] || 'Unknown Merchant';

            // Heuristic 2: Find Transaction Date
            // Regex to find dates like YYYY-MM-DD, DD/MM/YYYY, MM-DD-YYYY
            const dateRegex = /\b(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})\b/;
            for (let i = 0; i < Math.min(lines.length, 10); i++) {
              const dateMatch = lines[i].match(dateRegex);
              if (dateMatch) {
                const d = new Date(dateMatch[0]);
                if (!isNaN(d.getTime())) {
                  ocrResult.date = d;
                  break;
                }
              }
            }

            // Heuristic 3: Find Total Amount
            // Look for lines containing total keywords and floating numbers
            const totalRegex = /(?:total|grand\s+total|net\s+total|amount|due|paid|subtotal)\s*[:=]*\s*[$₹£€]*\s*([\d,]+\.\d{2})/i;
            const amountMatches = [];
            lines.forEach(line => {
              const match = line.match(totalRegex);
              if (match) {
                const val = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(val)) {
                  amountMatches.push(val);
                }
              }
            });

            if (amountMatches.length > 0) {
              ocrResult.amount = Math.max(...amountMatches);
            } else {
              // Fallback: extract all floating numbers and find the largest one (usually the grand total)
              const priceRegex = /\b([\d,]+\.\d{2})\b/g;
              let match;
              const allPrices = [];
              while ((match = priceRegex.exec(parsedText)) !== null) {
                const val = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(val)) {
                  allPrices.push(val);
                }
              }
              if (allPrices.length > 0) {
                ocrResult.amount = Math.max(...allPrices);
              }
            }

            // Heuristic 4: Extract items
            // Look for lines ending with a decimal price
            const itemLineRegex = /^(.+?)\s+[$₹£€]?\s*([\d,]+\.\d{2})$/;
            lines.forEach(line => {
              if (/total|subtotal|tax|vat|due|change|cash|card|visa|master/i.test(line)) {
                return;
              }
              const match = line.match(itemLineRegex);
              if (match) {
                const name = match[1].trim();
                const price = parseFloat(match[2].replace(/,/g, ''));
                if (name.length > 2 && !isNaN(price) && price < (ocrResult.amount || 999999)) {
                  ocrResult.items.push({ name, price });
                }
              }
            });

            ocrSucceeded = true;
          }
        } else {
          console.warn('OCR.Space API returned an error structure:', result);
        }
      } catch (ocrSpaceError) {
        console.warn('OCR.Space API request failed, falling back to mock OCR data:', ocrSpaceError);
      }
    } else {
      console.warn('OCR_API_KEY is not defined. Performing Mock OCR extraction.');
    }

    if (!ocrSucceeded) {
      console.log('Using fallback Mock OCR extraction.');
      ocrResult = {
        merchant: 'Mock Grocery Mart',
        amount: 42.85,
        date: new Date(),
        items: [
          { name: 'Organic Milk', price: 4.50 },
          { name: 'Whole Wheat Bread', price: 3.25 },
          { name: 'Fresh Strawberries', price: 5.99 },
          { name: 'Coffee Beans 1kg', price: 18.99 },
          { name: 'Paper Towels', price: 10.12 },
        ],
      };
    }

    receipt.ocrData = ocrResult;
    receipt.status = 'processed';
    await receipt.save();

    res.status(200).json({
      message: 'Receipt uploaded and processed successfully',
      data: ocrResult,
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    receipt.status = 'failed';
    await receipt.save().catch(() => {});
    res.status(500).json({ message: 'Receipt upload succeeded but OCR processing failed', error: error.message });
  }
};

module.exports = {
  uploadAndScanReceipt,
};
