import { useEffect, useState } from "react";

export default function Profile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("/api/auth/profile/", {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
      },
    })
    .then(response => response.json())
    .then(data => setUser(data))
    .catch(error => console.error("Error fetching profile:", error));
  }, []);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      {user ? (
        <div className="bg-white shadow-lg rounded-lg p-6 w-96 text-center">
          <h2 className="text-2xl font-bold text-blue-600">Profile</h2>
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Email:</strong> {user.email}</p>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
