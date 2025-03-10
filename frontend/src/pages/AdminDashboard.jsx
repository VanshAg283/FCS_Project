import { useEffect, useState, useContext } from "react";
import AuthContext from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!user) return; // Prevents accessing user properties if null

    if (!user.is_admin) {
      navigate("/"); // Redirect non-admin users
      return;
    }

    const fetchUsers = async () => {
      let accessToken = localStorage.getItem("access_token");
      try {
        let response = await fetch("/api/auth/admin/dashboard/", {
          headers: { "Authorization": `Bearer ${accessToken}` },
        });

        if (!response.ok) throw new Error("Failed to fetch users");

        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUsers();
  }, [user, navigate]); // Only runs when `user` is available

  const handleVerify = async (userId) => {
    let accessToken = localStorage.getItem("access_token");
    await fetch(`/api/auth/admin/verify/${userId}/`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    setUsers(users.map((u) => (u.id === userId ? { ...u, is_verified: true } : u)));
  };

  const handleReject = async (userId) => {
    let accessToken = localStorage.getItem("access_token");
    await fetch(`/api/auth/admin/reject/${userId}/`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    setUsers(users.map((u) => (u.id === userId ? { ...u, is_verified: false } : u)));
  };

  if (!user) return <p>Loading...</p>; // Ensure user is available before rendering

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-center">Admin Dashboard</h1>
      <table className="w-full mt-4 border-collapse border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Username</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="text-center">
              <td className="border p-2">{u.username}</td>
              <td className="border p-2">{u.email}</td>
              <td className="border p-2">{u.is_verified ? "✅ Verified" : "❌ Not Verified"}</td>
              <td className="border p-2">
                <button onClick={() => handleVerify(u.id)} className="bg-green-500 px-3 py-1 rounded text-white mx-2">
                  Verify
                </button>
                <button onClick={() => handleReject(u.id)} className="bg-red-500 px-3 py-1 rounded text-white">
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
