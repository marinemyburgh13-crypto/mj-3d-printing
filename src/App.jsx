
import React, { useEffect, useState } from "react";
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

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [categorySuccess, setCategorySuccess] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("all");

  // Restore the admin session and listen for login/logout changes.
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Session error:", error.message);
        return;
      }

      setIsAdmin(
        data.session?.user?.email?.toLowerCase() ===
          ADMIN_EMAIL.toLowerCase()
      );
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(
        session?.user?.email?.toLowerCase() ===
          ADMIN_EMAIL.toLowerCase()
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load categories from Supabase.
  async function loadCategories() {
    if (!supabase) {
      setCategoryError("The database connection is not configured.");
      setCategoriesLoading(false);
      return;
    }

    setCategoriesLoading(true);

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      setCategoryError("Could not load categories. Please refresh the page.");
      console.error("Category loading error:", error.message);
    } else {
      setCategories(data || []);
      setCategoryError("");
    }

    setCategoriesLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

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
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();

    if (error) {
      setError("Could not log out. Please try again.");
      return;
    }

    setIsAdmin(false);
    setShowLogin(false);
    setSelectedCategory("all");
  }

  // Add a new category.
  async function handleAddCategory(event) {
    event.preventDefault();

    const cleanName = categoryName.trim();

    setCategoryError("");
    setCategorySuccess("");

    if (!cleanName) return;

    if (
      categories.some(
        (category) =>
          category.name.toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      setCategoryError("That category already exists.");
      return;
    }

    const { error } = await supabase
      .from("categories")
      .insert({ name: cleanName });

    if (error) {
      setCategoryError("Could not add category. Please try again.");
      console.error("Add category error:", error.message);
      return;
    }

    setCategoryName("");
    setCategorySuccess("Category added successfully!");
    await loadCategories();
  }

  // Save a renamed category.
  async function handleRenameCategory(event, id) {
    event.preventDefault();

    const cleanName = editingCategoryName.trim();

    setCategoryError("");
    setCategorySuccess("");

    if (!cleanName) {
      setCategoryError("Please enter a category name.");
      return;
    }

    if (
      categories.some(
        (category) =>
          category.id !== id &&
          category.name.toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      setCategoryError("That category already exists.");
      return;
    }

    const { error } = await supabase
      .from("categories")
      .update({ name: cleanName })
      .eq("id", id);

    if (error) {
      setCategoryError("Could not rename category. Please try again.");
      console.error("Rename category error:", error.message);
      return;
    }

    setEditingCategoryId(null);
    setEditingCategoryName("");
    setCategorySuccess("Category renamed successfully!");
    await loadCategories();
  }

  // Delete a category.
  async function handleDeleteCategory(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this category?"
    );

    if (!confirmed) return;

    setCategoryError("");
    setCategorySuccess("");

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      setCategoryError("Could not delete category. Please try again.");
      console.error("Delete category error:", error.message);
      return;
    }

    if (selectedCategory === id) {
      setSelectedCategory("all");
    }

    setCategorySuccess("Category deleted successfully!");
    await loadCategories();
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
            aria-label="Toggle colour theme"
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

      {showLogin && !isAdmin && (
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

          {error && <p className="admin-error" role="alert">{error}</p>}

          <button onClick={() => setShowLogin(false)}>
            Close
          </button>
        </section>
      )}

      {isAdmin && (
        <section className="admin-dashboard">
          <div className="admin-heading">
            <h1>Welcome, Admin!</h1>
            <p>
              Manage your M+J 3D Printing catalogue from here.
            </p>
          </div>

          <section className="admin-section">
            <h2>Manage Categories</h2>
            <p className="admin-section-description">
              Create and organise the categories customers will see
              in your catalogue.
            </p>

            <form className="admin-form" onSubmit={handleAddCategory}>
              <input
                className="admin-input"
                type="text"
                placeholder="Enter a new category name"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                maxLength={40}
                required
              />

              <button className="admin-primary-button" type="submit">
                + Add Category
              </button>
            </form>

            {categoryError && (
              <p className="admin-error" role="alert">
                {categoryError}
              </p>
            )}

            {categorySuccess && (
              <p className="admin-success" role="status">
                {categorySuccess}
              </p>
            )}

            <h3>Your Categories</h3>

            {categoriesLoading ? (
              <p className="admin-empty">Loading categories...</p>
            ) : categories.length === 0 ? (
              <div className="admin-empty">
                <p>No categories yet.</p>
                <p>Add your first category above!</p>
              </div>
            ) : (
              <div className="admin-category-list">
                {categories.map((category) => (
                  <div className="admin-category-item" key={category.id}>
                    {editingCategoryId === category.id ? (
                      <form
                        className="admin-form"
                        style={{ flex: 1, marginBottom: 0 }}
                        onSubmit={(event) =>
                          handleRenameCategory(event, category.id)
                        }
                      >
                        <input
                          className="admin-input"
                          value={editingCategoryName}
                          onChange={(event) =>
                            setEditingCategoryName(event.target.value)
                          }
                          maxLength={40}
                          autoFocus
                          required
                        />

                        <button
                          className="admin-primary-button"
                          type="submit"
                        >
                          Save
                        </button>

                        <button
                          className="admin-secondary-button"
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(null);
                            setEditingCategoryName("");
                          }}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="admin-category-name">
                          {category.name}
                        </span>

                        <div className="admin-category-actions">
                          <button
                            className="admin-edit-button"
                            onClick={() => {
                              setEditingCategoryId(category.id);
                              setEditingCategoryName(category.name);
                              setCategoryError("");
                              setCategorySuccess("");
                            }}
                          >
                            Edit
                          </button>

                          <button
                            className="admin-delete-button"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      )}

      <nav className="categories" aria-label="Product categories">
        <button
          className={
            selectedCategory === "all"
              ? "category active"
              : "category"
          }
          onClick={() => setSelectedCategory("all")}
        >
          All
        </button>

        {categories.map((category) => (
          <button
            className={
              selectedCategory === category.id
                ? "category active"
                : "category"
            }
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
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
