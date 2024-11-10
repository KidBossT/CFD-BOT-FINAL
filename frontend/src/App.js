import { FiUpload, FiSend, FiTrash2, FiPlus, FiCopy, FiThumbsUp, FiThumbsDown } from 'react-icons/fi';
import { RiRobot2Line, RiUser3Line } from 'react-icons/ri';
import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';

function App() {
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState([{ 
    id: 'default', 
    name: 'New Chat', 
    messages: [] 
  }]);
  const [activeChat, setActiveChat] = useState('default');
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [reactions, setReactions] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    const savedChats = localStorage.getItem('chats');
    const savedActiveChat = localStorage.getItem('activeChat');
    if (savedChats) {
      setChats(JSON.parse(savedChats));
    }
    if (savedActiveChat) {
      setActiveChat(savedActiveChat);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
    localStorage.setItem('activeChat', activeChat);
  }, [chats, activeChat]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmail');
    if (token && email) {
      setIsAuthenticated(true);
      setUserEmail(email);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => {
        if (chat.id === activeChat) {
          return {
            ...chat,
            messages: [...chat.messages, newMessage]
          };
        }
        return chat;
      });
      return updatedChats;
    });

    const currentMessage = message;
    setMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:5000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: currentMessage }),
      });
      const data = await response.json();
      
      setIsTyping(false);

      const botResponse = {
        role: 'assistant',
        content: data,
        timestamp: new Date().toISOString()
      };

      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => {
          if (chat.id === activeChat) {
            return {
              ...chat,
              messages: [...chat.messages, botResponse]
            };
          }
          return chat;
        });
        return updatedChats;
      });

    } catch (error) {
      console.error('Error:', error);
      setIsTyping(false);
    }
  };

  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      name: `Chat ${chats.length + 1}`,
      messages: []
    };
    setChats([...chats, newChat]);
    setActiveChat(newChat.id);
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear this chat?')) {
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.id === activeChat) {
            return {
              ...chat,
              messages: []
            };
          }
          return chat;
        });
      });
    }
  };

  const deleteChat = (chatId) => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
      if (activeChat === chatId) {
        setActiveChat(chats[0].id);
      }
    }
  };

  const getCurrentChat = () => {
    return chats.find(chat => chat.id === activeChat) || chats[0];
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('http://localhost:5000/analyze-image', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        setAnalysisResult(result);

        const newMessage = {
          role: 'user',
          content: `Uploaded image: ${file.name}`,
          timestamp: new Date().toISOString(),
          isImage: true,
          imageUrl: URL.createObjectURL(file)
        };

        const botResponse = {
          role: 'assistant',
          content: `Pressure Map Analysis:\n${result.analysis}`,
          timestamp: new Date().toISOString(),
          pressureData: result.pressureData
        };

        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.id === activeChat) {
              return {
                ...chat,
                messages: [...chat.messages, newMessage, botResponse]
              };
            }
            return chat;
          });
        });
      } catch (error) {
        console.error('Error analyzing image:', error);
      }
    }
  };

  const handleCopy = async (text) => {
    await navigator.clipboard.writeText(text);
    // Optional: Add a toast notification here
  };

  const handleReaction = (messageId, type) => {
    setReactions(prev => ({
      ...prev,
      [messageId]: type
    }));
  };

  const renderMessage = (msg) => {
    const formatText = (text) => {
      if (!text) return '';

      // Process the entire text as one piece
      const processText = (content) => {
        return content.split(/(\*\*.*?\*\*)/g).map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });
      };

      // Handle numbered points
      const parts = text.split(/(?=^\d+\.)/gm);
      
      return parts.map((part, index) => {
        if (/^\d+\./.test(part)) {
          const [number, ...content] = part.split(/^(\d+\.)\s*/);
          return (
            <div key={index} className="point-wrapper">
              <div className="point-number">{number}</div>
              <div className="point-content">
                {processText(content.join(''))}
              </div>
            </div>
          );
        }
        return <div key={index} className="regular-text">{processText(part)}</div>;
      });
    };

    return (
      <div className="message-wrapper">
        <div className="message-avatar">
          {msg.role === 'assistant' ? 
            <RiRobot2Line className="bot-icon" /> : 
            <RiUser3Line className="user-icon" />
          }
        </div>
        <div className="message-content">
          {msg.isImage && msg.imageUrl && (
            <div className="uploaded-image">
              <img src={msg.imageUrl} alt="Uploaded" />
            </div>
          )}
          {msg.pressureData && (
            <div className="pressure-map">
              <canvas 
                ref={canvas => {
                  if (canvas && msg.pressureData) {
                    renderPressureMap(canvas, msg.pressureData);
                  }
                }}
                width="400"
                height="300"
              />
            </div>
          )}
          <div className="formatted-content">
            {formatText(msg.content)}
          </div>
          <span className="message-timestamp">
            {new Date(msg.timestamp).toLocaleTimeString()}
          </span>
          
          {msg.role === 'assistant' && (
            <div className="message-actions">
              <button 
                className="action-btn"
                onClick={() => handleCopy(msg.content)}
                title="Copy message"
              >
                <FiCopy />
              </button>
              <div className="reaction-buttons">
                <button 
                  className={`action-btn ${reactions[msg.timestamp] === 'up' ? 'active' : ''}`}
                  onClick={() => handleReaction(msg.timestamp, 'up')}
                  title="Thumbs up"
                >
                  <FiThumbsUp />
                </button>
                <button 
                  className={`action-btn ${reactions[msg.timestamp] === 'down' ? 'active' : ''}`}
                  onClick={() => handleReaction(msg.timestamp, 'down')}
                  title="Thumbs down"
                >
                  <FiThumbsDown />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPressureMap = (canvas, pressureData) => {
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 400, 0);
    
    gradient.addColorStop(0, '#00ff00');    // Low pressure
    gradient.addColorStop(0.5, '#ffff00');  // Medium pressure
    gradient.addColorStop(1, '#ff0000');    // High pressure
    
    ctx.fillStyle = gradient;
    
    pressureData.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.pressure * 5, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const TypingIndicator = () => (
    <div className="message-wrapper">
      <div className="message-avatar">
        <RiRobot2Line className="bot-icon" />
      </div>
      <div className="message-content typing-indicator">
        <div className="dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setShowLoginModal(false);
    setUserEmail(localStorage.getItem('userEmail'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setIsAuthenticated(false);
    setUserEmail(null);
  };

  return (
    <>
      <div className="chatbot-container">
        <div className="auth-corner">
          {isAuthenticated ? (
            <div className="user-info">
              <span>{userEmail}</span>
              <button className="auth-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <button className="auth-btn" onClick={() => setShowLoginModal(true)}>
              Login
            </button>
          )}
        </div>

        <div className="sidebar">
          <button className="new-chat-btn" onClick={createNewChat}>
            <FiPlus /> New Chat
          </button>
          <div className="chat-list">
            {chats.map(chat => (
              <div
                key={chat.id}
                className={`chat-item ${activeChat === chat.id ? 'active' : ''}`}
              >
                <span onClick={() => setActiveChat(chat.id)}>{chat.name}</span>
                {chats.length > 1 && (
                  <button 
                    className="delete-chat-btn"
                    onClick={() => deleteChat(chat.id)}
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="main-content">
          <div className="chat-header">
            <h1>CFD Chatbot</h1>
            <div className="header-buttons">
              <label className="upload-btn">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <FiUpload /> Upload
              </label>
              <button onClick={clearHistory} className="clear-history-btn">
                <FiTrash2 /> Clear
              </button>
            </div>
          </div>

          <div className="chat-history">
            {getCurrentChat().messages.map((msg, index) => (
              <div 
                key={index} 
                className={`chat-message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                {renderMessage(msg)}
              </div>
            ))}
            {isTyping && <TypingIndicator />}
          </div>

          <form onSubmit={handleSubmit} className="chat-input-form">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="chat-input"
            />
            <button type="submit" className="send-button">
              <FiSend />
            </button>
          </form>
        </div>
      </div>

      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button 
              className="modal-close" 
              onClick={() => setShowLoginModal(false)}
            >
              ×
            </button>
            <Login onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      )}
    </>
  );
}

export default App;