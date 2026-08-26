const Receipt = require('../models/Receipt');

// Helper to call Gemini AI OCR if GEMINI_API_KEY is available
async function tryGeminiOCR(fileBuffer, mimeType, apiKey) {
  try {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const base64Data = fileBuffer.toString('base64');

    const prompt = `Analyze this receipt image and extract structured data as JSON with:
{
  "merchant": "Store or merchant name",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "items": [
    { "name": "Item name", "price": 0.00 }
  ]
}
Return valid JSON only. Do not include markdown code block syntax.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType || 'image/jpeg',
              },
            },
          ],
        },
      ],
    });

    const text = response.text ? response.text.trim() : '';
    const cleanJson = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (parsed && (parsed.merchant || parsed.amount > 0)) {
      return {
        merchant: parsed.merchant || 'Store',
        amount: parseFloat(parsed.amount) || 0.0,
        date: parsed.date ? new Date(parsed.date) : new Date(),
        items: Array.isArray(parsed.items) ? parsed.items : [],
      };
    }
  } catch (err) {
    console.warn('[OCR] Gemini AI OCR fallback to OCR.Space:', err.message);
  }
  return null;
}

// Helper to call OCR.Space API with multi-endpoint failover
async function tryOCRSpace(fileBuffer, mimeType, apiKey) {
  const base64Data = fileBuffer.toString('base64');
  const base64Image = `data:${mimeType || 'image/jpeg'};base64,${base64Data}`;

  const endpoints = [
    'https://api.ocr.space/parse/image',
    'https://api2.ocr.space/parse/image',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`[OCR] Requesting OCR.Space (${endpoint})...`);
      const formData = new FormData();
      formData.append('apikey', apiKey);
      formData.append('base64Image', base64Image);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('isTable', 'true');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: formData,
      });

      if (!response.ok) {
        console.warn(`[OCR] Endpoint ${endpoint} returned HTTP ${response.status}`);
        continue;
      }

      const result = await response.json();
      console.log(`[OCR] ExitCode: ${result?.OCRExitCode}, IsErrored: ${result?.IsErroredOnProcessing}`);

      if (result && result.ParsedResults && result.ParsedResults.length > 0) {
        const parsedText = result.ParsedResults[0].ParsedText || '';
        if (parsedText.trim().length > 0) {
          return parseReceiptText(parsedText);
        }
      }
    } catch (e) {
      console.warn(`[OCR] Error with ${endpoint}:`, e.message);
    }
  }

  return null;
}

// Heuristic parser for raw OCR text
function parseReceiptText(parsedText) {
  const lines = parsedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const res = {
    merchant: 'Store / Merchant',
    amount: 0.0,
    date: new Date(),
    items: [],
  };

  if (lines.length === 0) return res;

  // 1. Merchant name (first non-generic header line)
  const genericHeaders = /^(tax\s*invoice|receipt|cash\s*memo|bill|retail\s*invoice|invoice|welcome|order|duplicate|payment)$/i;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    if (!genericHeaders.test(lines[i]) && lines[i].length >= 3 && !/^\d+$/.test(lines[i])) {
      res.merchant = lines[i];
      break;
    }
  }
  if (!res.merchant) res.merchant = lines[0];

  // 2. Date
  const dateRegex = /\b(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})\b/;
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const dateMatch = lines[i].match(dateRegex);
    if (dateMatch) {
      let d = new Date(dateMatch[0]);
      if (isNaN(d.getTime())) {
        const parts = dateMatch[0].split(/[-/.]/);
        if (parts.length === 3 && parts[2].length === 4) {
          d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }
      if (!isNaN(d.getTime()) && d.getFullYear() > 2000 && d.getFullYear() <= new Date().getFullYear() + 1) {
        res.date = d;
        break;
      }
    }
  }

  // 3. Amount
  const totalRegex = /(?:total|grand\s*total|net\s*total|amount\s*due|amount\s*paid|subtotal|balance\s*due|final\s*total)\s*[:=]*\s*(?:rs\.?|inr|[$₹£€])?\s*([\d,]+\.?\d*)/i;
  const amountMatches = [];
  lines.forEach((line) => {
    const match = line.match(totalRegex);
    if (match) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) amountMatches.push(val);
    }
  });

  if (amountMatches.length > 0) {
    res.amount = Math.max(...amountMatches);
  } else {
    const priceRegex = /(?:rs\.?|inr|[$₹£€])\s*([\d,]+\.?\d*)|(?:\b[\d,]+\.\d{2}\b)/gi;
    let priceMatch;
    const allPrices = [];
    while ((priceMatch = priceRegex.exec(parsedText)) !== null) {
      const numStr = (priceMatch[1] || priceMatch[0]).replace(/[^0-9.]/g, '');
      const val = parseFloat(numStr);
      if (!isNaN(val) && val > 0 && val < 10000000) allPrices.push(val);
    }
    if (allPrices.length > 0) res.amount = Math.max(...allPrices);
  }

  // 4. Line items
  const itemLineRegex = /^(.+?)\s+(?:rs\.?|inr|[$₹£€])?\s*([\d,]+\.\d{2})$/i;
  lines.forEach((line) => {
    if (/total|subtotal|tax|vat|gst|cgst|sgst|due|change|cash|card|visa|master|balance|discount/i.test(line)) {
      return;
    }
    const match = line.match(itemLineRegex);
    if (match) {
      const name = match[1].trim().replace(/^[-*•\d.\s]+/, '');
      const price = parseFloat(match[2].replace(/,/g, ''));
      if (name.length >= 2 && !isNaN(price) && price > 0 && price < (res.amount || 999999)) {
        res.items.push({ name, price });
      }
    }
  });

  return res;
}

// @desc    Upload a receipt and extract details
// @route   POST /api/receipts/upload
// @access  Private
const uploadAndScanReceipt = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const mimeType = req.file.mimetype || 'image/jpeg';
  const receipt = new Receipt({
    user: req.user._id,
    filename: req.file.originalname,
    status: 'pending',
  });

  try {
    let ocrResult = null;

    // Strategy 1: Try Gemini AI if GEMINI_API_KEY is available
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      ocrResult = await tryGeminiOCR(req.file.buffer, mimeType, geminiKey);
    }

    // Strategy 2: Use OCR.Space API
    if (!ocrResult) {
      const ocrKey = process.env.OCR_API_KEY || 'K82188461988957';
      ocrResult = await tryOCRSpace(req.file.buffer, mimeType, ocrKey);
    }

    // If OCR extracted data successfully
    if (ocrResult && (ocrResult.merchant || ocrResult.amount > 0)) {
      receipt.ocrData = ocrResult;
      receipt.status = 'processed';
      await receipt.save();

      return res.status(200).json({
        message: 'Receipt uploaded and processed successfully',
        data: ocrResult,
      });
    }

    // Strategy 3: Fallback template for unrecognized text
    const fallbackResult = {
      merchant: 'Receipt Expense',
      amount: 0.0,
      date: new Date(),
      items: [],
    };

    receipt.ocrData = fallbackResult;
    receipt.status = 'processed';
    await receipt.save();

    return res.status(200).json({
      message: 'Image uploaded. Please verify and confirm details.',
      data: fallbackResult,
    });
  } catch (error) {
    console.error('[OCR] Upload error:', error);
    receipt.status = 'failed';
    await receipt.save().catch(() => {});
    return res.status(500).json({ message: 'Receipt processing error', error: error.message });
  }
};

module.exports = {
  uploadAndScanReceipt,
};
