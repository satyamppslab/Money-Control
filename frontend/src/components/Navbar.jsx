import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Wallet, PlusCircle, ScanLine, LayoutDashboard, User as UserIcon, Sun, Moon, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout, currency, setCurrency, CURRENCY_SYMBOLS, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/login');
  };

  return (
    <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center space-x-2 text-brand-500 font-extrabold text-xl tracking-tight hover:opacity-90 transition-opacity">
              <Wallet className="h-6 w-6" />
              <span>MoneyControl</span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
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
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-brand-500 transition-colors cursor-pointer animate-fade-in"
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

          {/* Mobile Actions and Hamburger Toggle */}
          <div className="flex md:hidden items-center space-x-3">
            {/* Theme Toggle Button (Mobile) */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Currency Selector (Mobile) */}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-md px-1.5 py-1 focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              {Object.entries(CURRENCY_SYMBOLS).map(([key, symbol]) => (
                <option key={key} value={key}>
                  {key} ({symbol})
                </option>
              ))}
            </select>

            {/* Hamburger Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus:outline-none cursor-pointer"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown Panel */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 animate-fade-in transition-all">
          <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
            {user ? (
              <>
                <Link
                  to="/"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 text-slate-700 dark:text-slate-250 hover:bg-slate-100 dark:hover:bg-slate-900 px-3 py-2.5 rounded-md text-base font-semibold transition-colors"
                >
                  <LayoutDashboard className="h-5 w-5 text-brand-500" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/transactions"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 text-slate-700 dark:text-slate-250 hover:bg-slate-100 dark:hover:bg-slate-900 px-3 py-2.5 rounded-md text-base font-semibold transition-colors"
                >
                  <PlusCircle className="h-5 w-5 text-brand-500" />
                  <span>Transactions</span>
                </Link>
                <Link
                  to="/upload-receipt"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 text-slate-700 dark:text-slate-250 hover:bg-slate-100 dark:hover:bg-slate-900 px-3 py-2.5 rounded-md text-base font-semibold transition-colors"
                >
                  <ScanLine className="h-5 w-5 text-brand-500" />
                  <span>Scan Receipt</span>
                </Link>
                <div className="border-t border-slate-200 dark:border-slate-850 mt-2 pt-3 px-3 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-sm flex items-center space-x-1">
                    <UserIcon className="h-4 w-4 text-brand-500" />
                    <span className="truncate max-w-[120px]">{user.username}</span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-450 px-4 py-2 rounded-md text-sm font-bold border border-rose-500/25 transition-all cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-2">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="text-center text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 py-2.5 rounded-md text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="text-center bg-brand-500 hover:bg-brand-600 text-slate-950 py-2.5 rounded-md text-sm font-bold transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
