import { useState, useCallback, useEffect } from "react";
import apiClient from "../utils/apiClient";
import { API_ENDPOINTS } from "../utils/apiPaths";
import toast from "react-hot-toast";

export const useBudgets = (userId) => {
  const [budgets, setBudgets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBudgets = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get(API_ENDPOINTS.BUDGET.GET_ALL(userId));
      setBudgets(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      console.error("fetchBudgets error:", err);
      setError(err.message || "Failed to fetch budgets");
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchAlerts = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await apiClient.get(API_ENDPOINTS.BUDGET.ALERTS(userId));
      setAlerts(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      console.error("fetchAlerts error:", err);
      setAlerts([]);
    }
  }, [userId]);

  const saveBudget = useCallback(
    async (payload) => {
      if (!userId) return null;
      try {
        const data = await apiClient.post(API_ENDPOINTS.BUDGET.CREATE_OR_UPDATE(userId), payload);
        toast.success("Budget saved successfully");
        await fetchBudgets();
        await fetchAlerts();
        return data?.data;
      } catch (err) {
        toast.error(err.message || "Failed to save budget");
        throw err;
      }
    },
    [userId, fetchBudgets, fetchAlerts]
  );

  const deleteBudget = useCallback(
    async (budgetId) => {
      if (!userId || !budgetId) return false;
      try {
        await apiClient.delete(API_ENDPOINTS.BUDGET.DELETE(userId, budgetId));
        toast.success("Budget deleted successfully");
        await fetchBudgets();
        await fetchAlerts();
        return true;
      } catch (err) {
        toast.error(err.message || "Failed to delete budget");
        throw err;
      }
    },
    [userId, fetchBudgets, fetchAlerts]
  );

  useEffect(() => {
    fetchBudgets();
    fetchAlerts();
  }, [fetchBudgets, fetchAlerts]);

  return {
    budgets,
    alerts,
    loading,
    error,
    refetch: fetchBudgets,
    saveBudget,
    deleteBudget,
  };
};

export default useBudgets;
