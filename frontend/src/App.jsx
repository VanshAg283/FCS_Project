import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Header from "./components/Header";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";

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
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}
