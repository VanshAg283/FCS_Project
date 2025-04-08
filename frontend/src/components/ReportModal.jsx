import { useState } from "react";

export default function ReportModal({ username, userId, onClose, onSubmit }) {
  const [reportData, setReportData] = useState({
    reported_user: userId,
    report_type: "ABUSE",
    content: "",
    evidence_screenshot: null
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    { value: "ABUSE", label: "Abusive Content" },
    { value: "SPAM", label: "Spam" },
    { value: "FAKE", label: "Fake Account" },
    { value: "INAPPROPRIATE", label: "Inappropriate Content" },
    { value: "OTHER", label: "Other" }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!reportData.content.trim()) {
      setError("Please describe the issue");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("reported_user", reportData.reported_user);
      formData.append("report_type", reportData.report_type);
      formData.append("content", reportData.content);

      if (reportData.evidence_screenshot) {
        formData.append("evidence_screenshot", reportData.evidence_screenshot);
      }

      const response = await fetch("/api/auth/report/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        onSubmit && onSubmit(data);
        // Auto-close after success
        setTimeout(() => onClose(), 2000);
      } else {
        setError(data.error || "Failed to submit report");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReportData({ ...reportData, evidence_screenshot: e.target.files[0] });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Report {username}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>

        {success ? (
          <div className="bg-green-100 text-green-800 p-4 rounded mb-4">
            Your report has been submitted successfully and will be reviewed by an admin.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Type of Issue</label>
              <select
                value={reportData.report_type}
                onChange={(e) => setReportData({ ...reportData, report_type: e.target.value })}
                className="w-full p-2 border rounded"
              >
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Description</label>
              <textarea
                value={reportData.content}
                onChange={(e) => setReportData({ ...reportData, content: e.target.value })}
                className="w-full p-2 border rounded"
                rows="4"
                placeholder="Please describe the issue in detail..."
                required
              ></textarea>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Evidence (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full p-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload a screenshot as evidence if available
              </p>
            </div>

            {error && (
              <div className="bg-red-100 text-red-800 p-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
