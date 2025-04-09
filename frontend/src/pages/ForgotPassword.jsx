import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/auth/request-password-reset/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'If an account exists, an OTP has been sent.');
        // Optionally navigate after a delay or let user click a link
        // setTimeout(() => navigate(`/reset-password?email=${encodeURIComponent(email)}`), 2000);
      } else {
        setError(data.error || data.email?.[0] || 'Failed to request password reset.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error("Forgot Password Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Forgot Password</h2>
        <p className="text-center mb-6 text-gray-600">
          Enter your email address below, and we'll send you an OTP to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className={`w-full bg-blue-500 text-white py-2.5 rounded-lg hover:bg-blue-600 transition duration-200 text-lg ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset OTP'}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-green-600 font-medium">{message}</p>
        )}
        {error && (
          <p className="mt-4 text-center text-red-600 font-medium">{error}</p>
        )}

        {message && !error && (
             <div className="mt-4 text-center">
                 <button
                    onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
                    className="text-blue-600 hover:underline"
                 >
                     Proceed to Reset Password
                 </button>
             </div>
        )}

        <p className="mt-6 text-sm text-gray-500 text-center">
          Remember your password?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Log In
          </a>
        </p>
      </div>
    </div>
  );
}
