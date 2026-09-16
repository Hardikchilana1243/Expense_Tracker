import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";

import "./index.css";
import App from "./App.jsx";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

console.log(
  "🔍 Google Client ID loaded:",
  clientId ? "✅ Found" : "❌ Missing"
);

console.log("🔍 Environment:", import.meta.env.MODE);

try {
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("Root element not found in HTML");
  }

  createRoot(root).render(
    <StrictMode>
      <GoogleOAuthProvider clientId={clientId || ""}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </StrictMode>
  );
} catch (error) {
  console.error("❌ React render error:", error);

  document.body.innerHTML = `
    <div style="
      padding: 20px;
      font-family: Arial;
      background: #fee;
      border: 1px solid #f00;
      margin: 20px;
      border-radius: 8px;
    ">
      <h2 style="color: #c00; margin: 0 0 10px 0;">
        ⚠️ Application Error
      </h2>

      <p style="margin: 10px 0; color: #333;">
        ${error.message}
      </p>

      <p style="margin: 10px 0; color: #666; font-size: 12px;">
        Check browser console for more details
      </p>

      <button
        onclick="location.reload()"
        style="
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        "
      >
        Reload Page
      </button>
    </div>
  `;
}