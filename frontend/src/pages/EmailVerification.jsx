import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import VirtualKeyboard from "../components/VirtualKeyboard";

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

    // Ensure OTP has the expected length (optional, adjust as needed)
    if (otp.length !== 6) {
        setMessage("Please enter a 6-digit OTP.");
        setLoading(false);
        return;
    }

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
      <div className="bg-white shadow-lg rounded-lg p-8 w-[450px]">
        <h2 className="text-2xl font-bold mb-4 text-center text-blue-600">Email Verification</h2>
        <p className="text-center mb-6 text-gray-600">
          Enter the 6-digit verification code sent to your email.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
             <VirtualKeyboard onChange={setOtp} maxLength={6} />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2.5 rounded-lg hover:bg-blue-600 transition duration-200 mb-3 text-lg"
            disabled={loading || otp.length !== 6}
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <button
          onClick={handleResendOTP}
          className="w-full bg-gray-200 text-gray-800 py-2.5 rounded-lg hover:bg-gray-300 transition duration-200 mt-2 text-lg"
          disabled={loading}
        >
          Resend Code
        </button>

        {message && (
          <p className={`mt-4 text-center ${message.includes("successfully") ? "text-green-600" : "text-red-600"} font-medium`}>
            {message}
          </p>
        )}

        <p className="mt-5 text-sm text-gray-500 text-center">
          Check your inbox and spam folder. The code is valid for a limited time.
        </p>
      </div>
    </div>
  );
}
