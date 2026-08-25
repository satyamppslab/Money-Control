import { Sparkles, Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const UploadReceipt = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-xl p-10 rounded-2xl w-full max-w-xl shadow-2xl text-center relative z-10 space-y-6 transition-colors duration-200">
        <div className="inline-flex items-center justify-center p-4 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-500 dark:text-brand-400 mb-2 animate-bounce">
          <Sparkles className="h-10 w-10" />
        </div>

        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          AI Receipt OCR Scanner
        </h1>
        
        <div className="inline-block bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full px-4 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5 w-fit mx-auto transition-colors duration-200">
          <Clock className="h-3.5 w-3.5 text-brand-500 dark:text-brand-400" />
          <span>Coming Soon</span>
        </div>

        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
          We are currently polishing our advanced Gemini AI engine to extract dates, merchants, totals, and line items from your receipts with even higher accuracy. 
        </p>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <p className="text-xs text-slate-450 dark:text-slate-500">
            This feature will automatically parse uploads and update your ledger in real-time in the next version.
          </p>
        </div>

        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-955 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-200 dark:border-slate-800 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UploadReceipt;
