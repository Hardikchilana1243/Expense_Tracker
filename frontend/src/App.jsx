import React, { Suspense, lazy } from "react";
import UserProvider from "./context/UserContext";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Lazy-loaded page components for route-based code splitting
const Login = lazy(() => import("./pages/Auth/Login"));
const SignUp = lazy(() => import("./pages/Auth/SignUp"));
const Home = lazy(() => import("./pages/Dashboard/Home"));
const Income = lazy(() => import("./pages/Dashboard/Income"));
const Expense = lazy(() => import("./pages/Dashboard/Expense"));
const Budgets = lazy(() => import("./pages/Dashboard/Budgets"));
const Transactions = lazy(() => import("./pages/Dashboard/Transactions"));
const Profile = lazy(() => import("./pages/Dashboard/Profile"));

// Fallback loading component during lazy route resolution
const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans">
    <div className="text-center">
      <div className="text-4xl animate-spin mb-3">💫</div>
      <p className="text-slate-400 text-sm font-medium">Loading view...</p>
    </div>
  </div>
);

/* =========================================================
   ERROR BOUNDARY
========================================================= */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("❌ App Error:", error);
    console.error("❌ Error Info:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
            fontFamily: "Arial, sans-serif",
            background: "#020617",
            color: "#fff",
          }}
        >
          <div
            style={{
              maxWidth: "600px",
              width: "100%",
              textAlign: "center",
              padding: "40px",
              borderRadius: "16px",
              background: "#0f172a",
              border: "1px solid #334155",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>
              ⚠️
            </div>

            <h1
              style={{
                color: "#ef4444",
                marginBottom: "12px",
              }}
            >
              Something went wrong
            </h1>

            <p
              style={{
                color: "#94a3b8",
                marginBottom: "24px",
                lineHeight: "1.6",
              }}
            >
              {this.state.error?.message ||
                "An unexpected application error occurred."}
            </p>

            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "12px 24px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/* =========================================================
   PROTECTED ROUTE
========================================================= */

const ProtectedRoute = ({ element }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          color: "#fff",
          fontSize: "18px",
          fontWeight: "600",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "40px",
              marginBottom: "12px",
            }}
          >
            💫
          </div>

          <p>Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return element;
};

/* =========================================================
   APP ROUTES
========================================================= */

const App = () => {
  return (
    <UserProvider>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public routes */}

          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/signup"
            element={<SignUp />}
          />

          {/* Protected routes */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute element={<Home />} />
            }
          />

          <Route
            path="/income"
            element={
              <ProtectedRoute element={<Income />} />
            }
          />

          <Route
            path="/expense"
            element={
              <ProtectedRoute element={<Expense />} />
            }
          />

          <Route
            path="/budgets"
            element={
              <ProtectedRoute element={<Budgets />} />
            }
          />

          <Route
            path="/transactions"
            element={
              <ProtectedRoute element={<Transactions />} />
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute element={<Profile />} />
            }
          />

          {/* Unknown route */}

          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </Suspense>
    </UserProvider>
  );
};

/* =========================================================
   ERROR BOUNDARY WRAPPER
========================================================= */

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}