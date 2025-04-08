import { useState } from "react";

export default function BlockUserModal({ username, userId, onClose, onBlock }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleBlock = async () => {
    setLoading(true);
    setError("");

    try {
      // Add debug logging for request data
      console.log(`Sending block request for user ID: ${userId} (${typeof userId})`);

      // Make sure we send user_id as a number if possible
      const numericUserId = parseInt(userId, 10);
      const payload = {
        user_id: isNaN(numericUserId) ? userId : numericUserId
      };

      console.log("Block request payload:", payload);

      const response = await fetch("/api/auth/block/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      // Debug the response
      console.log(`Block request response status: ${response.status}`);

      // Check if response is valid JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server returned non-JSON response: ${text}`);
      }

      const data = await response.json();
      console.log("Block request response data:", data);

      if (response.ok) {
        setSuccess(true);
        onBlock && onBlock(data);
        // Auto-close after success
        setTimeout(() => onClose(), 2000);
      } else {
        setError(data.error || "Failed to block user");
      }
    } catch (err) {
      console.error("Block user error:", err);
      setError(`An error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Block {username}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>

        {success ? (
          <div className="bg-green-100 text-green-800 p-4 rounded mb-4">
            You have successfully blocked {username}.
          </div>
        ) : (
          <>
            <p className="mb-6">
              Are you sure you want to block {username}? This user will no longer be able to:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Send you messages</li>
              <li>See your profile</li>
              <li>Add you as a friend</li>
            </ul>

            {error && (
              <div className="bg-red-100 text-red-800 p-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBlock}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={loading}
              >
                {loading ? "Processing..." : "Block User"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
