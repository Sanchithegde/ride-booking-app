let map;
let cabMarker, destMarker;
let routePath = [];
let currentStep = 0;
let intervalId;

const ride = JSON.parse(localStorage.getItem('currentRide'));
const rideInfoDiv = document.getElementById('ride-info');
const rideStatus = document.getElementById('ride-status');
const startBtn = document.getElementById('start-ride');
const endBtn = document.getElementById('end-ride');

// Populate ride info
rideInfoDiv.innerHTML = `
  <p><strong>Rider:</strong> ${ride.rider}</p>
  <p><strong>From:</strong> ${ride.pickup}</p>
  <p><strong>To:</strong> ${ride.drop}</p>
  <p><strong>Distance:</strong> ${ride.distance}</p>
  <p><strong>Price:</strong> ${ride.price}</p>
`;

window.initMap = function () {
  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer();

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 14,
    center: { lat: 12.9716, lng: 77.5946 }, // fallback location
  });

  directionsRenderer.setMap(map);

  // Get coordinates using directions API
  directionsService.route(
    {
      origin: ride.pickup,
      destination: ride.drop,
      travelMode: google.maps.TravelMode.DRIVING,
    },
    (response, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(response);

        // Extract path
        const legs = response.routes[0].legs[0];
        const steps = legs.steps;
        steps.forEach((step) => {
          const segment = step.path;
          routePath.push(...segment);
        });

        // Place cab at start
        cabMarker = new google.maps.Marker({
          position: routePath[0],
          map: map,
          icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
          title: "Cab",
        });

        // Destination marker
        destMarker = new google.maps.Marker({
          position: routePath[routePath.length - 1],
          map: map,
          icon: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
          title: "Destination",
        });

        map.setCenter(routePath[0]);
      } else {
        console.error("Directions request failed due to " + status);
      }
    }
  );
};

// Start simulation
startBtn.addEventListener("click", () => {
  rideStatus.innerText = "Status: On Ride";
  startBtn.disabled = true;
  endBtn.disabled = false;

  intervalId = setInterval(() => {
    if (currentStep >= routePath.length) {
      clearInterval(intervalId);
      rideStatus.innerText = "Status: Reached Destination";
      return;
    }

    cabMarker.setPosition(routePath[currentStep]);
    map.panTo(routePath[currentStep]);
    currentStep++;
  }, 1000); // update every second
});

// End ride
endBtn.addEventListener("click", () => {
  clearInterval(intervalId);
  rideStatus.innerText = "Status: Ride Completed";
  startBtn.disabled = true;
  endBtn.disabled = true;
});
