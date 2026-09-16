import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { API_ENDPOINTS } from "../utils/apiPaths";

const banks = [
  { label: "HDFC Bank", sample: "HDFC1234567890" },
  { label: "State Bank of India", sample: "SBI9876543210" },
  { label: "ICICI Bank", sample: "ICICI1122334455" },
  { label: "Axis Bank", sample: "AXIS5566778899" },
  { label: "Kotak Mahindra Bank", sample: "KOTAK6677889900" },
];

const BankLink = ({ userId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    accountNumber: "",
    bankName: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId) {
      toast.error("User not found");
      return;
    }

    if (!formData.accountNumber || !formData.bankName) {
      toast.error("All fields are required");
      return;
    }

    if (formData.accountNumber.length < 8) {
      toast.error("Invalid account number");
      return;
    }

    setLoading(true);

    try {
      const url = API_ENDPOINTS?.MOCK?.LINK(userId);

      if (!url) {
        throw new Error("API endpoint not found");
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data?.message || "Server error";
        throw new Error(message);
      }

      if (data.success) {
        toast.success("✅ Bank account linked successfully!");
        onSuccess?.(data.bankAccount);

        setFormData({
          accountNumber: "",
          bankName: "",
        });
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch (err) {
      console.error("❌ BankLink Error:", err);
      toast.error(err.message || "Failed to link account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-3xl border border-blue-100 shadow-xl">
      
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        🏦 Link Bank Account
      </h3>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
        
        {/* Account Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Number
          </label>

          <input
            type="text"
            name="accountNumber"
            placeholder="e.g. HDFC1234567890"
            value={formData.accountNumber}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            required
          />

          <p className="text-xs text-blue-600 mt-1">
            Use one of the seeded mock accounts: HDFC1234567890, SBI9876543210, ICICI1122334455, AXIS5566778899, KOTAK6677889900.
          </p>
        </div>

        {/* Bank Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bank Name
          </label>

          <select
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          >
            <option value="">Select Bank</option>
            {banks.map((bank) => (
              <option key={bank.label} value={bank.label}>
                {bank.label}
              </option>
            ))}
          </select>

          <p className="text-xs text-blue-600 mt-1">
            Use one of the seeded mock accounts: HDFC1234567890, SBI9876543210, ICICI1122334455, AXIS5566778899, KOTAK6677889900.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-0.5 transition-all disabled:opacity-50"
        >
          {loading ? "🔄 Linking..." : "🔗 Link Account"}
        </button>

      </form>
    </div>
  );
};

export default BankLink;