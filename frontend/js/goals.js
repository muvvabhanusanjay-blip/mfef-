import { api, showToast, formatCurrency } from './api.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initAuth();
    setupSidebar();
    setupModals();
    await loadGoals();
  } catch (err) {
    console.error('[Goals Init Error]:', err);
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

async function loadGoals() {
  const grid = document.getElementById('savings-goals-grid');
  if (!grid) return;

  try {
    const res = await api.goals.getAll();
    const goals = res.data || [];
    const cur = currentUser?.currency || 'INR';

    if (goals.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p>No active savings goals found</p>
          <button id="add-first-goal-btn" class="btn btn-secondary" style="padding: 8px 16px; font-size: 0.85rem;">Create your first goal</button>
        </div>
      `;
      document.getElementById('add-first-goal-btn')?.addEventListener('click', () => {
        openGoalModal();
      });
      return;
    }

    grid.innerHTML = goals
      .map((g) => {
        const pct = Math.min(100, g.progressPercentage || Math.round((g.currentAmount / g.targetAmount) * 100));
        const formattedDate = g.targetDate
          ? new Date(g.targetDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : null;

        return `
        <div class="goal-card-full" data-id="${g._id}">
          <div class="goal-header-row">
            <div>
              <h3 class="goal-title">${escapeHtml(g.title)}</h3>
              ${formattedDate ? `<span class="goal-target-date">🎯 Target: ${formattedDate}</span>` : ''}
            </div>
            <span class="goal-pct-pill">${pct}%</span>
          </div>

          <div class="progress-track" style="height: 10px;">
            <div class="progress-bar" style="width: ${pct}%;"></div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-secondary);">
            <span>Saved: <strong style="color: var(--text-primary);">${formatCurrency(g.currentAmount, cur)}</strong></span>
            <span>Target: <strong style="color: var(--text-primary);">${formatCurrency(g.targetAmount, cur)}</strong></span>
          </div>

          <div class="goal-actions-row">
            <button class="btn btn-primary deposit-btn" data-id="${g._id}" data-name="${escapeHtml(g.title)}" style="flex: 1; padding: 8px 12px; font-size: 0.85rem;">
              + Deposit
            </button>
            <button class="btn-icon edit-goal-btn" data-id="${g._id}" title="Edit Goal">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-icon btn-icon-danger delete-goal-btn" data-id="${g._id}" title="Delete Goal">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
      })
      .join('');

    attachGoalActions(goals);
  } catch (err) {
    console.error('[Load Goals Error]:', err);
  }
}

function attachGoalActions(goals) {
  // Deposit buttons
  document.querySelectorAll('.deposit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      openDepositModal(id, name);
    });
  });

  // Edit buttons
  document.querySelectorAll('.edit-goal-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const g = goals.find((item) => item._id === id);
      if (g) openGoalModal(g);
    });
  });

  // Delete buttons
  document.querySelectorAll('.delete-goal-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Delete this savings goal?')) {
        try {
          await api.goals.delete(id);
          showToast('Savings goal deleted.', 'info');
          await loadGoals();
        } catch (err) {
          showToast(err.message || 'Error deleting goal', 'error');
        }
      }
    });
  });
}

function setupModals() {
  // Goal Create / Edit Modal
  const goalModal = document.getElementById('goal-modal');
  const openGoalBtn = document.getElementById('open-create-goal-modal');
  const closeGoalBtn = document.getElementById('goal-modal-close');
  const cancelGoalBtn = document.getElementById('goal-modal-cancel');
  const goalForm = document.getElementById('goal-form');

  const closeGoal = () => goalModal.classList.remove('open');
  if (openGoalBtn) openGoalBtn.addEventListener('click', () => openGoalModal());
  if (closeGoalBtn) closeGoalBtn.addEventListener('click', closeGoal);
  if (cancelGoalBtn) cancelGoalBtn.addEventListener('click', closeGoal);

  goalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('goal-id').value;
    const payload = {
      title: document.getElementById('goal-title').value.trim(),
      targetAmount: parseFloat(document.getElementById('goal-target').value),
      currentAmount: parseFloat(document.getElementById('goal-current').value || 0),
      targetDate: document.getElementById('goal-date').value || undefined
    };

    try {
      if (id) {
        await api.goals.update(id, payload);
        showToast('Goal updated successfully!', 'success');
      } else {
        await api.goals.create(payload);
        showToast('Savings goal created!', 'success');
      }
      closeGoal();
      await loadGoals();
    } catch (err) {
      showToast(err.message || 'Error saving goal', 'error');
    }
  });

  // Deposit Contribution Modal
  const depositModal = document.getElementById('deposit-modal');
  const closeDepositBtn = document.getElementById('deposit-modal-close');
  const cancelDepositBtn = document.getElementById('deposit-modal-cancel');
  const depositForm = document.getElementById('deposit-form');

  const closeDeposit = () => depositModal.classList.remove('open');
  if (closeDepositBtn) closeDepositBtn.addEventListener('click', closeDeposit);
  if (cancelDepositBtn) cancelDepositBtn.addEventListener('click', closeDeposit);

  depositForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('deposit-goal-id').value;
    const depositAmount = parseFloat(document.getElementById('deposit-amount').value);

    try {
      await api.goals.update(id, { depositAmount });
      showToast('Deposit recorded successfully!', 'success');
      closeDeposit();
      await loadGoals();
    } catch (err) {
      showToast(err.message || 'Deposit failed', 'error');
    }
  });
}

function openGoalModal(goal = null) {
  const form = document.getElementById('goal-form');
  form.reset();

  if (goal) {
    document.getElementById('goal-modal-title').textContent = 'Edit Savings Goal';
    document.getElementById('goal-id').value = goal._id || '';
    document.getElementById('goal-title').value = goal.title || '';
    document.getElementById('goal-target').value = goal.targetAmount || '';
    document.getElementById('goal-current').value = goal.currentAmount !== undefined ? goal.currentAmount : 0;
    document.getElementById('goal-date').value = goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '';
  } else {
    document.getElementById('goal-modal-title').textContent = 'Create Savings Goal';
    document.getElementById('goal-id').value = '';
    document.getElementById('goal-title').value = '';
    document.getElementById('goal-target').value = '';
    document.getElementById('goal-current').value = '0';
    document.getElementById('goal-date').value = '';
  }

  document.getElementById('goal-modal').classList.add('open');
}

function openDepositModal(id, name) {
  const form = document.getElementById('deposit-form');
  form.reset();
  document.getElementById('deposit-goal-id').value = id;
  document.getElementById('deposit-goal-name').textContent = `Adding to: ${name}`;
  document.getElementById('deposit-modal').classList.add('open');
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
