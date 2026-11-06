/**
 * SPENDWISE - Reusable API Client & Utilities
 * Pure Vanilla JavaScript ES Module using Fetch API
 */

const API_BASE = window.location.origin.includes('5000')
  ? '/api'
  : 'http://localhost:5000/api';

/**
 * Toast Notification System
 */
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Core HTTP Request Wrapper
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    },
    // Crucial: Send and receive session cookies across origin/port
    credentials: 'include'
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data.message || `Request failed with status ${response.status}`;
      // If unauthorized and not already on auth page, redirect
      if (response.status === 401 && !window.location.pathname.includes('login') && !window.location.pathname.includes('signup')) {
        window.location.href = 'login.html';
      }
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
}

/**
 * Currency Formatter Utility
 */
export function formatCurrency(amount, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

/**
 * API Submodules
 */
export const api = {
  // Authentication & User Profile
  auth: {
    signup: (data) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    getMe: () => request('/auth/me'),
    updateProfile: (data) => request('/profile', { method: 'PUT', body: JSON.stringify(data) }),
    updatePassword: (data) => request('/profile/password', { method: 'PUT', body: JSON.stringify(data) })
  },

  // Transactions
  transactions: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/transactions${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/transactions/${id}`),
    create: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/transactions/${id}`, { method: 'DELETE' })
  },

  // Budgets
  budgets: {
    getAll: (month, year) => {
      const query = month && year ? `?month=${month}&year=${year}` : '';
      return request(`/budgets${query}`);
    },
    save: (data) => request('/budgets', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/budgets/${id}`, { method: 'DELETE' })
  },

  // Savings Goals
  goals: {
    getAll: () => request('/goals'),
    create: (data) => request('/goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/goals/${id}`, { method: 'DELETE' })
  },

  // Dashboard Aggregates
  dashboard: {
    getSummary: (period = '1M') => request(`/dashboard/summary?period=${period}`),
    getCashflow: (period = '1M') => request(`/dashboard/cashflow?period=${period}`),
    getSpending: (period = '1M') => request(`/dashboard/spending?period=${period}`)
  },

  // Analytics
  analytics: {
    getOverview: (timeframe = 'monthly') => request(`/analytics/overview?timeframe=${timeframe}`),
    getCategories: () => request('/analytics/categories')
  }
};
