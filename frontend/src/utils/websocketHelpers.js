/**
 * Set up a WebSocket connection for a chat with proper message handling
 * @param {string} roomName - The chat room name
 * @param {string} senderUsername - Current user's username
 * @param {function} onMessageReceived - Callback for handling messages
 * @param {function} onError - Callback for handling errors
 * @returns {WebSocket} The WebSocket instance
 */
export const setupChatWebSocket = (roomName, senderUsername, receiverId, senderId, onMessageReceived, onError) => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}/ws/chat/${roomName}/`;

  const chatSocket = new WebSocket(wsUrl);

  chatSocket.onopen = function() {
    console.log('WebSocket connection established');
  };

  chatSocket.onmessage = function(e) {
    const data = JSON.parse(e.data);

    if (data.error) {
      // Handle error messages (e.g., when blocked)
      onError && onError(data);
    } else {
      // Process normal messages
      onMessageReceived && onMessageReceived(data);
    }
  };

  chatSocket.onclose = function(e) {
    console.log('WebSocket connection closed');
  };

  chatSocket.onerror = function(err) {
    console.error('WebSocket error:', err);
    onError && onError({ error: 'Failed to connect to chat server' });
  };

  // Add helper method to send messages with proper block checks
  chatSocket.sendMessage = function(messageText) {
    if (chatSocket.readyState === WebSocket.OPEN) {
      chatSocket.send(JSON.stringify({
        'message': messageText,
        'sender_username': senderUsername,
        'receiver_id': receiverId,
        'sender_id': senderId
      }));
    } else {
      onError && onError({ error: 'Chat connection not available' });
    }
  };

  return chatSocket;
};
