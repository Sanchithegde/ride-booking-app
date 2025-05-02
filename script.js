import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBRA9J106XJrYHBPPzgarHT9MP1wsLKuzM",
    authDomain: "ridesharing-app-566bf.firebaseapp.com",
    projectId: "ridesharing-app-566bf",
    storageBucket: "ridesharing-app-566bf.firebasestorage.app",
    messagingSenderId: "862020732936",
    appId: "1:862020732936:web:196328e7aa08f7b61ee9bd",
    measurementId: "G-T7YZSF72Z0"
  };
  

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM elements
const toggleLink = document.getElementById('toggle-link');
const toggleText = document.getElementById('toggle-text');
const formTitle = document.getElementById('form-title');
const authButton = document.getElementById('auth-button');
const nameGroup = document.getElementById('name-group');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authForm = document.getElementById('auth-form');
const errorMessage = document.getElementById('error-message'); // Error message container

// Track whether the user is logging in or registering
let isLogin = true;

// Toggle between login and sign up form
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

  // Rebind the link in case it was replaced
  document.getElementById('toggle-link').addEventListener('click', (e) => {
    toggleLink.click();
  });
});

// Handle form submission for login or registration
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailInput.value;
  const password = passwordInput.value;

  try {
    if (isLogin) {
      // Login the user
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'dashboard.html'; // Redirect to dashboard on success
    } else {
      // Handle registration logic (you can extend this for Firebase Auth registration)
      alert('Registration functionality is not yet implemented. You can add it if needed!');
    }
  } catch (error) {
    let errorMessageText = '';

    if (error.code === 'auth/invalid-email') {
      errorMessageText = 'Invalid email format. Please check and try again.';
    } else if (error.code === 'auth/user-not-found') {
      errorMessageText = 'No user found with this email. Please check and try again.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessageText = 'Incorrect password. Please try again.';
    } else {
      errorMessageText = 'Login failed. Please try again later.';
    }

    // Display the error message in the error message container
    errorMessage.textContent = errorMessageText;
    errorMessage.style.display = 'block'; // Show the error message container
  }
});
