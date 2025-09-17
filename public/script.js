// Current state
let currentPage = 1;
const itemsPerPage = 10;
let loggedInUser = null;
let selectedMassager = null;
let currentBooking = null;
let userRole = 'client';

// API base URL
const API_BASE_URL = window.location.origin + '/api';

// DOM elements
const massagersContainer = document.getElementById('massagers-container');
const paginationElement = document.getElementById('pagination');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const bookingModal = document.getElementById('booking-modal');
const paymentModal = document.getElementById('payment-modal');
const ratingModal = document.getElementById('rating-modal');
const profileModal = document.getElementById('profile-modal');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const bookNowBtn = document.getElementById('book-now-btn');
const installBtn = document.getElementById('install-btn');
const logoutBtn = document.getElementById('logout-btn');
const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');
const proceedToPaymentBtn = document.getElementById('proceed-to-payment');
const confirmPaymentBtn = document.getElementById('confirm-payment');
const submitRatingBtn = document.getElementById('submit-rating');

// Initialize the app
async function init() {
    await renderMassagers();
    renderPagination();
    setupEventListeners();
    checkAuthStatus();
    generateManifest();
}

// Get authentication token
function getAuthToken() {
    return localStorage.getItem('dimple_token');
}

// API request helper
async function apiRequest(url, options = {}) {
    const token = getAuthToken();
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const response = await fetch(`${API_BASE_URL}${url}`, { ...defaultOptions, ...options });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'API request failed');
    }
    
    return data;
}

// Render massagers for current page
async function renderMassagers() {
    try {
        massagersContainer.innerHTML = '<div class="loading">Loading massagers...</div>';
        
        const data = await apiRequest(`/massagers?page=${currentPage}&limit=${itemsPerPage}`);
        
        massagersContainer.innerHTML = '';
        
        if (data.data.length === 0) {
            massagersContainer.innerHTML = '<div class="no-results">No massagers available</div>';
            return;
        }
        
        data.data.forEach(massager => {
            const card = document.createElement('div');
            card.className = 'massager-card';
            card.innerHTML = `
                <div class="massager-image">${massager.gender === 'male' ? '💆‍♂️' : '💆‍♀️'}</div>
                <div class="massager-info">
                    <h3 class="massager-name">${massager.name}</h3>
                    <div class="massager-specialty">Specialty: ${massager.services.join(', ')}</div>
                    <div class="massager-rating">Rating: ${massager.rating} ⭐ (${massager.totalRatings} reviews)</div>
                    <div class="massager-location">Location: ${massager.location}</div>
                    <div class="massager-availability">Available: ${massager.availability}</div>
                    <div class="massager-price">Price: ${massager.pricePerHour} ETB/hr</div>
                </div>
                <div class="card-actions">
                    <button class="btn btn-outline view-profile-btn" data-id="${massager._id}">View Profile</button>
                    <button class="btn btn-primary book-btn" data-id="${massager._id}">Book Now</button>
                </div>
            `;
            massagersContainer.appendChild(card);
        });
        
        // Add event listeners to the buttons
        document.querySelectorAll('.book-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const massagerId = this.getAttribute('data-id');
                openBookingModal(massagerId);
            });
        });
        
        // Update total pages for pagination
        window.totalPages = data.pages;
        
    } catch (error) {
        console.error('Error loading massagers:', error);
        massagersContainer.innerHTML = `<div class="error">Error loading massagers: ${error.message}</div>`;
    }
}

// Render pagination controls
function renderPagination() {
    const totalPages = window.totalPages || 1;
    paginationElement.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Previous';
        prevBtn.addEventListener('click', async () => {
            currentPage--;
            await renderMassagers();
            renderPagination();
            window.scrollTo(0, 0);
        });
        paginationElement.appendChild(prevBtn);
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        if (i === currentPage) {
            pageBtn.classList.add('active');
        }
        pageBtn.addEventListener('click', async () => {
            currentPage = i;
            await renderMassagers();
            renderPagination();
            window.scrollTo(0, 0);
        });
        paginationElement.appendChild(pageBtn);
    }
    
    // Next button
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.addEventListener('click', async () => {
            currentPage++;
            await renderMassagers();
            renderPagination();
            window.scrollTo(0, 0);
        });
        paginationElement.appendChild(nextBtn);
    }
}

