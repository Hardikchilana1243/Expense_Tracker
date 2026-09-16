import { useState, useCallback, useEffect } from "react";
import apiClient from "../utils/apiClient";
import { API_ENDPOINTS } from "../utils/apiPaths";
import toast from "react-hot-toast";

export const useExpenses = (userId) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExpenses = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get(API_ENDPOINTS.EXPENSES.GET_ALL(userId));
      setExpenses(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      console.error("fetchExpenses error:", err);
      setError(err.message || "Failed to fetch expenses");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addExpense = useCallback(
    async (payload) => {
      if (!userId) return null;
      try {
        const data = await apiClient.post(API_ENDPOINTS.EXPENSES.ADD(userId), payload);
        toast.success("Expense added successfully");
        await fetchExpenses();
        return data?.data;
      } catch (err) {
        toast.error(err.message || "Failed to add expense");
        throw err;
      }
    },
    [userId, fetchExpenses]
  );

  const deleteExpense = useCallback(
    async (expenseId) => {
      if (!userId || !expenseId) return false;
      try {
        await apiClient.delete(API_ENDPOINTS.EXPENSES.DELETE(expenseId, userId));
        toast.success("Expense deleted successfully");
        await fetchExpenses();
        return true;
      } catch (err) {
        toast.error(err.message || "Failed to delete expense");
        throw err;
      }
    },
    [userId, fetchExpenses]
  );

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return {
    expenses,
    loading,
    error,
    refetch: fetchExpenses,
    addExpense,
    deleteExpense,
  };
};

export default useExpenses;
