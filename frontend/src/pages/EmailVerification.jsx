import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function EmailVerification() {
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Extract username from location state or URL params
  const username = location.state?.username || new URLSearchParams(location.search).get("username");

  if (!username) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="bg-white shadow-lg rounded-lg p-6 w-96">
          <h2 className="text-2xl font-bold mb-4 text-center text-red-600">Error</h2>
          <p className="text-center mb-4">No username provided. Please go back to registration.</p>
          <button
            onClick={() => navigate("/signup")}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-200"
          >
            Back to Registration
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-email/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store tokens
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);

        setMessage("Email verified successfully! Redirecting...");
        setTimeout(() => navigate("/chat"), 1500);
      } else {
        setMessage(data.error || "Verification failed. Please try again.");
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/auth/resend-verification/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Verification code resent to your email! Please check your inbox.");
      } else {
        setMessage(data.error || "Failed to resend verification code.");
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-6 w-96">
        <h2 className="text-2xl font-bold mb-4 text-center text-blue-600">Email Verification</h2>
        <p className="text-center mb-4">
          We've sent a verification code to your email address. Please enter it below.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter verification code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full px-3 py-2 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-200 mb-2"
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <button
          onClick={handleResendOTP}
          className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition duration-200 mt-2"
          disabled={loading}
        >
          Resend Verification Code
        </button>

        {message && (
          <p className={`mt-4 text-center ${message.includes("successfully") ? "text-green-500" : "text-red-500"}`}>
            {message}
          </p>
        )}

        <p className="mt-4 text-sm text-gray-500 text-center">
          Please check both your inbox and spam folder for the verification email.
        </p>
      </div>
    </div>
  );
}
