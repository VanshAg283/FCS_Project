import { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";

export default function ProductDetail() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
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

          // Only fetch product if user is verified
          if (data.is_verified) {
            fetchProduct();
          }
        } else {
          navigate("/verification", { state: { message: "Verification required to access marketplace" } });
        }
      } catch (err) {
        setError("Error checking verification status");
        setLoading(false);
      }
    };

    checkVerification();
  }, [productId, navigate]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/marketplace/listings/${productId}/`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProduct(data);
        setIsOwner(data.seller.id === user?.id);
      } else if (response.status === 403) {
        navigate("/verification");
      } else {
        setError("Failed to fetch product details");
      }
    } catch (err) {
      setError("Error fetching product details");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const response = await fetch(`/api/marketplace/products/${productId}/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`
        }
      });

      if (response.ok) {
        navigate("/marketplace", { state: { message: "Product deleted successfully" } });
      } else {
        setError("Failed to delete product");
      }
    } catch (err) {
      setError("Error deleting product");
    }
  };

  const handleContactSeller = () => {
    if (product?.seller?.id) {
      navigate(`/chat/${product.seller.id}`);
    }
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

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
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
        <div className="flex justify-center">
          <Link to="/marketplace" className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded">
            Return to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto p-6">
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
          <h3 className="mt-2 text-lg font-medium text-gray-900">Product not found</h3>
          <div className="mt-6">
            <Link
              to="/marketplace"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Return to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <Link to="/marketplace" className="text-blue-500 hover:text-blue-600 flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Marketplace
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            {product.images && product.images.length > 0 ? (
              <>
                <div className="relative rounded-lg overflow-hidden h-80 bg-gray-100 mb-4">
                  <img
                    src={product.images[activeImage].image_url}
                    alt={product.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {product.images.map((image, index) => (
                    <div
                      key={image.id}
                      className={`h-20 bg-gray-100 rounded cursor-pointer hover:opacity-80 ${
                        index === activeImage ? "ring-2 ring-blue-500" : ""
                      }`}
                      onClick={() => setActiveImage(index)}
                    >
                      <img
                        src={image.image_url}
                        alt={`Product view ${index + 1}`}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-sm font-medium bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    {product.category_name}
                  </span>
                  <span className="text-sm text-gray-500">
                    Posted on {new Date(product.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600">₹{product.price}</div>
            </div>

            <div className="border-t border-b border-gray-200 py-4 my-4">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Seller Information</h3>
              <div className="flex items-center">
                <div className="bg-gray-100 rounded-full h-10 w-10 flex items-center justify-center text-gray-700 font-semibold text-lg">
                  {product.seller.username.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3">
                  <p className="font-medium">{product.seller.username}</p>
                  <p className="text-sm text-gray-500">Verified User</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
              {isOwner ? (
                <>
                  <Link
                    to={`/marketplace/edit/${product.id}`}
                    className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Listing
                  </Link>
                  <button
                    onClick={handleDeleteProduct}
                    className="py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded font-medium flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Listing
                  </button>
                </>
              ) : (
                <button
                  onClick={handleContactSeller}
                  className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Contact Seller
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
