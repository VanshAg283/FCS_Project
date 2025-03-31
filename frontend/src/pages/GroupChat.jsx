import { useState, useEffect, useRef, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";

export default function GroupChat() {
  const { groupId } = useParams();
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [inviteMessage, setInviteMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    fetchGroupDetails();
    fetchMessages();
    fetchMembers();
  }, [groupId]);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchGroupDetails = async () => {
    try {
      const res = await fetch(`/api/groupchat/groups/${groupId}/`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch group details");
      }

      const data = await res.json();
      setGroup(data);
      // Check if current user is creator
      setIsCreator(user && data.creator === user.id);
    } catch (err) {
      console.error("Error fetching group details:", err);
      setError("Failed to load group");
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/groupchat/groups/${groupId}/messages/`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Failed to load messages");
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/groupchat/groups/${groupId}/members/`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch members");
      }

      const data = await res.json();
      setMembers(data.members || []);
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const res = await fetch("/api/groupchat/messages/send/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          group: groupId,
          text: newMessage,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      const data = await res.json();
      setMessages([...messages, data]);
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    }
  };

  const searchUsers = async () => {
    if (searchQuery.length < 3) {
      setInviteMessage("Please enter at least 3 characters to search");
      return;
    }

    try {
      const res = await fetch(`/api/auth/search/?q=${searchQuery}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!res.ok) throw new Error("Failed to search users");

      const data = await res.json();

      // Filter out users who are already members
      const memberIds = members.map(m => m.id);
      const filteredResults = data.filter(user => !memberIds.includes(user.id));

      setSearchResults(filteredResults);
      setInviteMessage("");
    } catch (err) {
      console.error("Error searching users:", err);
      setInviteMessage("Error searching users");
    }
  };

  const addUserToGroup = async (userId) => {
    try {
      const res = await fetch(`/api/groupchat/groups/${groupId}/members/add/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to add user to group");
      }

      // Update UI
      setInviteMessage("User added to group successfully!");

      // Refresh members
      fetchMembers();

      // Remove user from search results
      setSearchResults(searchResults.filter(user => user.id !== userId));
    } catch (err) {
      console.error("Error adding user to group:", err);
      setInviteMessage(err.message || "Error adding user to group");
    }
  };

  const removeUserFromGroup = async (userId) => {
    if (!isCreator && user.id !== userId) {
      setInviteMessage("Only the creator can remove other members");
      return;
    }

    try {
      const res = await fetch(`/api/groupchat/groups/${groupId}/members/${userId}/remove/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to remove user from group");
      }

      // Update UI
      fetchMembers();
      setInviteMessage("User removed from group successfully!");
    } catch (err) {
      console.error("Error removing user from group:", err);
      setInviteMessage(err.message || "Error removing user from group");
    }
  };

  const formatDateHeader = (dateString) => {
    const today = new Date();
    const messageDate = new Date(dateString);

    const isToday = today.toDateString() === messageDate.toDateString();
    const isYesterday =
      new Date(today.setDate(today.getDate() - 1)).toDateString() ===
      messageDate.toDateString();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(messageDate);
  };

  const formatTime = (timestamp) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(new Date(timestamp));
  };

  // Group Messages by Date
  const groupedMessages = messages.reduce((acc, msg) => {
    const dateHeader = formatDateHeader(msg.timestamp);
    if (!acc[dateHeader]) acc[dateHeader] = [];
    acc[dateHeader].push(msg);
    return acc;
  }, {});

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 text-xl">{error}</p>
        <Link to="/groups" className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
          Back to Groups
        </Link>
      </div>
    );
  }

  if (!group) {
    return <div className="text-center p-4">Loading group...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Group Header with Members Toggle */}
      <div className="bg-blue-600 text-white py-3 px-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">{group.name}</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="bg-blue-700 px-3 py-1 rounded hover:bg-blue-800"
          >
            {showMembers ? "Hide Members" : "Show Members"}
          </button>
          {isCreator && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-green-600 px-3 py-1 rounded hover:bg-green-700"
            >
              Add Members
            </button>
          )}
        </div>
      </div>

      {/* Members Sidebar (conditionally rendered) */}
      {showMembers && (
        <div className="bg-gray-200 p-3 border-b border-gray-300">
          <h3 className="font-semibold mb-2">Group Members ({members.length})</h3>
          <div className="flex flex-wrap gap-2">
            {members.map(member => (
              <div key={member.id} className="bg-white px-3 py-1 rounded-full text-sm flex items-center">
                {member.username}
                {(isCreator || user.id === member.id) && member.id !== group.creator && (
                  <button
                    onClick={() => removeUserFromGroup(member.id)}
                    className="ml-2 text-red-500 text-xs hover:text-red-700"
                  >
                    ✕
                  </button>
                )}
                {member.id === group.creator && (
                  <span className="ml-2 text-xs text-blue-600 font-semibold">
                    (Creator)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(groupedMessages).length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            No messages yet. Be the first to send a message!
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="text-center text-gray-500 text-sm my-2 font-semibold">
                {date}
              </div>

              {msgs.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 my-2 max-w-md ${
                    msg.is_sender
                      ? "bg-blue-500 text-white ml-auto rounded-l-lg rounded-tr-lg"
                      : "bg-white text-gray-900 rounded-r-lg rounded-tl-lg"
                  }`}
                >
                  {!msg.is_sender && (
                    <p className="text-xs font-semibold text-gray-600">{msg.sender_username}</p>
                  )}
                  <p className="text-sm">{msg.decrypted_text}</p>
                  <p className={`text-xs mt-1 text-right ${msg.is_sender ? "text-blue-100" : "text-gray-500"}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="bg-white p-3 flex items-center border-t sticky bottom-0">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none"
        />
        <button
          type="submit"
          className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Send
        </button>
      </form>

      {/* Add Members Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Members to Group</h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSearchQuery("");
                  setSearchResults([]);
                  setInviteMessage("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by username..."
                  className="flex-1 p-2 border rounded"
                />
                <button
                  onClick={searchUsers}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                >
                  Search
                </button>
              </div>
              {inviteMessage && <p className="text-sm text-red-500">{inviteMessage}</p>}
            </div>

            <div className="max-h-60 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map(user => (
                  <div key={user.id} className="flex justify-between items-center p-2 border-b">
                    <span>{user.username}</span>
                    <button
                      onClick={() => addUserToGroup(user.id)}
                      className="bg-green-500 text-white text-sm px-2 py-1 rounded hover:bg-green-600"
                    >
                      Add to Group
                    </button>
                  </div>
                ))
              ) : (
                searchQuery.length > 0 && searchResults.length === 0 && !inviteMessage && (
                  <p className="text-center text-gray-500 py-2">No users found</p>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
