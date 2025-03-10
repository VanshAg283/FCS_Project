import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function ChatList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch("/api/auth/users/", {
      headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
    })
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error("Error fetching users:", err));
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Users</h2>
      {users.map((user) => (
        <Link key={user.id} to={`/chat/${user.id}`} className="block p-2 bg-white my-2 rounded shadow">
          {user.username}
        </Link>
      ))}
    </div>
  );
}
