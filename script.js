
var map;
var markers = [];
var currentLocationMarker = null;
var routeLayer = null;
var currentLocation = null;

window.onload = function() {
    initializeMap();
};

// Show toast notification
function showMessage(message, type = 'success') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(messageDiv);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 4000);
}

// Show loading state
function showLoading(button) {
    const originalContent = button.innerHTML;
    button.innerHTML = '<div class="loading"></div> Loading...';
    button.disabled = true;
    return originalContent;
}

// Hide loading state
function hideLoading(button, originalContent) {
    button.innerHTML = originalContent;
    button.disabled = false;
}

// Initialize map with modern styling
function initializeMap() {
    map = L.map('map').setView([14.09, 120.68], 13);
    
    // Use a more modern tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Enhanced map click with better popup styling
    map.on('click', function(e) {
        var lat = e.latlng.lat.toFixed(6);
        var lng = e.latlng.lng.toFixed(6);
        
        var popup = L.popup({
            className: 'custom-popup',
            closeButton: true,
            autoClose: false
        })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="popup-content">
                <h3><i class="fas fa-map-marker-alt"></i> Location Details</h3>
                <div class="loading">Loading address...</div>
                <p><strong>Coordinates:</strong><br/>
                Lat: ${lat}<br/>Lng: ${lng}</p>
                ${currentLocation ? `<button onclick="getRouteToLocation(${lat}, ${lng})" class="route-btn">
                    <i class="fas fa-route"></i> Get Route
                </button>` : ''}
            </div>
        `)
        .openOn(map);
        
        // Fetch the address for this location
        fetchAddress(lat, lng)
            .then(function(address) {
                popup.setContent(`
                    <div class="popup-content">
                        <h3><i class="fas fa-map-marker-alt"></i> Location Details</h3>
                        <p><strong>Address:</strong><br/>${address}</p>
                        <p><strong>Coordinates:</strong><br/>
                        Lat: ${lat}<br/>Lng: ${lng}</p>
                        ${currentLocation ? `<button onclick="getRouteToLocation(${lat}, ${lng})" class="route-btn">
                            <i class="fas fa-route"></i> Get Route
                        </button>` : ''}
                    </div>
                `);
            })
            .catch(function(error) {
                popup.setContent(`
                    <div class="popup-content">
                        <h3><i class="fas fa-map-marker-alt"></i> Location Details</h3>
                        <p><strong>Address:</strong><br/>Unable to fetch address</p>
                        <p><strong>Coordinates:</strong><br/>
                        Lat: ${lat}<br/>Lng: ${lng}</p>
                        ${currentLocation ? `<button onclick="getRouteToLocation(${lat}, ${lng})" class="route-btn">
                            <i class="fas fa-route"></i> Get Route
                        </button>` : ''}
                    </div>
                `);
            });
    });
    
    showMessage('Map initialized successfully! 🗺️');
}

// Get route from current location to destination
function getRouteToLocation(destLat, destLng) {
    if (!currentLocation) {
        showMessage('Please get your current location first!', 'error');
        return;
    }
    
    const routeBtn = document.querySelector('.route-btn');
    if (routeBtn) {
        routeBtn.innerHTML = '<div class="loading"></div> Calculating...';
        routeBtn.disabled = true;
    }
    
    // Use OSRM (Open Source Routing Machine) for routing
    const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation.lng},${currentLocation.lat};${destLng},${destLat}?overview=full&geometries=geojson`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (routeBtn) {
                routeBtn.innerHTML = '<i class="fas fa-route"></i> Get Route';
                routeBtn.disabled = false;
            }
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                displayRoute(route, destLat, destLng);
            } else {
                showMessage('No route found to this location.', 'error');
            }
        })
        .catch(error => {
            if (routeBtn) {
                routeBtn.innerHTML = '<i class="fas fa-route"></i> Get Route';
                routeBtn.disabled = false;
            }
            showMessage('Error calculating route. Please try again.', 'error');
            console.error('Routing error:', error);
        });
}

