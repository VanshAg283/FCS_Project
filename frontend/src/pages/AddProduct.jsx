import { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";

export default function AddProduct({ isEdit = false }) {
  const { productId } = useParams();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    images: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const navigate = useNavigate();

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

          // If verified, fetch categories
          if (data.is_verified) {
            fetchCategories();
            if (isEdit && productId) {
              fetchProductDetails();
            }
          }
        } else {
          setError("Failed to check verification status");
        }
        setVerificationLoading(false);
      } catch (err) {
        setError("Error checking verification status");
        setVerificationLoading(false);
      }
    };

    checkVerification();

    // Set default categories in case API fails
    setCategories(prevCategories => {
      if (prevCategories.length === 0) {
        return [
          { id: 1, name: "Electronics" },
          { id: 2, name: "Fashion" },
          { id: 3, name: "Books" },
          { id: 4, name: "Home & Garden" },
          { id: 5, name: "Other" }
        ];
      }
      return prevCategories;
    });
  }, [isEdit, productId]);

  const fetchProductDetails = async () => {
    try {
      const response = await fetch(`/api/marketplace/products/${productId}/`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`
        }
      });

      if (response.ok) {
        const product = await response.json();
        setFormData({
          title: product.title,
          description: product.description,
          price: product.price,
          category: product.category,
          images: []
        });

        // Set image previews
        if (product.images && product.images.length > 0) {
          const imageUrls = product.images.map(img => img.image);
          setPreviews(imageUrls);
        }
      } else {
        setError("Failed to fetch product details");
      }
    } catch (err) {
      setError("Error fetching product details");
    }
  };

  const fetchCategories = async () => {
    try {
      console.log("Fetching categories for product form...");
      const response = await fetch("/api/marketplace/categories/", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Categories loaded:", data);
        setCategories(data);

        if (data.length === 0) {
          setError("No categories found. Please add a new category.");
        }
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch categories:", errorText);
        setError("Failed to fetch categories: " + (response.status === 404 ? "Categories endpoint not found" : errorText));
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("Error fetching categories: " + err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle special case for category selection
    if (name === "category" && value === "new") {
      setShowNewCategoryInput(true);
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim() || newCategory.trim().length < 2) {
      setError("Category name must be at least 2 characters");
      return;
    }

    setCategorySubmitting(true);
    setError("");

    try {
      console.log("Creating new category:", newCategory.trim());

      // Use the direct categories endpoint
      const response = await fetch("/api/marketplace/categories/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: newCategory.trim() })
      });

      // Log the raw response for debugging
      const responseText = await response.text();
      console.log("Category creation response:", response.status, responseText);

      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (response.ok) {
        // Add the new category to the list and select it
        console.log("Created category:", data);
        setCategories([...categories, data]);
        setFormData(prev => ({ ...prev, category: data.id.toString() }));

        // Reset the new category state
        setNewCategory("");
        setShowNewCategoryInput(false);
      } else {
        setError(data.error || data.detail || "Failed to create category");
      }
    } catch (err) {
      console.error("Category creation error:", err);
      setError("Error creating category: " + err.message);
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + formData.images.length > 5) {
      setError("You can upload a maximum of 5 images");
      return;
    }

    // Generate previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);

    // Update form data
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
  };

  const removeImage = (index) => {
    // Remove from previews
    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);

    // Remove from form data
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.title.trim()) {
      setError("Title is required");
      setLoading(false);
      return;
    }

    if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      setError("Valid price is required");
      setLoading(false);
      return;
    }

    if (!formData.category) {
      setError("Category is required");
      setLoading(false);
      return;
    }

    try {
      const form = new FormData();
      form.append("title", formData.title.trim());
      form.append("description", formData.description.trim());
      form.append("price", formData.price);
      form.append("category", formData.category);

      // Append images
      formData.images.forEach(image => {
        form.append("images", image);
      });

      // Log the form data for debugging
      console.log("Submitting form data:");
      for (let [key, value] of form.entries()) {
        console.log(`${key}: ${value instanceof File ? value.name : value}`);
      }

      let url = "/api/marketplace/products/";
      let method = "POST";

      if (isEdit && productId) {
        url = `/api/marketplace/products/${productId}/`;
        method = "PUT";
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`
        },
        body: form
      });

      // Log the response for debugging
      console.log("Response status:", response.status);
      const responseData = await response.json();
      console.log("Response data:", responseData);

      if (response.ok) {
        navigate(`/marketplace/${responseData.id || responseData.slug}`, {
          state: { message: isEdit ? "Product updated successfully" : "Product added successfully" }
        });
      } else {
        if (responseData.error) {
          setError(responseData.error);
        } else if (typeof responseData === 'object') {
          // Format field errors
          const errorMessages = [];
          for (const [field, errors] of Object.entries(responseData)) {
            errorMessages.push(`${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`);
          }
          setError(errorMessages.join('. '));
        } else {
          setError("Failed to create product");
        }
      }
    } catch (err) {
      console.error("Error creating product:", err);
      setError("Error creating product: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (verificationLoading) {
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link to="/marketplace" className="text-blue-500 hover:text-blue-600 flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Marketplace
        </Link>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">{isEdit ? "Edit Product" : "Add New Product"}</h1>

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

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title*
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price (₹)*
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category*
              </label>
              {!showNewCategoryInput ? (
                <div className="flex space-x-2">
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.length === 0 && (
                      <option value="" disabled>Loading categories...</option>
                    )}
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                    <option value="new">+ Add new category</option>
                  </select>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Enter new category name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={categorySubmitting}
                    className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    {categorySubmitting ? "..." : "Add"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategoryInput(false);
                      setNewCategory("");
                    }}
                    className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Images (Max 5)
            </label>
            <div className="flex items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer" onClick={() => document.getElementById('image-upload').click()}>
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <p className="mt-1 text-sm text-gray-500">Click to upload images</p>
              </div>
            </div>

            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img src={preview} alt={`Preview ${index + 1}`} className="h-24 w-full object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center hover:bg-red-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              to="/marketplace"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? "Saving..." : isEdit ? "Update Product" : "Create Listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
