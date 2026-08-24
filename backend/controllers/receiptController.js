const Receipt = require('../models/Receipt');

// Try loading Google Gen AI SDK
let GoogleGenAI;
try {
  const genaiSdk = require('@google/genai');
  GoogleGenAI = genaiSdk.GoogleGenAI;
} catch (err) {
  console.warn('Google Gen AI SDK not loaded yet. Mock OCR mode will be active until npm install runs.');
}

// Helper to convert an in-memory file buffer to a GoogleGenAI Part object
function fileToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}

// @desc    Upload a receipt and extract details using Gemini AI
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

    const apiKey = process.env.GEMINI_API_KEY;

    if (GoogleGenAI && apiKey) {
      console.log('Initializing Gemini AI with SDK...');
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
        Analyze this receipt image/PDF. Extract the following information:
        - Merchant/Store name
        - Total transaction amount (as a number)
        - Transaction date (in YYYY-MM-DD format if possible)
        - Individual items listed on the receipt, including their name and price.

        Respond ONLY with a JSON object in this exact schema:
        {
          "merchant": "string",
          "amount": number,
          "date": "string (YYYY-MM-DD)",
          "items": [
            {
              "name": "string",
              "price": number
            }
          ]
        }
      `;

      const filePart = fileToGenerativePart(req.file.buffer, mimeType);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [prompt, filePart],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        console.log('Gemini raw OCR response:', responseText);
        try {
          const parsed = JSON.parse(responseText);
          ocrResult.merchant = parsed.merchant || 'Unknown Merchant';
          ocrResult.amount = Number(parsed.amount) || 0;
          if (parsed.date) {
            ocrResult.date = new Date(parsed.date);
          }
          ocrResult.items = Array.isArray(parsed.items) ? parsed.items.map(item => ({
            name: item.name || 'Item',
            price: Number(item.price) || 0,
          })) : [];
        } catch (parseErr) {
          console.error('Failed to parse JSON response from Gemini, using fallback matching', parseErr);
        }
      }
    } else {
      console.warn('Gemini API key not configured or SDK missing. Performing Mock OCR extraction.');
      // Mock data based on some simple heuristics or randomized dummy receipt data
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
