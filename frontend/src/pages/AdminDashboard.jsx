import { useEffect, useState, useContext } from "react";
import AuthContext from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    if (!user.is_admin) {
      navigate("/");
      return;
    }

    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "verifications") {
      fetchPendingVerifications();
    }
  }, [user, navigate, activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    let accessToken = localStorage.getItem("access_token");
    try {
      let response = await fetch("/api/auth/admin/dashboard/", {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error("Failed to fetch users");

      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchPendingVerifications = async () => {
    setLoading(true);
    let accessToken = localStorage.getItem("access_token");
    try {
      let response = await fetch("/api/auth/admin/verifications/", {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error("Failed to fetch pending verifications");

      const data = await response.json();
      setPendingVerifications(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleVerify = async (userId) => {
    let accessToken = localStorage.getItem("access_token");
    try {
      await fetch(`/api/auth/admin/verify/${userId}/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ notes: "Manually verified by admin" })
      });
      setUsers(users.map((u) => (u.id === userId ? { ...u, verification_status: "VERIFIED", is_verified: true } : u)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (userId) => {
    let accessToken = localStorage.getItem("access_token");
    try {
      await fetch(`/api/auth/admin/reject/${userId}/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ notes: "Manually rejected by admin" })
      });
      setUsers(users.map((u) => (u.id === userId ? { ...u, verification_status: "REJECTED", is_verified: false } : u)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetVerification = async (userId) => {
    let accessToken = localStorage.getItem("access_token");
    try {
      const response = await fetch(`/api/auth/admin/reset-verification/${userId}/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ notes: "Reset for testing by admin" })
      });

      const data = await response.json();

      // Update UI based on message returned from backend
      if (data.message.includes("PENDING")) {
        // If it was reset to PENDING
        setUsers(users.map((u) => (u.id === userId ? {
          ...u,
          verification_status: "PENDING",
          is_verified: false
        } : u)));

        // Refresh pending verifications to show the newly reset user
        fetchPendingVerifications();
      } else {
        // If it was reset to UNVERIFIED
        setUsers(users.map((u) => (u.id === userId ? {
          ...u,
          verification_status: "UNVERIFIED",
          is_verified: false
        } : u)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDocumentReview = async (action) => {
    if (!selectedDocument) return;

    let accessToken = localStorage.getItem("access_token");
    try {
      await fetch(`/api/auth/admin/document/${selectedDocument.id}/review/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: action,
          notes: reviewNotes || `Document ${action === 'approve' ? 'approved' : 'rejected'} by admin`
        })
      });

      // Close modal and refresh data
      setSelectedDocument(null);
      setReviewNotes("");
      fetchPendingVerifications();
    } catch (err) {
      console.error(err);
    }
  };

  const viewDocument = (doc) => {
    console.log("Viewing document:", doc);
    setSelectedDocument(doc);
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 mr-2 ${activeTab === 'users' ? 'border-b-2 border-blue-500 font-semibold' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          All Users
        </button>
        <button
          className={`py-2 px-4 mr-2 ${activeTab === 'verifications' ? 'border-b-2 border-blue-500 font-semibold' : ''}`}
          onClick={() => setActiveTab('verifications')}
        >
          Pending Verifications
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p className="text-xl">Loading...</p>
        </div>
      ) : (
        <>
          {activeTab === 'users' && (
            <table className="w-full border-collapse">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2 text-left">Username</th>
                  <th className="border p-2 text-left">Email</th>
                  <th className="border p-2 text-left">Verification Status</th>
                  <th className="border p-2 text-left">Documents</th>
                  <th className="border p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="text-center">
                    <td className="border p-2 text-left">{u.username}</td>
                    <td className="border p-2 text-left">{u.email}</td>
                    <td className="border p-2 text-left">
                      {u.verification_status === "VERIFIED" ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Verified</span>
                      ) : u.verification_status === "PENDING" ? (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Pending</span>
                      ) : u.verification_status === "REJECTED" ? (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Rejected</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">Not Verified</span>
                      )}
                    </td>
                    <td className="border p-2 text-left">
                      {u.has_documents ? `${u.document_count} document(s)` : "No documents"}
                    </td>
                    <td className="border p-2">
                      <button onClick={() => handleVerify(u.id)} className="bg-green-500 px-3 py-1 rounded text-white mx-1">
                        Verify
                      </button>
                      <button onClick={() => handleReject(u.id)} className="bg-red-500 px-3 py-1 rounded text-white mx-1">
                        Reject
                      </button>
                      <button onClick={() => handleResetVerification(u.id)} className="bg-gray-500 px-3 py-1 rounded text-white mx-1">
                        Reset
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'verifications' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Pending Verification Requests</h2>

              {pendingVerifications.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No pending verification requests</p>
              ) : (
                pendingVerifications.map((profile) => (
                  <div key={profile.id} className="mb-8 p-4 border rounded-lg bg-white shadow">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{profile.user.username}</h3>
                        <p className="text-gray-600">{profile.user.email}</p>
                      </div>
                      <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Pending Verification
                      </div>
                    </div>

                    <h4 className="font-medium mb-2">Submitted Documents:</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border mb-4">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {profile.documents.map((doc) => (
                            <tr key={doc.id}>
                              <td className="px-4 py-2 whitespace-nowrap">{doc.document_type.replace('_', ' ')}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{doc.description || "N/A"}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{new Date(doc.uploaded_at).toLocaleString()}</td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <div className="flex space-x-2">
                                  {doc.document_file_url ? (
                                    <Link
                                      to={`/document/${doc.id}`}
                                      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded"
                                    >
                                      View
                                    </Link>
                                  ) : (
                                    <button
                                      className="bg-gray-300 text-gray-700 px-3 py-1 rounded cursor-not-allowed"
                                      disabled
                                    >
                                      View
                                    </button>
                                  )}
                                  <button
                                    onClick={() => viewDocument(doc)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                                  >
                                    Review
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Document Review Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
            <h2 className="text-xl font-bold mb-4">Document Review</h2>

            <div className="mb-4">
              <p><strong>Document Type:</strong> {selectedDocument.document_type.replace('_', ' ')}</p>
              <p><strong>Uploaded By:</strong> {pendingVerifications.find(p =>
                p.documents.some(d => d.id === selectedDocument.id)
              )?.user.username}</p>
              <p><strong>Uploaded On:</strong> {new Date(selectedDocument.uploaded_at).toLocaleString()}</p>
              {selectedDocument.description && <p><strong>Description:</strong> {selectedDocument.description}</p>}
            </div>

            <div className="mb-6">
              <p className="font-medium mb-2">Document Preview:</p>
              <div className="border p-2 rounded bg-gray-50 h-64 flex items-center justify-center">
                {selectedDocument ? (
                  <Link
                    to={`/document/${selectedDocument.id}`}
                    target="_blank"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Open Document Viewer
                  </Link>
                ) : (
                  <p className="text-gray-500">Document file not available</p>
                )}
              </div>
            </div>

            <div className="mb-6">
              <label className="block font-medium mb-2">Review Notes:</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full p-2 border rounded"
                rows="3"
                placeholder="Enter notes about this document and verification decision"
              ></textarea>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedDocument(null)}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDocumentReview('reject')}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Reject
              </button>
              <button
                onClick={() => handleDocumentReview('approve')}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
