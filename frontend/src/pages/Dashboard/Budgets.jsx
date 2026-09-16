import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { API_ENDPOINTS } from "../../utils/apiPaths";
import BudgetCard from "../../components/Cards/BudgetCard";
import SkeletonLoader from "../../components/Cards/SkeletonLoader";
import toast from "react-hot-toast";

const Budgets = () => {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ category: "", limit: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBudgets = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.BUDGET.GET_ALL(user.id), {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setBudgets(Array.isArray(data?.data) ? data.data : []);
      } else {
        toast.error("Failed to load budgets");
        setBudgets([]);
      }
    } catch (error) {
      console.error("Error fetching budgets:", error);
      toast.error("Failed to load budgets");
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  useEffect(() => {
    const refreshBudgets = () => {
      fetchBudgets();
    };

    window.addEventListener("statement-imported", refreshBudgets);
    return () => window.removeEventListener("statement-imported", refreshBudgets);
  }, [fetchBudgets]);

  const handleOpenModal = (budget = null) => {
    if (budget) {
      setFormData({ category: budget.category, limit: budget.limit });
    } else {
      setFormData({ category: "", limit: "" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ category: "", limit: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.limit) {
      toast.error("Category and Limit are required");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(API_ENDPOINTS.BUDGET.CREATE_OR_UPDATE(user.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: formData.category,
          limit: Number(formData.limit)
        }),
      });

      if (res.ok) {
        toast.success("Budget saved successfully!");
        fetchBudgets();
        handleCloseModal();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to save budget");
      }
    } catch (error) {
      console.error("Save budget error:", error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (budgetId) => {
    if (!window.confirm("Are you sure you want to delete this budget?")) return;
    
    try {
      const res = await fetch(API_ENDPOINTS.BUDGET.DELETE(user.id, budgetId), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Budget deleted");
        fetchBudgets();
      } else {
        toast.error("Failed to delete budget");
      }
    } catch (error) {
      console.error("Delete budget error:", error);
      toast.error("An error occurred");
    }
  };

  return (
    <DashboardLayout activeMenu="Budgets">
      <div className="p-5 md:p-8 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 min-h-screen dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 transition-colors">
        
        {/* Header Section */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 animate-slide-in-down">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 leading-tight">
              Budget Management 🎯
            </h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">
              Set limits and track your spending against your goals.
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
          >
            <span>+</span> Set New Budget
          </button>
        </div>

        {/* Budgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <>
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
            </>
          ) : budgets.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-slate-950 p-12 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center transition-colors">
              <div className="text-6xl mb-4">🏦</div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">No Budgets Set</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                You haven't created any budgets yet. Setting budgets helps you control spending and save more money.
              </p>
              <button
                onClick={() => handleOpenModal()}
                className="bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-slate-700 px-6 py-2 rounded-full font-semibold transition-colors"
              >
                Create your first budget
              </button>
            </div>
          ) : (
            budgets.map((budget, idx) => (
              <div key={budget._id} className="animate-slide-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                <BudgetCard 
                  budget={budget} 
                  onEdit={handleOpenModal}
                  onDelete={handleDelete}
                />
              </div>
            ))
          )}
        </div>

        {/* Modal for Create/Update */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-950 dark:border-slate-800 border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-6 transform animate-scale-in transition-colors">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {formData.category ? "Update Budget" : "Set New Budget"}
                </h2>
                <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-white text-2xl leading-none">&times;</button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none text-slate-900 dark:text-slate-100"
                    required
                  >
                    <option value="">Select a category</option>
                    {[
                      "🍜 Food",
                      "🚗 Transportation",
                      "🏥 Medical",
                      "🎓 Education",
                      "🎮 Entertainment",
                      "🛒 Shopping",
                      "💡 Utilities",
                      "📱 Mobile",
                      "🏠 Rent",
                      "👗 Clothes",
                      "📚 Books",
                      "✈️ Travel",
                    ].map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monthly Limit (₹)</label>
                  <input
                    type="number"
                    value={formData.limit}
                    onChange={(e) => setFormData({...formData, limit: e.target.value})}
                    placeholder="e.g. 5000"
                    min="1"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
                
                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-70 flex justify-center items-center"
                  >
                    {isSubmitting ? <span className="animate-spin text-xl leading-none">💫</span> : "Save Budget"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default Budgets;
