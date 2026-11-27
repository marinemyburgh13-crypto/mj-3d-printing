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
  const [productName, setProductName] = useState("");
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState("");
  const [productSuccess, setProductSuccess] = useState("");

  // Edit price state
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingPrice, setEditingPrice] = useState("");
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [priceSuccess, setPriceSuccess] = useState("");

  // Edit product name state
  const [editingNameProductId, setEditingNameProductId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameErrorProductId, setNameErrorProductId] = useState(null);
  const [nameSuccessId, setNameSuccessId] = useState(null);

  // Replace product photo state
  const [replacingProductId, setReplacingProductId] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [photoErrorProductId, setPhotoErrorProductId] = useState(null);
  const [photoSuccessId, setPhotoSuccessId] = useState(null);

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
      .select("id, name, price, image_path");

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
    setEditingProductId(null);
    setEditingNameProductId(null);
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
        name: productName.trim() || null,
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
    setProductName("");
    event.target.reset();

    setProductSuccess("Product added successfully!");
    setProductSaving(false);

    await loadProducts();
  }

  function startEditingPrice(product) {
    setEditingProductId(product.id);
    setEditingPrice(String(product.price));
    setPriceError("");
    setPriceSuccess("");
  }

  function cancelEditingPrice() {
    setEditingProductId(null);
    setEditingPrice("");
    setPriceError("");
  }

  async function handleUpdatePrice(event, product) {
    event.preventDefault();

    if (!supabase || !isAdmin) {
      setPriceError("You must be logged in as admin to edit prices.");
      return;
    }

    const price = Number(editingPrice);

    if (!Number.isFinite(price) || price <= 0) {
      setPriceError("Please enter a valid price greater than zero.");
      return;
    }

    setPriceSaving(true);
    setPriceError("");
    setPriceSuccess("");

    const { data, error } = await supabase
      .from("products")
      .update({ price })
      .eq("id", product.id)
      .select("id")
      .single();

    if (error || !data) {
      setPriceError("Could not update the price. Please try again.");
      console.error("Price update error:", error?.message || "No product updated.");
      setPriceSaving(false);
      return;
    }

    setProducts((currentProducts) =>
      currentProducts.map((item) =>
        item.id === product.id
          ? { ...item, price }
          : item
      )
    );

    setEditingProductId(null);
    setEditingPrice("");
    setPriceSuccess("Price updated successfully!");
    setPriceSaving(false);
  }

  // Start editing a product name
  function startEditingName(product) {
    setEditingNameProductId(product.id);
    setEditingName(product.name || "");
    setNameError("");
    setNameErrorProductId(null);
    setNameSuccessId(null);
  }

  // Cancel editing a product name
  function cancelEditingName() {
    setEditingNameProductId(null);
    setEditingName("");
    setNameError("");
    setNameErrorProductId(null);
  }

  // Save or remove a product name
  async function handleUpdateName(event, product) {
    event.preventDefault();

    if (!supabase || !isAdmin) {
      setNameError("You must be logged in as admin to edit names.");
      setNameErrorProductId(product.id);
      return;
    }

    setNameSaving(true);
    setNameError("");
    setNameErrorProductId(null);

    const newName = editingName.trim() || null;

    const { data, error } = await supabase
      .from("products")
      .update({ name: newName })
      .eq("id", product.id)
      .select("id")
      .single();

    if (error || !data) {
      setNameError("Could not update the name. Please try again.");
      setNameErrorProductId(product.id);
      console.error(
        "Name update error:",
        error?.message || "No product updated."
      );
      setNameSaving(false);
      return;
    }

    setProducts((currentProducts) =>
      currentProducts.map((item) =>
        item.id === product.id
          ? { ...item, name: newName }
          : item
      )
    );

    setEditingNameProductId(null);
    setEditingName("");
    setNameSuccessId(product.id);
    setNameSaving(false);

    // Hide the name success message after 3 seconds.
    window.setTimeout(() => {
      setNameSuccessId((currentId) =>
        currentId === product.id ? null : currentId
      );
    }, 3000);
  }

  async function handleReplacePhoto(event, product) {
    const input = event.target;
    const file = input.files?.[0];

    // Clear the input so the same photo can be selected again if needed.
    input.value = "";

    if (!file) return;

    setPhotoError("");
    setPhotoErrorProductId(null);
    setPhotoSuccessId(null);

    if (!supabase || !isAdmin) {
      setPhotoError("You must be logged in as admin to replace photos.");
      setPhotoErrorProductId(product.id);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file.");
      setPhotoErrorProductId(product.id);
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setPhotoError("The image must be smaller than 8 MB.");
      setPhotoErrorProductId(product.id);
      return;
    }

    setReplacingProductId(product.id);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const newImagePath = `${Date.now()}-${safeName}`;

    // Upload the new image first, so the existing photo stays safe if upload fails.
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(newImagePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      setPhotoError("Could not upload the new photo. Please try again.");
      setPhotoErrorProductId(product.id);
      console.error("Replacement image upload error:", uploadError.message);
      setReplacingProductId(null);
      return;
    }

    // Only change the product record after the new image has uploaded.
    const { data, error: updateError } = await supabase
      .from("products")
      .update({ image_path: newImagePath })
      .eq("id", product.id)
      .select("id")
      .single();

    if (updateError || !data) {
      // Keep the old product photo and remove the unused new upload.
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([newImagePath]);

      setPhotoError("Could not update the product photo. Please try again.");
      setPhotoErrorProductId(product.id);
      console.error(
        "Product photo update error:",
        updateError?.message || "No product updated."
      );
      setReplacingProductId(null);
      return;
    }

    // Update the visible catalogue without changing the product price or name.
    setProducts((currentProducts) =>
      currentProducts.map((item) =>
        item.id === product.id
          ? { ...item, image_path: newImagePath }
          : item
      )
    );

    // The new image is now saved, so the old image can be cleaned up.
    if (product.image_path) {
      const { error: cleanupError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([product.image_path]);

      if (cleanupError) {
        console.error("Old image cleanup error:", cleanupError.message);
      }
    }

    setPhotoError("");
    setPhotoErrorProductId(null);
    setPhotoSuccessId(product.id);
    setReplacingProductId(null);

    // Hide the success message after 3 seconds.
    window.setTimeout(() => {
      setPhotoSuccessId((currentId) =>
        currentId === product.id ? null : currentId
      );
    }, 3000);
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
              Upload a picture, enter its price, and optionally give it a name.
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
                Product name (optional)
                <input
                  className="admin-input"
                  type="text"
                  placeholder="e.g. Custom Keychain"
                  value={productName}
                  onChange={(event) =>
                    setProductName(event.target.value)
                  }
                />
              </label>

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
                  alt={product.name || "3D printed product"}
                  loading="lazy"
                />

                {product.name && (
                  <h3 className="product-name">
                    {product.name}
                  </h3>
                )}

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

                    {/* EDIT PRODUCT NAME */}
                    {editingNameProductId === product.id ? (
                      <form
                        className="product-edit-form"
                        onSubmit={(event) =>
                          handleUpdateName(event, product)
                        }
                      >
                        <label>
                          Edit Product Name
                          <input
                            className="admin-input"
                            type="text"
                            placeholder="Leave blank to remove the name"
                            value={editingName}
                            onChange={(event) =>
                              setEditingName(event.target.value)
                            }
                          />
                        </label>

                        {nameError &&
                          nameErrorProductId === product.id && (
                            <p className="admin-error" role="alert">
                              {nameError}
                            </p>
                          )}

                        <div className="product-edit-actions">
                          <button
                            className="admin-primary-button"
                            type="submit"
                            disabled={nameSaving}
                          >
                            {nameSaving ? "Saving..." : "Save Name"}
                          </button>

                          <button
                            className="admin-secondary-button"
                            type="button"
                            onClick={cancelEditingName}
                            disabled={nameSaving}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        className="admin-secondary-button"
                        onClick={() => startEditingName(product)}
                      >
                        Edit Name
                      </button>
                    )}

                    {nameSuccessId === product.id && (
                      <p className="admin-success" role="status">
                        Name updated successfully!
                      </p>
                    )}

                    {/* EDIT PRICE */}
                    {editingProductId === product.id ? (
                      <form
                        className="product-edit-form"
                        onSubmit={(event) =>
                          handleUpdatePrice(event, product)
                        }
                      >
                        <label>
                          Edit Price (ZMW)
                          <input
                            className="admin-input"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={editingPrice}
                            onChange={(event) =>
                              setEditingPrice(event.target.value)
                            }
                            required
                          />
                        </label>

                        {priceError && (
                          <p className="admin-error" role="alert">
                            {priceError}
                          </p>
                        )}

                        <div className="product-edit-actions">
                          <button
                            className="admin-primary-button"
                            type="submit"
                            disabled={priceSaving}
                          >
                            {priceSaving ? "Saving..." : "Save Price"}
                          </button>

                          <button
                            className="admin-secondary-button"
                            type="button"
                            onClick={cancelEditingPrice}
                            disabled={priceSaving}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        className="admin-secondary-button"
                        onClick={() => startEditingPrice(product)}
                      >
                        Edit Price
                      </button>
                    )}

                    {/* REPLACE PHOTO */}
                    <label className="admin-secondary-button replace-photo-button">
                      {replacingProductId === product.id
                        ? "Uploading Photo..."
                        : "Replace Photo"}
                      <input
                        className="replace-photo-input"
                        type="file"
                        accept="image/*"
                        disabled={replacingProductId !== null}
                        onChange={(event) =>
                          handleReplacePhoto(event, product)
                        }
                      />
                    </label>

                    {photoError && photoErrorProductId === product.id && (
                      <p className="admin-error" role="alert">
                        {photoError}
                      </p>
                    )}

                    {photoSuccessId === product.id && (
                      <p className="admin-success" role="status">
                        Photo replaced successfully!
                      </p>
                    )}

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
