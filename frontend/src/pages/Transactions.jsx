import { useEffect, useState } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, Search, Trash2, Calendar, Tag, DollarSign, Filter } from 'lucide-react';

const Transactions = () => {
  const { formatAmount, currency, convertToBase, CURRENCY_SYMBOLS } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

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

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!amount) return;

    try {
      await api.post('/transactions', {
        title: category, // Default title to selected category
        amount: convertToBase(amount, currency),
        type,
        category,
        date,
        description,
      });

      // Clear Form
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);

      fetchTransactions();
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this transaction?')) {
      try {
        await api.delete(`/transactions/${id}`);
        fetchTransactions();
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Filter & Search Logic
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.category.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <style>{`
        /* Direct override for dark mode calendar picker icon contrast */
        .dark input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1) !important;
          cursor: pointer;
        }
        .dark input[type="date"] {
          color:  #ffffff !important;
        }
      `}</style>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transaction Log Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md rounded-xl p-6 shadow-sm dark:shadow-none transition-colors duration-200">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Transaction History</h2>

            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search description or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2 pl-10 pr-4 text-slate-800 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="income">Inflow (Income)</option>
                  <option value="expense">Outflow (Expense)</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <p className="text-center py-12 text-slate-500">No matching records found.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((t) => (
                  <div key={t._id} className="py-4 flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500 dark:text-rose-400'}`}>
                        {t.type === 'income' ? <PlusCircle className="h-5 w-5" /> : <Trash2 className="h-5 w-5 rotate-45" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.title}</p>
                        {t.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.description}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-slate-450 dark:text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(t.date).toLocaleDateString()}
                          </span>
                          <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {t.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-300'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}
                      </span>
                      <button
                        onClick={() => handleDelete(t._id)}
                        className="text-slate-400 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Transaction Side Form */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md rounded-xl p-6 shadow-sm dark:shadow-none transition-colors duration-200">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Add Transaction</h2>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 dark:text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2 px-3 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-colors cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c} className="bg-white dark:bg-slate-950 text-slate-850 dark:text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2 px-3 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-colors cursor-pointer"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 dark:text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Amount ({currency})</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-450 dark:text-slate-500">
                      {CURRENCY_SYMBOLS[currency] || '$'}
                    </span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2 pl-8 pr-3 text-slate-850 dark:text-white placeholder-slate-450 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2 px-3 text-slate-800 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-colors cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional transaction info..."
                  rows="2"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2 px-3 text-slate-800 dark:text-white placeholder-slate-450 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-colors"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-colors cursor-pointer text-sm"
              >
                <span>Save Transaction</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
