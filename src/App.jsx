import React, { useState, useEffect } from 'react';
import AuthorityList from './components/AuthorityList';
import QueryForm from './components/QueryForm';
import ResponseDisplay from './components/ResponseDisplay';
import KnowledgeManager from './components/KnowledgeManager';
import { simulateGeminiResponse, authorities as initialMockAuthorities } from './services/mockApi';
import knowledgeManifest from './services/knowledge_manifest.json';
import { auth, signInWithGoogle, logout } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import './index.css';

const API_BASE = "http://localhost:8080/api";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  // ... rest of state
  const [error, setError] = useState(null);
  const [authorities, setAuthorities] = useState([]);
  const [showManager, setShowManager] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchInventory = async () => {
      if (!user) {
        // Fallback when not logged in
        if (knowledgeManifest && knowledgeManifest.length > 0) {
          setAuthorities(knowledgeManifest);
        } else {
          setAuthorities(initialMockAuthorities);
        }
        return;
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/inventory`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setAuthorities(data);
            return;
          }
        }
        console.warn("Inventory fetch returned empty or failed, falling back to static.");
        setAuthorities(knowledgeManifest || initialMockAuthorities);

      } catch (err) {
        console.error("Failed to fetch inventory:", err);
        setAuthorities(knowledgeManifest || initialMockAuthorities);
      }
    };

    fetchInventory();
  }, [user]);

  const handleSearch = async (query) => {
    setLoading(true);
    setResponse(null);
    setError(null);
    try {
      if (!user) {
        setError("You must be logged in to search.");
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();

      const res = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
      });

      if (!res.ok) throw new Error("API call failed");

      const result = await res.json();
      setResponse(result);
    } catch (err) {
      console.error(err);
      setError("Failed to reach the compliance agent. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAuthority = async (authName, fileName) => {
    try {
      if (!user) return;
      const token = await user.getIdToken();
      await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ authority: authName, filename: fileName })
      });
      // Refresh inventory
      // In a real app we might re-fetch or optimistically update
    } catch (e) {
      console.error("Upload failed", e);
    }
  };

  const handleAddAuthority = async (name, fileName) => {
    try {
      if (!user) return;
      const token = await user.getIdToken();
      await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ authority: name, filename: fileName })
      });

      // Optimistic update for UI
      setAuthorities(prev => {
        const exists = prev.some(a => (typeof a === 'string' ? a : a.authority) === name);
        if (exists) return prev;
        return [...prev, { authority: name, lastUpdated: new Date().toISOString() }];
      });
    } catch (e) {
      console.error("Add authority failed", e);
    }
  };

  if (authLoading) return <div className="loading-screen"><div className="loader"></div></div>;

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card glass-panel">
          <div className="logo-icon">🇸🇬</div>
          <h1>SG Code Authority</h1>
          <p>Please sign in to access the agent.</p>
          <button onClick={signInWithGoogle} className="google-btn">
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }



  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-top">
          <div className="user-controls-wrapper">
            <img
              src={user.photoURL}
              alt="user"
              className="user-avatar clickable"
              title={user.displayName}
              onClick={() => setShowUserMenu(!showUserMenu)}
            />

            {showUserMenu && (
              <div className="user-dropdown-menu">
                <button className="icon-btn-circle logout" onClick={logout} title="Sign Out">
                  🚪
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="logo-area">
          <div className="logo-icon">🇸🇬</div>
          <h1>SG Code Authority Agent</h1>
        </div>
        <p className="subtitle">AI-assisted compliance checker for Singapore Architects</p>
      </header>

      <main className="main-content">
        <div className="left-panel">
          <AuthorityList
            authorities={authorities}
            onManageClick={() => setShowManager(true)}
          />
        </div>
        <div className="center-panel">
          <QueryForm onSearch={handleSearch} isLoading={loading} />

          {loading && (
            <div className="loading-state">
              <div className="loader"></div>
              <p>Consulting the knowledge base...</p>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <ResponseDisplay data={response} />
        </div>
      </main>

      <footer className="app-footer">
        <p>© 2024 Authority Code Search. Powered by Gemini.</p>
      </footer>

      {showManager && (
        <KnowledgeManager
          authorities={authorities}
          onUpdateAuthority={handleUpdateAuthority}
          onAddAuthority={handleAddAuthority}
          onClose={() => setShowManager(false)}
        />
      )}
    </div>
  );
}

export default App;
