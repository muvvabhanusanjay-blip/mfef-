import { api, showToast, formatCurrency } from './api.js';

let currentUser = null;
const now = new Date();
let currentMonth = now.getMonth() + 1;
let currentYear = now.getFullYear();

const CATEGORY_ICONS = {
  'Overall': '🎯',
  'Food & Dining': '🍔',
  'Housing': '🏠',
  'Transport': '🚗',
  'Entertainment': '🎬',
  'Shopping': '🛍️',
  'Healthcare': '💊',
  'Utilities': '⚡',
  'Other': '💳'
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initAuth();
    setupSidebar();
    setupPeriodControls();
    setupModal();
    await loadBudgets();
  } catch (err) {
    console.error('[Budgets Init Error]:', err);
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

function setupPeriodControls() {
  const monthSelect = document.getElementById('budget-month-select');
  const yearSelect = document.getElementById('budget-year-select');

  monthSelect.value = currentMonth;
  yearSelect.value = currentYear;

  monthSelect.addEventListener('change', (e) => {
    currentMonth = parseInt(e.target.value, 10);
    loadBudgets();
  });

  yearSelect.addEventListener('change', (e) => {
    currentYear = parseInt(e.target.value, 10);
    loadBudgets();
  });
}

async function loadBudgets() {
  const overallContainer = document.getElementById('overall-budget-container');
  const grid = document.getElementById('category-budgets-grid');
  const bannerSpent = document.getElementById('spent-banner-val');

  try {
    const res = await api.budgets.getAll(currentMonth, currentYear);
    const budgets = res.data || [];
    const cur = currentUser?.currency || 'INR';

    bannerSpent.textContent = formatCurrency(res.totalExpensesInMonth || 0, cur);

    // 1. Render Overall Budget
    const overallBudget = budgets.find((b) => b.category === 'Overall');
    if (overallBudget) {
      const pct = Math.min(100, overallBudget.percentage);
      const isOver = overallBudget.isExceeded;
      const progressColor = isOver ? 'var(--color-expense)' : pct >= 80 ? 'var(--color-warning)' : 'var(--accent-primary)';

      overallContainer.innerHTML = `
        <div class="stat-card" style="margin-bottom: 24px; padding: 26px 30px; border-left: 4px solid ${progressColor};">
          <div class="stat-card-top">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="budget-cat-icon">🎯</div>
              <div>
                <h3 style="font-size: 1.25rem; font-weight: 800;">Overall Monthly Budget</h3>
                <span style="font-size: 0.85rem; color: var(--text-secondary);">Limit: ${formatCurrency(overallBudget.amount, cur)}</span>
              </div>
            </div>
            <div style="text-align: right;">
              ${isOver ? `<span class="budget-warning-badge">⚠️ Limit Exceeded</span>` : `<span style="font-size: 0.9rem; font-weight: 700; color: ${progressColor};">${overallBudget.percentage}% Spent</span>`}
            </div>
          </div>

          <div class="progress-track" style="height: 12px; margin-top: 6px;">
            <div class="progress-bar" style="width: ${pct}%; background: ${progressColor}; box-shadow: 0 0 12px ${progressColor};"></div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.88rem; color: var(--text-secondary); margin-top: 4px;">
            <span>Spent: <strong style="color: var(--text-primary);">${formatCurrency(overallBudget.spent, cur)}</strong></span>
            <span>Remaining: <strong style="color: ${overallBudget.remaining > 0 ? 'var(--accent-primary)' : 'var(--color-expense)'};">${formatCurrency(overallBudget.remaining, cur)}</strong></span>
          </div>
        </div>
      `;
    } else {
      overallContainer.innerHTML = `
        <div class="stat-card" style="margin-bottom: 24px; text-align: center; padding: 24px;">
          <p style="color: var(--text-secondary); margin-bottom: 12px;">No overall budget set for this month</p>
          <button id="set-overall-btn" class="btn btn-secondary" style="margin: 0 auto; padding: 8px 18px; font-size: 0.85rem;">+ Set Overall Budget</button>
        </div>
      `;
      document.getElementById('set-overall-btn')?.addEventListener('click', () => {
        openBudgetModal({ category: 'Overall', amount: '' });
      });
    }

    // 2. Render Category Budgets
    const categoryBudgets = budgets.filter((b) => b.category !== 'Overall');

    if (categoryBudgets.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p>No category budgets defined for this month</p>
          <button id="add-first-cat-budget" class="btn btn-secondary" style="padding: 8px 16px; font-size: 0.85rem;">Create a category budget</button>
        </div>
      `;
      document.getElementById('add-first-cat-budget')?.addEventListener('click', () => {
        openBudgetModal();
      });
      return;
    }

    grid.innerHTML = categoryBudgets
      .map((b) => {
        const icon = CATEGORY_ICONS[b.category] || '💳';
        const pct = Math.min(100, b.percentage);
        const isOver = b.isExceeded;
        const barColor = isOver ? 'var(--color-expense)' : pct >= 80 ? 'var(--color-warning)' : 'var(--accent-primary)';

        return `
        <div class="budget-card" data-id="${b._id}">
          <div class="budget-header">
            <div class="budget-title-wrap">
              <div class="budget-cat-icon">${icon}</div>
              <span class="budget-cat-name">${escapeHtml(b.category)}</span>
            </div>
            <div class="action-buttons-cell">
              <button class="btn-icon edit-budget-btn" data-id="${b._id}" title="Edit Budget">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="btn-icon btn-icon-danger delete-budget-btn" data-id="${b._id}" title="Delete Budget">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>

          <div class="budget-amounts-row">
            <div>
              <span class="budget-spent-big">${formatCurrency(b.spent, cur)}</span>
              <span class="budget-limit-sub"> / ${formatCurrency(b.amount, cur)}</span>
            </div>
            <div>
              ${isOver ? `<span class="budget-warning-badge">Exceeded</span>` : `<span style="font-weight: 700; color: ${barColor};">${b.percentage}%</span>`}
            </div>
          </div>

          <div class="progress-track">
            <div class="progress-bar" style="width: ${pct}%; background: ${barColor}; box-shadow: 0 0 10px ${barColor};"></div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary);">
            <span>${isOver ? 'Over budget by' : 'Remaining'}:</span>
            <span style="font-weight: 600; color: ${isOver ? 'var(--color-expense)' : 'var(--text-primary)'};">
              ${formatCurrency(isOver ? b.spent - b.amount : b.remaining, cur)}
            </span>
          </div>
        </div>
      `;
      })
      .join('');

    attachBudgetActions(categoryBudgets);
  } catch (err) {
    console.error('[Load Budgets Error]:', err);
  }
}

function attachBudgetActions(budgets) {
  document.querySelectorAll('.edit-budget-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const b = budgets.find((item) => item._id === id);
      if (b) openBudgetModal(b);
    });
  });

  document.querySelectorAll('.delete-budget-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Delete this category budget?')) {
        try {
          await api.budgets.delete(id);
          showToast('Budget deleted.', 'info');
          await loadBudgets();
        } catch (err) {
          showToast(err.message || 'Error deleting budget', 'error');
        }
      }
    });
  });
}

function setupModal() {
  const modal = document.getElementById('budget-modal');
  const openBtn = document.getElementById('open-set-budget-modal');
  const closeBtn = document.getElementById('budget-modal-close');
  const cancelBtn = document.getElementById('budget-modal-cancel');
  const form = document.getElementById('budget-form');

  const closeModal = () => modal.classList.remove('open');

  if (openBtn) openBtn.addEventListener('click', () => openBudgetModal());
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('budget-id').value;
    const category = document.getElementById('budget-category').value;
    const amount = parseFloat(document.getElementById('budget-amount').value);

    try {
      if (id) {
        await api.budgets.update(id, { amount, category });
        showToast('Budget updated successfully!', 'success');
      } else {
        await api.budgets.save({
          month: currentMonth,
          year: currentYear,
          category,
          amount
        });
        showToast('Budget saved successfully!', 'success');
      }
      closeModal();
      await loadBudgets();
    } catch (err) {
      showToast(err.message || 'Error saving budget', 'error');
    }
  });
}

function openBudgetModal(budget = null) {
  const form = document.getElementById('budget-form');
  form.reset();

  if (budget) {
    document.getElementById('budget-modal-title').textContent = 'Edit Budget';
    document.getElementById('budget-id').value = budget._id || '';
    document.getElementById('budget-category').value = budget.category || 'Overall';
    document.getElementById('budget-amount').value = budget.amount !== undefined ? budget.amount : '';
  } else {
    document.getElementById('budget-modal-title').textContent = 'Set Monthly Budget';
    document.getElementById('budget-id').value = '';
    document.getElementById('budget-category').value = 'Overall';
    document.getElementById('budget-amount').value = '';
  }

  document.getElementById('budget-modal').classList.add('open');
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
