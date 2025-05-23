import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ReportModal from "../components/ReportModal";
import BlockUserModal from "../components/BlockUserModal";

export default function ChatList() {
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [message, setMessage] = useState("");
  const [friendRequests, setFriendRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
    fetchBlockedUsers();
  }, []);

  const fetchFriends = async () => {
    try {
      const res = await fetch("/api/auth/friends/", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
      });
      const data = await res.json();
      setFriends(data);
    } catch (err) {
      console.error("Error fetching friends:", err);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const res = await fetch("/api/auth/friend-requests/", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
      });
      const data = await res.json();
      setFriendRequests(data);
    } catch (err) {
      console.error("Error fetching friend requests:", err);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const res = await fetch("/api/auth/blocks/", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`
        },
      });

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Non-JSON response:", await res.text());
        throw new Error("Server returned non-JSON response");
      }

      const data = await res.json();
      setBlockedUsers(data);
    } catch (err) {
      console.error("Error fetching blocked users:", err);
      // Instead of failing, set empty array
      setBlockedUsers([]);
      setMessage("Error loading blocked users.");
    }
  };

  const handleFriendRequest = async (requestId, action) => {
    try {
      const res = await fetch("/api/auth/friend-request/respond/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ request_id: requestId, action }),
      });

      if (res.ok) {
        // Refresh both friend requests and friends lists
        fetchFriendRequests();
        fetchFriends();
        setMessage(`Friend request ${action}ed successfully`);
      } else {
        const data = await res.json();
        setMessage(data.error || `Failed to ${action} friend request`);
      }
    } catch (err) {
      console.error(`Error ${action}ing friend request:`, err);
      setMessage(`Error ${action}ing friend request`);
    }
  };

  const searchUsers = async () => {
    if (searchQuery.length < 3) {
      setMessage("Please enter at least 3 characters to search");
      return;
    }

    try {
      const res = await fetch(`/api/auth/search/?q=${searchQuery}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
      });
      const data = await res.json();
      setSearchResults(data);
      setMessage("");
    } catch (err) {
      console.error("Error searching users:", err);
      setMessage("Error searching users");
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      const res = await fetch("/api/auth/friend-request/send/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiver: userId }),
      });

      const data = await res.json();

      if (res.ok) {
        setSearchResults(results =>
          results.map(user =>
            user.id === userId
              ? { ...user, friendship_status: 'PENDING' }
              : user
          )
        );
        setMessage("Friend request sent successfully");
      } else {
        setMessage(data.error || "Error sending friend request");
      }
    } catch (err) {
      console.error("Error sending friend request:", err);
      setMessage("Error sending friend request");
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      const res = await fetch(`/api/auth/unblock/${userId}/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (res.ok) {
        setBlockedUsers(blockedUsers.filter(block => block.blocked !== userId));
        setMessage("User unblocked successfully");
      } else {
        const data = await res.json();
        setMessage(data.error || "Error unblocking user");
      }
    } catch (err) {
      console.error("Error unblocking user:", err);
      setMessage("Error unblocking user");
    }
  };

  const openReportModal = (user) => {
    setSelectedUser(user);
    setShowReportModal(true);
  };

  const openBlockModal = (user) => {
    setSelectedUser(user);
    setShowBlockModal(true);
  };

  const isUserBlocked = (userId) => {
    return blockedUsers.some(block =>
      // Handle both string and number comparisons
      String(block.blocked) === String(userId)
    );
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Friend Requests Section */}
      {friendRequests.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Friend Requests</h2>
          <div className="space-y-2">
            {friendRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow">
                <span className="font-medium">{request.sender_username}</span>
                <div className="space-x-2">
                  <button
                    onClick={() => handleFriendRequest(request.id, 'accept')}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleFriendRequest(request.id, 'reject')}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Search Users</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={searchUsers}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Search
          </button>
        </div>
        {message && <p className="mt-2 text-red-500">{message}</p>}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2">Search Results</h3>
          {searchResults.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-2 bg-white my-2 rounded shadow">
              <span>{user.username}</span>
              <div className="flex space-x-2">
                {user.friendship_status === null && !isUserBlocked(user.id) && (
                  <button
                    onClick={() => sendFriendRequest(user.id)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    Add Friend
                  </button>
                )}
                {user.friendship_status === 'PENDING' && (
                  <span className="text-yellow-600">Request Pending</span>
                )}
                {user.friendship_status === 'ACCEPTED' && (
                  <span className="text-green-600">Friends</span>
                )}

                {/* Report and Block buttons */}
                <div className="flex space-x-1">
                  <button
                    onClick={() => openReportModal(user)}
                    className="bg-gray-200 text-gray-800 px-2 py-1 rounded hover:bg-gray-300"
                    title="Report User"
                  >
                    ⚠️
                  </button>

                  {isUserBlocked(user.id) ? (
                    <button
                      onClick={() => handleUnblockUser(user.id)}
                      className="bg-gray-200 text-gray-800 px-2 py-1 rounded hover:bg-gray-300"
                      title="Unblock User"
                    >
                      🔓
                    </button>
                  ) : (
                    <button
                      onClick={() => openBlockModal(user)}
                      className="bg-gray-200 text-gray-800 px-2 py-1 rounded hover:bg-gray-300"
                      title="Block User"
                    >
                      🚫
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends List */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Friends</h2>
        {friends.length === 0 ? (
          <p className="text-gray-500">No friends yet. Search for users to add friends!</p>
        ) : (
          friends.map((friend) => (
            <div key={friend.id} className="flex items-center justify-between p-2 bg-white my-2 rounded shadow">
              <Link to={`/chat/${friend.id}`} className="flex-grow hover:text-blue-500">
                {friend.username}
              </Link>

              <div className="flex space-x-1">
                <button
                  onClick={() => openReportModal(friend)}
                  className="bg-gray-200 text-gray-800 px-2 py-1 rounded hover:bg-gray-300"
                  title="Report User"
                >
                  ⚠️
                </button>
                <button
                  onClick={() => openBlockModal(friend)}
                  className="bg-gray-200 text-gray-800 px-2 py-1 rounded hover:bg-gray-300"
                  title="Block User"
                >
                  🚫
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Blocked Users Section */}
      {blockedUsers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Blocked Users</h2>
          {blockedUsers.map((block) => (
            <div key={block.id} className="flex items-center justify-between p-2 bg-white my-2 rounded shadow">
              <span>{block.blocked_username}</span>
              <button
                onClick={() => handleUnblockUser(block.blocked)}
                className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && selectedUser && (
        <ReportModal
          username={selectedUser.username}
          userId={selectedUser.id}
          onClose={() => setShowReportModal(false)}
          onSubmit={() => {
            setMessage(`Reported ${selectedUser.username} successfully`);
          }}
        />
      )}

      {/* Block Modal */}
      {showBlockModal && selectedUser && (
        <BlockUserModal
          username={selectedUser.username}
          userId={selectedUser.id}
          onClose={() => setShowBlockModal(false)}
          onBlock={() => {
            setMessage(`Blocked ${selectedUser.username} successfully`);
            fetchBlockedUsers();
          }}
        />
      )}
    </div>
  );
}
