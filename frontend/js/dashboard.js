import { api, showToast, formatCurrency } from './api.js';

let currentUser = null;
let activePeriod = '1M';
let cashflowChartInstance = null;
let spendingChartInstance = null;

// Category icon map for fintech visual appeal
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
    setupHeaderDate();
    setupSidebar();
    setupPeriodFilter();
    setupModals();
    setupCharts();
    await loadAllDashboardData();
  } catch (error) {
    console.error('[Dashboard Init Error]:', error);
  }
});

/**
 * 1. Verify User Authentication
 */
async function initAuth() {
  try {
    const res = await api.auth.getMe();
    currentUser = res.user;

    // Greeting according to time of day
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
    if (hour >= 17) timeGreeting = 'Good evening';

    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) {
      greetingEl.textContent = `${timeGreeting}, ${currentUser.name} 👋`;
    }

    // Set User initials avatar and snippet
    const avatarEl = document.getElementById('user-avatar');
    const snippetEl = document.getElementById('user-name-snippet');
    if (avatarEl) {
      const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      avatarEl.textContent = initials || 'U';
    }
    if (snippetEl) snippetEl.textContent = currentUser.name;

    // Logout action
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await api.auth.logout();
          showToast('Signed out successfully.', 'info');
          window.location.href = 'login.html';
        } catch (e) {
          window.location.href = 'login.html';
        }
      });
    }
  } catch (err) {
    window.location.href = 'login.html';
  }
}

/**
 * 2. Setup Current Date Display
 */
function setupHeaderDate() {
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    const options = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('en-US', options);
  }
}

/**
 * 3. Mobile Sidebar Controls
 */
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

  // Cards placeholder modal trigger
  const cardsBtn = document.getElementById('cards-nav-btn');
  if (cardsBtn) {
    cardsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('cards-modal').classList.add('open');
    });
  }
  const cardsClose = document.getElementById('cards-modal-close');
  if (cardsClose) {
    cardsClose.addEventListener('click', () => {
      document.getElementById('cards-modal').classList.remove('open');
    });
  }
}

/**
 * 4. Period Filter Chips (1W, 1M, 3M, 1Y)
 */
function setupPeriodFilter() {
  const chips = document.querySelectorAll('.period-chip[data-period]');
  chips.forEach((chip) => {
    chip.addEventListener('click', async () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      activePeriod = chip.getAttribute('data-period');
      await reloadPeriodData();
    });
  });
}

/**
 * 5. Initialize Chart.js Options with Dark Fintech Theme
 */
function setupCharts() {
  Chart.defaults.color = '#A0A0B8';
  Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
  Chart.defaults.font.size = 12;

  // Dual-line Cash Flow Chart
  const cfCtx = document.getElementById('cashflowChart');
  if (cfCtx) {
    cashflowChartInstance = new Chart(cfCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Income',
            data: [],
            borderColor: '#00E6A0',
            backgroundColor: 'rgba(0, 230, 160, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#00E6A0',
            borderWidth: 2.5
          },
          {
            label: 'Expense',
            data: [],
            borderColor: '#FF5B73',
            backgroundColor: 'rgba(255, 91, 115, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#FF5B73',
            borderWidth: 2.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#15152B',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            titleColor: '#FFFFFF',
            bodyColor: '#A0A0B8',
            padding: 12,
            callbacks: {
              label: function (ctx) {
                return ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, currentUser?.currency)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              callback: function (val) {
                return formatCurrency(val, currentUser?.currency);
              }
            }
          }
        }
      }
    });
  }

  // Doughnut Spending Chart
  const spCtx = document.getElementById('spendingDoughnutChart');
  if (spCtx) {
    spendingChartInstance = new Chart(spCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: [],
            borderColor: '#101024',
            borderWidth: 3,
            hoverOffset: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '74%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#15152B',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            titleColor: '#FFFFFF',
            bodyColor: '#A0A0B8',
            padding: 12,
            callbacks: {
              label: function (ctx) {
                return ` ${ctx.label}: ${formatCurrency(ctx.parsed, currentUser?.currency)}`;
              }
            }
          }
        }
      }
    });
  }
}

/**
 * 6. Load & Refresh All Dashboard Components
 */
async function loadAllDashboardData() {
  await Promise.all([
    reloadPeriodData(),
    loadRecentTransactions(),
    loadSavingsGoals()
  ]);
}

/**
 * Reload components dependent on active period filter (1W, 1M, 3M, 1Y)
 */
