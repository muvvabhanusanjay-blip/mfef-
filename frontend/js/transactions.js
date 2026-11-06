import { api, showToast, formatCurrency } from './api.js';

let currentUser = null;
let currentPage = 1;
const limit = 15;
let currentFilters = {
  search: '',
  type: '',
  category: '',
  sortBy: 'date_desc'
};

const CATEGORY_ICONS = {
  'Food & Dining': '🍔',
  'Housing': '🏠',
  'Transport': '🚗',
  'Entertainment': '🎬',
  'Shopping': '🛍️',
  'Healthcare': '💊',
  'Utilities': '⚡',
  'Salary': '💰',
  'Investment': '📈',
  'Other': '💳'
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initAuth();
    setupSidebar();
    setupFilters();
    setupPagination();
    setupModal();
    await loadTransactions();
  } catch (err) {
    console.error('[Transactions Init Error]:', err);
  }
});

async function initAuth() {
  try {
    const res = await api.auth.getMe();
    currentUser = res.user;

    const avatarEl = document.getElementById('user-avatar');
    const snippetEl = document.getElementById('user-name-snippet');
    if (avatarEl) {
      const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      avatarEl.textContent = initials || 'U';
    }
    if (snippetEl) snippetEl.textContent = currentUser.name;

    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await api.auth.logout();
      window.location.href = 'login.html';
    });
  } catch (err) {
    window.location.href = 'login.html';
  }
}

function setupSidebar() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const closeBtn = document.getElementById('sidebar-close');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  const toggle = (open) => {
    sidebar.classList.toggle('mobile-open', open);
    backdrop.classList.toggle('mobile-open', open);
  };

  if (hamburgerBtn) hamburgerBtn.addEventListener('click', () => toggle(true));
  if (closeBtn) closeBtn.addEventListener('click', () => toggle(false));
  if (backdrop) backdrop.addEventListener('click', () => toggle(false));
}

function setupFilters() {
  const searchInput = document.getElementById('filter-search');
  const typeSelect = document.getElementById('filter-type');
  const categorySelect = document.getElementById('filter-category');
  const sortSelect = document.getElementById('filter-sort');

  // Debounced search
  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentFilters.search = e.target.value.trim();
      currentPage = 1;
      loadTransactions();
    }, 300);
  });

  typeSelect.addEventListener('change', (e) => {
    currentFilters.type = e.target.value;
    currentPage = 1;
    loadTransactions();
  });

  categorySelect.addEventListener('change', (e) => {
    currentFilters.category = e.target.value;
    currentPage = 1;
    loadTransactions();
  });

  sortSelect.addEventListener('change', (e) => {
    currentFilters.sortBy = e.target.value;
    currentPage = 1;
    loadTransactions();
  });
}

function setupPagination() {
  const prevBtn = document.getElementById('page-prev-btn');
  const nextBtn = document.getElementById('page-next-btn');

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadTransactions();
    }
  });

  nextBtn.addEventListener('click', () => {
    currentPage++;
    loadTransactions();
  });
}

async function loadTransactions() {
  const tbody = document.getElementById('transactions-table-body');
  const infoEl = document.getElementById('pagination-info');
  const pageIndicator = document.getElementById('page-indicator');
  const prevBtn = document.getElementById('page-prev-btn');
  const nextBtn = document.getElementById('page-next-btn');

  try {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 36px; color: var(--text-secondary);">
          Loading transactions...
        </td>
      </tr>
    `;

    const params = {
      page: currentPage,
      limit,
      ...currentFilters
    };

    const res = await api.transactions.getAll(params);
    const transactions = res.data || [];
    const pagination = res.pagination || { total: 0, totalPages: 1 };

    const cur = currentUser?.currency || 'INR';

    if (transactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <p>No transactions match your query</p>
            </div>
          </td>
        </tr>
      `;
      infoEl.textContent = 'Showing 0 of 0 transactions';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    tbody.innerHTML = transactions
      .map((tx) => {
        const isIncome = tx.type === 'income';
        const icon = CATEGORY_ICONS[tx.category] || '💳';
        const formattedDate = new Date(tx.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });

        return `
        <tr data-id="${tx._id}">
          <td style="color: var(--text-secondary);">${formattedDate}</td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(tx.title)}</div>
            ${tx.description ? `<div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(tx.description)}</div>` : ''}
          </td>
          <td>
            <span class="badge" style="background-color: var(--bg-card-secondary); color: var(--text-primary); border: 1px solid var(--border-color); display: inline-flex; align-items: center; gap: 6px;">
              <span>${icon}</span>
              <span>${escapeHtml(tx.category)}</span>
            </span>
          </td>
          <td><span class="badge badge-outline">${escapeHtml(tx.paymentMethod || 'Cash')}</span></td>
          <td style="font-weight: 700; color: ${isIncome ? 'var(--accent-primary)' : 'var(--color-expense)'};">
            ${isIncome ? '+' : '-'}${formatCurrency(tx.amount, cur)}
          </td>
          <td style="text-align: right;">
            <div class="action-buttons-cell" style="justify-content: flex-end;">
              <button class="btn-icon edit-btn" data-id="${tx._id}" title="Edit">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="btn-icon btn-icon-danger delete-btn" data-id="${tx._id}" title="Delete">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');

    // Update pagination display
    const startIdx = (pagination.page - 1) * pagination.limit + 1;
    const endIdx = Math.min(pagination.page * pagination.limit, pagination.total);
    infoEl.textContent = `Showing ${startIdx} to ${endIdx} of ${pagination.total} transactions`;
    pageIndicator.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;

    prevBtn.disabled = pagination.page <= 1;
    nextBtn.disabled = pagination.page >= pagination.totalPages;

    // Attach row action listeners
    attachRowActions(transactions);
  } catch (err) {
    console.error('[Load Transactions Error]:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-expense); padding: 30px;">Failed to load transactions.</td></tr>`;
  }
}

