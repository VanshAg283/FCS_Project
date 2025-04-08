import { useEffect, useState, useContext } from "react";
import AuthContext from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showResetLoginAttemptsModal, setShowResetLoginAttemptsModal] = useState(false);
  const [usernameToReset, setUsernameToReset] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportStatusFilter, setReportStatusFilter] = useState("PENDING");
  const [reportAdminNotes, setReportAdminNotes] = useState("");

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
    } else if (activeTab === "suspicious") {
      fetchSuspiciousActivity();
    } else if (activeTab === "reports") {
      fetchReports();
    }
  }, [user, navigate, activeTab, reportStatusFilter]);

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

  const fetchSuspiciousActivity = async () => {
    setLoading(true);
    let accessToken = localStorage.getItem("access_token");
    try {
      let response = await fetch("/api/auth/admin/suspicious-activity/", {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error("Failed to fetch suspicious activity");

      const data = await response.json();
      setSuspiciousActivity(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    let accessToken = localStorage.getItem("access_token");
    try {
      let url = "/api/auth/admin/reports/";
      if (reportStatusFilter) {
        url += `?status=${reportStatusFilter}`;
      }

      let response = await fetch(url, {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error("Failed to fetch reports");

      const data = await response.json();
      setReports(data);
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

      if (data.message.includes("PENDING")) {
        setUsers(users.map((u) => (u.id === userId ? {
          ...u,
          verification_status: "PENDING",
          is_verified: false
        } : u)));

        fetchPendingVerifications();
      } else {
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

      setSelectedDocument(null);
      setReviewNotes("");
      fetchPendingVerifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveSuspiciousActivity = async (attemptId) => {
    let accessToken = localStorage.getItem("access_token");
    try {
      await fetch(`/api/auth/admin/suspicious-activity/${attemptId}/resolve/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      setSuspiciousActivity(suspiciousActivity.filter(item => item.id !== attemptId));
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDeleteUser = (userId, username) => {
    setUserToDelete({ id: userId, username: username });
    setShowDeleteConfirmation(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    let accessToken = localStorage.getItem("access_token");
    try {
      const response = await fetch(`/api/auth/admin/user/${userToDelete.id}/delete/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        setUsers(users.filter(user => user.id !== userToDelete.id));
        setShowDeleteConfirmation(false);
        setUserToDelete(null);
      } else {
        console.error("Failed to delete user");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetLoginAttempts = async () => {
    if (!usernameToReset) {
      setResetMessage("Please enter a username");
      return;
    }

    let accessToken = localStorage.getItem("access_token");
    try {
      const response = await fetch("/api/auth/admin/reset-login-attempts/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username: usernameToReset })
      });

      const data = await response.json();

      if (response.ok) {
        setResetMessage(data.message);
        fetchSuspiciousActivity();

        setTimeout(() => {
          setShowResetLoginAttemptsModal(false);
          setUsernameToReset("");
          setResetMessage("");
        }, 3000);
      } else {
        setResetMessage(data.error || "Failed to reset login attempts");
      }
    } catch (err) {
      console.error(err);
      setResetMessage("An error occurred");
    }
  };

  const handleUpdateReportStatus = async (reportId, newStatus) => {
    let accessToken = localStorage.getItem("access_token");
    try {
      const response = await fetch(`/api/auth/admin/report/${reportId}/update/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: newStatus,
          admin_notes: reportAdminNotes
        })
      });

      if (response.ok) {
        fetchReports();
        setSelectedReport(null);
        setReportAdminNotes("");
      } else {
        console.error("Failed to update report status");
      }
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
        <button
          className={`py-2 px-4 mr-2 ${activeTab === 'suspicious' ? 'border-b-2 border-blue-500 font-semibold' : ''}`}
          onClick={() => setActiveTab('suspicious')}
        >
          Suspicious Activity
        </button>
        <button
          className={`py-2 px-4 mr-2 ${activeTab === 'reports' ? 'border-b-2 border-blue-500 font-semibold' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          User Reports
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
                      <button onClick={() => confirmDeleteUser(u.id, u.username)} className="bg-red-700 px-3 py-1 rounded text-white mx-1">
                        Delete
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

          {activeTab === 'suspicious' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Suspicious Activity</h2>
                <button
                  onClick={() => setShowResetLoginAttemptsModal(true)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Reset User Login History
                </button>
              </div>

              {suspiciousActivity.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No suspicious activity detected</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-2 px-4 text-left">Username</th>
                        <th className="py-2 px-4 text-left">IP Address</th>
                        <th className="py-2 px-4 text-left">Time</th>
                        <th className="py-2 px-4 text-left">Reason</th>
                        <th className="py-2 px-4 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suspiciousActivity.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="py-2 px-4">{item.username}</td>
                          <td className="py-2 px-4">{item.ip_address || "Unknown"}</td>
                          <td className="py-2 px-4">
                            {new Date(item.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2 px-4">{item.reason}</td>
                          <td className="py-2 px-4">
                            <button
                              onClick={() => handleResolveSuspiciousActivity(item.id)}
                              className="bg-green-500 px-3 py-1 rounded text-white"
                            >
                              Resolve
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">User Reports</h2>
                <div>
                  <select
                    value={reportStatusFilter}
                    onChange={(e) => setReportStatusFilter(e.target.value)}
                    className="p-2 border rounded"
                  >
                    <option value="">All Reports</option>
                    <option value="PENDING">Pending Review</option>
                    <option value="REVIEWING">Under Review</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="DISMISSED">Dismissed</option>
                  </select>
                </div>
              </div>

              {reports.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No reports found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-2 px-4 text-left">Reporter</th>
                        <th className="py-2 px-4 text-left">Reported User</th>
                        <th className="py-2 px-4 text-left">Type</th>
                        <th className="py-2 px-4 text-left">Date</th>
                        <th className="py-2 px-4 text-left">Status</th>
                        <th className="py-2 px-4 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report) => (
                        <tr key={report.id} className="border-t">
                          <td className="py-2 px-4">{report.reporter_username}</td>
                          <td className="py-2 px-4">{report.reported_username}</td>
                          <td className="py-2 px-4">{report.report_type_display}</td>
                          <td className="py-2 px-4">{new Date(report.created_at).toLocaleString()}</td>
                          <td className="py-2 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium
                              ${report.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                              ${report.status === 'REVIEWING' ? 'bg-blue-100 text-blue-800' : ''}
                              ${report.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : ''}
                              ${report.status === 'DISMISSED' ? 'bg-gray-100 text-gray-800' : ''}
                            `}>
                              {report.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2 px-4">
                            <button
                              onClick={() => setSelectedReport(report)}
                              className="bg-blue-500 px-3 py-1 rounded text-white"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

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

      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-red-600">Delete User</h2>
            <p className="mb-6">
              Are you sure you want to delete user <strong>{userToDelete?.username}</strong>?
              This action cannot be undone and will remove all user data.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetLoginAttemptsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-red-600">Reset User Login History</h2>
            <p className="mb-4">
              This will completely delete ALL login attempts for a user, unblocking their account and removing all suspicious activity flags.
            </p>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Username</label>
              <input
                type="text"
                value={usernameToReset}
                onChange={(e) => setUsernameToReset(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter username to reset"
              />
            </div>

            {resetMessage && (
              <div className={`p-3 mb-4 rounded ${resetMessage.includes("Successfully") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {resetMessage}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowResetLoginAttemptsModal(false);
                  setUsernameToReset("");
                  setResetMessage("");
                }}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleResetLoginAttempts}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reset Login History
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
            <h2 className="text-xl font-bold mb-4">Review Report</h2>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <p><strong>Report Type:</strong> {selectedReport.report_type_display}</p>
                <p><strong>Reporter:</strong> {selectedReport.reporter_username}</p>
                <p><strong>Reported User:</strong> {selectedReport.reported_username}</p>
                <p><strong>Date Reported:</strong> {new Date(selectedReport.created_at).toLocaleString()}</p>
                <p><strong>Current Status:</strong> {selectedReport.status}</p>
              </div>

              {selectedReport.evidence_screenshot && (
                <div>
                  <p><strong>Evidence:</strong></p>
                  <img
                    src={selectedReport.evidence_screenshot}
                    alt="Evidence"
                    className="border rounded max-h-40 object-contain"
                  />
                </div>
              )}
            </div>

            <div className="mb-4 bg-gray-50 p-3 rounded">
              <p className="font-medium">Description:</p>
              <p className="whitespace-pre-wrap">{selectedReport.content}</p>
            </div>

            <div className="mb-6">
              <label className="block font-medium mb-2">Admin Notes:</label>
              <textarea
                value={reportAdminNotes}
                onChange={(e) => setReportAdminNotes(e.target.value)}
                className="w-full p-2 border rounded"
                rows="3"
                placeholder="Enter notes about this report (optional)"
              ></textarea>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>

              {selectedReport.status === 'PENDING' && (
                <button
                  onClick={() => handleUpdateReportStatus(selectedReport.id, 'REVIEWING')}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Mark as Reviewing
                </button>
              )}

              <button
                onClick={() => handleUpdateReportStatus(selectedReport.id, 'DISMISSED')}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Dismiss
              </button>

              <button
                onClick={() => handleUpdateReportStatus(selectedReport.id, 'RESOLVED')}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
