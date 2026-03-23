import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../auth';
import { sanitizeError, logErrorSafely } from '../utils/errorHandler';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ identifier?: string; password?: string }>({});
  const nav = useNavigate();

  /**
   * SECURITY: Client-side input validation
   * Validates email/phone format and password requirements
   * Returns validation errors object or empty object if valid
   */
  const validateInputs = (): { identifier?: string; password?: string } => {
    const errors: { identifier?: string; password?: string } = {};
    const id = identifier.trim();
    const pwd = password;

    // Validate identifier (email or phone)
    if (!id) {
      errors.identifier = 'Email or phone number is required';
    } else if (id.length < 5) {
      errors.identifier = 'Invalid email or phone number format';
    } else {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Basic phone validation (10+ digits)
      const phoneRegex = /^\d{10,}$/;
      const isValidEmail = emailRegex.test(id);
      const isValidPhone = phoneRegex.test(id.replace(/\D/g, ''));

      if (!isValidEmail && !isValidPhone) {
        errors.identifier = 'Please enter a valid email or phone number';
      }
    }

    // Validate password
    if (!pwd) {
      errors.password = 'Password is required';
    } else if (pwd.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    return errors;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    // Validate inputs before submission
    const errors = validateInputs();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);

    try {
      await login(identifier.trim(), password);
      nav('/', { replace: true }); // Avoid stale state after successful login
    } catch (err) {
      const sanitized = sanitizeError(err);
      logErrorSafely('Login: Authentication failed', err);
      setError(sanitized.userMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-600 mb-6">Sign in to manage your store</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email or Phone Number
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition ${
                validationErrors.identifier
                  ? 'border-red-300 focus:ring-red-200 bg-red-50'
                  : 'border-gray-300 focus:ring-blue-200'
              }`}
              placeholder="admin@example.com or 9876543210"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setValidationErrors(prev => ({ ...prev, identifier: undefined }));
              }}
            />
            {validationErrors.identifier && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <span>⚠️</span> {validationErrors.identifier}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition ${
                validationErrors.password
                  ? 'border-red-300 focus:ring-red-200 bg-red-50'
                  : 'border-gray-300 focus:ring-blue-200'
              }`}
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setValidationErrors(prev => ({ ...prev, password: undefined }));
              }}
            />
            {validationErrors.password && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <span>⚠️</span> {validationErrors.password}
              </p>
            )}
          </div>

          <button
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors font-medium"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-gray-500 text-xs text-center mt-6">
          Demo credentials available in documentation
        </p>
      </div>
    </div>
  );
}
