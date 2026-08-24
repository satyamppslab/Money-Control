import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp, Calendar, Tag, Trash2, ArrowRight, PieChart, Activity, ChevronLeft, ChevronRight } from 'lucide-react';

const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { formatAmount } = useAuth();
  
  // Date state for month selection
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Tooltip state for the heatmap
  const [hoveredDay, setHoveredDay] = useState(null);

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

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handlePrevMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await api.delete(`/transactions/${id}`);
        fetchTransactions();
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // Filter transactions for the selected month/year
  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth(); // 0-indexed
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  const monthlyTransactions = transactions.filter((t) => {
    const tDate = new Date(t.date);
    return tDate.getFullYear() === selectedYear && tDate.getMonth() === selectedMonth;
  });

  // Calculate stats for the selected month
  let income = 0;
  let expense = 0;
  monthlyTransactions.forEach((t) => {
    if (t.type === 'income') {
      income += t.amount;
    } else {
      expense += t.amount;
    }
  });
  const balance = income - expense;

  // Calculate Category Breakdowns for the selected month
  const expenseCategories = {};
  monthlyTransactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      expenseCategories[t.category] = (expenseCategories[t.category] || 0) + t.amount;
    });

  // Calculate Monthly Day-Wise Expenses (Heatmap / Square Chart) for selected month
  const dailyExpenses = {};
  for (let d = 1; d <= daysInMonth; d++) {
    dailyExpenses[d] = 0;
  }

  monthlyTransactions.forEach((t) => {
    if (t.type === 'expense') {
      const dateNum = new Date(t.date).getDate();
      dailyExpenses[dateNum] += t.amount;
    }
  });

  const maxDailyExpense = Math.max(...Object.values(dailyExpenses), 1);

  // Donut/Pie Chart Calculations
  const totalFlow = income + expense;
  const incomePercentage = totalFlow > 0 ? (income / totalFlow) * 100 : 50;
  const expensePercentage = totalFlow > 0 ? (expense / totalFlow) * 100 : 50;

  // Donut SVG constants
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const incomeStrokeOffset = circumference - (incomePercentage / 100) * circumference;
  const expenseStrokeOffset = circumference - (expensePercentage / 100) * circumference;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome header with dynamic Month/Year switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Finance Overview</span>
            <TrendingUp className="h-6 w-6 text-brand-500 animate-pulse" />
          </h1>
          <p className="text-slate-400 mt-1">Real-time breakdown of your income and expenditures.</p>
        </div>

        {/* Dynamic Month Navigation Controls */}
        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800/80 px-4 py-2 rounded-xl text-white shadow-inner">
          <button
            onClick={handlePrevMonth}
            className="hover:text-brand-500 transition-colors p-1 flex items-center justify-center cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-extrabold tracking-wider uppercase min-w-[140px] text-center select-none text-slate-200">
            {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={handleNextMonth}
            className="hover:text-brand-500 transition-colors p-1 flex items-center justify-center cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-xl p-6 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="absolute top-0 right-0 p-4 bg-brand-500/10 rounded-bl-3xl group-hover:bg-brand-500/20 transition-colors">
            <DollarSign className="h-6 w-6 text-brand-400" />
          </div>
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Balance</p>
          <p className={`text-3xl font-black mt-2 tracking-tight ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatAmount(balance)}
          </p>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <span>Net position for selected month</span>
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-xl p-6 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="absolute top-0 right-0 p-4 bg-emerald-500/10 rounded-bl-3xl group-hover:bg-emerald-500/20 transition-colors">
            <ArrowUpRight className="h-6 w-6 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Income</p>
          <p className="text-3xl font-black text-emerald-400 mt-2 tracking-tight">
            +{formatAmount(income)}
          </p>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <span>All incoming cash flows</span>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-xl p-6 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="absolute top-0 right-0 p-4 bg-rose-500/10 rounded-bl-3xl group-hover:bg-rose-500/20 transition-colors">
            <ArrowDownRight className="h-6 w-6 text-rose-400" />
          </div>
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Expenses</p>
          <p className="text-3xl font-black text-rose-400 mt-2 tracking-tight">
            -{formatAmount(expense)}
          </p>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <span>All outgoing expenditures</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Day-Wise Expense Heatmap (Square Chart) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-xl p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-brand-400" />
              <span>Daily Spending Intensity</span>
            </h2>
            <span className="text-xs text-slate-500">
              {selectedDate.toLocaleString('default', { month: 'long' })} {selectedYear}
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            Hover over a day to see the total expense amount. Darker squares indicate higher spending days.
          </p>

          {/* Square Heatmap Calendar Grid */}
          <div className="max-w-md mx-auto sm:mx-0">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Grid Cells */}
            <div className="grid grid-cols-7 gap-2">
              {/* Previous Month Offsets (Blank spacers) */}
              {Array.from({ length: new Date(selectedYear, selectedMonth, 1).getDay() }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="aspect-square bg-slate-950/20 border border-slate-900/50 rounded-lg opacity-25"
                ></div>
              ))}

              {/* Active Month Days */}
              {Object.entries(dailyExpenses).map(([day, amount]) => {
                const fraction = amount / maxDailyExpense;
                // Set background colors based on spending percentage
                let bgColor = 'bg-slate-950 border border-slate-900';
                if (amount > 0) {
                  if (fraction < 0.25) bgColor = 'bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/10';
                  else if (fraction < 0.5) bgColor = 'bg-emerald-500/40 hover:bg-emerald-500/55 border border-emerald-500/20';
                  else if (fraction < 0.75) bgColor = 'bg-emerald-500/65 hover:bg-emerald-500/80 border border-emerald-500/30';
                  else bgColor = 'bg-emerald-500 hover:bg-emerald-400 border border-emerald-500/40 text-slate-950';
                }

                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all relative cursor-help select-none ${bgColor}`}
                    onMouseEnter={() => setHoveredDay({ day, amount })}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    <span className={amount > 0.75 * maxDailyExpense ? 'text-slate-950' : 'text-slate-400'}>
                      {day}
                    </span>
                  </div>
                );
              })}

              {/* Next Month Offsets to pad the final row */}
              {Array.from({
                length: (7 - ((new Date(selectedYear, selectedMonth, 1).getDay() + daysInMonth) % 7)) % 7
              }).map((_, idx) => (
                <div
                  key={`empty-end-${idx}`}
                  className="aspect-square bg-slate-950/20 border border-slate-900/50 rounded-lg opacity-25"
                ></div>
              ))}
            </div>
          </div>

          {/* Heatmap Tooltip */}
          <div className="mt-4 min-h-[24px] flex items-center justify-start text-xs text-slate-400">
            {hoveredDay ? (
              <span className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 animate-fade-in">
                Day {hoveredDay.day}: <strong className="text-emerald-400">{formatAmount(hoveredDay.amount)}</strong> spent
              </span>
            ) : (
              <span className="text-slate-600 italic">Hover over squares to inspect daily spending</span>
            )}
          </div>
        </div>

        {/* Right Side: Donut / Pie Chart (Income vs Expense) */}
        <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-xl p-6 flex flex-col">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-brand-400" />
            <span>Cash Flow Ratio</span>
          </h2>

          <div className="flex-1 flex flex-col items-center justify-center py-4">
            {totalFlow === 0 ? (
              <div className="w-36 h-36 rounded-full border-4 border-slate-800 flex items-center justify-center text-slate-600 text-xs italic">
                No cash flow data
              </div>
            ) : (
              <div className="relative w-36 h-36">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  {/* Background base track */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke="#1e293b"
                    strokeWidth="14"
                  />
                  {/* Income Stroke Ring segment */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke="#34d399" /* emerald-400 */
                    strokeWidth="14"
                    strokeDasharray={circumference}
                    strokeDashoffset={incomeStrokeOffset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Expense Stroke Ring segment */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke="#f87171" /* rose-400 */
                    strokeWidth="14"
                    strokeDasharray={circumference}
                    strokeDashoffset={expenseStrokeOffset}
                    strokeLinecap="round"
                    transform={`rotate(${(incomePercentage / 100) * 360} 60 60)`}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                {/* Center Net Position overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Net Flow</span>
                  <span className={`text-xs font-black mt-0.5 ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {balance >= 0 ? '+' : ''}{( (balance / (totalFlow || 1)) * 100 ).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Legend / Metrics */}
            <div className="w-full mt-6 grid grid-cols-2 gap-4 text-center border-t border-slate-800/80 pt-4">
              <div className="space-y-0.5">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span>Income</span>
                </div>
                <p className="text-sm font-bold text-emerald-400">
                  {incomePercentage.toFixed(0)}%
                </p>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                  <span>Expenses</span>
                </div>
                <p className="text-sm font-bold text-rose-400">
                  {expensePercentage.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Recent Transactions for Selected Month */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Monthly Transactions</h2>
              <Link
                to="/transactions"
                className="text-brand-400 hover:text-brand-300 text-sm font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Manage All</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {monthlyTransactions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                <p>No transactions found for this month.</p>
                <Link
                  to="/transactions"
                  className="mt-3 inline-block bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer"
                >
                  Add Transaction
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {monthlyTransactions.slice(0, 5).map((t) => (
                  <div key={t._id} className="py-4 flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-lg ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {t.type === 'income' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{t.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(t.date).toLocaleDateString()}
                          </span>
                          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {t.category}
                          </span>
                          {t.receiptUrl && (
                            <a
                              href={t.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded-full hover:bg-brand-500/20 transition-all"
                            >
                              Receipt 🖼️
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}
                      </span>
                      <button
                        onClick={() => handleDelete(t._id)}
                        className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                        title="Delete transaction"
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

        {/* Right Side: Category Breakdown for Selected Month */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Expense Categories</h2>
            {Object.keys(expenseCategories).length === 0 ? (
              <p className="text-center py-8 text-slate-500">No expenses to display.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(expenseCategories)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => {
                    const percentage = expense > 0 ? (amount / expense) * 100 : 0;
                    return (
                      <div key={category}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-slate-300 font-medium capitalize">{category}</span>
                          <span className="text-slate-400 font-bold">
                            {formatAmount(amount)} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
