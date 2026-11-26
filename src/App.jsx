
import React, { useState } from "react";
import logo from "./Screenshot 2026-11-26 142429.png";
import { supabase } from "./supabase";

const ADMIN_EMAIL = "rieksraais@gmail.com";

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setError("");

    if (!supabase) {
      setError("The login service is not configured.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password
    });

    setLoading(false);

    if (error) {
      setError("Incorrect password. Please try again.");
      return;
    }

    setIsAdmin(true);
    setShowLogin(false);
    setPassword("");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsAdmin(false);
  }

  return (
    <main className={darkMode ? "app dark" : "app light"}>
      <header className="header">
        <div className="brand">
          <img
            src={logo}
            alt="M+J 3D Printing"
            style={{
              width: "90px",
              height: "66px",
              objectFit: "contain"
            }}
          />
          <span>M+J 3D Printing</span>
        </div>

        <div className="header-actions">
          <button
            className="theme-button"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          {isAdmin ? (
            <button className="login-button" onClick={handleLogout}>
              Log Out
            </button>
          ) : (
            <button
              className="login-button"
              onClick={() => {
                setShowLogin(!showLogin);
                setError("");
              }}
            >
              Admin Login
            </button>
          )}
        </div>
      </header>

      <section className="intro">
        <p>TURNING IDEAS INTO REALITY.</p>
      </section>

      {showLogin && (
        <section className="login-panel">
          <h2>Admin Login</h2>

          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Log In"}
            </button>
          </form>

          {error && <p role="alert">{error}</p>}

          <button onClick={() => setShowLogin(false)}>
            Close
          </button>
        </section>
      )}

      {isAdmin && (
        <section className="login-panel">
          <h2>Welcome, Admin!</h2>
          <p>You're successfully signed in.</p>
          <p>Your admin dashboard is coming next.</p>
        </section>
      )}

      <nav className="categories">
        <button className="category active">All</button>
      </nav>

      <section className="catalogue">
        <div className="empty-state">
          <div className="empty-icon">◇</div>
          <h2>Something exciting is being created!</h2>
          <p>
            Our catalogue is getting ready.
            Check back soon!
          </p>
        </div>
      </section>

      <div className="contact-area">
        <p>Have an idea? We'd love to hear about it.</p>
        <span>WhatsApp ordering coming soon</span>
      </div>
    </main>
  );
}