async function reloadPeriodData() {
  try {
    const [summaryRes, cashflowRes, spendingRes] = await Promise.all([
      api.dashboard.getSummary(activePeriod),
      api.dashboard.getCashflow(activePeriod),
      api.dashboard.getSpending(activePeriod)
    ]);

    // Update 4 Summary Cards
    const cur = currentUser?.currency || 'INR';
    const { metrics } = summaryRes;

    document.getElementById('stat-balance').textContent = formatCurrency(metrics.netCashBalance.value, cur);
    document.getElementById('stat-income').textContent = formatCurrency(metrics.monthlyIncome.value, cur);
    document.getElementById('stat-expense').textContent = formatCurrency(metrics.totalSpent.value, cur);
    document.getElementById('stat-savings-rate').textContent = `${metrics.savingsRate.value}%`;

    const incomeTrendEl = document.getElementById('trend-income');
    incomeTrendEl.textContent = `${metrics.monthlyIncome.changePercent >= 0 ? '+' : ''}${metrics.monthlyIncome.changePercent}% vs prior`;
    incomeTrendEl.className = `stat-trend ${metrics.monthlyIncome.isPositive ? 'trend-positive' : 'trend-negative'}`;

    const expenseTrendEl = document.getElementById('trend-expense');
    expenseTrendEl.textContent = `${metrics.totalSpent.changePercent >= 0 ? '+' : ''}${metrics.totalSpent.changePercent}% vs prior`;
    expenseTrendEl.className = `stat-trend ${metrics.totalSpent.isPositive ? 'trend-positive' : 'trend-negative'}`;

    const savingsTrendEl = document.getElementById('trend-savings');
    savingsTrendEl.textContent = `${metrics.savingsRate.value >= 20 ? 'Optimal' : 'Needs attention'}`;
    savingsTrendEl.className = `stat-trend ${metrics.savingsRate.isPositive ? 'trend-positive' : 'trend-negative'}`;

    // Update Cash Flow Chart
    if (cashflowChartInstance && cashflowRes.chartData) {
      cashflowChartInstance.data.labels = cashflowRes.chartData.labels;
      cashflowChartInstance.data.datasets[0].data = cashflowRes.chartData.datasets[0].data;
      cashflowChartInstance.data.datasets[1].data = cashflowRes.chartData.datasets[1].data;
      cashflowChartInstance.update();
    }

    // Update Spending Doughnut Chart & Legend
    if (spendingChartInstance && spendingRes.chartData) {
      document.getElementById('doughnut-total').textContent = formatCurrency(spendingRes.totalSpending, cur);

      spendingChartInstance.data.labels = spendingRes.chartData.labels;
      spendingChartInstance.data.datasets[0].data = spendingRes.chartData.datasets[0].data;
      spendingChartInstance.data.datasets[0].backgroundColor = spendingRes.chartData.datasets[0].backgroundColor;
      spendingChartInstance.update();

      // Render custom legend items below doughnut
      const legendListEl = document.getElementById('spending-legend-list');
      if (legendListEl) {
        if (!spendingRes.categories || spendingRes.categories.length === 0) {
          legendListEl.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 10px;">No expenses in this period</p>`;
        } else {
          legendListEl.innerHTML = spendingRes.categories
            .slice(0, 5)
            .map(
              (cat) => `
              <div class="legend-item">
                <div class="legend-left">
                  <span class="legend-dot" style="background-color: ${cat.color};"></span>
                  <span class="legend-name">${cat.category}</span>
                </div>
                <div class="legend-right">
                  <span class="legend-amount">${formatCurrency(cat.amount, cur)}</span>
                  <span class="legend-pct">${cat.percentage}%</span>
                </div>
              </div>
            `
            )
            .join('');
        }
      }
    }
  } catch (err) {
    console.error('[Error reloading period data]:', err);
  }
}

/**
 * 7. Load & Render Recent 5 Transactions
 */
