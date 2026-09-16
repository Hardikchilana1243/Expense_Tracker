import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { FcGoogle } from "react-icons/fc";
import { LuLoader } from "react-icons/lu";
import { useAuth } from "../../context/AuthContext";

const GoogleAuthButton = ({ setError, setLoading, loading }) => {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const [clientIdMissing, setClientIdMissing] = useState(false);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    console.log("🔥 CLIENT ID:", clientId);
    console.log("🔥 ORIGIN:", window.location.origin);

    if (!clientId) {
      setClientIdMissing(true);
    }
  }, []);

  const handleGoogleAuth = async (credentialResponse) => {
    const idToken = credentialResponse?.credential;

    if (!idToken) {
      setError?.("Google login failed");
      return;
    }

    setError?.("");
    setLoading?.(true);

    try {
      await googleLogin({ idToken });
      navigate("/dashboard");

    } catch (err) {
      console.error("Google Auth Error:", err);
      setError?.(err.message);
    } finally {
      setLoading?.(false);
    }
  };

  // ❗ Client ID missing UI
  if (clientIdMissing) {
    return (
      <p className="text-red-500 text-center text-sm">
        ❌ Google Client ID missing (.env check karo)
      </p>
    );
  }

  return (
    <div className="w-full">
      {loading ? (
        <button
          type="button"
          className="w-full py-3 border rounded-xl flex justify-center items-center gap-2"
          disabled
        >
          <LuLoader className="animate-spin" />
          Loading...
        </button>
      ) : (
        <GoogleLogin
          onSuccess={handleGoogleAuth}
          onError={() => setError?.("Google login failed")}
        />
      )}

      <div className="mt-2 flex justify-center items-center gap-1 text-xs text-gray-500">
        <FcGoogle size={14} />
        Secure Google Login
      </div>
    </div>
  );
};

export default GoogleAuthButton;