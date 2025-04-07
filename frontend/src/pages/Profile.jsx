import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext.jsx";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [newProfilePic, setNewProfilePic] = useState(null);
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const navigate = useNavigate();
  const { logout, fetchProfile } = useContext(AuthContext);

  const defaultProfilePic = "/person.png"; // Default image

  useEffect(() => {
    const fetchUserProfile = async () => {
      let accessToken = localStorage.getItem("access_token");
      let refreshToken = localStorage.getItem("refresh_token");

      if (!accessToken) {
        logout();
        navigate("/login");
        return;
      }

      try {
        let response = await fetch("/api/auth/profile/", {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (response.status === 401 && refreshToken) {
          const refreshResponse = await fetch("/api/auth/token/refresh/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (!refreshResponse.ok) throw new Error("Session expired. Please log in again.");

          const newTokens = await refreshResponse.json();
          localStorage.setItem("access_token", newTokens.access);

          response = await fetch("/api/auth/profile/", {
            headers: {
              "Authorization": `Bearer ${newTokens.access}`,
              "Content-Type": "application/json",
            },
          });
        }

        if (!response.ok) throw new Error("Failed to fetch profile.");

        const data = await response.json();
        setUser(data);
        setNewUsername(data.username);
        setBio(data.bio || "");
      } catch (err) {
        setError(err.message);
        setTimeout(() => navigate("/login"), 2000);
      }
    };

    fetchUserProfile();
  }, [navigate, logout]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleProfileUpdate = async () => {
    let formData = new FormData();
    if (newUsername) formData.append("username", newUsername);
    if (newProfilePic) formData.append("profile_picture", newProfilePic);
    if (bio !== user.bio) formData.append("bio", bio);

    let accessToken = localStorage.getItem("access_token");
    try {
      let response = await fetch("/api/auth/profile/update/", {
        method: "PUT",
        headers: { "Authorization": `Bearer ${accessToken}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to update profile.");

      setMessage("Profile updated successfully!");
      fetchProfile();
    } catch (err) {
      setMessage("Error updating profile.");
    }
  };

  const handleRemoveProfilePic = async () => {
    let accessToken = localStorage.getItem("access_token");
    try {
      let response = await fetch("/api/auth/profile/remove_picture/", {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error("Failed to remove profile picture.");

      setMessage("Profile picture removed!");
      fetchProfile();
    } catch (err) {
      setMessage("Error removing profile picture.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!password) {
      setDeleteError("Password is required");
      return;
    }

    let accessToken = localStorage.getItem("access_token");
    try {
      const response = await fetch("/api/auth/account/delete/", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        // Log out and redirect to login page
        logout();
        navigate("/login", { state: { message: "Your account has been successfully deleted." } });
      } else {
        const data = await response.json();
        setDeleteError(data.error || "Failed to delete account");
      }
    } catch (err) {
      setDeleteError("An error occurred. Please try again.");
    }
  };

  if (error) {
    return <p className="text-red-500 text-center">{error}</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Profile</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {message && (
        <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{message}</div>
      )}

      {user && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3">
              <div className="mb-4">
                <img
                  src={user.profile_picture || defaultProfilePic}
                  alt="Profile"
                  className="w-32 h-32 object-cover rounded-full mx-auto"
                />
              </div>
              <div className="mb-4">
                <input
                  type="file"
                  onChange={(e) => setNewProfilePic(e.target.files[0])}
                  className="w-full p-2 border rounded"
                />
              </div>
              <button
                onClick={handleRemoveProfilePic}
                className="w-full bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600 mb-2"
              >
                Remove Picture
              </button>
            </div>

            <div className="w-full md:w-2/3">
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full p-2 border rounded bg-gray-100"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {user.email_verified ? "✓ Email verified" : "Email not verified"}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-2 border rounded"
                  rows="4"
                  maxLength="500"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handleProfileUpdate}
                  className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                >
                  Update Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h3>
            <p className="text-gray-700 mb-4">
              Deleting your account will permanently remove all your data from our system. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteConfirmation(true)}
              className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
            >
              Delete Account
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-red-600">Delete Your Account</h2>
            <p className="mb-4">
              Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.
            </p>
            <p className="mb-4 font-medium">Please enter your password to confirm:</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded mb-4"
              placeholder="Enter your password"
            />
            {deleteError && <p className="text-red-500 mb-4">{deleteError}</p>}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setPassword("");
                  setDeleteError("");
                }}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
