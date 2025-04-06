import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import AuthContext from "../context/AuthContext";

export default function Header() {
  const { isLoggedIn, user, logout, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-blue-600 p-4 text-white flex justify-between items-center shadow-lg">
      <Link to="/" className="text-xl font-bold hover:underline">Chat App</Link>

      {isLoggedIn && (
        <div className="flex space-x-4">
          <Link to="/chat" className="hover:underline">Chat</Link>
          <Link to="/groups" className="hover:underline">Groups</Link>
          <Link to="/marketplace" className="hover:underline">Marketplace</Link>
          <Link to="/verification" className="hover:underline">Verification</Link>
        </div>
      )}

      <div className="flex items-center space-x-4">
        {isLoggedIn ? (
          <>
            {/* Admin Panel - Only for Admins */}
            {isAdmin && (
              <Link to="/admin" className="hover:underline text-yellow-300 font-semibold">
                Admin Panel
              </Link>
            )}
            <Link to="/profile" className="flex items-center hover:underline">
              <img
                src={user?.profile_picture || "/person.png"} // Default image
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-white"
              />
              <span className="ml-2 font-medium">{user?.username}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-500 px-3 py-1 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/signup" className="hover:underline">Signup</Link>
            <Link to="/login" className="bg-green-500 px-4 py-2 rounded hover:bg-green-700">
              Login
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
