import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

export default function Chat() {
  const { receiverId } = useParams();
  const [messages, setMessages] = useState([]);
  const [receiverName, setReceiverName] = useState("Loading...");
  const [newMessage, setNewMessage] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setAuthToken(token);

    const fetchReceiverName = async () => {
      try {
        let response = await fetch(`/api/auth/users/`, {
          headers: { "Authorization": `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch users.");
        }

        const users = await response.json();
        const receiver = users.find((user) => user.id === parseInt(receiverId));

        setReceiverName(receiver ? receiver.username : "Unknown User");
      } catch (err) {
        setReceiverName("Error Loading");
      }
    };

    fetchReceiverName();
  }, [receiverId]);

  useEffect(() => {
    const fetchMessages = async () => {
      let accessToken = localStorage.getItem("access_token");

      try {
        let response = await fetch(`/api/chat/${receiverId}/`, {
          headers: { "Authorization": `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch messages.");
        }

        const data = await response.json();
        setMessages(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();
  }, [receiverId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);

      const previewUrl = URL.createObjectURL(file);
      setMediaPreview(previewUrl);
    }
  };

  const cancelMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !mediaFile) || isLoading) return;
    setIsLoading(true);
    let accessToken = localStorage.getItem("access_token");

    try {
      const formData = new FormData();
      if (newMessage.trim()) {
        formData.append("text", newMessage.trim());
      }
      formData.append("receiver", receiverId);

      if (mediaFile) {
        formData.append("media", mediaFile);
      }

      let response = await fetch("/api/chat/send-with-media/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to send message.");
      }

      setNewMessage("");
      setMediaFile(null);
      setMediaPreview(null);

      const fetchMessages = async () => {
        let accessToken = localStorage.getItem("access_token");

        try {
          let response = await fetch(`/api/chat/${receiverId}/`, {
            headers: { "Authorization": `Bearer ${accessToken}` },
          });

          if (!response.ok) {
            throw new Error("Failed to fetch messages.");
          }

          const data = await response.json();
          setMessages(data);
        } catch (err) {
          console.error(err);
        }
      };

      fetchMessages();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMessage = async (messageId) => {
    if (!messageId || deletingMessageId) return;

    setDeletingMessageId(messageId);
    const accessToken = localStorage.getItem("access_token");

    try {
      const response = await fetch(`/api/chat/delete/${messageId}/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete message");
      }

      setMessages(messages.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const confirmDelete = (messageId) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      deleteMessage(messageId);
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

  const groupedMessages = messages.reduce((acc, msg) => {
    const dateHeader = formatDateHeader(msg.timestamp);
    if (!acc[dateHeader]) acc[dateHeader] = [];
    acc[dateHeader].push(msg);
    return acc;
  }, {});

  const getAuthenticatedMediaUrl = (path) => {
    const baseUrl = window.location.origin;
    const fullPath = `${baseUrl}${path}?auth_token=${authToken}`;
    return fullPath;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-blue-600 text-white text-center py-3 text-xl font-semibold">
        {receiverName}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
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
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                    {msg.decrypted_text && msg.decrypted_text !== "[Error decrypting message]" &&
                     msg.decrypted_text.trim() !== "" && (
                      <p className="text-sm">{msg.decrypted_text}</p>
                    )}

                    {msg.decrypted_text === "[Error decrypting message]" && (
                      <p className="text-sm text-red-300">[Error decrypting message]</p>
                    )}

                    {msg.attachments &&
                      msg.attachments.map((attachment) => (
                        <div key={attachment.id} className="mt-2">
                          {attachment.file_type === "svg" ? (
                            <img
                              src={getAuthenticatedMediaUrl(attachment.file_url)}
                              alt="SVG attachment"
                              className="max-w-full rounded-md"
                              loading="lazy"
                              onError={(e) => {
                                console.error("SVG loading error");
                                e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iMTIiIHk9IjEyIiBmb250LXNpemU9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjYWFhYWFhIj5TVkc8L3RleHQ+PC9zdmc+";
                              }}
                            />
                          ) : attachment.file_type === "image" ? (
                            <img
                              src={getAuthenticatedMediaUrl(attachment.file_url)}
                              alt="Image attachment"
                              className="max-w-full rounded-md"
                              loading="lazy"
                              onError={(e) => {
                                console.error("Image loading error");
                                e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iMTIiIHk9IjEyIiBmb250LXNpemU9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjYWFhYWFhIj5JbWFnZSBFcnJvcjwvdGV4dD48L3N2Zz4=";
                              }}
                            />
                          ) : attachment.file_type === "gif" ? (
                            <img
                              src={getAuthenticatedMediaUrl(attachment.file_url)}
                              alt="GIF attachment"
                              className="max-w-full rounded-md"
                              loading="lazy"
                              onError={(e) => {
                                console.error("GIF loading error");
                                e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iMTIiIHk9IjEyIiBmb250LXNpemU9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjYWFhYWFhIj5HaWY8L3RleHQ+PC9zdmc+";
                              }}
                            />
                          ) : attachment.file_type === "video" ? (
                            <video
                              src={getAuthenticatedMediaUrl(attachment.file_url)}
                              controls
                              className="max-w-full rounded-md"
                              onError={(e) => {
                                console.error("Video loading error");
                                e.target.parentElement.innerHTML = '<div class="bg-gray-200 p-4 rounded text-gray-500 text-center">Video could not be loaded</div>';
                              }}
                            />
                          ) : null}
                        </div>
                      ))}

                    <p
                      className={`text-xs mt-1 text-right ${
                        msg.is_sender ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>

                  {msg.is_sender && (
                    <button
                      onClick={() => confirmDelete(msg.id)}
                      disabled={deletingMessageId === msg.id}
                      className={`ml-2 text-xs opacity-60 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 ${
                        msg.is_sender ? "text-blue-100" : "text-gray-400"
                      }`}
                      title="Delete message"
                    >
                      {deletingMessageId === msg.id ? (
                        <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"></path>
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {mediaPreview && (
        <div className="p-2 bg-gray-200 flex items-center">
          <div className="relative">
            {mediaFile.type.startsWith("image/") ? (
              <img
                src={mediaPreview}
                alt="Media preview"
                className="h-20 w-auto rounded"
              />
            ) : mediaFile.type.startsWith("video/") ? (
              <video src={mediaPreview} className="h-20 w-auto rounded" />
            ) : null}
            <button
              onClick={cancelMedia}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="p-4 bg-gray-200 flex items-center">
        <label className="p-2 text-gray-600 cursor-pointer hover:text-blue-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
          <input
            type="file"
            accept="image/*,video/*,.gif"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 border-0 rounded-full p-2 mx-2 focus:outline-none"
        />
        <button
          onClick={sendMessage}
          disabled={isLoading}
          className={`p-2 rounded-full ${
            isLoading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-700"
          } text-white`}
        >
          {isLoading ? (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

