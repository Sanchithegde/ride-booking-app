import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBRA9J106XJrYHBPPzgarHT9MP1wsLKuzM",
  authDomain: "ridesharing-app-566bf.firebaseapp.com",
  projectId: "ridesharing-app-566bf",
  storageBucket: "ridesharing-app-566bf.appspot.com",
  messagingSenderId: "862020732936",
  appId: "1:862020732936:web:196328e7aa08f7b61ee9bd",
  measurementId: "G-T7YZSF72Z0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const toggleLink = document.getElementById('toggle-link');
const toggleText = document.getElementById('toggle-text');
const formTitle = document.getElementById('form-title');
const authButton = document.getElementById('auth-button');
const nameGroup = document.getElementById('name-group');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authForm = document.getElementById('auth-form');
const errorMessage = document.getElementById('error-message');

let isLogin = true;

// Toggle login/signup mode
function toggleFormMode() {
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

  // Re-bind toggle link
  document.getElementById('toggle-link').addEventListener('click', (e) => {
    e.preventDefault();
    toggleFormMode();
  });
}

// Initial binding
toggleLink.addEventListener('click', (e) => {
  e.preventDefault();
  toggleFormMode();
});

// Handle login or registration
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  try {
    if (isLogin) {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'dashboard.html';
    } else {
      const name = nameInput.value.trim();
      if (!name) {
        errorMessage.textContent = 'Please enter your name.';
        errorMessage.style.display = 'block';
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      // Add user to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        createdAt: new Date().toISOString()
      });

      localStorage.setItem('userName', name);
      window.location.href = 'dashboard.html';
    }
  } catch (error) {
    let errorMessageText = '';

    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessageText = 'Email already in use.';
        break;
      case 'auth/invalid-email':
        errorMessageText = 'Invalid email address.';
        break;
      case 'auth/weak-password':
        errorMessageText = 'Password should be at least 6 characters.';
        break;
      case 'auth/user-not-found':
        errorMessageText = 'User not found.';
        break;
      case 'auth/wrong-password':
        errorMessageText = 'Incorrect password.';
        break;
      default:
        errorMessageText = 'Authentication failed. Please try again.';
    }

    errorMessage.textContent = errorMessageText;
    errorMessage.style.display = 'block';
  }
});
