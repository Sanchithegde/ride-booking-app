import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Firebase config
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
const db = getFirestore(app);
const auth = getAuth(app);

// DOM elements
const form = document.getElementById('group-form');
const groupNameInput = document.getElementById('group-name');
const membersInput = document.getElementById('members');
const confirmation = document.getElementById('confirmation-message');
const groupDisplayName = document.getElementById('group-display-name');
const memberList = document.getElementById('member-list');

let currentUser = null;
let userGroupId = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadGroup();
  } else {
    window.location.href = 'index.html'; // redirect if not logged in
  }
});

// Validate that all entered emails exist in Firestore users
async function validateEmails(emails) {
  const validEmails = [];

  for (const email of emails) {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      validEmails.push(email);
    }
  }

  return validEmails;
}

// Load the group this user is a part of
async function loadGroup() {
  const q = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.email));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const groupDoc = snapshot.docs[0];
    const group = groupDoc.data();
    userGroupId = groupDoc.id;

    groupDisplayName.textContent = group.name;
    groupNameInput.value = group.name;
    membersInput.value = group.members.join(', ');
    memberList.innerHTML = '';
    group.members.forEach(email => {
      const li = document.createElement('li');
      li.textContent = email;
      memberList.appendChild(li);
    });
  } else {
    groupDisplayName.textContent = 'No group created yet.';
    memberList.innerHTML = '';
  }
}

// Save or update the group in Firestore
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const groupName = groupNameInput.value.trim();
  const members = membersInput.value.split(',').map(m => m.trim()).filter(Boolean);

  if (!groupName || members.length === 0) {
    confirmation.innerText = 'Please enter a group name and at least one member.';
    return;
  }

  const validMembers = await validateEmails(members);

  if (validMembers.length !== members.length) {
    const invalids = members.filter(email => !validMembers.includes(email));
    confirmation.innerText = `Group not saved. These emails are not registered users: ${invalids.join(', ')}`;
    return;
  }

  const group = {
    name: groupName,
    members: validMembers,
    owner: currentUser.email
  };

  try {
    if (userGroupId) {
      await setDoc(doc(db, 'groups', userGroupId), group);
      confirmation.innerText = 'Group updated successfully.';
    } else {
      const newDoc = doc(collection(db, 'groups'));
      await setDoc(newDoc, group);
      userGroupId = newDoc.id;
      confirmation.innerText = 'Group created successfully.';
    }

    loadGroup();
  } catch (error) {
    console.error('Error saving group:', error);
    confirmation.innerText = 'Error saving group. Please try again.';
  }
});
