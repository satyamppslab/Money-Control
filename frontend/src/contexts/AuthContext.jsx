import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axiosInstance';

const AuthContext = createContext();

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
};

const CURRENCY_RATES = {
  INR: 95.0,
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 155.0,
  CAD: 1.36,
  AUD: 1.50,
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrencyState] = useState('INR');
  const [theme, setThemeState] = useState('dark');
  
  // Dynamic live exchange rates relative to base INR
  const [rates, setRates] = useState({
    INR: 1.0,
    USD: 0.0105, // 1 INR = 0.0105 USD (Fallback)
    EUR: 0.0097,
    GBP: 0.0082,
    JPY: 1.63,
    CAD: 0.014,
    AUD: 0.016,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    const storedCurrency = localStorage.getItem('currency') || 'INR';
    setCurrencyState(storedCurrency);
    const storedTheme = localStorage.getItem('theme') || 'dark';
    setThemeState(storedTheme);
    if (storedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Fetch daily live rates relative to base INR
    const fetchLiveRates = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/INR');
        const data = await res.json();
        if (data && data.rates) {
          setRates(prev => ({
            ...prev,
            INR: 1.0,
            USD: parseFloat(data.rates.USD) || prev.USD,
            EUR: parseFloat(data.rates.EUR) || prev.EUR,
            GBP: parseFloat(data.rates.GBP) || prev.GBP,
            JPY: parseFloat(data.rates.JPY) || prev.JPY,
            CAD: parseFloat(data.rates.CAD) || prev.CAD,
            AUD: parseFloat(data.rates.AUD) || prev.AUD,
          }));
          console.log('Live daily exchange rates (INR base) loaded successfully.', data.rates);
        }
      } catch (err) {
        console.warn('Failed to fetch live exchange rates, using local fallback rates.', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveRates();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const setCurrency = (curr) => {
    setCurrencyState(curr);
    localStorage.setItem('currency', curr);
  };

  const formatAmount = (amountInUSD) => {
    const rate = rates[currency] || 1;
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    const converted = Number(amountInUSD) * rate;
    return `${symbol}${converted.toFixed(2)}`;
  };

  const convertToBase = (amount, fromCurrency) => {
    const rate = rates[fromCurrency] || 1;
    return Number(amount) / rate;
  };

  const convertFromBase = (amountInUSD, toCurrency) => {
    const rate = rates[toCurrency] || 1;
    return Number(amountInUSD) * rate;
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    setUser(response.data);
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  };

  const register = async (username, email, password) => {
    const response = await api.post('/auth/register', { username, email, password });
    setUser(response.data);
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, currency, setCurrency, formatAmount, CURRENCY_SYMBOLS, theme, toggleTheme, convertToBase, convertFromBase, rates }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