// Open booking modal
async function openBookingModal(massagerId) {
    try {
        const data = await apiRequest(`/massagers/${massagerId}`);
        selectedMassager = data.data;
        
        const bookingDetails = document.getElementById('booking-details');
        bookingDetails.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                <div style="font-size: 3rem; margin-right: 15px;">${selectedMassager.gender === 'male' ? '💆‍♂️' : '💆‍♀️'}</div>
                <div>
                    <h3>${selectedMassager.name}</h3>
                    <p>Specialty: ${selectedMassager.services.join(', ')}</p>
                    <p>Price: ${selectedMassager.pricePerHour} ETB/hr</p>
                </div>
            </div>
        `;
        
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('booking-date').setAttribute('min', today);
        
        bookingModal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading massager details:', error);
        alert('Error loading massager details: ' + error.message);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Auth buttons
    loginBtn.addEventListener('click', () => loginModal.style.display = 'flex');
    registerBtn.addEventListener('click', () => registerModal.style.display = 'flex');
    bookNowBtn.addEventListener('click', () => {
        if (loggedInUser) {
            // If logged in, scroll to massagers section
            document.getElementById('massagers').scrollIntoView({ behavior: 'smooth' });
        } else {
            // If not logged in, open login modal
            loginModal.style.display = 'flex';
        }
    });
    
    // Role selection
    document.querySelectorAll('.role-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.role-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            userRole = this.getAttribute('data-role');
            
            // Show/hide massager-specific fields
            const massagerFields = document.getElementById('massager-fields');
            massagerFields.style.display = userRole === 'massager' ? 'block' : 'none';
        });
    });
    
    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            loginModal.style.display = 'none';
            registerModal.style.display = 'none';
            bookingModal.style.display = 'none';
            paymentModal.style.display = 'none';
            ratingModal.style.display = 'none';
            profileModal.style.display = 'none';
        });
    });
    
    // Switch between login and register modals
    switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginModal.style.display = 'none';
        registerModal.style.display = 'flex';
    });
    
    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerModal.style.display = 'none';
        loginModal.style.display = 'flex';
    });
    
    // Form submissions
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    
    // Payment and sharing
    proceedToPaymentBtn.addEventListener('click', handleProceedToPayment);
    confirmPaymentBtn.addEventListener('click', handlePayment);
    submitRatingBtn.addEventListener('click', handleRating);
    
    document.querySelectorAll('.share-button').forEach(btn => {
        btn.addEventListener('click', function() {
            const platform = this.getAttribute('data-platform');
            shareBooking(platform);
        });
    });
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // PWA installation
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        installBtn.style.display = 'block';
        installBtn.addEventListener('click', () => {
            e.prompt();
            installBtn.style.display = 'none';
        });
    });
}

// Check authentication status
function checkAuthStatus() {
    const userData = localStorage.getItem('dimple_user');
    const token = localStorage.getItem('dimple_token');
    
    if (userData && token) {
        loggedInUser = JSON.parse(userData);
        updateAuthUI();
    }
}

// Update UI based on authentication status
function updateAuthUI() {
    if (loggedInUser) {
        loginBtn.textContent = 'Profile';
        registerBtn.style.display = 'none';
        
        loginBtn.removeEventListener('click', () => loginModal.style.display = 'flex');
        loginBtn.addEventListener('click', async () => {
            try {
                // Fetch updated user data
                const data = await apiRequest('/auth/me');
                loggedInUser = data.user;
                localStorage.setItem('dimple_user', JSON.stringify(loggedInUser));
                
                // Show profile
                document.getElementById('profile-info').innerHTML = `
                    <div class="form-group">
                        <label>Name</label>
                        <div>${loggedInUser.name}</div>
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <div>${loggedInUser.phone}</div>
                    </div>
                    <div class="form-group">
                        <label>Role</label>
                        <div>${loggedInUser.role}</div>
                    </div>
                    ${loggedInUser.role === 'massager' ? `
                    <div class="form-group">
                        <label>Services</label>
                        <div>${loggedInUser.services.join(', ') || 'Not specified'}</div>
                    </div>
                    <div class="form-group">
                        <label>Location</label>
                        <div>${loggedInUser.location || 'Not specified'}</div>
                    </div>
                    ` : ''}
                `;
                profileModal.style.display = 'flex';
            } catch (error) {
                console.error('Error fetching user profile:', error);
                alert('Error loading profile: ' + error.message);
            }
        });
    } else {
        loginBtn.textContent = 'Login';
        registerBtn.style.display = 'block';
        
        loginBtn.removeEventListener('click', () => profileModal.style.display = 'flex');
        loginBtn.addEventListener('click', () => loginModal.style.display = 'flex');
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    const phone = document.getElementById('login-phone').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ phone, password })
        });
        
        if (data.success) {
            localStorage.setItem('dimple_token', data.token);
            localStorage.setItem('dimple_user', JSON.stringify(data.user));
            
            loggedInUser = data.user;
            loginModal.style.display = 'none';
            updateAuthUI();
            alert('Login successful!');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    const userData = {
        name,
        phone,
        password,
        role: userRole
    };
    
    if (userRole === 'massager') {
        userData.services = document.getElementById('register-services').value.split(',').map(s => s.trim());
        userData.gender = document.getElementById('register-gender').value;
        userData.location = document.getElementById('register-location').value;
        userData.availability = document.getElementById('register-availability').value;
        userData.pricePerHour = parseInt(document.getElementById('register-price').value);
    }
    
    try {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (data.success) {
            localStorage.setItem('dimple_token', data.token);
            localStorage.setItem('dimple_user', JSON.stringify(data.user));
            
            loggedInUser = data.user;
            registerModal.style.display = 'none';
            updateAuthUI();
            alert('Registration successful! You are now logged in.');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed: ' + error.message);
    }
}

// Handle proceed to payment
async function handleProceedToPayment() {
    if (!loggedInUser) {
        alert('Please login to book a massage');
        loginModal.style.display = 'flex';
        return;
    }
    
    const date = document.getElementById('booking-date').value;
    const time = document.getElementById('booking-time').value;
    
    if (!date || !time) {
        alert('Please select both date and time');
        return;
    }
    
    try {
        const bookingData = {
            massagerId: selectedMassager._id,
            date,
            time,
            duration: 1 // Default to 1 hour
        };
        
        const data = await apiRequest('/bookings', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
        
        currentBooking = data.data;
        
        // Show payment modal
        const paymentDetails = document.getElementById('payment-details');
        paymentDetails.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <h3>Booking Summary</h3>
                <p>Massager: ${selectedMassager.name}</p>
                <p>Date: ${date}</p>
                <p>Time: ${time}</p>
                <p><strong>Total: ${currentBooking.totalPrice} ETB</strong></p>
            </div>
        `;
        
        bookingModal.style.display = 'none';
        paymentModal.style.display = 'flex';
    } catch (error) {
        console.error('Booking error:', error);
        alert('Booking failed: ' + error.message);
    }
}

