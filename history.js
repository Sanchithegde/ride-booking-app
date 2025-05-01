document.addEventListener('DOMContentLoaded', function () {
    const rideHistoryContainer = document.getElementById('ride-history');
  
    // Fetch the ride history from localStorage
    const rideHistory = JSON.parse(localStorage.getItem('rideHistory')) || [];
  
    if (rideHistory.length === 0) {
      // Display a message if there are no rides
      const message = document.createElement('p');
      message.classList.add('empty-message');
      message.textContent = 'No rides booked yet.';
      rideHistoryContainer.appendChild(message);
    } else {
      // Display each ride in the history
      rideHistory.forEach(ride => {
        const rideItem = document.createElement('div');
        rideItem.classList.add('ride-item');
  
        rideItem.innerHTML = `
          <h3>Ride for ${ride.rider}</h3>
          <p><strong>From:</strong> ${ride.pickup}</p>
          <p><strong>To:</strong> ${ride.drop}</p>
          <p class="details"><strong>Distance:</strong> ${ride.distance} | <strong>Price:</strong> ${ride.price}</p>
          <p class="details"><strong>Booked on:</strong> ${new Date(ride.timestamp).toLocaleString()}</p>
          <p class="status">${ride.status || 'Ride in Progress'}</p>
        `;
  
        rideHistoryContainer.appendChild(rideItem);
      });
    }
  });
  