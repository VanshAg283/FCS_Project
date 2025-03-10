import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useContext } from "react";
import AuthContext from "./context/AuthContext";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Header from "./components/Header";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatList from "./pages/ChatList";
import Chat from "./pages/Chat";
import AdminDashboard from "./pages/AdminDashboard";


function Home() {
    const [message, setMessage] = useState("Loading...");

    useEffect(() => {
      fetch("/api/hello/")
        .then(response => response.json())
        .then(data => setMessage(data.message))
        .catch(error => setMessage("Error fetching data"));
    }, []);

    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <h1 className="text-3xl font-bold text-blue-600">{message}</h1>
      </div>
    );
  }

export default function App() {
  const { isLoggedIn, isAdmin } = useContext(AuthContext);
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={isLoggedIn ? <Navigate to="/chat" /> : <Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute>
            <ChatList />
          </ProtectedRoute>
        } />
        <Route path="/chat/:receiverId" element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        } />
       {/* Admin Dashboard (Only for Admins) */}
       <Route path="/admin" element={
          isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />
        } />

        {/* Redirect any unknown routes to Home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
