import { Link } from "react-router-dom";

export default function Header() {
  return (
    <nav className="bg-blue-600 text-white py-4 px-6 flex justify-between">
      <h1 className="text-xl font-bold">My App</h1>
      <div>
        <Link to="/signup" className="px-4 hover:underline">Sign Up</Link>
        <Link to="/login" className="px-4 hover:underline">Login</Link>
      </div>
    </nav>
  );
}
