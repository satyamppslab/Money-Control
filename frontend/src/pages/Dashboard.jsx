import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp, Calendar, Tag, Trash2, ArrowRight, PieChart, Activity, ChevronLeft, ChevronRight, ListPlus, FileDown, ScanLine } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { formatAmount, currency, CURRENCY_SYMBOLS } = useAuth();
  
  // Date state for month selection
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Selected day state (defaults to today's date)
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

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

  // Sync selectedDay to ensure it doesn't exceed days in the newly selected month
  useEffect(() => {
    const maxDays = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    }
  }, [selectedDate, selectedDay]);

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

  // Filter transactions for the selected day
  const dayTransactions = monthlyTransactions.filter((t) => {
    return new Date(t.date).getDate() === Number(selectedDay);
  });

  // Donut/Pie Chart Calculations
  const totalFlow = income + expense;
  const incomePercentage = totalFlow > 0 ? (income / totalFlow) * 100 : 50;
  const expensePercentage = totalFlow > 0 ? (expense / totalFlow) * 100 : 50;

  // Donut SVG constants
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const incomeStrokeOffset = circumference - (incomePercentage / 100) * circumference;
  const expenseStrokeOffset = circumference - (expensePercentage / 100) * circumference;

  const handleDownloadStatement = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    
    const formatPdfDate = (dateStr) => {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    };

    const startDateStr = formatPdfDate(firstDay);
    const endDateStr = formatPdfDate(lastDay);
    const monthName = selectedDate.toLocaleString('default', { month: 'long' });

    // Calculate opening balance (all transactions before first day of selected month)
    let openingBal = 0;
    transactions.forEach((t) => {
      const tDate = new Date(t.date);
      if (tDate < firstDay) {
        openingBal += (t.type === 'income' ? t.amount : -t.amount);
      }
    });
    const closingBal = openingBal + income - expense;

    // Filter and sort transactions
    const incomeTx = monthlyTransactions.filter(t => t.type === 'income').sort((a, b) => new Date(a.date) - new Date(b.date));
    const sortedMonthlyTx = [...monthlyTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Expense breakdowns
    const expenseTx = monthlyTransactions.filter(t => t.type === 'expense');
    const categoriesStats = {};
    expenseTx.forEach(t => {
      if (!categoriesStats[t.category]) {
        categoriesStats[t.category] = { count: 0, amount: 0 };
      }
      categoriesStats[t.category].count += 1;
      categoriesStats[t.category].amount += t.amount;
    });

    const categoryList = Object.entries(categoriesStats).map(([name, data]) => ({
      name,
      count: data.count,
      amount: data.amount,
      percentage: expense > 0 ? ((data.amount / expense) * 100).toFixed(1) : '0.0'
    })).sort((a, b) => b.amount - a.amount);

    const totalExpenseCount = expenseTx.length;
    const currencySymbol = CURRENCY_SYMBOLS[currency] || '₹';
    const formatVal = (val) => `${currencySymbol}${parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const opt = {
      margin:       [10, 15, 10, 15],
      filename:     `Financial_Statement_${monthName}_${selectedYear}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const container = document.createElement('div');
    container.style.fontFamily = "Arial, Helvetica, sans-serif";
    container.style.color = "#1e293b";
    container.style.backgroundColor = "#ffffff";
    container.style.fontSize = "11px";
    container.style.lineHeight = "1.5";

    container.innerHTML = `
      <!-- PAGE 1 -->
      <div style="padding: 10px 0 20px 0; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <!-- Header -->
          <div style="margin-bottom: 25px;">
            <h1 style="font-size: 24px; font-weight: 800; color: #000000; margin: 0; text-transform: uppercase;">YOUR&nbsp;FINANCIAL&nbsp;TRACKER</h1>
            <h2 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 4px 0 0 0;">Monthly&nbsp;Financial&nbsp;Statement</h2>
            <p style="font-size: 12px; font-weight: 600; color: #64748b; margin: 8px 0 0 0;">${monthName}&nbsp;${selectedYear}</p>
            <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">Statement&nbsp;period:&nbsp;${startDateStr}&nbsp;–&nbsp;${endDateStr}</p>
          </div>

          <!-- Summary Box -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #cbd5e1;">
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #cbd5e1;">
              <th style="padding: 10px; text-align: left; font-size: 9px; text-transform: uppercase; color: #475569; border-right: 1px solid #cbd5e1; width: 25%;">Opening&nbsp;Balance</th>
              <th style="padding: 10px; text-align: left; font-size: 9px; text-transform: uppercase; color: #475569; border-right: 1px solid #cbd5e1; width: 25%;">Total&nbsp;Income</th>
              <th style="padding: 10px; text-align: left; font-size: 9px; text-transform: uppercase; color: #475569; border-right: 1px solid #cbd5e1; width: 25%;">Total&nbsp;Expenses</th>
              <th style="padding: 10px; text-align: left; font-size: 9px; text-transform: uppercase; color: #475569; width: 25%;">Closing&nbsp;Balance</th>
            </tr>
            <tr>
              <td style="padding: 14px 10px; font-size: 13px; font-weight: 700; color: #0f172a; border-right: 1px solid #cbd5e1;">${formatVal(openingBal)}</td>
              <td style="padding: 14px 10px; font-size: 13px; font-weight: 700; color: #10b981; border-right: 1px solid #cbd5e1;">+${formatVal(income)}</td>
              <td style="padding: 14px 10px; font-size: 13px; font-weight: 700; color: #ef4444; border-right: 1px solid #cbd5e1;">-${formatVal(expense)}</td>
              <td style="padding: 14px 10px; font-size: 13px; font-weight: 700; color: ${closingBal >= 0 ? '#10b981' : '#ef4444'};">${formatVal(closingBal)}</td>
            </tr>
          </table>

          <!-- Income Section -->
          <h3 style="font-size: 13px; font-weight: 700; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin: 20px 0 10px 0; text-transform: uppercase;">Income</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; color: #64748b;">Date</th>
                <th style="padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; color: #64748b;">Description</th>
                <th style="padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; color: #64748b;">Category</th>
                <th style="padding: 8px 10px; text-align: right; font-size: 9px; text-transform: uppercase; color: #64748b;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${incomeTx.length === 0 ? `
                <tr><td colspan="4" style="padding: 15px; text-align: center; color: #94a3b8; font-style: italic;">No income transactions recorded</td></tr>
              ` : incomeTx.map(t => `
                <tr style="border-bottom: 1px solid #f1f5f9; page-break-inside: avoid; break-inside: avoid;">
                  <td style="padding: 8px 10px; color: #334155;">${formatPdfDate(t.date)}</td>
                  <td style="padding: 8px 10px; color: #334155; font-weight: 500;">${t.title}</td>
                  <td style="padding: 8px 10px; color: #475569;">${t.category}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #10b981;">+${formatVal(t.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Expense Breakdown Section -->
          <h3 style="font-size: 13px; font-weight: 700; border-bottom: 2px solid #ef4444; padding-bottom: 4px; margin: 30px 0 10px 0; text-transform: uppercase;">Expense Breakdown</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; color: #64748b;">Category</th>
                <th style="padding: 8px 10px; text-align: center; font-size: 9px; text-transform: uppercase; color: #64748b; width: 20%;">Transactions</th>
                <th style="padding: 8px 10px; text-align: right; font-size: 9px; text-transform: uppercase; color: #64748b; width: 25%;">Amount</th>
                <th style="padding: 8px 10px; text-align: right; font-size: 9px; text-transform: uppercase; color: #64748b; width: 20%;">% of Expenses</th>
              </tr>
            </thead>
            <tbody>
              ${categoryList.length === 0 ? `
                <tr><td colspan="4" style="padding: 15px; text-align: center; color: #94a3b8; font-style: italic;">No expense transactions recorded</td></tr>
              ` : categoryList.map(c => `
                <tr style="border-bottom: 1px solid #f1f5f9; page-break-inside: avoid; break-inside: avoid;">
                  <td style="padding: 8px 10px; font-weight: 600; color: #334155;">${c.name}</td>
                  <td style="padding: 8px 10px; text-align: center; color: #475569;">${c.count}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #ef4444;">-${formatVal(c.amount)}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 500; color: #475569;">${c.percentage}%</td>
                </tr>
              `).join('')}
              <tr style="border-top: 2px solid #cbd5e1; background-color: #f8fafc; font-weight: 700;">
                <td style="padding: 10px; color: #0f172a;">Total</td>
                <td style="padding: 10px; text-align: center; color: #0f172a;">${totalExpenseCount}</td>
                <td style="padding: 10px; text-align: right; color: #ef4444;">-${formatVal(expense)}</td>
                <td style="padding: 10px; text-align: right; color: #0f172a;">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 30px;">
          Confidential&nbsp;—&nbsp;Personal&nbsp;Financial&nbsp;Statement&nbsp;|&nbsp;Page&nbsp;1
        </div>
      </div>

      <div class="page-break" style="page-break-before: always;"></div>

      <!-- PAGE 2 -->
      <div style="padding: 10px 0 20px 0; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <!-- Header -->
          <div style="margin-bottom: 25px;">
            <h1 style="font-size: 24px; font-weight: 800; color: #000000; margin: 0; text-transform: uppercase;">Transaction&nbsp;Details</h1>
            <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">All ${monthlyTransactions.length} transactions included in this statement.</p>
          </div>

          <!-- Complete Ledger Table -->
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; color: #64748b; width: 15%;">Date</th>
                <th style="padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; color: #64748b; width: 35%;">Description</th>
                <th style="padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; color: #64748b; width: 20%;">Category</th>
                <th style="padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; color: #64748b; width: 15%;">Type</th>
                <th style="padding: 8px 10px; text-align: right; font-size: 9px; text-transform: uppercase; color: #64748b; width: 15%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${sortedMonthlyTx.length === 0 ? `
                <tr><td colspan="5" style="padding: 15px; text-align: center; color: #94a3b8; font-style: italic;">No transactions recorded this month</td></tr>
              ` : sortedMonthlyTx.map(t => `
                <tr style="border-bottom: 1px solid #f1f5f9; page-break-inside: avoid; break-inside: avoid;">
                  <td style="padding: 8px 10px; color: #475569;">${formatPdfDate(t.date)}</td>
                  <td style="padding: 8px 10px; color: #0f172a; font-weight: 500;">${t.title}</td>
                  <td style="padding: 8px 10px; color: #475569;">${t.category}</td>
                  <td style="padding: 8px 10px; text-transform: capitalize; font-weight: 600; color: ${t.type === 'income' ? '#10b981' : '#f59e0b'};">${t.type}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: ${t.type === 'income' ? '#10b981' : '#ef4444'};">
                    ${t.type === 'income' ? '+' : '-'}${formatVal(t.amount)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 30px;">
          Confidential&nbsp;—&nbsp;Personal&nbsp;Financial&nbsp;Statement&nbsp;|&nbsp;Page&nbsp;2
        </div>
      </div>

      <div class="page-break" style="page-break-before: always;"></div>

      <!-- PAGE 3 -->
      <div style="padding: 10px 0 20px 0; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <!-- Summary Header -->
          <div style="margin-bottom: 25px;">
            <h1 style="font-size: 24px; font-weight: 800; color: #000000; margin: 0; text-transform: uppercase;">Summary&nbsp;Overview</h1>
          </div>

          <!-- Totals list -->
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #cbd5e1; font-size: 13px;">
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 16px 20px; font-weight: 600; color: #475569;">Total Income</td>
              <td style="padding: 16px 20px; text-align: right; font-weight: 700; color: #10b981;">+${formatVal(income)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 16px 20px; font-weight: 600; color: #475569;">Total Expenses</td>
              <td style="padding: 16px 20px; text-align: right; font-weight: 700; color: #ef4444;">-${formatVal(expense)}</td>
            </tr>
            <tr style="background-color: #f8fafc; font-weight: 850; font-size: 15px;">
              <td style="padding: 20px; color: #0f172a;">Net Balance</td>
              <td style="padding: 20px; text-align: right; color: ${balance >= 0 ? '#10b981' : '#ef4444'};">
                ${balance >= 0 ? '+' : ''}${formatVal(balance)}
              </td>
            </tr>
          </table>
        </div>
        <div style="font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 30px;">
          Confidential&nbsp;—&nbsp;Personal&nbsp;Financial&nbsp;Statement&nbsp;|&nbsp;Page&nbsp;3
        </div>
      </div>

      <div class="page-break" style="page-break-before: always;"></div>

      <!-- PAGE 4 -->
      <div style="padding: 10px 0 20px 0; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <!-- Header -->
          <div style="margin-bottom: 25px;">
            <h1 style="font-size: 24px; font-weight: 800; color: #000000; margin: 0; text-transform: uppercase;">Monthly&nbsp;Analysis</h1>
            <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">Category-wise view of your spending</p>
          </div>

          <!-- Spending List -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
            <tbody>
              ${categoryList.map(c => `
                <tr style="border-bottom: 1px solid #f1f5f9; font-size: 12px;">
                  <td style="padding: 14px 10px; font-weight: 600; color: #334155;">${c.name}</td>
                  <td style="padding: 14px 10px; text-align: right; font-weight: 700; color: #0f172a;">${formatVal(c.amount)}</td>
                  <td style="padding: 14px 10px; text-align: right; color: #64748b; font-weight: 500; width: 20%;">${c.percentage}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Financial Summary Box -->
          <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 20px; margin-top: 20px; line-height: 1.6;">
            <p style="margin: 0; font-size: 12px; color: #334155;">
              <strong>Financial Summary:</strong> You received <strong>${formatVal(income)}</strong> in income and recorded <strong>${formatVal(expense)}</strong> in expenses, resulting in a net balance of <strong style="color: ${balance >= 0 ? '#10b981' : '#ef4444'};">${formatVal(balance)}</strong> for the transactions included in this statement.
            </p>
          </div>
        </div>
        <div style="font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 30px;">
          Confidential&nbsp;—&nbsp;Personal&nbsp;Financial&nbsp;Statement&nbsp;|&nbsp;Page&nbsp;4
        </div>
      </div>
    `;

    // Render PDF using html2pdf
    html2pdf().from(container).set(opt).save();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome header with dynamic Month/Year switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none backdrop-blur-md transition-colors duration-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Finance Overview</span>
            <TrendingUp className="h-6 w-6 text-brand-500 animate-pulse" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time breakdown of your income and expenditures.</p>
        </div>

        {/* Dynamic Month Navigation & Statement Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 px-4 py-2 rounded-xl text-slate-800 dark:text-white shadow-inner transition-colors duration-200">
            <button
              onClick={handlePrevMonth}
              className="hover:text-brand-500 transition-colors p-1 flex items-center justify-center cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-extrabold tracking-wider uppercase min-w-[140px] text-center select-none text-slate-700 dark:text-slate-200">
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

          <Link
            to="/upload-receipt"
            className="bg-brand-500/15 hover:bg-brand-500/25 text-brand-600 dark:text-brand-400 border border-brand-500/30 px-3.5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
            title="Scan Receipt with AI"
          >
            <ScanLine className="h-4.5 w-4.5" />
            <span className="hidden sm:inline">Scan Receipt</span>
          </Link>

          <button
            onClick={handleDownloadStatement}
            className="bg-brand-500 hover:bg-brand-600 text-slate-950 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 active:translate-y-0.5 border border-brand-500/10"
            title="Download Full Monthly Statement PDF"
          >
            <FileDown className="h-4.5 w-4.5" />
            <span className="hidden sm:inline">Statement</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md rounded-xl p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 shadow-sm dark:shadow-none transition-colors duration-200">
          <div className="absolute top-0 right-0 p-4 bg-brand-500/10 rounded-bl-3xl group-hover:bg-brand-500/20 transition-colors">
            <DollarSign className="h-6 w-6 text-brand-500 dark:text-brand-400" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Balance</p>
          <p className={`text-3xl font-black mt-2 tracking-tight ${balance >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-550 dark:text-rose-450'}`}>
            {formatAmount(balance)}
          </p>
          <div className="mt-4 flex items-center text-xs text-slate-450 dark:text-slate-500">
            <span>Net position for selected month</span>
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md rounded-xl p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 shadow-sm dark:shadow-none transition-colors duration-200">
          <div className="absolute top-0 right-0 p-4 bg-emerald-500/10 rounded-bl-3xl group-hover:bg-emerald-500/20 transition-colors">
            <ArrowUpRight className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Income</p>
          <p className="text-3xl font-black text-emerald-500 dark:text-emerald-400 mt-2 tracking-tight">
            +{formatAmount(income)}
          </p>
          <div className="mt-4 flex items-center text-xs text-slate-450 dark:text-slate-500">
            <span>All incoming cash flows</span>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md rounded-xl p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 shadow-sm dark:shadow-none transition-colors duration-200">
          <div className="absolute top-0 right-0 p-4 bg-rose-500/10 rounded-bl-3xl group-hover:bg-rose-500/20 transition-colors">
            <ArrowDownRight className="h-6 w-6 text-rose-500 dark:text-rose-400" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Expenses</p>
          <p className="text-3xl font-black text-rose-500 dark:text-rose-400 mt-2 tracking-tight">
            -{formatAmount(expense)}
          </p>
          <div className="mt-4 flex items-center text-xs text-slate-450 dark:text-slate-500">
            <span>All outgoing expenditures</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Dynamic Interactive Calendar & Selected Day Details */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md rounded-xl p-6 relative flex flex-col md:flex-row gap-6 shadow-sm dark:shadow-none transition-colors duration-200">
          
          {/* Calendar Portion */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand-500 dark:text-brand-400" />
                <span>Daily Spending Intensity</span>
              </h2>
              <span className="text-xs text-slate-500">
                {selectedDate.toLocaleString('default', { month: 'long' })} {selectedYear}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click a square to select the day and view its details on the right panel.
            </p>

            {/* Square Heatmap Calendar Grid */}
            <div>
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
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
                    className="aspect-square bg-slate-100 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-900/50 rounded-lg opacity-25"
                  ></div>
                ))}

                {/* Active Month Days */}
                {Object.entries(dailyExpenses).map(([day, amount]) => {
                  const fraction = amount / maxDailyExpense;
                  const isSelected = Number(selectedDay) === Number(day);
                  
                  // Set background colors based on spending percentage
                  let bgColor = 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900';
                  if (amount > 0) {
                    if (fraction < 0.25) bgColor = 'bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/10';
                    else if (fraction < 0.5) bgColor = 'bg-emerald-500/40 hover:bg-emerald-500/55 border border-emerald-500/20';
                    else if (fraction < 0.75) bgColor = 'bg-emerald-500/65 hover:bg-emerald-500/80 border border-emerald-500/30';
                    else bgColor = 'bg-emerald-500 hover:bg-emerald-400 border border-emerald-500/40 text-slate-950';
                  }

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(Number(day))}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all relative cursor-pointer select-none ${bgColor} ${
                        isSelected ? 'ring-2 ring-brand-400 dark:ring-brand-400 scale-105 shadow-lg shadow-brand-500/20 font-black' : ''
                      }`}
                      onMouseEnter={() => setHoveredDay({ day, amount })}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      <span className={amount > 0.75 * maxDailyExpense ? 'text-slate-950' : 'text-slate-500 dark:text-slate-400'}>
                        {day}
                      </span>
                    </button>
                  );
                })}

                {/* Next Month Offsets to pad the final row */}
                {Array.from({
                  length: (7 - ((new Date(selectedYear, selectedMonth, 1).getDay() + daysInMonth) % 7)) % 7
                }).map((_, idx) => (
                  <div
                    key={`empty-end-${idx}`}
                    className="aspect-square bg-slate-100 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-900/50 rounded-lg opacity-25"
                  ></div>
                ))}
              </div>
            </div>

            {/* Hover Tooltip */}
            <div className="min-h-[20px] flex items-center justify-start text-[11px] text-slate-500 italic">
              {hoveredDay ? (
                <span>Day {hoveredDay.day}: <strong className="text-emerald-550 dark:text-emerald-400">{formatAmount(hoveredDay.amount)}</strong> spent</span>
              ) : (
                <span>Hover over squares for total amounts</span>
              )}
            </div>
          </div>

          {/* Agenda/Selected Day details portion */}
          <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-6 md:pt-0 md:pl-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ListPlus className="h-4 w-4 text-brand-500 dark:text-brand-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Day details ({selectedDay})
                </h3>
              </div>

              {dayTransactions.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No transactions recorded on this day.</p>
              ) : (
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {dayTransactions.map((t) => (
                    <div key={t._id} className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between text-xs group transition-colors">
                      <div className="space-y-1 truncate mr-2">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{t.title}</p>
                        <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-full capitalize">
                          {t.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}
                        </span>
                        <button
                          onClick={() => handleDelete(t._id)}
                          className="text-slate-450 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-500">
              Selected: {new Date(selectedYear, selectedMonth, selectedDay).toLocaleDateString()}
            </div>
          </div>

        </div>

        {/* Right Side: Donut / Pie Chart (Income vs Expense) */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md rounded-xl p-6 flex flex-col shadow-sm dark:shadow-none transition-colors duration-200">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-brand-500 dark:text-brand-400" />
            <span>Cash Flow Ratio</span>
          </h2>

          <div className="flex-1 flex flex-col items-center justify-center py-4">
            {totalFlow === 0 ? (
              <div className="w-36 h-36 rounded-full border-4 border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-600 text-xs italic">
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
                    stroke="#e2e8f0" /* slate-200 */
                    className="dark:stroke-slate-800"
                    strokeWidth="14"
                  />
                  {/* Income Stroke Ring segment */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke="#10b981" /* emerald-500 */
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
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Net Flow</span>
                  <span className={`text-xs font-black mt-0.5 ${balance >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                    {balance >= 0 ? '+' : ''}{( (balance / (totalFlow || 1)) * 100 ).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Legend / Metrics */}
            <div className="w-full mt-6 grid grid-cols-2 gap-4 text-center border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <div className="space-y-0.5">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Income</span>
                </div>
                <p className="text-sm font-bold text-emerald-500 dark:text-emerald-400">
                  {incomePercentage.toFixed(0)}%
                </p>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                  <span>Expenses</span>
                </div>
                <p className="text-sm font-bold text-rose-450 dark:text-rose-400">
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
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md rounded-xl p-6 shadow-sm dark:shadow-none transition-colors duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Monthly Transactions</h2>
              <Link
                to="/transactions"
                className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 text-sm font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Manage All</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {monthlyTransactions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                <p>No transactions found for this month.</p>
                <Link
                  to="/transactions"
                  className="mt-3 inline-block bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 border border-brand-500/30 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer"
                >
                  Add Transaction
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {monthlyTransactions.slice(0, 5).map((t) => (
                  <div key={t._id} className="py-4 flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-lg ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500 dark:text-rose-400'}`}>
                        {t.type === 'income' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(t.date).toLocaleDateString()}
                          </span>
                          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {t.category}
                          </span>
                          {t.receiptUrl && (
                            <a
                              href={t.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded-full hover:bg-brand-500/20 transition-all"
                            >
                              Receipt 🖼️
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-350'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}
                      </span>
                      <button
                        onClick={() => handleDelete(t._id)}
                        className="text-slate-400 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
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
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md rounded-xl p-6 shadow-sm dark:shadow-none transition-colors duration-200">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Expense Categories</h2>
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
                          <span className="text-slate-600 dark:text-slate-300 font-medium capitalize">{category}</span>
                          <span className="text-slate-500 dark:text-slate-450 font-bold">
                            {formatAmount(amount)} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-850 rounded-full h-2 overflow-hidden">
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
