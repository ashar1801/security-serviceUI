document.addEventListener('DOMContentLoaded', function() {
    // Event listeners for tabs
    document.getElementById('documents-tab').addEventListener('click', function() {
        setActiveTab('documents');
    });

    document.getElementById('location-tab').addEventListener('click', function() {
        setActiveTab('location');
    });

    // Event listener for emergency button
    document.querySelector('.emergency-button').addEventListener('click', function() {
        alert('Emergency button clicked!');
        // Add emergency button handling code here
    });

    // Event listener for close button on popup
    document.getElementById('closeBtn').addEventListener('click', () => {
        const popup = document.getElementById('popup');
        popup.classList.add('hide');
        popup.classList.remove('show');
        setTimeout(() => {
            popup.style.display = 'none';
        }, 500); // Sync with the fade-out transition duration
    });

    // Fetch user name and load files on page load
    fetchUserName();
    loadFiles();

    // Start the location tracking
    sendLocation();
});

// Function to handle form submission for file upload
document.getElementById('fileUploadForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const fileInput = document.getElementById('file');
    const userId = document.getElementById('userId').value;
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('userId', userId);

    showLoadingBar(); // Show loading bar when form is submitted
    const token = localStorage.getItem('token');

    fetch('http://localhost:8080/api/files/add', { // Replace with your actual endpoint
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.message.toLowerCase().includes('success')) {
            showPopup(data.message, 'success');
        } else {
            showPopup(data.message, 'error');
        }
        console.log('Success:', data);
    })
    .catch((error) => {
        showPopup('Error uploading file', 'error');
        console.error('Error:', error);
    })
    .finally(() => {
        hideLoadingBar(); // Hide loading bar when API call completes
    });
});

// Function to set active tab
function setActiveTab(tab) {
    document.querySelectorAll('nav button').forEach(button => {
        button.classList.remove('active');
    });
    document.getElementById(`${tab}-tab`).classList.add('active');

    document.querySelectorAll('main section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${tab}-section`).classList.add('active');
}

// Sidebar functions
function openNav() {
    document.getElementById("mySidebar").style.width = "250px";
}

function closeNav() {
    document.getElementById("mySidebar").style.width = "0";
}

// Logout function
function logout() {
    showLoadingBar();
    localStorage.removeItem('token');
    window.location.href = "login.html";
}

// Fetch user name
async function fetchUserName() {
    showLoadingBar();
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('http://localhost:8080/api/user/view', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if(response.status === 401){
                showPopup("Unauthorized user");
                logout();
            }
        }

        const data = await response.json();

        if (data.status) {
            document.getElementById('welcomeMessage').textContent = `HEY, ${data.data.firstName} ${data.data.lastName}`;
        } else {
            showPopup(data.message);
        }
    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error);
    } finally {
        hideLoadingBar();
    }
}

// Show popup message
function showPopup(message) {
    const popup = document.getElementById('popup');
    const popupMessage = document.getElementById('popupMessage');
    popupMessage.textContent = message;
    popup.classList.add('show');
    setTimeout(() => {
        popup.classList.add('hide');
        popup.classList.remove('show');
    }, 3000);
    setTimeout(() => {
        popup.style.display = 'none';
    }, 3500);
}

// Show/hide loading bar
function showLoadingBar() {
    document.getElementById('loadingBar').style.display = 'block';
}

function hideLoadingBar() {
    document.getElementById('loadingBar').style.display = 'none';
}

// Map functions
let map;
let marker;

function initMap(latitude, longitude) {
    const zoomLevel = 16; // Set your desired zoom level

    if (!map) {
        map = L.map('map', {
            zoomControl: false, // Disable zoom control buttons
            scrollWheelZoom: false, // Disable zoom by scrolling
            doubleClickZoom: false, // Disable zoom by double-clicking
            boxZoom: false, // Disable zoom by dragging a box
            touchZoom: false // Disable zoom by touch
        }).setView([latitude, longitude], zoomLevel);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    } else {
        map.setView([latitude, longitude], zoomLevel);
    }

    if (!marker) {
        marker = L.marker([latitude, longitude]).addTo(map);
    } else {
        marker.setLatLng([latitude, longitude]);
    }
}

