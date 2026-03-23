/**
 * Password Reset Modal
 * Allows admins to reset another user's password with confirmation
 */

import { useState } from 'react';
import { IUser } from '../../hooks/useUsers';

interface PasswordResetModalProps {
  open: boolean;
  user: IUser | null;
  onClose: () => void;
  onConfirm: (password: string, reason: string) => Promise<void>;
  loading?: boolean;
}

const PASSWORD_RULES = [
  'At least 8 characters',
  'Contains uppercase letter',
  'Contains lowercase letter',
  'Contains number',
  'Contains special character (@$!%*?&)',
];

export function PasswordResetModal({
  open,
  user,
  onClose,
  onConfirm,
  loading = false,
}: Readonly<PasswordResetModalProps>) {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [passwordValid, setPasswordValid] = useState(false);

  // Validate password strength
  const validatePassword = (pwd: string) => {
    if (!pwd) {
      setPasswordValid(false);
      return;
    }

    const rules = {
      minLength: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[@$!%*?&]/.test(pwd),
    };

    const isValid = Object.values(rules).every((rule) => rule);
    setPasswordValid(isValid);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setNewPassword(pwd);
    validatePassword(pwd);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      setError('Password is required');
      return;
    }

    if (!passwordValid) {
      setError('Password does not meet security requirements');
      return;
    }

    try {
      await onConfirm(newPassword, reason || 'Admin password reset');
      setNewPassword('');
      setReason('');
      setError('');
      onClose();
    } catch (err) {
      setError((err as Error)?.message || 'Failed to reset password');
    }
  };

  if (!open || !user) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 99,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15), 0 8px 10px rgba(0, 0, 0, 0.1)',
            width: '90%',
            maxWidth: 500,
            maxHeight: '90vh',
            overflow: 'auto',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e8eaf0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700, color: '#0f1623' }}>
                🔐 Reset Password
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#8b92a9' }}>
                {user.name} ({user.email})
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 24,
                color: '#8b92a9',
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} style={{ padding: '24px', flexGrow: 1 }}>
            {/* Warning */}
            <div
              style={{
                background: '#fff3e0',
                border: '1px solid #ffe0b2',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 20,
                fontSize: 13,
                color: '#e65100',
                display: 'flex',
                gap: 12,
              }}
            >
              <span style={{ marginTop: 2 }}>⚠️</span>
              <div>
                <strong>Important:</strong> You are about to reset this user's password. They will
                need to change it on their next login.
              </div>
            </div>

            {/* New Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
                New Password *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter strong password"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px 36px 10px 12px',
                    border: `1px solid ${newPassword && !passwordValid ? '#ef4444' : '#e8eaf0'}`,
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 16,
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>

              {/* Password Requirements */}
              {newPassword && (
                <div style={{ marginTop: 12 }}>
                  {PASSWORD_RULES.map((rule) => {
                    const ruleMet =
                      (rule.includes('8') && newPassword.length >= 8) ||
                      (rule.includes('uppercase') && /[A-Z]/.test(newPassword)) ||
                      (rule.includes('lowercase') && /[a-z]/.test(newPassword)) ||
                      (rule.includes('number') && /\d/.test(newPassword)) ||
                      (rule.includes('special') && /[@$!%*?&]/.test(newPassword));

                    return (
                      <div
                        key={rule}
                        style={{
                          fontSize: 12,
                          color: ruleMet ? '#16a34a' : '#8b92a9',
                          marginBottom: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span>{ruleMet ? '✓' : '○'}</span>
                        {rule}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reason (Optional) */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
                Reason (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., User forgot password, Security reset..."
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e8eaf0',
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  minHeight: 60,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '10px 12px',
                  background: '#fecaca',
                  border: '1px solid #fca5a5',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#991b1b',
                }}
              >
                ❌ {error}
              </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e8eaf0',
                  background: '#fff',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#4b5470',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!passwordValid || loading}
                style={{
                  padding: '8px 24px',
                  border: 'none',
                  background: passwordValid && !loading ? '#3b6ef8' : '#cbd5e1',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: passwordValid && !loading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                }}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
