// Firebase SDK Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc
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
let map, directionsService, directionsRenderer;
let pickupMarker, dropMarker;
let markers = [];

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
    window.initMap(); // Call map init only after group loaded
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
    groupMembers = userGroup.members;

    groupMembers.forEach(member => {
      const option = document.createElement('option');
      option.value = member;
      option.textContent = member;
      riderSelect.appendChild(option);
    });
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

  const autocompletePickup = new google.maps.places.Autocomplete(pickupInput);
  const autocompleteDrop = new google.maps.places.Autocomplete(dropInput);

  autocompletePickup.bindTo("bounds", map);
  autocompleteDrop.bindTo("bounds", map);

  autocompletePickup.addListener("place_changed", () => {
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

// Fetch the user's location from Firestore
async function fetchUserLocation(email) {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email)); // Query by email
    const snapshot = await getDocs(q);
  
    if (!snapshot.empty) {
      // Assuming there's only one user with that email
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      const location = userData.location; // This is a GeoPoint
  
      // Return the latitude and longitude as an object
      return {
        lat: location.latitude,
        lng: location.longitude
      };
    } else {
      console.error('User not found in Firestore');
      return null;
    }
  }
  
  
  // Handle rider selection and update pickup location
riderSelect.addEventListener('change', async function () {
    const riderEmail = riderSelect.value;
  
    if (riderEmail === "Myself") {
      getCurrentLocation();
    } else {
      // Fetch the selected user's location from Firestore
      const location = await fetchUserLocation(riderEmail);
  
      if (location) {
        // Create a Google Maps LatLng object using the fetched coordinates
        const userLatLng = new google.maps.LatLng(location.lat, location.lng); 
  
        pickupInput.value = `${riderEmail}'s Location`; // Show rider location in the input field
  
        setMarker(userLatLng, "pickup"); // Place the pickup marker on the map
        map.panTo(userLatLng); // Center the map on the selected user's location
  
        // Update the pickupLocation global variable
        pickupLocation = userLatLng;
        if (dropMarker) calculateAndDisplayRoute(); // Recalculate route if drop marker exists
      } else {
        alert("User location not found in Firestore.");
      }
    }
  });
  

function setMarker(location, type) {
  if (type === "pickup") {
    if (pickupMarker) pickupMarker.setMap(null);
    pickupMarker = new google.maps.Marker({
      position: location,
      map,
      label: "P",
    });
  } else if (type === "drop") {
    if (dropMarker) dropMarker.setMap(null);
    dropMarker = new google.maps.Marker({
      position: location,
      map,
      label: "D",
    });
  }

  map.panTo(location);

  if (pickupMarker && dropMarker) {
    calculateAndDisplayRoute();
  }
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
        window.alert("Directions request failed: " + status);
      }
    }
  );
}

function addMarker(location, label) {
  const marker = new google.maps.Marker({
    position: location,
    map: map,
    label: label,
  });
  markers.push(marker);
}

function clearMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}

function generateDummyMarkers() {
  clearMarkers();

  if (!userGroup || !userGroup.members) return;

  const members = userGroup.members.filter(m => m !== "Myself");

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

rideForm.addEventListener('submit', function(event) {
  event.preventDefault();
  const rider = riderSelect.value;
  const pickup = pickupInput.value;
  const drop = dropInput.value;

  confirmation.textContent = `Ride booked for ${rider} from ${pickup} to ${drop}.`;
});

currentLocationButton.addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        pickupInput.value = "Current Location";
        setMarker(currentLoc, "pickup");
      },
      () => {
        alert("Unable to fetch your location.");
      }
    );
  } else {
    alert("Geolocation is not supported by your browser.");
  }
});