async function updateLocation(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    const location = {
        latitude: latitude,
        longitude: longitude
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8080/api/location/get-live', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(location)
        });

        const data = await response.text();
        // document.getElementById('status').innerHTML = data;
        initMap(latitude, longitude);

        // Call the function again to continue tracking
        sendLocation();
    } catch (error) {
        document.getElementById('status').innerHTML = 'Error: ' + error;
    }
}

function sendLocation() {
    if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' }).then(function (permissionStatus) {
            if (permissionStatus.state === 'granted') {
                // If permission is already granted, get the location
                navigator.geolocation.getCurrentPosition(updateLocation, showError, {
                    maximumAge: 0,
                    timeout: 10000,
                    enableHighAccuracy: true
                });
            } else if (permissionStatus.state === 'prompt') {
                // Request permission if not already granted
                navigator.geolocation.getCurrentPosition(updateLocation, showError, {
                    maximumAge: 0,
                    timeout: 10000,
                    enableHighAccuracy: true
                });
            } else {
                document.getElementById('status').innerHTML = "Geolocation permission is denied.";
            }

            // Listen for changes to the permission state
            permissionStatus.onchange = function () {
                if (permissionStatus.state === 'granted') {
                    navigator.geolocation.getCurrentPosition(updateLocation, showError, {
                        maximumAge: 0,
                        timeout: 10000,
                        enableHighAccuracy: true
                    });
                }
            };
        });
    } else {
        // Fallback for browsers that do not support the permissions API
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(updateLocation, showError, {
                maximumAge: 0,
                timeout: 10000,
                enableHighAccuracy: true
            });
        } else {
            document.getElementById('status').innerHTML = "Geolocation is not supported by this browser.";
        }
    }
}

// Function to show error messages if location fetching fails
function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            document.getElementById('status').innerHTML = "User denied the request for Geolocation.";
            break;
        case error.POSITION_UNAVAILABLE:
            document.getElementById('status').innerHTML = "Location information is unavailable.";
            break;
        case error.TIMEOUT:
            document.getElementById('status').innerHTML = "The request to get user location timed out.";
            break;
        case error.UNKNOWN_ERROR:
            document.getElementById('status').innerHTML = "An unknown error occurred.";
            break;
    }
}

// Initialize map with a default location
initMap(20.5937, 78.9629); // Coordinates for India

// Function to load files from the backend
function loadFiles() {
    showLoadingBar();
    const token = localStorage.getItem('token');
    fetch('http://localhost:8080/api/files/view-all', { // Replace with your actual endpoint
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status) {
            const fileList = document.getElementById('fileList');
            fileList.innerHTML = '';
            data.data.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'document';
                fileItem.innerHTML = `<div>${file.fileName}</div>`;
                fileList.appendChild(fileItem);
                console.log(file.fileName);
            });
            const showAllBtn = document.createElement('div');
            showAllBtn.className = 'show-all';
            showAllBtn.innerText = 'SHOW ALL';
            showAllBtn.onclick = showAllDocuments;
            fileList.appendChild(showAllBtn);
        } else {
            showPopup('Error: ' + data.message, 'error');
        }
    })
    .catch((error) => {
        showPopup('Error loading files', 'error');
        console.error('Error:', error);
    })
    .finally(() => {
        hideLoadingBar();
    });
}

// Function to show all documents (implement as needed)
function showAllDocuments() {
    // Add logic to show all documents
}

// Hide the loading bar once the entire page is fully loaded
window.addEventListener('load', function() {
    hideLoadingBar();
    loadFiles();
});
