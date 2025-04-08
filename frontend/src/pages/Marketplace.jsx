import { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    // Check if user is verified
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

          // If verified, fetch products
          if (data.is_verified) {
            fetchProducts();
            fetchCategories();
          }
        } else {
          setError("Failed to check verification status");
        }
        setLoading(false);
      } catch (err) {
        setError("Error checking verification status");
        setLoading(false);
      }
    };

    checkVerification();
  }, []);

  const fetchProducts = async (categoryId = null, query = null) => {
    setLoading(true);
    try {
      let url = "/api/marketplace/products/";
      const params = [];

      if (categoryId && categoryId !== "all") {
        params.push(`category=${categoryId}`);
      }

      if (query && query.trim() !== "") {
        params.push(`search=${encodeURIComponent(query.trim())}`);
      }

      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data);
        setError("");
      } else {
        setError("Failed to fetch products");
      }
    } catch (err) {
      setError("Error fetching products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      console.log("Fetching categories...");
      const response = await fetch("/api/marketplace/categories/", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Categories retrieved:", data);

        if (data.length === 0) {
          // Use default categories if none are returned
          setCategories([
            { id: "electronics", name: "Electronics" },
            { id: "clothing", name: "Clothing & Fashion" },
            { id: "books", name: "Books & Stationery" },
            { id: "home", name: "Home & Kitchen" },
            { id: "other", name: "Other" }
          ]);
        } else {
          setCategories(data);
        }
      } else {
        console.error("Failed to fetch categories:", await response.text());
        // Use default categories if API fails
        setCategories([
          { id: "electronics", name: "Electronics" },
          { id: "clothing", name: "Clothing & Fashion" },
          { id: "books", name: "Books & Stationery" },
          { id: "home", name: "Home & Kitchen" },
          { id: "other", name: "Other" }
        ]);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      // Use default categories if API fails
      setCategories([
        { id: "electronics", name: "Electronics" },
        { id: "clothing", name: "Clothing & Fashion" },
        { id: "books", name: "Books & Stationery" },
        { id: "home", name: "Home & Kitchen" },
        { id: "other", name: "Other" }
      ]);
    }
  };

  const handleSearch = () => {
    fetchProducts(selectedCategory === "all" ? null : selectedCategory, searchQuery);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    fetchProducts(categoryId === "all" ? null : categoryId, searchQuery);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-yellow-800">Verification Required</h3>
              <div className="mt-2 text-yellow-700">
                <p>You need to be verified to access the marketplace. Please complete verification to continue.</p>
                <div className="mt-4">
                  <Link to="/verification" className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded">
                    Go to Verification Page
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Marketplace</h1>
        <Link to="/marketplace/new" className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded">
          Add New Product
        </Link>
      </div>

      <div className="mb-6 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full p-3 pl-10 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
        <div className="w-full md:w-1/3">
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSearch}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded w-full md:w-auto"
        >
          Search
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-sm text-gray-500">Try changing your search or filter, or add a new product.</p>
          <div className="mt-6">
            <Link
              to="/marketplace/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Add New Product
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <div
              key={product.id}
              onClick={() => navigate(`/marketplace/${product.id}`)}
              className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white"
            >
              <div className="relative h-48 bg-gray-200">
                {product.images.length > 0 ? (
                  <img
                    src={product.images[0].image}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-100">
                    <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  ₹{product.price}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-1 truncate">{product.title}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-gray-500">
                    {new Date(product.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-sm font-medium bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    {product.category_name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
