import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext.jsx";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [newProfilePic, setNewProfilePic] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
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

  if (error) {
    return <p className="text-red-500 text-center">{error}</p>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Profile</h2>

        {/* Profile Picture with Upload & Remove Option */}
        <div className="relative w-32 h-32 mx-auto mb-4">
          <img
            src={user?.profile_picture || defaultProfilePic}
            alt="Profile"
            className="w-full h-full object-cover rounded-full border-4 border-blue-400 shadow-lg"
          />
          <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition">
            📷
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setNewProfilePic(e.target.files[0])}
            />
          </label>
        </div>

        {user?.profile_picture && (
          <button
            onClick={handleRemoveProfilePic}
            className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-700 transition"
          >
            Remove Picture
          </button>
        )}

        <p className="text-gray-700"><strong>Username:</strong> {user?.username}</p>
        <p className="text-gray-500"><strong>Email:</strong> {user?.email}</p>

        {/* Profile Update Form */}
        <div className="mt-6">
          <input
            type="text"
            placeholder="New Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="border p-2 w-full rounded-md shadow-sm"
          />
          <button
            onClick={handleProfileUpdate}
            className="mt-4 px-4 py-2 w-full bg-blue-500 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Update Profile
          </button>
        </div>

        {/* Message Display */}
        {message && <p className="text-green-500 mt-2">{message}</p>}
        {error && <p className="text-red-500 mt-2">{error}</p>}

        {/* Logout Button */}
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="mt-6 px-4 py-2 w-full bg-red-500 text-white rounded-lg hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
