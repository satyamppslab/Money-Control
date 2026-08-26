import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, User, ArrowRight, Eye, EyeOff, Phone, ChevronDown } from 'lucide-react';

const COUNTRY_RULES = {
  '+91': { min: 10, max: 10, label: '10 digits', name: 'India' },
  '+1': { min: 10, max: 10, label: '10 digits', name: 'US/Canada' },
  '+44': { min: 10, max: 11, label: '10 or 11 digits', name: 'United Kingdom' },
  '+61': { min: 9, max: 9, label: '9 digits', name: 'Australia' },
  '+81': { min: 10, max: 10, label: '10 digits', name: 'Japan' },
  '+971': { min: 9, max: 9, label: '9 digits', name: 'UAE' }
};

const CURRENCY_TO_COUNTRY = {
  INR: '+91',
  USD: '+1',
  CAD: '+1',
  GBP: '+44',
  AUD: '+61',
  JPY: '+81',
  EUR: '+44',
};

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Verification States
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const { register, sendOtp, currency } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const defaultCode = CURRENCY_TO_COUNTRY[currency] || '+91';
    setCountryCode(defaultCode);
  }, [currency]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Password matching validation
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Password strength validation (capital letter, number, and special character required)
    const hasCapital = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasCapital || !hasNumber || !hasSpecial) {
      setError('Password must contain at least one capital letter, one number, and one special character.');
      return;
    }

    // Phone number validation
    const cleanPhone = phone.replace(/\D/g, ''); // strip non-digits
    const rule = COUNTRY_RULES[countryCode];
    if (rule) {
      if (cleanPhone.length < rule.min || cleanPhone.length > rule.max) {
        setError(`For ${rule.name} (${countryCode}), the phone number must be exactly ${rule.label}.`);
        return;
      }
    } else {
      if (cleanPhone.length < 7 || cleanPhone.length > 15) {
        setError('Please enter a valid phone number (7 to 15 digits).');
        return;
      }
    }

    setLoading(true);
    const fullPhoneNumber = `${countryCode}${cleanPhone}`;

    try {
      const data = await sendOtp(email, fullPhoneNumber);
      if (data.success) {
        setIsOtpSent(true);
        setToastMsg(data.mockOtp ? 'Verification code sent! (Check backend logs for code)' : 'Verification code sent to your mobile number!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!/^\d{6}$/.test(otp)) {
      setError('Verification code must be a 6-digit number.');
      return;
    }

    setLoading(true);
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhoneNumber = `${countryCode}${cleanPhone}`;

    try {
      await register(username, email, password, fullPhoneNumber, otp);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setLoading(true);
    setToastMsg('');
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhoneNumber = `${countryCode}${cleanPhone}`;

    try {
      const data = await sendOtp(email, fullPhoneNumber);
      if (data.success) {
        setToastMsg(data.mockOtp ? 'New verification code sent! (Check backend logs for code)' : 'New verification code sent to your mobile number!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-xl p-8 rounded-2xl w-full max-w-md shadow-2xl relative z-10 transition-colors duration-200">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isOtpSent ? 'Verify Phone' : 'Create Account'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            {isOtpSent
              ? `Enter the code sent to ${countryCode} ${phone}`
              : 'Join MoneyControl and take charge of your finances'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 p-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {toastMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-lg text-sm mb-6 font-semibold animate-pulse text-center">
            {toastMsg}
          </div>
        )}

        {isOtpSent ? (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">Verification Code (OTP)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-450 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  minLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-600 hover:to-emerald-700 text-slate-950 font-bold py-3 rounded-lg flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Verifying...' : 'Verify & Register'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="flex justify-between items-center text-xs mt-4">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-brand-600 dark:text-brand-400 hover:underline cursor-pointer font-semibold"
              >
                Resend Code
              </button>
              <button
                type="button"
                onClick={() => setIsOtpSent(false)}
                className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
              >
                Edit Info
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-450 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-450 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">Phone Number</label>
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={countryCode}
                    onChange={(e) => {
                      const targetVal = e.target.value;
                      setCountryCode(targetVal);
                      const rule = COUNTRY_RULES[targetVal];
                      if (rule) {
                        setPhone(prev => prev.slice(0, rule.max));
                      }
                    }}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-7 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 text-sm transition-all cursor-pointer appearance-none"
                  >
                    <option value="+91">+91 (IN)</option>
                    <option value="+1">+1 (US/CA)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+61">+61 (AU)</option>
                    <option value="+81">+81 (JP)</option>
                    <option value="+971">+971 (AE)</option>
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-450 dark:text-slate-500">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-450 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder={COUNTRY_RULES[countryCode]?.label || 'Phone number'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={COUNTRY_RULES[countryCode]?.max || 15}
                    minLength={COUNTRY_RULES[countryCode]?.min || 7}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-450 dark:text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2.5 pl-10 pr-10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 dark:text-slate-500 hover:text-slate-755 dark:hover:text-slate-300 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-450 dark:text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-lg py-2.5 pl-10 pr-10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 dark:text-slate-500 hover:text-slate-755 dark:hover:text-slate-300 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Action button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-600 hover:to-emerald-700 text-slate-950 font-bold py-3 rounded-lg flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Sending Code...' : 'Sign Up'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        <div className="text-center mt-6">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
