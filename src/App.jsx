
import React, { useState } from "react";
import logo from "./Screenshot 2026-11-26 142429.png";

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

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

          <button
            className="login-button"
            onClick={() => setShowLogin(!showLogin)}
          >
            Admin Login
          </button>
        </div>
      </header>

      <section className="intro">
        <p>TURNING IDEAS INTO REALITY.</p>
      </section>

      {showLogin && (
        <section className="login-panel">
          <h2>Admin Login</h2>
          <p>Admin sign-in will be connected in the next stage.</p>
          <button onClick={() => setShowLogin(false)}>
            Close
          </button>
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
