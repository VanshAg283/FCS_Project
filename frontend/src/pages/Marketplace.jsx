import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function Marketplace() {
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch verification status to determine access
    fetchVerificationStatus();
    // Load sample products
    loadSampleProducts();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const response = await fetch("/api/auth/verification/status/", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch verification status");

      const data = await response.json();
      setVerificationStatus(data.verification_status);
      setLoading(false);
    } catch (err) {
      setError("Error checking verification status");
      setLoading(false);
    }
  };

  const loadSampleProducts = () => {
    // Sample products
    setProducts([
      {
        id: 1,
        name: "Premium Smartphone",
        price: 999.99,
        description: "Latest model with advanced features",
        image: "https://placehold.co/300x200/4285F4/FFFFFF?text=Smartphone"
      },
      {
        id: 2,
        name: "Laptop Pro",
        price: 1299.99,
        description: "Powerful laptop for professionals",
        image: "https://placehold.co/300x200/34A853/FFFFFF?text=Laptop"
      },
      {
        id: 3,
        name: "Wireless Earbuds",
        price: 129.99,
        description: "High-quality sound with noise cancellation",
        image: "https://placehold.co/300x200/FBBC05/FFFFFF?text=Earbuds"
      },
      {
        id: 4,
        name: "Smart Watch",
        price: 249.99,
        description: "Track your fitness and stay connected",
        image: "https://placehold.co/300x200/EA4335/FFFFFF?text=Watch"
      }
    ]);
  };

  if (loading) {
    return <div className="text-center p-10">Loading...</div>;
  }

  // If user is not verified, show verification required message
  if (verificationStatus !== "VERIFIED") {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-md mt-10">
        <h1 className="text-3xl font-bold text-center mb-6">Marketplace Access Restricted</h1>

        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
          <div className="flex items-center">
            <div className="p-2">
              <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Verification Required</p>
              <p className="text-sm">
                To access the Marketplace, you need to complete the verification process.
              </p>
            </div>
          </div>
        </div>

        <p className="mb-4">
          For your security and the safety of our community, we require all users to verify their identity before accessing the Marketplace.
        </p>

        <p className="mb-6">
          Verification helps us maintain a secure environment and protect against fraud.
        </p>

        <div className="text-center">
          <Link
            to="/verification"
            className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
          >
            Go to Verification Page
          </Link>
        </div>
      </div>
    );
  }

  // If verified, show marketplace
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Marketplace</h1>

      <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-8">
        <p className="font-medium">
          ✅ Your account is verified. You have full access to the marketplace!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
              <p className="text-gray-600 mb-2">{product.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">${product.price}</span>
                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