// Display route on map
function displayRoute(route, destLat, destLng) {
    // Remove existing route
    if (routeLayer) {
        map.removeLayer(routeLayer);
    }
    
    // Create route layer
    routeLayer = L.geoJSON(route.geometry, {
        style: {
            color: '#667eea',
            weight: 6,
            opacity: 0.8
        }
    }).addTo(map);
    
    // Fit map to show entire route
    map.fitBounds(routeLayer.getBounds(), { padding: [20, 20] });
    
    // Calculate and display route info
    const distance = (route.distance / 1000).toFixed(1); // Convert to km
    const duration = Math.round(route.duration / 60); // Convert to minutes
    
    // Create route info popup
    const routeInfo = L.popup({
        className: 'custom-popup route-info-popup',
        closeButton: true,
        autoClose: false
    })
    .setLatLng([destLat, destLng])
    .setContent(`
        <div class="popup-content">
            <h3><i class="fas fa-route"></i> Route Information</h3>
            <div class="route-stats">
                <div class="route-stat">
                    <i class="fas fa-road"></i>
                    <span><strong>Distance:</strong> ${distance} km</span>
                </div>
                <div class="route-stat">
                    <i class="fas fa-clock"></i>
                    <span><strong>Duration:</strong> ${duration} min</span>
                </div>
            </div>
            <button onclick="clearRoute()" class="clear-route-btn">
                <i class="fas fa-times"></i> Clear Route
            </button>
        </div>
    `)
    .openOn(map);
    
    showMessage(`Route calculated! Distance: ${distance}km, Time: ${duration}min 🚗`);
}

// Clear current route
function clearRoute() {
    if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
    }
    
    // Close any open popups
    map.closePopup();
    
    showMessage('Route cleared! 🗑️');
}

// Enhanced search function with loading state
function searchLocation() {
    var searchTerm = document.getElementById('searchInput').value.trim();
    if (!searchTerm) {
        showMessage('Please enter a location to search for!', 'error');
        return;
    }
    
    const searchBtn = document.querySelector('.search-btn');
    const originalContent = showLoading(searchBtn);
    
    var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(searchTerm) + '&limit=1';
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            hideLoading(searchBtn, originalContent);
            
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                
                if (data.length > 0) {
                    var location = data[0];
                    var lat = parseFloat(location.lat);
                    var lng = parseFloat(location.lon);
                    
                    map.setView([lat, lng], 15);
                    
                    var marker = L.marker([lat, lng]).addTo(map);
                    marker.bindPopup(`
                        <div class="popup-content">
                            <h3><i class="fas fa-search"></i> Search Result</h3>
                            <p><strong>Location:</strong><br/>${location.display_name}</p>
                            <p><strong>Coordinates:</strong><br/>
                            Lat: ${lat.toFixed(6)}<br/>Lng: ${lng.toFixed(6)}</p>
                            ${currentLocation ? `<button onclick="getRouteToLocation(${lat}, ${lng})" class="route-btn">
                                <i class="fas fa-route"></i> Get Route
                            </button>` : ''}
                        </div>
                    `);
                    marker.openPopup();
                    
                    markers.push(marker);
                    showMessage(`Location found: ${location.display_name} ✅`);
                } else {
                    showMessage('Location not found. Please try a different search term.', 'error');
                }
            } else {
                showMessage('Error searching for location. Please try again.', 'error');
            }
        }
    };
    
    xhr.send();
}

