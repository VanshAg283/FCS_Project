import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

export default function DocumentViewer() {
  const { documentId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documentData, setDocumentData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDocumentInfo = async () => {
      try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          throw new Error("You must be logged in to view this document");
        }

        // First, fetch document metadata
        const response = await fetch(`/api/auth/document/${documentId}/info/`, {
          headers: {
            "Authorization": `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("You are not authorized to view this document");
          } else if (response.status === 404) {
            throw new Error("Document not found");
          } else {
            throw new Error("Failed to load document information");
          }
        }

        const data = await response.json();
        setDocumentData(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchDocumentInfo();
  }, [documentId]);

  const viewDocument = () => {
    const accessToken = localStorage.getItem("access_token");
    // Open in an iframe or a new tab securely with the token in the request header
    window.open(`/api/auth/document/${documentId}/view/?token=${accessToken}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <Link
            to="/verification"
            className="inline-block bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{documentData.document_type.replace('_', ' ')}</h1>
        <div className="text-sm text-gray-600 mb-4">
          <p>Uploaded on: {new Date(documentData.uploaded_at).toLocaleString()}</p>
          {documentData.description && (
            <p className="mt-1">Description: {documentData.description}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center space-y-4 py-10 border rounded-lg bg-gray-50">
        <p className="text-gray-600">For security reasons, documents must be viewed in a new tab</p>
        <button
          onClick={viewDocument}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300"
        >
          View Document
        </button>
      </div>

      <div className="mt-8 flex justify-between">
        <Link
          to="/verification"
          className="text-blue-500 hover:text-blue-700"
        >
          ← Back to Verification
        </Link>
      </div>
    </div>
  );
}