async function loadRecentTransactions() {
  const container = document.getElementById('recent-transactions-feed');
  if (!container) return;

  try {
    const res = await api.transactions.getAll({ limit: 5, sortBy: 'date_desc' });
    const transactions = res.data || [];

    if (transactions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No recent transactions recorded</p>
          <button class="btn btn-secondary open-tx-modal-btn" style="padding: 6px 14px; font-size: 0.82rem;">Record first transaction</button>
        </div>
      `;
      setupAddTxButtons();
      return;
    }

    const cur = currentUser?.currency || 'INR';

    container.innerHTML = transactions
      .map((tx) => {
        const isIncome = tx.type === 'income';
        const icon = CATEGORY_ICONS[tx.category] || '💳';
        const formattedDate = new Date(tx.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });

        return `
        <div class="tx-item" data-id="${tx._id}">
          <div class="tx-left">
            <div class="tx-icon" style="background-color: ${isIncome ? 'rgba(0, 230, 160, 0.1)' : 'rgba(255, 91, 115, 0.1)'};">
              ${icon}
            </div>
            <div class="tx-meta">
              <span class="tx-title">${escapeHtml(tx.title)}</span>
              <div class="tx-sub">
                <span>${formattedDate}</span>
                <span>•</span>
                <span class="badge badge-outline">${escapeHtml(tx.paymentMethod || 'Cash')}</span>
              </div>
            </div>
          </div>
          <div class="tx-right">
            <span class="tx-amount ${isIncome ? 'amount-income' : 'amount-expense'}">
              ${isIncome ? '+' : '-'}${formatCurrency(tx.amount, cur)}
            </span>
          </div>
        </div>
      `;
      })
      .join('');
  } catch (err) {
    console.error('[Load Transactions Error]:', err);
  }
}

/**
 * 8. Load & Render Savings Goals Widget
 */
async function loadSavingsGoals() {
  const container = document.getElementById('goals-feed');
  if (!container) return;

  try {
    const res = await api.goals.getAll();
    const goals = res.data || [];

    if (goals.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No active savings goals</p>
          <button id="empty-add-goal-btn" class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.82rem;">Create a goal</button>
        </div>
      `;
      document.getElementById('empty-add-goal-btn')?.addEventListener('click', () => {
        document.getElementById('goal-modal').classList.add('open');
      });
      return;
    }

    const cur = currentUser?.currency || 'INR';

    container.innerHTML = goals
      .slice(0, 3)
      .map((g) => {
        const pct = Math.min(100, g.progressPercentage || Math.round((g.currentAmount / g.targetAmount) * 100));
        return `
        <div class="goal-card-widget">
          <div class="goal-widget-header">
            <span class="goal-widget-title">${escapeHtml(g.title)}</span>
            <span class="goal-widget-pct">${pct}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-bar" style="width: ${pct}%;"></div>
          </div>
          <div class="goal-widget-amounts">
            <span>Saved <span class="goal-saved-bold">${formatCurrency(g.currentAmount, cur)}</span></span>
            <span>Target ${formatCurrency(g.targetAmount, cur)}</span>
          </div>
        </div>
      `;
      })
      .join('');
  } catch (err) {
    console.error('[Load Goals Error]:', err);
  }
}

/**
 * 9. Modals Management (Add/Edit Transaction, Add Goal)
 */
function setupModals() {
  // Add Transaction Modal
  const txModal = document.getElementById('tx-modal');
  const openTxBtn = document.getElementById('open-add-tx-modal');
  const closeTxBtn = document.getElementById('tx-modal-close');
  const cancelTxBtn = document.getElementById('tx-modal-cancel');
  const txForm = document.getElementById('tx-form');

  // Type buttons in modal
  const typeExpenseBtn = document.getElementById('tx-type-expense');
  const typeIncomeBtn = document.getElementById('tx-type-income');
  const typeInput = document.getElementById('tx-type');

  if (typeExpenseBtn && typeIncomeBtn) {
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
  }

  const openTxModal = () => {
    txForm.reset();
    document.getElementById('tx-id').value = '';
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('tx-modal-title').textContent = 'Add Transaction';
    typeExpenseBtn.click();
    txModal.classList.add('open');
  };

  const closeTxModal = () => txModal.classList.remove('open');

  if (openTxBtn) openTxBtn.addEventListener('click', openTxModal);
  if (closeTxBtn) closeTxBtn.addEventListener('click', closeTxModal);
  if (cancelTxBtn) cancelTxBtn.addEventListener('click', closeTxModal);

  setupAddTxButtons();

  // Transaction form submit
  if (txForm) {
    txForm.addEventListener('submit', async (e) => {
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
          showToast('Transaction updated successfully!', 'success');
        } else {
          await api.transactions.create(payload);
          showToast('Transaction recorded successfully!', 'success');
        }
        closeTxModal();
        await loadAllDashboardData();
      } catch (err) {
        showToast(err.message || 'Error saving transaction', 'error');
      }
    });
  }

  // Savings Goal Modal
  const goalModal = document.getElementById('goal-modal');
  const openGoalBtn = document.getElementById('open-add-goal-modal');
  const closeGoalBtn = document.getElementById('goal-modal-close');
  const cancelGoalBtn = document.getElementById('goal-modal-cancel');
  const goalForm = document.getElementById('goal-form');

  const openGoalModal = () => {
    goalForm.reset();
    goalModal.classList.add('open');
  };
  const closeGoalModal = () => goalModal.classList.remove('open');

  if (openGoalBtn) openGoalBtn.addEventListener('click', openGoalModal);
  if (closeGoalBtn) closeGoalBtn.addEventListener('click', closeGoalModal);
  if (cancelGoalBtn) cancelGoalBtn.addEventListener('click', closeGoalModal);

  if (goalForm) {
    goalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        title: document.getElementById('goal-title').value.trim(),
        targetAmount: parseFloat(document.getElementById('goal-target').value),
        currentAmount: parseFloat(document.getElementById('goal-initial').value || 0),
        targetDate: document.getElementById('goal-date').value || undefined
      };

      try {
        await api.goals.create(payload);
        showToast('Savings goal created!', 'success');
        closeGoalModal();
        await loadSavingsGoals();
      } catch (err) {
        showToast(err.message || 'Failed to create goal', 'error');
      }
    });
  }
}

function setupAddTxButtons() {
  document.querySelectorAll('.open-tx-modal-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('open-add-tx-modal')?.click();
    });
  });
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
