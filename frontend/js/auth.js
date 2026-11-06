import { api, showToast } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  setupPasswordToggles();
  setupLoginForm();
  setupSignupForm();
  checkUrlMessages();
});

/**
 * Password Visibility Toggle
 */
function setupPasswordToggles() {
  const toggleButtons = document.querySelectorAll('.toggle-password');
  toggleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      // Update icon SVG
      btn.innerHTML = isPassword
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>`;
    });
  });
}

/**
 * Inline alert message display
 */
function showAlert(message, type = 'error') {
  const alertEl = document.getElementById('auth-alert');
  if (!alertEl) return;

  alertEl.textContent = message;
  alertEl.className = `alert-inline alert-${type}`;
  alertEl.style.display = 'block';
}

function clearAlert() {
  const alertEl = document.getElementById('auth-alert');
  if (alertEl) {
    alertEl.style.display = 'none';
    alertEl.textContent = '';
  }
}

/**
 * Handle Login Form
 */
function setupLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.innerHTML;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      showAlert('Please enter both email and password.');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Signing In...</span>';

      const response = await api.auth.login({ email, password });
      showToast('Welcome back! Redirecting to dashboard...', 'success');

      // Short delay for smooth visual transition
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 600);
    } catch (error) {
      showAlert(error.message || 'Login failed. Please verify your credentials.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

/**
 * Handle Signup Form
 */
function setupSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.innerHTML;

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const currency = document.getElementById('currency').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Client-side validations
    if (!name || !email || !password) {
      showAlert('All required fields must be filled.');
      return;
    }

    if (password.length < 6) {
      showAlert('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Passwords do not match. Please verify and re-enter.');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Creating Account...</span>';

      await api.auth.signup({
        name,
        email,
        currency,
        password,
        confirmPassword
      });

      showToast('Account created successfully!', 'success');

      // As per master prompt: "After successful signup, redirect to login."
      setTimeout(() => {
        window.location.href = 'login.html?registered=true';
      }, 700);
    } catch (error) {
      showAlert(error.message || 'Could not create account. Please try again.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

/**
 * Check URL query params for redirected feedback
 */
function checkUrlMessages() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('registered') === 'true') {
    showAlert('Account created successfully! Please sign in with your credentials.', 'success');
  }
}
