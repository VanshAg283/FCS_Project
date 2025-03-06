import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      let accessToken = localStorage.getItem("access_token");
      let refreshToken = localStorage.getItem("refresh_token");

      if (!accessToken) {
        navigate("/login"); // Redirect if not logged in
        return;
      }

      try {
        let response = await fetch("/api/auth/profile/", {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        // If access token expired, try refreshing it
        if (response.status === 401 && refreshToken) {
          const refreshResponse = await fetch("/api/auth/token/refresh/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (!refreshResponse.ok) {
            throw new Error("Session expired. Please log in again.");
          }

          const newTokens = await refreshResponse.json();
          localStorage.setItem("access_token", newTokens.access);

          // Retry fetching profile with new access token
          response = await fetch("/api/auth/profile/", {
            headers: {
              "Authorization": `Bearer ${newTokens.access}`,
              "Content-Type": "application/json",
            },
          });
        }

        if (!response.ok) {
          throw new Error("Failed to fetch profile.");
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err.message);
        setTimeout(() => navigate("/login"), 2000); // Redirect after 2 seconds
      }
    };

    fetchProfile();
  }, [navigate]);

  if (error) {
    return <p className="text-red-500 text-center">{error}</p>;
  }

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      {user ? (
        <div className="bg-white shadow-lg rounded-lg p-6 w-96 text-center">
          <h2 className="text-2xl font-bold text-blue-600">Profile</h2>
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Email:</strong> {user.email}</p>
        </div>
      ) : (
        <p className="text-gray-500">Loading profile...</p>
      )}
    </div>
  );
}
