import { useContext, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, logout, isAdmin, user } = useContext(AuthContext);
  const [isVerified, setIsVerified] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    // Check user verification status if logged in
    if (isLoggedIn) {
      checkVerification();
    }
  }, [isLoggedIn]);

  const checkVerification = async () => {
    try {
      const response = await fetch("/api/auth/verification/status/", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsVerified(data.is_verified);
      }
    } catch (err) {
      console.error("Error checking verification status:", err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-blue-600">SecureChat</Link>
            </div>
            {isLoggedIn && (
              <nav className="hidden sm:ml-6 sm:flex sm:space-x-4">
                <Link
                  to="/chat"
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    location.pathname.startsWith("/chat")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Chat
                </Link>
                <Link
                  to="/groups"
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    location.pathname.startsWith("/groups")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Group Chat
                </Link>
                {isVerified && (
                  <Link
                    to="/marketplace"
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      location.pathname.startsWith("/marketplace")
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Marketplace
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      location.pathname.startsWith("/admin")
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Admin
                  </Link>
                )}
              </nav>
            )}
          </div>

          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isLoggedIn ? (
              <div className="ml-3 relative flex items-center gap-4">
                {!isVerified && (
                  <Link
                    to="/verification"
                    className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Verify Account
                  </Link>
                )}
                <Link
                  to="/profile"
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    location.pathname === "/profile"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    location.pathname === "/login"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <svg
                className={`${showMobileMenu ? "hidden" : "block"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${showMobileMenu ? "block" : "hidden"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${showMobileMenu ? "block" : "hidden"} sm:hidden`}>
        {isLoggedIn ? (
          <div className="pt-2 pb-3 space-y-1">
            <Link
              to="/chat"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname.startsWith("/chat")
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
              }`}
              onClick={() => setShowMobileMenu(false)}
            >
              Chat
            </Link>
            <Link
              to="/groups"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname.startsWith("/groups")
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
              }`}
              onClick={() => setShowMobileMenu(false)}
            >
              Group Chat
            </Link>
            {isVerified && (
              <Link
                to="/marketplace"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname.startsWith("/marketplace")
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                }`}
                onClick={() => setShowMobileMenu(false)}
              >
                Marketplace
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname.startsWith("/admin")
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                }`}
                onClick={() => setShowMobileMenu(false)}
              >
                Admin
              </Link>
            )}
            <Link
              to="/profile"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === "/profile"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
              }`}
              onClick={() => setShowMobileMenu(false)}
            >
              My Profile
            </Link>
            {!isVerified && (
              <Link
                to="/verification"
                className="block px-3 py-2 rounded-md text-base font-medium text-yellow-700 bg-yellow-50"
                onClick={() => setShowMobileMenu(false)}
              >
                Verify Account
              </Link>
            )}
            <button
              onClick={() => {
                handleLogout();
                setShowMobileMenu(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="pt-2 pb-3 space-y-1">
            <Link
              to="/login"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === "/login"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
              }`}
              onClick={() => setShowMobileMenu(false)}
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="block px-3 py-2 rounded-md text-base font-medium bg-blue-500 text-white hover:bg-blue-600"
              onClick={() => setShowMobileMenu(false)}
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
