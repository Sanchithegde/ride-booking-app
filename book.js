let autocompletePickup, autocompleteDrop;
let directionsService, map;
let pickupLocation, dropLocation;
let markers = [];

const baseBangaloreCoords = { lat: 12.9716, lng: 77.5946 };

const pickupInput = document.getElementById('pickup');
const dropInput = document.getElementById('drop');
const riderSelect = document.getElementById('rider');
const rideForm = document.getElementById('ride-form');
const confirmation = document.getElementById('confirmation-message');
const distanceDisplay = document.getElementById('distance');
const priceDisplay = document.getElementById('price');
const currentLocationButton = document.getElementById('current-location-button');

let groupMembers = [];

function loadGroupMembers() {
  const group = JSON.parse(localStorage.getItem('userGroup'));
  if (!group || !group.members || group.members.length === 0) {
    confirmation.innerText = "No group found. Please create a group first.";
    rideForm.style.display = 'none';
    return;
  }

  groupMembers = group.members;

  group.members.forEach(member => {
    const option = document.createElement('option');
    option.value = member;
    option.textContent = member;
    riderSelect.appendChild(option);
  });
}

window.initMap = function () {
  const options = {
    types: ['geocode'],
    componentRestrictions: { country: 'IN' }
  };

  directionsService = new google.maps.DirectionsService();

  autocompletePickup = new google.maps.places.Autocomplete(pickupInput, options);
  autocompleteDrop = new google.maps.places.Autocomplete(dropInput, options);

  autocompletePickup.addListener('place_changed', () => {
    const place = autocompletePickup.getPlace();
    if (place.geometry) {
      pickupLocation = place.geometry.location;
      updateMap(pickupLocation, 'Pickup');
      if (dropLocation) calculateDistanceAndPrice();
    }
  });

  autocompleteDrop.addListener('place_changed', () => {
    const place = autocompleteDrop.getPlace();
    if (place.geometry) {
      dropLocation = place.geometry.location;
      if (pickupLocation) calculateDistanceAndPrice();
    }
  });

  map = new google.maps.Map(document.getElementById('map'), {
    center: baseBangaloreCoords,
    zoom: 12
  });

  loadGroupMembers();
  generateDummyMarkers();
};

function clearMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}

function addMarker(position, label) {
  const marker = new google.maps.Marker({
    position,
    map,
    label
  });
  markers.push(marker);
}

function updateMap(position, label) {
  clearMarkers();
  addMarker(position, label);
  map.setCenter(position);
  map.setZoom(14);
}

function getCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const currentLocation = new google.maps.LatLng(lat, lng);

      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: currentLocation }, function (results, status) {
        if (status === google.maps.GeocoderStatus.OK && results[0]) {
          pickupInput.value = results[0].formatted_address;
          pickupLocation = currentLocation;
          updateMap(currentLocation, 'Me');
          if (dropLocation) calculateDistanceAndPrice();
        } else {
          alert("Unable to get the current location address.");
        }
      });
    }, function () {
      alert("Geolocation service failed. Please enable location access.");
    });
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

function generateDummyMarkers() {
  clearMarkers();

  const group = JSON.parse(localStorage.getItem('userGroup'));
  if (!group || !group.members) return;

  const members = group.members.filter(m => m !== "Myself");

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

riderSelect.addEventListener('change', function () {
  const rider = riderSelect.value;
  if (rider === "Myself") {
    getCurrentLocation();
  } else {
    // Just locate the dummy marker position instead of actual geocode
    const index = groupMembers.findIndex(m => m === rider);
    const dummyLat = baseBangaloreCoords.lat + ((index + 1) * 0.01);
    const dummyLng = baseBangaloreCoords.lng + ((index + 1) * 0.01);

    const dummyLatLng = new google.maps.LatLng(dummyLat, dummyLng);
    pickupLocation = dummyLatLng;
    pickupInput.value = `${rider}'s Location (Dummy)`;

    updateMap(dummyLatLng, rider.charAt(0));
    if (dropLocation) calculateDistanceAndPrice();
  }
});

function calculateDistanceAndPrice() {
  const request = {
    origin: pickupLocation,
    destination: dropLocation,
    travelMode: google.maps.TravelMode.DRIVING
  };

  directionsService.route(request, function (result, status) {
    if (status === google.maps.DirectionsStatus.OK) {
      const distanceInMeters = result.routes[0].legs[0].distance.value;
      const distanceInKm = distanceInMeters / 1000;
      const price = distanceInKm * 30;

      distanceDisplay.innerText = `${distanceInKm.toFixed(2)} km`;
      priceDisplay.innerText = `₹ ${price.toFixed(2)}`;
    } else {
      console.error('Error calculating route:', status);
    }
  });
}

rideForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const rider = riderSelect.value;

  if (!pickupLocation || !dropLocation || !rider) {
    confirmation.innerText = "Please fill in all fields and select valid locations.";
    return;
  }

  const ride = {
    pickup: pickupInput.value,
    drop: dropInput.value,
    rider,
    timestamp: new Date().toISOString(),
    group: groupMembers,
    distance: distanceDisplay.innerText,
    price: priceDisplay.innerText
  };

  localStorage.setItem('currentRide', JSON.stringify(ride));

  confirmation.innerHTML = `
    ✅ Ride booked for <strong>${rider}</strong><br/>
    From <strong>${ride.pickup}</strong> to <strong>${ride.drop}</strong><br/>
    Distance: ${ride.distance} | Price: ${ride.price}<br/>
    Shared with group: ${ride.group.join(', ')}
  `;

  rideForm.reset();
  distanceDisplay.innerText = '- km';
  priceDisplay.innerText = '- INR';
  pickupLocation = null;
  dropLocation = null;
  clearMarkers();
  generateDummyMarkers();
});

currentLocationButton.addEventListener('click', getCurrentLocation);