// Handle payment
async function handlePayment() {
    const telebirrPhone = document.getElementById('telebirr-phone').value;
    
    if (!telebirrPhone) {
        alert('Please enter your Telebirr phone number');
        return;
    }
    
    try {
        // In a real implementation, this would integrate with Telebirr API
        alert(`Processing Telebirr payment from ${telebirrPhone} for ${currentBooking.totalPrice} ETB...`);
        
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update booking status to confirmed
        const data = await apiRequest(`/bookings/${currentBooking._id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'confirmed' })
        });
        
        currentBooking = data.data;
        
        paymentModal.style.display = 'none';
        
        // Show rating modal
        const ratingDetails = document.getElementById('rating-details');
        ratingDetails.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <h3>Thank you for your booking!</h3>
                <p>Your booking with ${selectedMassager.name} has been confirmed.</p>
                <p>We hope you enjoy your massage experience.</p>
            </div>
        `;
        
        ratingModal.style.display = 'flex';
    } catch (error) {
        console.error('Payment error:', error);
        alert('Payment failed: ' + error.message);
    }
}

// Handle rating submission
async function handleRating() {
    const rating = document.querySelector('input[name="rating"]:checked');
    const reviewText = document.getElementById('review-text').value;
    
    if (!rating) {
        alert('Please select a rating');
        return;
    }
    
    try {
        const ratingData = {
            bookingId: currentBooking._id,
            rating: parseInt(rating.value),
            review: reviewText
        };
        
        await apiRequest('/ratings', {
            method: 'POST',
            body: JSON.stringify(ratingData)
        });
        
        ratingModal.style.display = 'none';
        alert('Thank you for your feedback!');
        
        // Share to Telegram channel (simulated)
        shareToTelegram();
    } catch (error) {
        console.error('Rating error:', error);
        alert('Rating submission failed: ' + error.message);
    }
}

// Share booking
function shareBooking(platform) {
    const message = `I just booked a massage session with ${selectedMassager.name} on Dimple!`;
    let url = '';
    
    switch(platform) {
        case 'telegram':
            url = `https://t.me/share/url?url=https://dimple.com&text=${encodeURIComponent(message)}`;
            break;
        case 'whatsapp':
            url = `https://wa.me/?text=${encodeURIComponent(message)}`;
            break;
    }
    
    window.open(url, '_blank');
}

// Share to Telegram channel
function shareToTelegram() {
    // In a real implementation, this would use the Telegram Bot API
    console.log(`Sharing booking to Telegram channel @lelaworker`);
    // This would typically be done on the server side for security
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('dimple_token');
    localStorage.removeItem('dimple_user');
    loggedInUser = null;
    profileModal.style.display = 'none';
    updateAuthUI();
    alert('You have been logged out');
}

// Generate PWA manifest
function generateManifest() {
    const manifest = {
        "name": "Dimple - Massager Booking",
        "short_name": "Dimple",
        "description": "Book professional massagers with secure Telebirr payments",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#4CAF50",
        "theme_color": "#4CAF50",
        "icons": [
            {
                "src": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💆</text></svg>",
                "sizes": "192x192",
                "type": "image/svg+xml"
            },
            {
                "src": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💆</text></svg>",
                "sizes": "512x512",
                "type": "image/svg+xml"
            }
        ]
    };
    
    const manifestBlob = new Blob([JSON.stringify(manifest)], {type: 'application/json'});
    const manifestURL = URL.createObjectURL(manifestBlob);
    document.getElementById('app-manifest').setAttribute('href', manifestURL);
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('SW registered: ', registration);
        }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
    });
}

// Initialize the app
init();

