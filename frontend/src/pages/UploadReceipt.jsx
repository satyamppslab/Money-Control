import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useAuth } from '../contexts/AuthContext';
import { UploadCloud, Sparkles, Clock, ArrowLeft, Check, AlertCircle, Loader2, Tag, Calendar, User, ShoppingBag } from 'lucide-react';

const UploadReceipt = () => {
  const { currency, CURRENCY_SYMBOLS, convertToBase } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // OCR results states
  const [ocrData, setOcrData] = useState(null);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Shopping');
  const [description, setDescription] = useState('');

  const categories = [
    'Food', 
    'Utilities', 
    'Rent', 
    'Entertainment', 
    'Salary', 
    'Investment', 
    'Shopping', 
    'Travel', 
    'Health', 
    'Education', 
    'Groceries',
    'Insurance',
    'Other'
  ];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleScanReceipt = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const response = await api.post('/receipts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const extracted = response.data.data;
      setOcrData(extracted);
      setMerchant(extracted.merchant || 'Unknown Merchant');
      setAmount(extracted.amount || '0.00');
      
      // Format date to YYYY-MM-DD
      if (extracted.date) {
        const d = new Date(extracted.date);
        if (!isNaN(d.getTime())) {
          setDate(d.toISOString().split('T')[0]);
        } else {
          setDate(new Date().toISOString().split('T')[0]);
        }
      } else {
        setDate(new Date().toISOString().split('T')[0]);
      }

      // Pre-fill description with items
      if (extracted.items && extracted.items.length > 0) {
        const itemsStr = extracted.items.map(item => `${item.name}: ${CURRENCY_SYMBOLS[currency] || '₹'}${item.price}`).join(', ');
        setDescription(`AI Parsed Items: ${itemsStr}`);
      } else {
        setDescription('AI Parsed Receipt');
      }

      setSuccess('OCR details scanned successfully!');
    } catch (err) {
      console.error('Scan error:', err);
      setError(err.response?.data?.message || 'Failed to parse receipt. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = async (e) => {
    e.preventDefault();
    if (!amount || !merchant) return;

    setLoading(true);
    try {
      await api.post('/transactions', {
        title: merchant, // Save merchant name as transaction title
        amount: convertToBase(amount, currency), // Convert to base base currency
        type: 'expense', // Receipts are outflows/expenses
        category,
        date,
        description,
      });

      setSuccess('Transaction successfully added to ledger!');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to log receipt transaction.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[calc(100vh-120px)] relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="flex flex-col gap-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-655 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Receipt Scanner</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Instantly scan receipts and add expenses with Gemini AI</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-500 dark:text-brand-400 px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Gemini AI Engine</span>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 p-4 rounded-xl text-sm flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-sm flex items-start gap-2">
            <Check className="h-5 w-5 shrink-0 animate-bounce" />
            <span>{success}</span>
          </div>
        )}

        {!ocrData ? (
          /* File Upload Zone */
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm dark:shadow-none transition-colors duration-200">
            <form onSubmit={handleScanReceipt} className="space-y-6">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative">
                <input
                  type="file"
                  required
                  accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="h-14 w-14 text-slate-400 dark:text-slate-500 mb-4" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  {file ? file.name : 'Select or drop receipt file'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-450">
                  Accepts PDF, JPG, JPEG, PNG, WEBP formats (Max 5MB)
                </span>
              </div>

              <button
                type="submit"
                disabled={!file || loading}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-slate-950 font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer text-sm shadow-md shadow-brand-500/15"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Extracting details with Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4.5 w-4.5" />
                    <span>Scan & Extract Receipt</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* OCR Result & Confirmation Form */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-none space-y-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-brand-500" />
                <span>Confirm Extracted Details</span>
              </h2>

              <form onSubmit={handleConfirmSave} className="space-y-4">
                <div>
                  <label className="block text-slate-500 dark:text-slate-350 text-xs font-semibold mb-1.5 uppercase tracking-wider">Merchant / Store Name</label>
                  <input
                    type="text"
                    required
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-355 text-xs font-semibold mb-1.5 uppercase tracking-wider">Amount ({currency})</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-355 text-xs font-semibold mb-1.5 uppercase tracking-wider">Date</label>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().split('T')[0]}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 text-slate-800 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-355 text-xs font-semibold mb-1.5 uppercase tracking-wider">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 text-slate-805 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-colors cursor-pointer"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c} className="bg-white dark:bg-slate-950 text-slate-850 dark:text-white">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-355 text-xs font-semibold mb-1.5 uppercase tracking-wider">File Name</label>
                    <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 text-slate-500 text-sm truncate select-none">
                      {file ? file.name : 'Unknown File'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-355 text-xs font-semibold mb-1.5 uppercase tracking-wider">Description / Breakdown</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="3"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-colors"
                  ></textarea>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOcrData(null);
                      setFile(null);
                    }}
                    className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    Re-upload
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold py-3 rounded-lg text-sm transition-all cursor-pointer shadow-md"
                  >
                    Confirm & Save Expense
                  </button>
                </div>
              </form>
            </div>

            {/* AI Extracted Items Column */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-none space-y-4">
              <h3 className="text-md font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-brand-500" />
                <span>AI Extracted Items</span>
              </h3>

              {ocrData.items && ocrData.items.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto pr-1">
                  {ocrData.items.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{item.name}</span>
                      <span className="text-slate-900 dark:text-white font-bold">{CURRENCY_SYMBOLS[currency] || '₹'}{item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-xs italic text-center py-6">
                  No individual line items parsed.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadReceipt;
