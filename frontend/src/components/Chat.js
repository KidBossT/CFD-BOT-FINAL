import React, { useState } from 'react';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message immediately
    const userMessage = { text: input, isUser: true, timestamp: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      console.log('Sending request to:', process.env.REACT_APP_API_URL); // Debug log
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input }),
      });

      console.log('Response status:', response.status); // Debug log

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data); // Debug log

      // Add bot response
      const botMessage = { 
        text: data, 
        isUser: false, 
        timestamp: new Date().toLocaleTimeString() 
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      // Add error message to chat
      const errorMessage = { 
        text: 'Sorry, there was an error processing your request.', 
        isUser: false, 
        timestamp: new Date().toLocaleTimeString() 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.isUser ? 'user' : 'bot'}`}>
            <p>{message.text}</p>
            <span className="timestamp">{message.timestamp}</span>
          </div>
        ))}
        {isLoading && <div className="message bot">Typing...</div>}
      </div>
      <form onSubmit={sendMessage} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default Chat; 