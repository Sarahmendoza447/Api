
var map;
var markers = [];
var currentLocationMarker = null;

window.onload = function() {
    initializeMap();
};

function initializeMap() {
    map = L.map('map').setView([14.09, 120.68], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    map.on('click', function(e) {
        var lat = e.latlng.lat.toFixed(6);
        var lng = e.latlng.lng.toFixed(6);
        
        var popup = L.popup()
            .setLatLng(e.latlng)
            .setContent('<b>Location Details</b><br/>Loading address...<br/>Latitude: ' + lat + '<br/>Longitude: ' + lng)
            .openOn(map);
        
        // Fetch the address for this location
        fetchAddress(lat, lng)
            .then(function(address) {
                popup.setContent('<b>Location Details</b><br/><b>Address:</b> ' + address + '<br/>Latitude: ' + lat + '<br/>Longitude: ' + lng);
            })
            .catch(function(error) {
                popup.setContent('<b>Location Details</b><br/><b>Address:</b> Unable to fetch address<br/>Latitude: ' + lat + '<br/>Longitude: ' + lng);
            });
    });
    
    alert('Map initialized successfully!');
}

function searchLocation() {
    var searchTerm = document.getElementById('searchInput').value;
    if (!searchTerm) {
        alert('Please enter a location to search for!');
        return;
    }
    
    var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(searchTerm) + '&limit=1';
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                
                if (data.length > 0) {
                    var location = data[0];
                    var lat = parseFloat(location.lat);
                    var lng = parseFloat(location.lon);
                    
                    map.setView([lat, lng], 15);
                    
                    var marker = L.marker([lat, lng]).addTo(map);
                    marker.bindPopup('<b>Search Result</b><br/>' + location.display_name + '<br/>Lat: ' + lat.toFixed(6) + ', Lng: ' + lng.toFixed(6));
                    marker.openPopup();
                    
                    markers.push(marker);
                    alert('Location found: ' + location.display_name);
                } else {
                    alert('Location not found. Please try a different search term.');
                }
            } else {
                alert('Error searching for location. Please try again.');
            }
        }
    };
    
    xhr.send();
}

function getCurrentLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by this browser.');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            var lat = position.coords.latitude;
            var lng = position.coords.longitude;
            
            map.setView([lat, lng], 15);
            
            if (currentLocationMarker) {
                map.removeLayer(currentLocationMarker);
            }
            
            currentLocationMarker = L.marker([lat, lng])
                .addTo(map)
                .bindPopup('<b>Your Location</b><br/>Lat: ' + lat.toFixed(6) + '<br/>Lng: ' + lng.toFixed(6) + '<br/>Accuracy: ±' + position.coords.accuracy.toFixed(0) + ' meters')
                .openPopup();
            
            alert('Current location found!');
        },
        function(error) {
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
            
            alert(errorMsg);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

function addMarker() {
    var center = map.getCenter();
    var lat = center.lat.toFixed(6);
    var lng = center.lng.toFixed(6);
    
    var marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup('<b>Custom Marker</b><br/>Added at: ' + lat + ', ' + lng + '<br/>Click to remove this marker');
    
    marker.on('click', function() {
        if (confirm('Remove this marker?')) {
            map.removeLayer(marker);
            for (var i = 0; i < markers.length; i++) {
                if (markers[i] === marker) {
                    markers.splice(i, 1);
                    break;
                }
            }
        }
    });
    
    markers.push(marker);
    alert('Marker added at: ' + lat + ', ' + lng);
}

function clearMarkers() {
    if (markers.length === 0) {
        alert('No markers to clear!');
        return;
    }
    
    if (confirm('Remove all ' + markers.length + ' markers?')) {
        for (var i = 0; i < markers.length; i++) {
            map.removeLayer(markers[i]);
        }
        markers = [];
        alert('All markers cleared');
    }
}


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