function attachRowActions(transactions) {
  // Edit buttons
  document.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const tx = transactions.find((t) => t._id === id);
      if (tx) openEditModal(tx);
    });
  });

  // Delete buttons
  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this transaction?')) {
        try {
          await api.transactions.delete(id);
          showToast('Transaction deleted successfully.', 'info');
          await loadTransactions();
        } catch (err) {
          showToast(err.message || 'Error deleting transaction', 'error');
        }
      }
    });
  });
}

function setupModal() {
  const modal = document.getElementById('tx-modal');
  const openBtn = document.getElementById('open-add-tx-modal');
  const closeBtn = document.getElementById('tx-modal-close');
  const cancelBtn = document.getElementById('tx-modal-cancel');
  const form = document.getElementById('tx-form');

  const typeExpenseBtn = document.getElementById('tx-type-expense');
  const typeIncomeBtn = document.getElementById('tx-type-income');
  const typeInput = document.getElementById('tx-type');

  typeExpenseBtn.addEventListener('click', () => {
    typeExpenseBtn.classList.add('active');
    typeIncomeBtn.classList.remove('active');
    typeInput.value = 'expense';
  });
  typeIncomeBtn.addEventListener('click', () => {
    typeIncomeBtn.classList.add('active');
    typeExpenseBtn.classList.remove('active');
    typeInput.value = 'income';
  });

  const openModal = () => {
    form.reset();
    document.getElementById('tx-id').value = '';
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('tx-modal-title').textContent = 'Add Transaction';
    typeExpenseBtn.click();
    modal.classList.add('open');
  };

  const closeModal = () => modal.classList.remove('open');

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('tx-id').value;
    const payload = {
      title: document.getElementById('tx-title').value.trim(),
      amount: parseFloat(document.getElementById('tx-amount').value),
      type: typeInput.value,
      category: document.getElementById('tx-category').value,
      paymentMethod: document.getElementById('tx-payment').value,
      date: document.getElementById('tx-date').value,
      description: document.getElementById('tx-description').value.trim()
    };

    try {
      if (id) {
        await api.transactions.update(id, payload);
        showToast('Transaction updated!', 'success');
      } else {
        await api.transactions.create(payload);
        showToast('Transaction recorded!', 'success');
      }
      closeModal();
      await loadTransactions();
    } catch (err) {
      showToast(err.message || 'Error saving transaction', 'error');
    }
  });
}

function openEditModal(tx) {
  document.getElementById('tx-modal-title').textContent = 'Edit Transaction';
  document.getElementById('tx-id').value = tx._id;
  document.getElementById('tx-title').value = tx.title;
  document.getElementById('tx-amount').value = tx.amount;
  document.getElementById('tx-category').value = tx.category;
  document.getElementById('tx-payment').value = tx.paymentMethod || 'Cash';
  document.getElementById('tx-date').value = new Date(tx.date).toISOString().split('T')[0];
  document.getElementById('tx-description').value = tx.description || '';

  if (tx.type === 'income') {
    document.getElementById('tx-type-income').click();
  } else {
    document.getElementById('tx-type-expense').click();
  }

  document.getElementById('tx-modal').classList.add('open');
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
