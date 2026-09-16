import { useState, useCallback, useEffect } from "react";
import apiClient from "../utils/apiClient";
import { API_ENDPOINTS } from "../utils/apiPaths";
import toast from "react-hot-toast";

export const useIncomes = (userId) => {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIncomes = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get(API_ENDPOINTS.INCOME.GET_ALL(userId));
      setIncomes(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      console.error("fetchIncomes error:", err);
      setError(err.message || "Failed to fetch income");
      setIncomes([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addIncome = useCallback(
    async (payload) => {
      if (!userId) return null;
      try {
        const data = await apiClient.post(API_ENDPOINTS.INCOME.ADD(userId), payload);
        toast.success("Income added successfully");
        await fetchIncomes();
        return data?.data;
      } catch (err) {
        toast.error(err.message || "Failed to add income");
        throw err;
      }
    },
    [userId, fetchIncomes]
  );

  const deleteIncome = useCallback(
    async (incomeId) => {
      if (!userId || !incomeId) return false;
      try {
        await apiClient.delete(API_ENDPOINTS.INCOME.DELETE(incomeId, userId));
        toast.success("Income deleted successfully");
        await fetchIncomes();
        return true;
      } catch (err) {
        toast.error(err.message || "Failed to delete income");
        throw err;
      }
    },
    [userId, fetchIncomes]
  );

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  return {
    incomes,
    loading,
    error,
    refetch: fetchIncomes,
    addIncome,
    deleteIncome,
  };
};

export default useIncomes;
