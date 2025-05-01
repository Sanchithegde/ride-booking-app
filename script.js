const toggleLink = document.getElementById('toggle-link');
const toggleText = document.getElementById('toggle-text');
const formTitle = document.getElementById('form-title');
const authButton = document.getElementById('auth-button');
const nameGroup = document.getElementById('name-group');

let isLogin = true;

toggleLink.addEventListener('click', (e) => {
  e.preventDefault();
  isLogin = !isLogin;

  if (isLogin) {
    formTitle.textContent = 'Login';
    authButton.textContent = 'Login';
    toggleText.innerHTML = `Don't have an account? <a href="#" id="toggle-link">Sign up</a>`;
    nameGroup.style.display = 'none';
  } else {
    formTitle.textContent = 'Sign Up';
    authButton.textContent = 'Register';
    toggleText.innerHTML = `Already have an account? <a href="#" id="toggle-link">Login</a>`;
    nameGroup.style.display = 'block';
  }

  // Rebind link since it was replaced
  document.getElementById('toggle-link').addEventListener('click', (e) => {
    toggleLink.click();
  });
});

const authForm = document.getElementById('auth-form');

authForm.addEventListener('submit', (e) => {
  e.preventDefault();

  // Simulate login success
  // In the real version, you would validate credentials first

  window.location.href = 'dashboard.html';
});
