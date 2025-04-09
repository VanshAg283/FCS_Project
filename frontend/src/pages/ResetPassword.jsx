import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import VirtualKeyboard from '../components/VirtualKeyboard'; // Import the component

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email');

  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  useEffect(() => {
    if (!email) {
      setError('Email address not found in URL. Please request a reset link again.');
      // Consider navigating back or showing a link to forgot-password
    }
  }, [email]);
w
  const validatePassword = (password) => {
    // Check minimum length
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return false;
    }

    // Check for letter and number (same as in Signup.jsx)
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasLetter || !hasNumber) {
      setError('Password must include at least one letter and one number.');
      return false;
    }

    return true;
  };

  const handleOtpVerification = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'OTP verified successfully!');
        setOtpVerified(true);
      } else {
        setError(data.error || 'Failed to verify OTP. It might be invalid or expired.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error("OTP Verification Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== password2) {
      setError('Passwords do not match.');
      return;
    }

    // Validate password format
    if (!validatePassword(password)) {
      // Error is already set in validatePassword function
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password, password2 }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Password reset successfully! Redirecting to login...');
        setPassword('');
        setPassword2('');
        setTimeout(() => navigate('/login'), 2500);
      } else {
        if (data.error) {
          setError(data.error);
        } else if (data.detail) {
          setError(data.detail);
        } else if (data.password) {
          // Handle password-specific errors from the backend
          setError(Array.isArray(data.password) ? data.password[0] : data.password);
        } else {
          setError('Failed to reset password. Please try again.');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error("Reset Password Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Disable form submission if email is missing
  const isOtpSubmitDisabled = loading || !email || otp.length !== 6;
  const isPasswordSubmitDisabled = loading || !password || password !== password2;

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
          {otpVerified ? 'Set New Password' : 'Verify OTP'}
        </h2>
        {!email ? (
          <div className="text-center text-red-600 bg-red-100 p-4 rounded border border-red-300">
            <p>{error || 'Missing email parameter.'}</p>
            <Link to="/forgot-password" className="text-blue-600 hover:underline mt-2 inline-block">Request Reset Again</Link>
          </div>
        ) : (
          <>
            {!otpVerified ? (
              // OTP Verification Step
              <>
                <p className="text-center mb-6 text-gray-600">
                  Enter the 6-digit OTP sent to <strong>{email}</strong>.
                </p>

                <form onSubmit={handleOtpVerification}>
                  {/* OTP Input using Virtual Keyboard */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Enter OTP</label>
                    <VirtualKeyboard onChange={setOtp} maxLength={6} />
                  </div>

                  {error && (
                    <p className="mb-4 text-center text-red-600 font-medium">{error}</p>
                  )}
                  {message && (
                    <p className="mb-4 text-center text-green-600 font-medium">{message}</p>
                  )}

                  <button
                    type="submit"
                    className={`w-full bg-blue-500 text-white py-2.5 rounded-lg hover:bg-blue-600 transition duration-200 text-lg ${isOtpSubmitDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isOtpSubmitDisabled}
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </form>
              </>
            ) : (
              // Password Reset Step
              <>
                <p className="text-center mb-6 text-gray-600">
                  OTP has been verified. Please set your new password.
                </p>

                <form onSubmit={handlePasswordReset}>
                  {/* New Password Input */}
                  <div className="mb-4">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      placeholder="Enter new password (min. 8 chars)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                      required
                      minLength={8}
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Password must be at least 8 characters with at least one letter and one number.
                    </p>
                  </div>

                  {/* Confirm New Password Input */}
                  <div className="mb-6">
                    <label htmlFor="password2" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="password2"
                      placeholder="Confirm new password"
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                      required
                      minLength={8}
                      disabled={loading}
                    />
                  </div>

                  {error && (
                    <p className="mb-4 text-center text-red-600 font-medium">{error}</p>
                  )}
                  {message && (
                    <p className="mb-4 text-center text-green-600 font-medium">{message}</p>
                  )}

                  <button
                    type="submit"
                    className={`w-full bg-blue-500 text-white py-2.5 rounded-lg hover:bg-blue-600 transition duration-200 text-lg ${isPasswordSubmitDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isPasswordSubmitDisabled}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              </>
            )}

            <p className="mt-6 text-sm text-gray-500 text-center">
              Need a new OTP?{' '}
              <Link to="/forgot-password" className="text-blue-600 hover:underline">
                Request again
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
