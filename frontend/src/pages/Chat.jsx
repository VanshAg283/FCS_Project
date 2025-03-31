import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

export default function Chat() {
  const { receiverId } = useParams();
  const [messages, setMessages] = useState([]);
  const [receiverName, setReceiverName] = useState("Loading...");
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchReceiverName = async () => {
      let accessToken = localStorage.getItem("access_token");

      try {
        let response = await fetch(`/api/auth/users/`, {
          headers: { "Authorization": `Bearer ${accessToken}` },
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

  const sendMessage = async () => {
    if (!newMessage.trim()) return; // Prevent sending empty messages
    let accessToken = localStorage.getItem("access_token");

    try {
      let response = await fetch("/api/chat/send/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiver: receiverId,
          text: newMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message.");
      }

      const sentMessage = await response.json();
      setMessages((prevMessages) => [...prevMessages, sentMessage]); // ✅ Add new message to state instantly
      setNewMessage("");
    } catch (err) {
      console.error("Send Message Error:", err.message);
    }
  };

  // 🔹 Format Date for WhatsApp-Like Headers (e.g., Today, Yesterday)
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

  // 🔹 Format Time Below Each Message
  const formatTime = (timestamp) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(new Date(timestamp));
  };

  // 🔹 Group Messages by Date
  const groupedMessages = messages.reduce((acc, msg) => {
    const dateHeader = formatDateHeader(msg.timestamp);
    if (!acc[dateHeader]) acc[dateHeader] = [];
    acc[dateHeader].push(msg);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* ✅ Chat Header - Shows Receiver’s Username */}
      <div className="bg-blue-600 text-white text-center py-3 text-xl font-semibold">
        {receiverName}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            {/* 📅 Date Header (WhatsApp-Style) */}
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
                <p className="text-sm">{msg.decrypted_text}</p>
                <p className={`text-xs mt-1 text-right ${msg.is_sender ? "text-blue-100" : "text-gray-500"}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Sticks to Bottom */}
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
    </div>
  );
}
