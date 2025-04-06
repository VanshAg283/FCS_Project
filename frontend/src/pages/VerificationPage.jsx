import { useEffect, useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";

export default function VerificationPage() {
  const [documentType, setDocumentType] = useState("ID_CARD");
  const [description, setDescription] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchVerificationStatus();
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
      setDocuments(data.documents || []);
    } catch (err) {
      setError("Error fetching verification status: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!documentFile) {
      setError("Please select a document file");
      return;
    }

    const formData = new FormData();
    formData.append("document_type", documentType);
    formData.append("document_file", documentFile);
    formData.append("description", description);

    try {
      const response = await fetch("/api/auth/verification/submit/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to submit document");

      const data = await response.json();
      setMessage("Document submitted successfully for verification!");
      // Reset form
      setDocumentType("ID_CARD");
      setDescription("");
      setDocumentFile(null);

      // Refresh verification status
      fetchVerificationStatus();
    } catch (err) {
      setError("Error submitting document: " + err.message);
    }
  };

  const renderStatusBadge = () => {
    switch (verificationStatus) {
      case "VERIFIED":
        return <span className="bg-green-500 text-white px-2 py-1 rounded">Verified</span>;
      case "PENDING":
        return <span className="bg-yellow-500 text-white px-2 py-1 rounded">Pending Verification</span>;
      case "REJECTED":
        return <span className="bg-red-500 text-white px-2 py-1 rounded">Verification Rejected</span>;
      default:
        return <span className="bg-gray-500 text-white px-2 py-1 rounded">Not Verified</span>;
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Account Verification</h1>

        <div className="mb-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Verification Status</h2>
          <div className="text-lg">{renderStatusBadge()}</div>
        </div>

        {verificationStatus === "REJECTED" && (
          <div className="mb-8 p-4 bg-red-100 rounded-lg">
            <h2 className="text-xl font-semibold mb-2 text-red-700">Verification Rejected</h2>
            <p>Your verification was rejected. Please submit a new document for verification.</p>
          </div>
        )}

        {verificationStatus === "PENDING" && (
          <div className="mb-8 p-4 bg-yellow-100 rounded-lg">
            <h2 className="text-xl font-semibold mb-2 text-yellow-700">Verification Pending</h2>
            <p>Your verification is pending review by an administrator. You will be notified once it's processed.</p>
          </div>
        )}

        {verificationStatus !== "VERIFIED" && (
          <>
            <h2 className="text-xl font-semibold mb-4">Submit Verification Document</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="ID_CARD">ID Card</option>
                  <option value="AADHAR">Aadhar Card</option>
                  <option value="DRIVERS_LICENSE">Driver's License</option>
                  <option value="OTHER">Other Document</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  rows="3"
                  placeholder="Provide any additional details about your document"
                ></textarea>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 mb-2">Upload Document</label>
                <input
                  type="file"
                  onChange={(e) => setDocumentFile(e.target.files[0])}
                  className="w-full p-2 border rounded-md"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Upload a clear image or PDF of your document. Maximum size: 5MB.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
              >
                Submit Document for Verification
              </button>
            </form>

            {error && <p className="mt-4 text-red-500">{error}</p>}
            {message && <p className="mt-4 text-green-500">{message}</p>}
          </>
        )}

        {/* Previously Submitted Documents */}
        {documents.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-4">Submitted Documents</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 text-left">Type</th>
                    <th className="py-2 px-4 text-left">Description</th>
                    <th className="py-2 px-4 text-left">Date Submitted</th>
                    <th className="py-2 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-t">
                      <td className="py-2 px-4">{doc.document_type.replace('_', ' ')}</td>
                      <td className="py-2 px-4">{doc.description || "N/A"}</td>
                      <td className="py-2 px-4">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-4">
                        <Link
                          to={`/document/${doc.id}`}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded"
                        >
                          View Document
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
