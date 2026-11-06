import { api, showToast } from './api.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initAuth();
    setupSidebar();
    setupProfileForm();
    setupPasswordForm();
  } catch (err) {
    console.error('[Settings Init Error]:', err);
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

    // Populate profile form fields
    document.getElementById('profile-name').value = currentUser.name || '';
    document.getElementById('profile-email').value = currentUser.email || '';
    document.getElementById('profile-currency').value = currentUser.currency || 'INR';

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

function setupProfileForm() {
  const form = document.getElementById('profile-form');
  const submitBtn = document.getElementById('save-profile-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('profile-name').value.trim();
    const currency = document.getElementById('profile-currency').value;

    if (!name) {
      showToast('Name cannot be empty.', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      const res = await api.auth.updateProfile({ name, currency });
      currentUser = res.user;

      showToast('Profile updated successfully!', 'success');
      document.getElementById('user-name-snippet').textContent = currentUser.name;
    } catch (err) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Profile Changes';
    }
  });
}

function setupPasswordForm() {
  const form = document.getElementById('password-form');
  const submitBtn = document.getElementById('change-pwd-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;

    if (!currentPassword || !newPassword) {
      showToast('Please fill all password fields.', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'error');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';

      await api.auth.updatePassword({ currentPassword, newPassword });
      showToast('Password changed successfully!', 'success');
      form.reset();
    } catch (err) {
      showToast(err.message || 'Password update failed.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Update Password';
    }
  });
}
