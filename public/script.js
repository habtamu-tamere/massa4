        // API Base URL - Change this to your backend URL
        const API_BASE_URL = 'http://localhost:5000/api';

        // Current state
        let currentPage = 1;
        const itemsPerPage = 10;
        let loggedInUser = null;
        let selectedMassager = null;
        let currentBooking = null;
        let userRole = 'client';

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

        // API Service functions
        const apiService = {
            // Generic API request function
            async request(endpoint, options = {}) {
                const url = `${API_BASE_URL}${endpoint}`;
                const config = {
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    ...options
                };

                // Add auth token if available
                if (loggedInUser && loggedInUser.token) {
                    config.headers.Authorization = `Bearer ${loggedInUser.token}`;
                }

                try {
                    const response = await fetch(url, config);
                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.message || 'API request failed');
                    }

                    return data;
                } catch (error) {
                    console.error('API request error:', error);
                    throw error;
                }
            },

            // Auth endpoints
            async register(userData) {
                return this.request('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify(userData)
                });
            },

            async login(credentials) {
                return this.request('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify(credentials)
                });
            },

            async getCurrentUser() {
                return this.request('/auth/me');
            },

            async updateUserDetails(userData) {
                return this.request('/auth/updatedetails', {
                    method: 'PUT',
                    body: JSON.stringify(userData)
                });
            },

            // Massager endpoints
            async getMassagers(page = 1, limit = 10, filters = {}) {
                const queryParams = new URLSearchParams({
                    page,
                    limit,
                    ...filters
                });
                
                return this.request(`/massagers?${queryParams}`);
            },

            async getMassager(id) {
                return this.request(`/massagers/${id}`);
            },

            async getMassagerAvailability(id, date) {
                return this.request(`/massagers/${id}/availability?date=${date}`);
            },

            // Booking endpoints
            async createBooking(bookingData) {
                return this.request('/bookings', {
                    method: 'POST',
                    body: JSON.stringify(bookingData)
                });
            },

            async getBookings(status = '') {
                const endpoint = status ? `/bookings?status=${status}` : '/bookings';
                return this.request(endpoint);
            },

            async getBooking(id) {
                return this.request(`/bookings/${id}`);
            },

            async updateBookingStatus(id, status, reason = '') {
                return this.request(`/bookings/${id}/status`, {
                    method: 'PUT',
                    body: JSON.stringify({ status, cancellationReason: reason })
                });
            },

            // Payment endpoints
            async initializePayment(bookingId, phone) {
                return this.request('/payments/initialize', {
                    method: 'POST',
                    body: JSON.stringify({ bookingId, phone })
                });
            },

            async verifyPayment(transactionId) {
                return this.request('/payments/verify', {
                    method: 'POST',
                    body: JSON.stringify({ transactionId })
                });
            },

            async getPaymentHistory() {
                return this.request('/payments/history');
            }
        };

        // Initialize the app
        async function init() {
            await checkAuthStatus();
            await renderMassagers();
            setupEventListeners();
            generateManifest();
        }

        // Render massagers for current page
        async function renderMassagers() {
            try {
                massagersContainer.innerHTML = '<div class="loading">Loading massagers...</div>';
                
                const response = await apiService.getMassagers(currentPage, itemsPerPage);
                
                if (response.data && response.data.length > 0) {
                    massagersContainer.innerHTML = '';
                    const fragment = document.createDocumentFragment();
                    
                    response.data.forEach(massager => {
                        const card = document.createElement('div');
                        card.className = 'massager-card';
                        card.innerHTML = `
                            <div class="massager-image">${getGenderEmoji(massager.gender)}</div>
                            <div class="massager-info">
                                <h3 class="massager-name">${escapeHtml(massager.name)}</h3>
                                <div class="massager-specialty">Specialty: ${escapeHtml(massager.services.join(', '))}</div>
                                <div class="massager-rating">Rating: ${massager.rating} ⭐ (${massager.totalRatings} reviews)</div>
                                <div class="massager-location">Location: ${escapeHtml(massager.location)}</div>
                                <div class="massager-availability">Available: ${escapeHtml(massager.availability)}</div>
                                <div class="massager-price">Price: ${massager.profile?.basePrice || 500} ETB/hr</div>
                            </div>
                            <div class="card-actions">
                                <button class="btn btn-outline view-profile-btn" data-id="${massager._id}">View Profile</button>
                                <button class="btn btn-primary book-btn" data-id="${massager._id}">Book Now</button>
                            </div>
                        `;
                        fragment.appendChild(card);
                    });
                    
                    massagersContainer.appendChild(fragment);
                    
                    // Add event listeners to the buttons
                    document.querySelectorAll('.book-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const massagerId = this.getAttribute('data-id');
                            openBookingModal(massagerId);
                        });
                    });
                    
                    renderPagination(response.pagination);
                } else {
                    massagersContainer.innerHTML = '<div class="no-results">No massagers found. Please try different filters.</div>';
                }
            } catch (error) {
                console.error('Error loading massagers:', error);
                massagersContainer.innerHTML = `<div class="error">Error loading massagers: ${error.message}</div>`;
            }
        }

        // Render pagination controls
        function renderPagination(pagination) {
            paginationElement.innerHTML = '';
            
            if (!pagination || !pagination.next && !pagination.prev) return;
            
            // Previous button
            if (pagination.prev) {
                const prevBtn = document.createElement('button');
                prevBtn.textContent = 'Previous';
                prevBtn.addEventListener('click', () => {
                    currentPage = pagination.prev.page;
                    renderMassagers();
                    window.scrollTo(0, 0);
                });
                paginationElement.appendChild(prevBtn);
            }
            
            // Page numbers
            if (pagination.pages > 1) {
                for (let i = 1; i <= pagination.pages; i++) {
                    const pageBtn = document.createElement('button');
                    pageBtn.textContent = i;
                    if (i === currentPage) {
                        pageBtn.classList.add('active');
                    }
                    pageBtn.addEventListener('click', () => {
                        currentPage = i;
                        renderMassagers();
                        window.scrollTo(0, 0);
                    });
                    paginationElement.appendChild(pageBtn);
                }
            }
            
            // Next button
            if (pagination.next) {
                const nextBtn = document.createElement('button');
                nextBtn.textContent = 'Next';
                nextBtn.addEventListener('click', () => {
                    currentPage = pagination.next.page;
                    renderMassagers();
                    window.scrollTo(0, 0);
                });
                paginationElement.appendChild(nextBtn);
            }
        }

        // Open booking modal
        async function openBookingModal(massagerId) {
            try {
                const response = await apiService.getMassager(massagerId);
                selectedMassager = response.data;
                
                const bookingDetails = document.getElementById('booking-details');
                bookingDetails.innerHTML = `
                    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                        <div style="font-size: 3rem; margin-right: 15px;">${getGenderEmoji(selectedMassager.gender)}</div>
                        <div>
                            <h3>${escapeHtml(selectedMassager.name)}</h3>
                            <p>Specialty: ${escapeHtml(selectedMassager.services.join(', '))}</p>
                            <p>Price: ${selectedMassager.profile?.basePrice || 500} ETB/hr</p>
                        </div>
                    </div>
                `;
                
                // Set minimum date to today
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('booking-date').setAttribute('min', today);
                
                bookingModal.style.display = 'flex';
            } catch (error) {
                console.error('Error loading massager details:', error);
                alert(`Error: ${error.message}`);
            }
        }

        // Setup event listeners
        function setupEventListeners() {
            // Auth buttons
            loginBtn.addEventListener('click', () => loginModal.style.display = 'flex');
            registerBtn.addEventListener('click', () => registerModal.style.display = 'flex');
            bookNowBtn.addEventListener('click', () => {
                if (loggedInUser) {
                    document.getElementById('massagers').scrollIntoView({ behavior: 'smooth' });
                } else {
                    loginModal.style.display = 'flex';
                }
            });
            
            // Role selection
            document.querySelectorAll('.role-option').forEach(option => {
                option.addEventListener('click', function() {
                    document.querySelectorAll('.role-option').forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    userRole = this.getAttribute('data-role');
                    
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
        async function checkAuthStatus() {
            const token = localStorage.getItem('dimple_token');
            const userData = localStorage.getItem('dimple_user');
            
            if (token && userData) {
                try {
                    loggedInUser = JSON.parse(userData);
                    loggedInUser.token = token;
                    
                    // Verify token is still valid
                    await apiService.getCurrentUser();
                    updateAuthUI();
                } catch (error) {
                    console.error('Token validation failed:', error);
                    localStorage.removeItem('dimple_token');
                    localStorage.removeItem('dimple_user');
                    loggedInUser = null;
                }
            }
        }

        // Update UI based on authentication status
        function updateAuthUI() {
            if (loggedInUser) {
                loginBtn.textContent = 'Profile';
                registerBtn.style.display = 'none';
                
                loginBtn.removeEventListener('click', () => loginModal.style.display = 'flex');
                loginBtn.addEventListener('click', () => {
                    document.getElementById('profile-info').innerHTML = `
                        <div class="form-group">
                            <label>Name</label>
                            <div>${escapeHtml(loggedInUser.name)}</div>
                        </div>
                        <div class="form-group">
                            <label>Phone</label>
                            <div>${escapeHtml(loggedInUser.phone)}</div>
                        </div>
                        <div class="form-group">
                            <label>Role</label>
                            <div>${escapeHtml(loggedInUser.role)}</div>
                        </div>
                        ${loggedInUser.role === 'massager' ? `
                        <div class="form-group">
                            <label>Services</label>
                            <div>${escapeHtml(loggedInUser.services.join(', ') || 'Not specified')}</div>
                        </div>
                        <div class="form-group">
                            <label>Location</label>
                            <div>${escapeHtml(loggedInUser.location || 'Not specified')}</div>
                        </div>
                        ` : ''}
                    `;
                    profileModal.style.display = 'flex';
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
            
            if (!phone || !password) {
                alert('Please enter both phone number and password');
                return;
            }
            
            try {
                const response = await apiService.login({ phone, password });
                
                if (response.success) {
                    loggedInUser = response.data;
                    
                    // Store token and user data
                    localStorage.setItem('dimple_token', loggedInUser.token);
                    localStorage.setItem('dimple_user', JSON.stringify(loggedInUser));
                    
                    loginModal.style.display = 'none';
                    updateAuthUI();
                    alert('Login successful!');
                }
            } catch (error) {
                alert(`Login failed: ${error.message}`);
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
            
            // Add massager-specific fields if applicable
            if (userRole === 'massager') {
                userData.services = document.getElementById('register-services').value.split(',').map(s => s.trim());
                userData.gender = document.getElementById('register-gender').value;
                userData.location = document.getElementById('register-location').value;
                userData.availability = document.getElementById('register-availability').value;
            }
            
            try {
                const response = await apiService.register(userData);
                
                if (response.success) {
                    loggedInUser = response.data;
                    
                    // Store token and user data
                    localStorage.setItem('dimple_token', loggedInUser.token);
                    localStorage.setItem('dimple_user', JSON.stringify(loggedInUser));
                    
                    registerModal.style.display = 'none';
                    updateAuthUI();
                    alert('Registration successful! You are now logged in.');
                }
            } catch (error) {
                alert(`Registration failed: ${error.message}`);
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
                // Create booking object
                const bookingData = {
                    massagerId: selectedMassager._id,
                    service: selectedMassager.services[0],
                    date: new Date(`${date}T${time}`).toISOString(),
                    startTime: time,
                    duration: 60, // Default 1 hour
                    location: selectedMassager.location || 'Client specified location'
                };
                
                const response = await apiService.createBooking(bookingData);
                
                if (response.success) {
                    currentBooking = response.data;
                    
                    // Show payment modal
                    const paymentDetails = document.getElementById('payment-details');
                    paymentDetails.innerHTML = `
                        <div style="margin-bottom: 1rem;">
                            <h3>Booking Summary</h3>
                            <p>Massager: ${escapeHtml(selectedMassager.name)}</p>
                            <p>Date: ${date}</p>
                            <p>Time: ${time}</p>
                            <p><strong>Total: ${currentBooking.totalAmount} ETB</strong></p>
                        </div>
                    `;
                    
                    bookingModal.style.display = 'none';
                    paymentModal.style.display = 'flex';
                }
            } catch (error) {
                alert(`Booking failed: ${error.message}`);
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
                // Initialize payment
                const response = await apiService.initializePayment(currentBooking._id, telebirrPhone);
                
                if (response.success) {
                    // Simulate payment processing (in a real app, this would redirect to payment gateway)
                    alert(`Processing Telebirr payment from ${telebirrPhone} for ${currentBooking.totalAmount} ETB...`);
                    
                    // Simulate payment verification after delay
                    setTimeout(async () => {
                        try {
                            const verifyResponse = await apiService.verifyPayment(response.data.transactionId);
                            
                            if (verifyResponse.success) {
                                paymentModal.style.display = 'none';
                                
                                // Show rating modal
                                const ratingDetails = document.getElementById('rating-details');
                                ratingDetails.innerHTML = `
                                    <div style="margin-bottom: 1rem;">
                                        <h3>Thank you for your booking!</h3>
                                        <p>Your booking with ${escapeHtml(selectedMassager.name)} has been confirmed.</p>
                                        <p>We hope you enjoy your massage experience.</p>
                                    </div>
                                `;
                                
                                ratingModal.style.display = 'flex';
                            }
                        } catch (error) {
                            alert(`Payment verification failed: ${error.message}`);
                        }
                    }, 2000);
                }
            } catch (error) {
                alert(`Payment initialization failed: ${error.message}`);
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
            
            // In a real implementation, this would call the rating API endpoint
            alert('Thank you for your feedback!');
            ratingModal.style.display = 'none';
            
            // Share to Telegram channel (simulated)
            shareToTelegram();
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
            console.log(`Sharing booking to Telegram channel @lelaworker`);
        }

        // Handle logout
        function handleLogout() {
            loggedInUser = null;
            localStorage.removeItem('dimple_token');
            localStorage.removeItem('dimple_user');
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

        // Utility functions
        function escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        }

        function getGenderEmoji(gender) {
            return gender === 'female' ? '💆‍♀️' : '💆‍♂️';
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