// Firebase SDK Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  updateDoc,
  setDoc,
  onSnapshot,
  deleteDoc,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

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

// HTML Elements
let map;
let cabMarker, destMarker;
let directionsService;
let directionsRenderer;
let routePath = [];
let currentStep = 0;
let intervalId;

const rideInfoDiv = document.getElementById('ride-info');
const rideStatus = document.getElementById('ride-status');
const startBtn = document.getElementById('start-ride');
const endBtn = document.getElementById('end-ride');

// Get rideId from URL or fallback to latest ongoing ride
const urlParams = new URLSearchParams(window.location.search);
let rideId = urlParams.get('rideId');
let currentUser = null;

// Auth state listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    if (!rideId) {
      const members = await getGroupMembers(user.email);
      rideId = await findOngoingRideForUserGroup(members);
    }

    if (!rideId) {
      alert("No rides found for this user or group.");
      return;
    }

    getRideDetails();
  } else {
    alert("Please log in to view ride.");
  }
});

// Get group members from Firestore where current user is in the group
async function getGroupMembers(email) {
  const q = query(collection(db, 'groups'), where('members', 'array-contains', email));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    return snapshot.docs[0].data().members;
  }
  return [email]; // Fallback: only current user
}

// Search rides for any group member with startTime set and endTime null
async function findOngoingRideForUserGroup(members) {
  for (const member of members) {
    console.log(`Checking rides for member: ${member}`);

    // Try to find an ongoing ride first
    const ongoingQuery = query(
      collection(db, "rides"),
      where("rider", "==", member),
      where("startTime", "!=", null),
      where("endTime", "==", null)
    );
    const ongoingSnapshot = await getDocs(ongoingQuery);
    if (!ongoingSnapshot.empty) {
      console.log("Found ongoing ride.");
      return ongoingSnapshot.docs[0].id;
    }

    // If no ongoing ride, fetch latest completed ride
    const recentQuery = query(
      collection(db, "rides"),
      where("rider", "==", member),
      orderBy("startTime", "desc"),
      limit(1)
    );
    const recentSnapshot = await getDocs(recentQuery);
    if (!recentSnapshot.empty) {
      console.log("Found most recent completed ride.");
      return recentSnapshot.docs[0].id;
    }
  }
  return null;
}

// Fetch ride details and initialize tracking
async function getRideDetails() {
  try {
    const rideDoc = await getDoc(doc(db, "rides", rideId));
    if (rideDoc.exists()) {
      const rideData = rideDoc.data();
      displayRideInfo(rideData);

      const riderEmail = rideData.rider;
      const pickupLocation = await getUserLocationByEmail(riderEmail);
      const dropLocation = await geocodeAddress(rideData.drop);

      if (pickupLocation && dropLocation) {
        initMap(pickupLocation, dropLocation);
        listenToLiveLocation(); // Real-time cab updates
      }
    } else {
      alert("Ride not found.");
    }
  } catch (err) {
    console.error("Failed to fetch ride details:", err);
  }
}

// Get user's location from Firestore
async function getUserLocationByEmail(email) {
  const q = query(collection(db, "users"), where("email", "==", email));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return snapshot.docs[0].data().location;
  }
  return null;
}

// UI: Display ride info
function displayRideInfo(rideData) {
  rideInfoDiv.innerHTML = `
    <p><strong>Rider:</strong> ${rideData.rider}</p>
    <p><strong>Pickup:</strong> ${rideData.pickup}</p>
    <p><strong>Drop:</strong> ${rideData.drop}</p>
    <p><strong>Distance:</strong> ${rideData.distance}</p>
    <p><strong>Price:</strong> ${rideData.price}</p>
  `;

  const status = rideData.endTime ? "Completed"
              : rideData.startTime ? "On the Way"
              : "Not Picked Up";
  updateRideStatus(status);
}

// Convert address to lat/lng
function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK") {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        reject("Geocoding failed");
      }
    });
  });
}

// Initialize map and markers
function initMap(pickup, drop) {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 14,
    center: { lat: pickup.latitude, lng: pickup.longitude }
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map });

  const request = {
    origin: new google.maps.LatLng(pickup.latitude, pickup.longitude),
    destination: new google.maps.LatLng(drop.lat, drop.lng),
    travelMode: google.maps.TravelMode.DRIVING
  };

  directionsService.route(request, (result, status) => {
    if (status === "OK") {
      directionsRenderer.setDirections(result);
      const steps = result.routes[0].legs[0].steps;
      routePath = [];
      steps.forEach(step => {
        routePath.push(...step.path);
      });
      currentStep = 0;

      cabMarker = new google.maps.Marker({
        position: routePath[0],
        map,
        icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        title: "Cab"
      });

      destMarker = new google.maps.Marker({
        position: routePath[routePath.length - 1],
        map,
        icon: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
        title: "Destination"
      });

      map.setCenter(routePath[0]);
    }
  });
}

// Start ride
startBtn.addEventListener("click", async () => {
  updateRideStatus("On the Way");
  startBtn.disabled = true;
  endBtn.disabled = false;

  await updateDoc(doc(db, "rides", rideId), {
    startTime: Timestamp.now()
  });

  intervalId = setInterval(updateCabPosition, 1000);
});

// End ride
endBtn.addEventListener("click", async () => {
  clearInterval(intervalId);
  updateRideStatus("Completed");
  cabMarker.setPosition(destMarker.getPosition());
  startBtn.disabled = true;
  endBtn.disabled = true;

  await updateDoc(doc(db, "rides", rideId), {
    endTime: Timestamp.now()
  });

  await deleteDoc(doc(db, "rides", rideId, "liveLocation", "current"));
});

// Animate cab movement
function updateCabPosition() {
  if (currentStep >= routePath.length) {
    clearInterval(intervalId);
    updateRideStatus("Completed");
    return;
  }
  const nextPos = routePath[currentStep];
  cabMarker.setPosition(nextPos);
  map.panTo(nextPos);
  currentStep++;

  shareLiveLocation(nextPos);
}

// Upload cab's current location
async function shareLiveLocation(position) {
  await setDoc(doc(db, "rides", rideId, "liveLocation", "current"), {
    lat: position.lat(),
    lng: position.lng(),
    timestamp: Timestamp.now()
  });
}

// Watch for live updates
function listenToLiveLocation() {
  const locRef = doc(db, "rides", rideId, "liveLocation", "current");
  onSnapshot(locRef, (docSnap) => {
    if (docSnap.exists()) {
      const loc = docSnap.data();
      if (cabMarker) {
        cabMarker.setPosition({ lat: loc.lat, lng: loc.lng });
        map.panTo({ lat: loc.lat, lng: loc.lng });
      }
    }
  });
}

// Update status text
function updateRideStatus(status) {
  rideStatus.textContent = `Status: ${status}`;
  rideStatus.style.color = status === "Completed" ? "green" : "orange";
}
