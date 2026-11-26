
import React, { useEffect, useState } from "react";
import logo from "./Screenshot 2026-11-26 142429.png";
import { supabase } from "./supabase";

const ADMIN_EMAIL = "rieksraais@gmail.com";
const WHATSAPP_NUMBER = "260573503571";
const STORAGE_BUCKET = "product-images";

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [productFile, setProductFile] = useState(null);
  const [productPrice, setProductPrice] = useState("");
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState("");
  const [productSuccess, setProductSuccess] = useState("");

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error(error.message);
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

  async function loadProducts() {
    if (!supabase) {
      setProductError("The database connection is not configured.");
      setProductsLoading(false);
      return;
    }

    setProductsLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("id, price, image_path");

    if (error) {
      setProductError("Could not load products. Please refresh the page.");
      console.error("Product loading error:", error.message);
    } else {
      setProducts(data || []);
      setProductError("");
    }

    setProductsLoading(false);
  }

  useEffect(() => {
    loadProducts();
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
  }

  async function handleAddProduct(event) {
    event.preventDefault();

    setProductError("");
    setProductSuccess("");

    if (!supabase) {
      setProductError("The database connection is not configured.");
      return;
    }

    if (!productFile) {
      setProductError("Please choose a product picture.");
      return;
    }

    const price = Number(productPrice);

    if (!Number.isFinite(price) || price <= 0) {
      setProductError("Please enter a valid price greater than zero.");
      return;
    }

    if (!productFile.type.startsWith("image/")) {
      setProductError("Please choose an image file.");
      return;
    }

    if (productFile.size > 8 * 1024 * 1024) {
      setProductError("The image must be smaller than 8 MB.");
      return;
    }

    setProductSaving(true);

    const safeName = productFile.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "-"
    );

    const imagePath = `${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(imagePath, productFile, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      setProductError("Could not upload the picture. Please try again.");
      console.error("Image upload error:", uploadError.message);
      setProductSaving(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("products")
      .insert({
        price,
        image_path: imagePath
      });

    if (insertError) {
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([imagePath]);

      setProductError("Could not save the product. Please try again.");
      console.error("Product save error:", insertError.message);
      setProductSaving(false);
      return;
    }

    setProductFile(null);
    setProductPrice("");
    event.target.reset();

    setProductSuccess("Product added successfully!");
    setProductSaving(false);

    await loadProducts();
  }

  async function handleDeleteProduct(product) {
    const confirmed = window.confirm(
      "Are you sure you want to remove this product?"
    );

    if (!confirmed) return;

    setProductError("");
    setProductSuccess("");

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      setProductError("Could not delete the product.");
      console.error("Product deletion error:", error.message);
      return;
    }

    if (product.image_path) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([product.image_path]);

      if (storageError) {
        console.error("Image cleanup error:", storageError.message);
      }
    }

    setProductSuccess("Product removed.");
    await loadProducts();
  }

  function getImageUrl(imagePath) {
    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(imagePath);

    return data.publicUrl;
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

          {error && (
            <p className="admin-error" role="alert">{error}</p>
          )}

          <button onClick={() => setShowLogin(false)}>
            Close
          </button>
        </section>
      )}

      {isAdmin && (
        <section className="admin-dashboard">
          <div className="admin-heading">
            <h1>Welcome, Admin!</h1>
            <p>Manage your M+J 3D Printing products here.</p>
          </div>

          <section className="admin-section">
            <h2>Add a Product</h2>

            <p className="admin-section-description">
              Upload a picture and enter its price.
            </p>

            <form
              className="product-upload-form"
              onSubmit={handleAddProduct}
            >
              <label className="product-field-label">
                Product picture
                <input
                  className="admin-input"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setProductFile(event.target.files?.[0] || null)
                  }
                  required
                />
              </label>

              {productFile && (
                <p className="admin-section-description">
                  Selected: {productFile.name}
                </p>
              )}

              <label className="product-field-label">
                Price (ZMW)
                <input
                  className="admin-input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 150"
                  value={productPrice}
                  onChange={(event) =>
                    setProductPrice(event.target.value)
                  }
                  required
                />
              </label>

              <button
                className="admin-primary-button"
                type="submit"
                disabled={productSaving}
              >
                {productSaving ? "Uploading..." : "+ Add Product"}
              </button>
            </form>

            {productError && (
              <p className="admin-error" role="alert">
                {productError}
              </p>
            )}

            {productSuccess && (
              <p className="admin-success" role="status">
                {productSuccess}
              </p>
            )}
          </section>
        </section>
      )}

      <section className="catalogue">
        {productsLoading ? (
          <p className="admin-empty">Loading products...</p>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◇</div>
            <h2>Something exciting is being created!</h2>
            <p>
              Our catalogue is getting ready.
              Check back soon!
            </p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <img
                  className="product-image"
                  src={getImageUrl(product.image_path)}
                  alt="3D printed product"
                  loading="lazy"
                />

                <p className="product-price">
                  K{Number(product.price).toLocaleString("en-ZM")}
                </p>

                <a
                  className="product-order-button"
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Order on WhatsApp
                </a>

                {isAdmin && (
                  <div className="product-admin-actions">
                    <button
                      className="admin-delete-button"
                      onClick={() => handleDeleteProduct(product)}
                    >
                      Delete Product
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="contact-area">
        <p>Have an idea? We'd love to hear about it.</p>
        <span>Turning Ideas Into Reality.</span>
      </div>
    </main>
  );
}
