import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Wallet, PlusCircle, ScanLine, LayoutDashboard, User as UserIcon, Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const { user, logout, currency, setCurrency, CURRENCY_SYMBOLS, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-brand-500 font-extrabold text-xl tracking-tight hover:opacity-90 transition-opacity">
              <Wallet className="h-6 w-6" />
              <span>MoneyControl</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Currency Selector */}
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
              >
                {Object.entries(CURRENCY_SYMBOLS).map(([key, symbol]) => (
                  <option key={key} value={key}>
                    {key} ({symbol})
                  </option>
                ))}
              </select>
            </div>

            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/"
                  className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/transactions"
                  className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Transactions</span>
                </Link>
                <Link
                  to="/upload-receipt"
                  className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <ScanLine className="h-4 w-4" />
                  <span>Scan Receipt</span>
                </Link>
                <div className="flex items-center space-x-2 pl-4 border-l border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 text-sm flex items-center space-x-1">
                    <UserIcon className="h-4 w-4 text-brand-500" />
                    <span className="max-w-[100px] truncate">{user.username}</span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 px-3 py-1.5 rounded-md text-xs font-semibold border border-rose-500/20 transition-all cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-4 py-2 rounded-md text-sm transition-colors cursor-pointer"
              >
                Register
              </Link>
            </div>
          )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