// Enhanced current location function
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showMessage('Geolocation is not supported by this browser.', 'error');
        return;
    }
    
    const locationBtn = document.querySelector('.control-btn.primary');
    const originalContent = showLoading(locationBtn);
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            hideLoading(locationBtn, originalContent);
            
            var lat = position.coords.latitude;
            var lng = position.coords.longitude;
            
            // Store current location for routing
            currentLocation = { lat: lat, lng: lng };
            
            map.setView([lat, lng], 15);
            
            if (currentLocationMarker) {
                map.removeLayer(currentLocationMarker);
            }
            
            currentLocationMarker = L.marker([lat, lng])
                .addTo(map)
                .bindPopup(`
                    <div class="popup-content">
                        <h3><i class="fas fa-location-arrow"></i> Your Location</h3>
                        <p><strong>Coordinates:</strong><br/>
                        Lat: ${lat.toFixed(6)}<br/>Lng: ${lng.toFixed(6)}</p>
                        <p><strong>Accuracy:</strong> ±${position.coords.accuracy.toFixed(0)} meters</p>
                    </div>
                `)
                .openPopup();
            
            showMessage('Current location found! 📍');
        },
        function(error) {
            hideLoading(locationBtn, originalContent);
            
            var errorMsg = 'Unable to get your location. ';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg += 'Location access denied by user.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg += 'Location information unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMsg += 'Location request timed out.';
                    break;
                default:
                    errorMsg += 'An unknown error occurred.';
                    break;
            }
            
            showMessage(errorMsg, 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// Enhanced add marker function
function addMarker() {
    var center = map.getCenter();
    var lat = center.lat.toFixed(6);
    var lng = center.lng.toFixed(6);
    
    var marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup(`
        <div class="popup-content">
            <h3><i class="fas fa-map-pin"></i> Custom Marker</h3>
            <p><strong>Added at:</strong><br/>
            Lat: ${lat}<br/>Lng: ${lng}</p>
            <p><em>Click to remove this marker</em></p>
            ${currentLocation ? `<button onclick="getRouteToLocation(${lat}, ${lng})" class="route-btn">
                <i class="fas fa-route"></i> Get Route
            </button>` : ''}
        </div>
    `);
    
    marker.on('click', function() {
        if (confirm('Remove this marker?')) {
            map.removeLayer(marker);
            for (var i = 0; i < markers.length; i++) {
                if (markers[i] === marker) {
                    markers.splice(i, 1);
                    break;
                }
            }
            showMessage('Marker removed! 🗑️');
        }
    });
    
    markers.push(marker);
    showMessage(`Marker added at: ${lat}, ${lng} 📌`);
}

// Enhanced clear markers function
function clearMarkers() {
    if (markers.length === 0) {
        showMessage('No markers to clear!', 'error');
        return;
    }
    
    if (confirm(`Remove all ${markers.length} markers?`)) {
        for (var i = 0; i < markers.length; i++) {
            map.removeLayer(markers[i]);
        }
        markers = [];
        showMessage('All markers cleared! 🧹');
    }
}

// Enhanced address fetching
function fetchAddress(lat, lng) {
    return fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(function(data) {
            return data.display_name || "Address not found";
        })
        .catch(function(error) {
            console.error('Error fetching address:', error);
            return "Unable to fetch address";
        });
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && document.activeElement.id === 'searchInput') {
        searchLocation();
    }
});

// Add CSS for custom popup styling
const style = document.createElement('style');
style.textContent = `
    .custom-popup .leaflet-popup-content-wrapper {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 15px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .custom-popup .leaflet-popup-content {
        margin: 15px;
        font-family: 'Inter', sans-serif;
    }
    
    .popup-content h3 {
        color: #667eea;
        margin-bottom: 10px;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .popup-content p {
        margin: 8px 0;
        line-height: 1.4;
    }
    
    .popup-content strong {
        color: #333;
    }
    
    .custom-popup .leaflet-popup-tip {
        background: rgba(255, 255, 255, 0.95);
    }
    
    .route-btn {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
        width: 100%;
        justify-content: center;
    }
    
    .route-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    
    .route-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }
    
    .clear-route-btn {
        background: linear-gradient(135deg, #f44336, #d32f2f);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
        width: 100%;
        justify-content: center;
    }
    
    .clear-route-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(244, 67, 54, 0.4);
    }
    
    .route-stats {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 10px 0;
    }
    
    .route-stat {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        background: rgba(102, 126, 234, 0.1);
        border-radius: 6px;
    }
    
    .route-stat i {
        color: #667eea;
        width: 16px;
    }
    
    .route-info-popup .leaflet-popup-content-wrapper {
        min-width: 250px;
    }
`;
document.head.appendChild(style);