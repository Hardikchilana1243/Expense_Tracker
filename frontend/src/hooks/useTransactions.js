import { useState, useCallback, useEffect } from "react";
import apiClient from "../utils/apiClient";
import { API_ENDPOINTS } from "../utils/apiPaths";
import toast from "react-hot-toast";

export const useTransactions = (userId, options = {}) => {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const queryParams = new URLSearchParams({
      page: (options.page || 1).toString(),
      limit: (options.limit || 10).toString(),
      sort: options.sort || "latest",
      ...(options.search && { search: options.search }),
      ...(options.type && options.type !== "all" && { type: options.type }),
    }).toString();

    try {
      const data = await apiClient.get(`${API_ENDPOINTS.TRANSACTIONS.GET_ALL(userId)}?${queryParams}`);
      setTransactions(Array.isArray(data?.data) ? data.data : []);
      if (data?.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("fetchTransactions error:", err);
      setError(err.message || "Failed to fetch transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [userId, options.page, options.limit, options.sort, options.search, options.type]);

  const deleteTransaction = useCallback(
    async (id, txType) => {
      if (!userId || !id) return false;
      try {
        await apiClient.delete(API_ENDPOINTS.TRANSACTIONS.DELETE(userId, txType, id));
        toast.success("Transaction deleted successfully");
        await fetchTransactions();
        return true;
      } catch (err) {
        toast.error(err.message || "Failed to delete transaction");
        throw err;
      }
    },
    [userId, fetchTransactions]
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    pagination,
    loading,
    error,
    refetch: fetchTransactions,
    deleteTransaction,
  };
};

export default useTransactions;
