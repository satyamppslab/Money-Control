import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axiosInstance';

const AuthContext = createContext();

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrencyState] = useState('USD');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    const storedCurrency = localStorage.getItem('currency');
    if (storedCurrency) {
      setCurrencyState(storedCurrency);
    }
    setLoading(false);
  }, []);

  const setCurrency = (curr) => {
    setCurrencyState(curr);
    localStorage.setItem('currency', curr);
  };

  const formatAmount = (amount) => {
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    return `${symbol}${Number(amount).toFixed(2)}`;
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
    <AuthContext.Provider value={{ user, loading, login, register, logout, currency, setCurrency, formatAmount, CURRENCY_SYMBOLS }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
