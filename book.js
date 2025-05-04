// Firebase SDK Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  addDoc,
  serverTimestamp,
  updateDoc,
  GeoPoint
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Firebase Config
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

// Global Variables
let currentUser = null;
let groupMembers = [];
let userGroup = null;
let currentGroupId = "";
let map, directionsService, directionsRenderer;
let pickupMarker, dropMarker;
let markers = [];

let autocompletePickup, autocompleteDrop;

const pickupInput = document.getElementById('pickup');
const dropInput = document.getElementById('drop');
const riderSelect = document.getElementById('rider');
const rideForm = document.getElementById('ride-form');
const confirmation = document.getElementById('confirmation-message');
const distanceDisplay = document.getElementById('distance');
const priceDisplay = document.getElementById('price');
const currentLocationButton = document.getElementById('current-location-button');

const baseBangaloreCoords = { lat: 12.9716, lng: 77.5946 };

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await loadGroupMembersFromFirestore();
    window.initMap();
  } else {
    window.location.href = 'index.html';
  }
});

async function loadGroupMembersFromFirestore() {
  const q = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.email));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const groupDoc = snapshot.docs[0];
    userGroup = groupDoc.data();
    currentGroupId = groupDoc.id;
    groupMembers = userGroup.members;

    groupMembers.forEach(member => {
      const option = document.createElement('option');
      option.value = member;
      option.textContent = member;
      riderSelect.appendChild(option);
    });

    riderSelect.value = currentUser.email;
    currentLocationButton.disabled = false;

  } else {
    confirmation.innerText = "No group found. Please create a group first.";
    rideForm.style.display = 'none';
  }
}

window.initMap = () => {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: baseBangaloreCoords,
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map });

  autocompletePickup = new google.maps.places.Autocomplete(pickupInput);
  autocompleteDrop = new google.maps.places.Autocomplete(dropInput);

  autocompletePickup.bindTo("bounds", map);
  autocompleteDrop.bindTo("bounds", map);

  autocompletePickup.addListener("place_changed", () => {
    if (pickupInput.disabled) return;  // Block if not editable
    const place = autocompletePickup.getPlace();
    if (!place.geometry) return;
    setMarker(place.geometry.location, "pickup");
  });

  autocompleteDrop.addListener("place_changed", () => {
    const place = autocompleteDrop.getPlace();
    if (!place.geometry) return;
    setMarker(place.geometry.location, "drop");
  });

  generateDummyMarkers();
};

async function fetchUserLocation(email) {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const location = userData.location;
    return { lat: location.latitude, lng: location.longitude };
  } else {
    console.error('User not found in Firestore');
    return null;
  }
}

riderSelect.addEventListener('change', async function () {
    const riderEmail = riderSelect.value;
    currentLocationButton.disabled = riderEmail !== currentUser.email;
  
    if (riderEmail === currentUser.email) {
      getCurrentLocationAndSet();
    } else {
      const location = await fetchUserLocation(riderEmail);
      if (location) {
        const userLatLng = new google.maps.LatLng(location.lat, location.lng);
        pickupInput.value = `${riderEmail}'s Location`;
        setMarker(userLatLng, "pickup");
        map.panTo(userLatLng);
      } else {
        alert("User location not found in Firestore.");
      }
    }
  });
  

function setMarker(location, type) {
  if (type === "pickup") {
    if (pickupMarker) pickupMarker.setMap(null);
    pickupMarker = new google.maps.Marker({ position: location, map, label: "P" });
  } else if (type === "drop") {
    if (dropMarker) dropMarker.setMap(null);
    dropMarker = new google.maps.Marker({ position: location, map, label: "D" });
  }

  map.panTo(location);
  if (pickupMarker && dropMarker) calculateAndDisplayRoute();
}

function calculateAndDisplayRoute() {
  directionsService.route(
    {
      origin: pickupMarker.getPosition(),
      destination: dropMarker.getPosition(),
      travelMode: google.maps.TravelMode.DRIVING,
    },
    (response, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(response);
        const distance = response.routes[0].legs[0].distance.value / 1000;
        const price = (distance * 30).toFixed(2);
        distanceDisplay.textContent = `Distance: ${distance.toFixed(2)} km`;
        priceDisplay.textContent = `Estimated Price: ₹${price}`;
      } else {
        alert("Directions request failed: " + status);
      }
    }
  );
}

function addMarker(location, label) {
  const marker = new google.maps.Marker({ position: location, map, label });
  markers.push(marker);
}

function clearMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}

function generateDummyMarkers() {
  clearMarkers();
  if (!userGroup || !userGroup.members) return;
  const members = userGroup.members.filter(m => m !== currentUser.email);

  members.forEach((member, index) => {
    const offsetLat = (Math.random() - 0.5) * 0.1;
    const offsetLng = (Math.random() - 0.5) * 0.1;
    const dummyLatLng = {
      lat: baseBangaloreCoords.lat + offsetLat,
      lng: baseBangaloreCoords.lng + offsetLng
    };
    addMarker(dummyLatLng, member.charAt(0));
  });

  map.setCenter(baseBangaloreCoords);
}

async function updateUserLocationInFirestore(location) {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", currentUser.email));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const userDoc = snapshot.docs[0];
    const userRef = doc(db, "users", userDoc.id);

    await updateDoc(userRef, {
      location: new GeoPoint(location.lat, location.lng)
    });
  }
}

function getCurrentLocationAndSet() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const currentLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        pickupInput.value = "Current Location";
        setMarker(currentLoc, "pickup");
        await updateUserLocationInFirestore(currentLoc);
      },
      () => alert("Unable to fetch your location.")
    );
  } else {
    alert("Geolocation is not supported by your browser.");
  }
}

currentLocationButton.addEventListener('click', getCurrentLocationAndSet);

rideForm.addEventListener('submit', async function(event) {
  event.preventDefault();

  const rider = riderSelect.value;
  const pickup = pickupInput.value;
  const drop = dropInput.value;

  if (!rider || !pickup || !drop) {
    confirmation.textContent = "Please fill all fields.";
    return;
  }

  const distanceText = distanceDisplay.textContent.replace("Distance: ", "").replace(" km", "");
  const priceText = priceDisplay.textContent.replace("Estimated Price: ₹", "");

  try {
    const rideRef = await addDoc(collection(db, "rides"), {
      rider: rider,
      pickup: pickup,
      drop: drop,
      distance: `${distanceText} km`,
      price: `₹${priceText}`,
      bookedBy: currentUser.email,
      groupId: userGroup?.groupId || "unknown",
      status: "booked",
      timestamp: serverTimestamp()
    });

    confirmation.textContent = `Ride booked for ${rider} from ${pickup} to ${drop}. Redirecting...`;

    setTimeout(() => {
      window.location.href = `track.html?rideId=${rideRef.id}`;
    }, 2000);

  } catch (err) {
    console.error("Failed to book ride:", err);
    confirmation.textContent = "Booking failed. Please try again.";
  }
});
