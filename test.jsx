import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";

export default function GroupList() {
  const { user } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/groupchat/groups/", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!res.ok) throw new Error("Failed to fetch groups");

      const data = await res.json();
      setGroups(data);
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching groups:", err);
      setMessage("Error fetching groups");
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setMessage("Group name is required");
      return;
    }

    try {
      const res = await fetch("/api/groupchat/groups/create/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription,
        }),
      });

      if (!res.ok) throw new Error("Failed to create group");

      const data = await res.json();
      setGroups([...groups, data]);
      setShowCreateModal(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setMessage("");
    } catch (err) {
      console.error("Error creating group:", err);
      setMessage("Error creating group");
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    try {
      const res = await fetch(`/api/groupchat/groups/${groupId}/delete/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!res.ok) throw new Error("Failed to delete group");

      // Remove group from state
      setGroups(groups.filter(group => group.id !== groupId));
    } catch (err) {
      console.error("Error deleting group:", err);
      setMessage("Error deleting group");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Groups</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create New Group
        </button>
      </div>

      {message && <p className="text-red-500 mb-4">{message}</p>}

      {/* Group List */}
      {isLoading ? (
        <p className="text-center py-8">Loading groups...</p>
      ) : groups.length === 0 ? (
        <p className="text-gray-500 text-center py-8">You don't belong to any groups yet. Create a new one to get started!</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <div
              key={group.id}
              className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-semibold">{group.name}</h2>
                {group.creator === user?.id && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteGroup(group.id);
                    }}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-gray-600 text-sm mt-1">
                Created by: {group.creator_username}
                {group.creator === user?.id && " (You)"}
              </p>
              {group.description && <p className="mt-2 text-gray-700">{group.description}</p>}
              <div className="flex justify-between items-center mt-4">
                <p className="text-gray-500 text-xs">
                  Created: {formatDate(group.created_at)}
                </p>
                <div className="flex space-x-2">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {group.members_count} {group.members_count === 1 ? 'member' : 'members'}
                  </span>
                  <Link
                    to={`/groups/${group.id}`}
                    className="bg-green-500 text-white text-sm px-3 py-1 rounded hover:bg-green-600"
                  >
                    Chat
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Create New Group</h2>
            <form onSubmit={handleCreateGroup}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Enter group name"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Description (optional)</label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Enter group description"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
