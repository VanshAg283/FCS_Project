import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";

export default function AdminUnlock() {
  const [username, setUsername] = useState("");
  const [masterKey, setMasterKey] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/admin-unlock/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          master_key: masterKey,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setSuccess(true);

        // Store tokens returned from the backend and update auth context
        if (data.access && data.refresh) {
          localStorage.setItem("access_token", data.access);
          localStorage.setItem("refresh_token", data.refresh);

          // Get the user data to pass to the auth context
          const userResponse = await fetch("/api/auth/profile/", {
            headers: {
              "Authorization": `Bearer ${data.access}`,
              "Content-Type": "application/json",
            },
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            login(data.access, userData);

            // Show success message and redirect after a short delay
            setTimeout(() => navigate("/admin"), 2000);
          }
        }
      } else {
        setMessage(data.error || "Failed to unlock admin account");
        setSuccess(false);
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Admin Account Unlock</h2>
        <p className="text-gray-600 mb-6 text-center">
          Use this form to unlock an admin account that has been locked due to suspicious activity.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-700 font-medium mb-2">
              Admin Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="masterKey" className="block text-gray-700 font-medium mb-2">
              Master Key
            </label>
            <input
              type="password"
              id="masterKey"
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            {loading ? "Processing..." : "Unlock Admin Account"}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg ${
              success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {message}
            {success && <p>Redirecting to admin dashboard...</p>}
          </div>
        )}

        {!loading && !success && (
          <div className="mt-6 text-center">
            <Link to="/login" className="text-gray-600 hover:underline">
              Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
