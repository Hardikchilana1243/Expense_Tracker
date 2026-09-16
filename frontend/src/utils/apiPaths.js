const API_BASE_URL = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) || "http://localhost:3000/api/v1";

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    SIGNUP: `${API_BASE_URL}/auth/signup`,
    GOOGLE: `${API_BASE_URL}/auth/google`,
    ME: `${API_BASE_URL}/auth/me`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
  },
  // Dashboard

  DASHBOARD: {
    OVERVIEW: (userId) => `${API_BASE_URL}/dashboard/overview/${userId}`,
    SUMMARY: (userId) => `${API_BASE_URL}/dashboard/summary/${userId}`,
    TRANSACTIONS: (userId) => `${API_BASE_URL}/dashboard/transactions/${userId}`,
    EXPENSES_BY_CATEGORY: (userId) => `${API_BASE_URL}/dashboard/expenses-by-category/${userId}`,
    INCOME_VS_EXPENSE: (userId) => `${API_BASE_URL}/dashboard/income-vs-expense/${userId}`,
    SPENDING_TRENDS: (userId) => `${API_BASE_URL}/dashboard/spending-trends/${userId}`,
    SUMMARY_STATS: (userId) => `${API_BASE_URL}/dashboard/summary-stats/${userId}`,
  },

  // Mock Bank NEW
  MOCK: {
    LINK: (userId) => `${API_BASE_URL}/mock/${userId}/link`,
    IMPORT: (userId) => `${API_BASE_URL}/mock/${userId}/import`,
    GET: (userId) => `${API_BASE_URL}/mock/${userId}`,
  },
  STATEMENTS: {
    PREVIEW: `${API_BASE_URL}/statements/preview`,
    UPLOAD: `${API_BASE_URL}/statements/upload`,
  },
  NOTIFICATIONS: {
    GET_ALL: (userId) => `${API_BASE_URL}/notifications/${userId}`,
    READ_ALL: (userId) => `${API_BASE_URL}/notifications/${userId}/read-all`,
    MARK_READ: (userId, notificationId) => `${API_BASE_URL}/notifications/${userId}/${notificationId}/read`,
    PREFERENCES: `${API_BASE_URL}/notifications/preferences`,
    REPORT_HISTORY: `${API_BASE_URL}/notifications/report-history`,
    TRIGGER_REPORTS: `${API_BASE_URL}/notifications/trigger-monthly-reports`,
    EMAIL_STATUS: `${API_BASE_URL}/notifications/email-status`,
  },
  // Transactions
  TRANSACTIONS: {
    GET_ALL: (userId) => `${API_BASE_URL}/transactions/${userId}`,
    DELETE: (userId, type, id) => `${API_BASE_URL}/transactions/${userId}/${type}/${id}`,
  },
  BUDGET: {
    GET_ALL: (userId) => `${API_BASE_URL}/budgets/${userId}`,
    CREATE_OR_UPDATE: (userId) => `${API_BASE_URL}/budgets/${userId}`,
    DELETE: (userId, budgetId) => `${API_BASE_URL}/budgets/${userId}/${budgetId}`,
    ALERTS: (userId) => `${API_BASE_URL}/budgets/${userId}/alerts`,
  },
  // ✅ INCOME ADD KAR (IMPORTANT)
INCOME: {
  GET_ALL: (userId) => `${API_BASE_URL}/income/${userId}`,
  ADD: (userId) => `${API_BASE_URL}/income/${userId}`,
  DELETE: (incomeId, userId) =>
    `${API_BASE_URL}/income/${incomeId}?userId=${userId}`,
  DELETE_BULK: `${API_BASE_URL}/income/bulk`,
  DELETE_FILTERED: `${API_BASE_URL}/income/bulk-filtered`,
},
  INSIGHTS: {
    GET_ALL: (userId) => `${API_BASE_URL}/insights/${userId}`,
  },
  AI_ADVISOR: {
    SUMMARY: (userId) => `${API_BASE_URL}/ai/summary/${userId}`,
    RECOMMENDATIONS: (userId) => `${API_BASE_URL}/ai/recommendations/${userId}`,
    FORECAST: (userId) => `${API_BASE_URL}/ai/forecast/${userId}`,
    HEALTH: (userId) => `${API_BASE_URL}/ai/financial-health/${userId}`,
  },
  // Expenses
  EXPENSES: {
    GET_ALL: (userId) => `${API_BASE_URL}/expenses/${userId}`,
    ADD: (userId) => `${API_BASE_URL}/expenses/${userId}`,
    DELETE: (expenseId, userId) =>
      `${API_BASE_URL}/expenses/${expenseId}?userId=${userId}`,
    DELETE_BULK: `${API_BASE_URL}/expenses/bulk`,
    DELETE_FILTERED: `${API_BASE_URL}/expenses/bulk-filtered`,
  },
};



