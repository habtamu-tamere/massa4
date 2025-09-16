        // Use strict mode for better error handling
        'use strict';

        // Constants and configuration
        const CONFIG = {
            ITEMS_PER_PAGE: 10,
            SERVICES: ['Swedish Massage', 'Deep Tissue', 'Aromatherapy', 'Hot Stone', 'Thai Massage', 'Shiatsu', 'Reflexology'],
            LOCATIONS: ['Addis Ababa', 'Dire Dawa', 'Hawassa', 'Bahir Dar', 'Gondar', 'Mekelle', 'Adama'],
            STORAGE_KEYS: {
                USERS: 'dimple_users',
                USER: 'dimple_user',
                BOOKINGS: 'dimple_bookings',
                RATINGS: 'dimple_ratings'
            }
        };

        // Sample data for massagers
        const massagers = generateMassagers(30);

        // Current state
        let currentPage = 1;
        let loggedInUser = null;
        let selectedMassager = null;
        let currentBooking = null;
        let userRole = 'client';
        let deferredPrompt = null; // For PWA installation

        // DOM elements cache
        const domElements = {
            massagersContainer: document.getElementById('massagers-container'),
            paginationElement: document.getElementById('pagination'),
            loginModal: document.getElementById('login-modal'),
            registerModal: document.getElementById('register-modal'),
            bookingModal: document.getElementById('booking-modal'),
            paymentModal: document.getElementById('payment-modal'),
            ratingModal: document.getElementById('rating-modal'),
            profileModal: document.getElementById('profile-modal'),
            loginBtn: document.getElementById('login-btn'),
            registerBtn: document.getElementById('register-btn'),
            bookNowBtn: document.getElementById('book-now-btn'),
            installBtn: document.getElementById('install-btn'),
            logoutBtn: document.getElementById('logout-btn'),
            switchToRegister: document.getElementById('switch-to-register'),
            switchToLogin: document.getElementById('switch-to-login'),
            proceedToPaymentBtn: document.getElementById('proceed-to-payment'),
            confirmPaymentBtn: document.getElementById('confirm-payment'),
            submitRatingBtn: document.getElementById('submit-rating')
        };

        // Utility functions
        const utils = {
            // Generate unique ID
            generateId: () => Date.now().toString(36) + Math.random().toString(36).substr(2),
            
            // Format currency
            formatCurrency: (amount) => `${amount} ETB`,
            
            // Escape HTML to prevent XSS
            escapeHtml: (text) => {
                const map = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                };
                return text.replace(/[&<>"']/g, (m) => map[m]);
            },
            
            // Validate phone number (Ethiopian format)
            validatePhone: (phone) => /^\+251[0-9]{9}$/.test(phone),
            
            // Show loading state on button
            setButtonLoading: (button, isLoading) => {
                const btn = typeof button === 'string' ? document.getElementById(button) : button;
                if (!btn) return;
                
                const btnText = btn.querySelector('.btn-text');
                const loading = btn.querySelector('.loading');
                
                if (isLoading) {
                    btn.disabled = true;
                    if (btnText) btnText.style.display = 'none';
                    if (loading) loading.style.display = 'inline-block';
                } else {
                    btn.disabled = false;
                    if (btnText) btnText.style.display = 'inline-block';
                    if (loading) loading.style.display = 'none';
                }
            },
            
            // Debounce function for performance
            debounce: (func, wait) => {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            }
        };

        // Generate sample massagers
        function generateMassagers(count) {
            const massagers = [];
            
            for (let i = 1; i <= count; i++) {
                const serviceCount = Math.floor(Math.random() * 3) + 1;
                const selectedServices = [];
                
                for (let j = 0; j < serviceCount; j++) {
                    const randomService = CONFIG.SERVICES[Math.floor(Math.random() * CONFIG.SERVICES.length)];
                    if (!selectedServices.includes(randomService)) {
                        selectedServices.push(randomService);
                    }
                }
                
                massagers.push({
                    id: i,
                    name: `Massager ${i}`,
                    specialty: selectedServices.join(', '),
                    rating: (Math.random() * 2 + 3).toFixed(1), // Random rating between 3.0 and 5.0
                    price: Math.floor(Math.random() * 1000) + 500, // Random price between 500 and 1500
                    image: `💆‍${i % 2 ? '♂' : '♀'}️`, // Alternate between male and female emoji
                    gender: i % 2 ? 'Male' : 'Female',
                    location: CONFIG.LOCATIONS[Math.floor(Math.random() * CONFIG.LOCATIONS.length)],
                    availability: 'Mon-Sat 9:00 AM - 8:00 PM',
                    reviews: Math.floor(Math.random() * 100) + 10
                });
            }
            
            return massagers;
        }

        // Main app functionality
        const app = {
            // Initialize the app
            init: function() {
                this.renderMassagers();
                this.renderPagination();
                this.setupEventListeners();
                this.checkAuthStatus();
                this.generateManifest();
                this.registerServiceWorker();
            },

            // Render massagers for current page
            renderMassagers: function() {
                const startIndex = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
                const endIndex = Math.min(startIndex + CONFIG.ITEMS_PER_PAGE, massagers.length);
                const fragment = document.createDocumentFragment();
                
                for (let i = startIndex; i < endIndex; i++) {
                    const massager = massagers[i];
                    const card = document.createElement('div');
                    card.className = 'massager-card';
                    card.innerHTML = `
                        <div class="massager-image" aria-label="${massager.gender} massager">${massager.image}</div>
                        <div class="massager-info">
                            <h3 class="massager-name">${utils.escapeHtml(massager.name)}</h3>
                            <div class="massager-specialty">Specialty: ${utils.escapeHtml(massager.specialty)}</div>
                            <div class="massager-rating">Rating: ${massager.rating} ⭐ (${massager.reviews} reviews)</div>
                            <div class="massager-location">Location: ${utils.escapeHtml(massager.location)}</div>
                            <div class="massager-availability">Available: ${utils.escapeHtml(massager.availability)}</div>
                            <div class="massager-price">Price: ${utils.formatCurrency(massager.price)}/hr</div>
                        </div>
                        <div class="card-actions">
                            <button class="btn btn-outline view-profile-btn" data-id="${massager.id}">View Profile</button>
                            <button class="btn btn-primary book-btn" data-id="${massager.id}">Book Now</button>
                        </div>
                    `;
                    fragment.appendChild(card);
                }
                
                domElements.massagersContainer.innerHTML = '';
                domElements.massagersContainer.appendChild(fragment);
                
                // Add event listeners to the buttons
                domElements.massagersContainer.querySelectorAll('.book-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const massagerId = parseInt(this.getAttribute('data-id'));
                        app.openBookingModal(massagerId);
                    });
                });
            },

            // Render pagination controls
            renderPagination: function() {
                const totalPages = Math.ceil(massagers.length / CONFIG.ITEMS_PER_PAGE);
                domElements.paginationElement.innerHTML = '';
                
                if (totalPages <= 1) return;
                
                const fragment = document.createDocumentFragment();
                
                // Previous button
                if (currentPage > 1) {
                    const prevBtn = document.createElement('button');
                    prevBtn.textContent = 'Previous';
                    prevBtn.addEventListener('click', () => {
                        currentPage--;
                        this.renderMassagers();
                        this.renderPagination();
                        window.scrollTo(0, 0);
                    });
                    fragment.appendChild(prevBtn);
                }
                
                // Page numbers
                for (let i = 1; i <= totalPages; i++) {
                    const pageBtn = document.createElement('button');
                    pageBtn.textContent = i;
                    if (i === currentPage) {
                        pageBtn.classList.add('active');
                    }
                    pageBtn.addEventListener('click', () => {
                        currentPage = i;
                        this.renderMassagers();
                        this.renderPagination();
                        window.scrollTo(0, 0);
                    });
                    fragment.appendChild(pageBtn);
                }
                
                // Next button
                if (currentPage < totalPages) {
                    const nextBtn = document.createElement('button');
                    nextBtn.textContent = 'Next';
                    nextBtn.addEventListener('click', () => {
                        currentPage++;
                        this.renderMassagers();
                        this.renderPagination();
                        window.scrollTo(0, 0);
                    });
                    fragment.appendChild(nextBtn);
                }
                
                domElements.paginationElement.appendChild(fragment);
            },

            // Open booking modal
            openBookingModal: function(massagerId) {
                selectedMassager = massagers.find(m => m.id === massagerId);
                if (!selectedMassager) return;
                
                const bookingDetails = document.getElementById('booking-details');
                bookingDetails.innerHTML = `
                    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                        <div style="font-size: 3rem; margin-right: 15px;" aria-label="${selectedMassager.gender} massager">${selectedMassager.image}</div>
                        <div>
                            <h3>${utils.escapeHtml(selectedMassager.name)}</h3>
                            <p>Specialty: ${utils.escapeHtml(selectedMassager.specialty)}</p>
                            <p>Price: ${utils.formatCurrency(selectedMassager.price)}/hr</p>
                        </div>
                    </div>
                `;
                
                // Set minimum date to today
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('booking-date').setAttribute('min', today);
                
                app.showModal(domElements.bookingModal);
            },

            // Setup event listeners
            setupEventListeners: function() {
                // Auth buttons
                domElements.loginBtn.addEventListener('click', () => app.showModal(domElements.loginModal));
                domElements.registerBtn.addEventListener('click', () => app.showModal(domElements.registerModal));
                domElements.bookNowBtn.addEventListener('click', () => {
                    if (loggedInUser) {
                        // If logged in, scroll to massagers section
                        document.getElementById('massagers').scrollIntoView({ behavior: 'smooth' });
                    } else {
                        // If not logged in, open login modal
                        app.showModal(domElements.loginModal);
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
                    
                    // Add keyboard support
                    option.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            option.click();
                        }
                    });
                });
                
                // Close modals
                document.querySelectorAll('.close-modal').forEach(btn => {
                    btn.addEventListener('click', () => app.closeAllModals());
                });
                
                // Close modal when clicking outside
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) {
                            app.closeAllModals();
                        }
                    });
                });
                
                // Switch between login and register modals
                domElements.switchToRegister.addEventListener('click', (e) => {
                    e.preventDefault();
                    domElements.loginModal.style.display = 'none';
                    app.showModal(domElements.registerModal);
                });
                
                domElements.switchToLogin.addEventListener('click', (e) => {
                    e.preventDefault();
                    domElements.registerModal.style.display = 'none';
                    app.showModal(domElements.loginModal);
                });
                
                // Form submissions
                document.getElementById('login-form').addEventListener('submit', (e) => app.handleLogin(e));
                document.getElementById('register-form').addEventListener('submit', (e) => app.handleRegister(e));
                
                // Payment and sharing
                domElements.proceedToPaymentBtn.addEventListener('click', () => app.handleProceedToPayment());
                domElements.confirmPaymentBtn.addEventListener('click', () => app.handlePayment());
                domElements.submitRatingBtn.addEventListener('click', () => app.handleRating());
                
                document.querySelectorAll('.share-button').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const platform = this.getAttribute('data-platform');
                        app.shareBooking(platform);
                    });
                    
                    // Add keyboard support
                    btn.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            btn.click();
                        }
                    });
                });
                
                // Payment method selection
                document.querySelectorAll('.payment-method').forEach(method => {
                    method.addEventListener('click', function() {
                        document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
                        this.classList.add('selected');
                    });
                    
                    // Add keyboard support
                    method.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            method.click();
                        }
                    });
                });
                
                // Logout
                domElements.logoutBtn.addEventListener('click', () => app.handleLogout());
                
                // PWA installation
                window.addEventListener('beforeinstallprompt', (e) => {
                    e.preventDefault();
                    deferredPrompt = e;
                    domElements.installBtn.style.display = 'block';
                    domElements.installBtn.addEventListener('click', () => {
                        if (deferredPrompt) {
                            deferredPrompt.prompt();
                            deferredPrompt.userChoice.then((choiceResult) => {
                                if (choiceResult.outcome === 'accepted') {
                                    console.log('User accepted the install prompt');
                                }
                                deferredPrompt = null;
                            });
                        }
                        domElements.installBtn.style.display = 'none';
                    });
                });
                
                // Escape key to close modals
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        app.closeAllModals();
                    }
                });
            },

            // Show modal with accessibility support
            showModal: function(modal) {
                // Close any open modals first
                app.closeAllModals();
                
                modal.style.display = 'flex';
                modal.setAttribute('aria-hidden', 'false');
                
                // Focus on first interactive element
                const focusableElement = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusableElement) {
                    focusableElement.focus();
                }
                
                // Trap focus inside modal
                app.trapFocus(modal);
            },

            // Close all modals
            closeAllModals: function() {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                    modal.setAttribute('aria-hidden', 'true');
                });
            },

            // Trap focus inside modal for accessibility
            trapFocus: function(modal) {
                const focusableElements = modal.querySelectorAll('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])');
                const firstFocusableElement = focusableElements[0];
                const lastFocusableElement = focusableElements[focusableElements.length - 1];
                
                const handleTabKey = (e) => {
                    if (e.key !== 'Tab') return;
                    
                    if (e.shiftKey) {
                        if (document.activeElement === firstFocusableElement) {
                            e.preventDefault();
                            lastFocusableElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastFocusableElement) {
                            e.preventDefault();
                            firstFocusableElement.focus();
                        }
                    }
                };
                
                modal.addEventListener('keydown', handleTabKey);
                
                // Store the event handler to remove it later
                modal._keydownHandler = handleTabKey;
            },

            // Check authentication status
            checkAuthStatus: function() {
                try {
                    const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
                    if (userData) {
                        loggedInUser = JSON.parse(userData);
                        this.updateAuthUI();
                    }
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
                }
            },

            // Update UI based on authentication status
            updateAuthUI: function() {
                if (loggedInUser) {
                    domElements.loginBtn.textContent = 'Profile';
                    domElements.registerBtn.style.display = 'none';
                    
                    domElements.loginBtn.removeEventListener('click', () => app.showModal(domElements.loginModal));
                    domElements.loginBtn.addEventListener('click', () => {
                        // Show profile instead of login
                        document.getElementById('profile-info').innerHTML = `
                            <div class="form-group">
                                <label>Name</label>
                                <div>${utils.escapeHtml(loggedInUser.name)}</div>
                            </div>
                            <div class="form-group">
                                <label>Phone</label>
                                <div>${utils.escapeHtml(loggedInUser.phone)}</div>
                            </div>
                            <div class="form-group">
                                <label>Role</label>
                                <div>${utils.escapeHtml(loggedInUser.role)}</div>
                            </div>
                            ${loggedInUser.role === 'massager' ? `
                            <div class="form-group">
                                <label>Services</label>
                                <div>${utils.escapeHtml(loggedInUser.services || 'Not specified')}</div>
                            </div>
                            <div class="form-group">
                                <label>Location</label>
                                <div>${utils.escapeHtml(loggedInUser.location || 'Not specified')}</div>
                            </div>
                            ` : ''}
                        `;
                        app.showModal(domElements.profileModal);
                    });
                } else {
                    domElements.loginBtn.textContent = 'Login';
                    domElements.registerBtn.style.display = 'block';
                    
                    domElements.loginBtn.removeEventListener('click', () => app.showModal(domElements.profileModal));
                    domElements.loginBtn.addEventListener('click', () => app.showModal(domElements.loginModal));
                }
            },

            // Handle login
            handleLogin: function(e) {
                e.preventDefault();
                const phone = document.getElementById('login-phone').value;
                const password = document.getElementById('login-password').value;
                
                // Validation
                if (!phone || !password) {
                    alert('Please enter both phone number and password');
                    return;
                }
                
                if (!utils.validatePhone(phone)) {
                    alert('Please enter a valid Ethiopian phone number (+251XXXXXXXXX)');
                    return;
                }
                
                utils.setButtonLoading('login-submit-btn', true);
                
                // Simulate API call
                setTimeout(() => {
                    try {
                        // Check if user exists in localStorage
                        const users = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USERS) || '[]');
                        const user = users.find(u => u.phone === phone && u.password === password);
                        
                        if (user) {
                            loggedInUser = user;
                            localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
                            domElements.loginModal.style.display = 'none';
                            this.updateAuthUI();
                            alert('Login successful!');
                        } else {
                            alert('Invalid credentials. Please try again.');
                        }
                    } catch (error) {
                        console.error('Login error:', error);
                        alert('An error occurred during login. Please try again.');
                    } finally {
                        utils.setButtonLoading('login-submit-btn', false);
                    }
                }, 1000); // Simulate network delay
            },

            // Handle registration
            handleRegister: function(e) {
                e.preventDefault();
                const name = document.getElementById('register-name').value;
                const phone = document.getElementById('register-phone').value;
                const password = document.getElementById('register-password').value;
                const confirmPassword = document.getElementById('register-confirm-password').value;
                
                // Validation
                if (password !== confirmPassword) {
                    alert('Passwords do not match');
                    return;
                }
                
                if (password.length < 6) {
                    alert('Password must be at least 6 characters long');
                    return;
                }
                
                if (!utils.validatePhone(phone)) {
                    alert('Please enter a valid Ethiopian phone number (+251XXXXXXXXX)');
                    return;
                }
                
                utils.setButtonLoading('register-submit-btn', true);
                
                // Simulate API call
                setTimeout(() => {
                    try {
                        // Check if user already exists
                        const users = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USERS) || '[]');
                        if (users.some(u => u.phone === phone)) {
                            alert('User with this phone number already exists');
                            utils.setButtonLoading('register-submit-btn', false);
                            return;
                        }
                        
                        // Create new user
                        const newUser = { 
                            id: utils.generateId(),
                            name, 
                            phone, 
                            password, 
                            role: userRole,
                            createdAt: new Date().toISOString()
                        };
                        
                        // Add massager-specific fields if applicable
                        if (userRole === 'massager') {
                            newUser.services = document.getElementById('register-services').value;
                            newUser.gender = document.getElementById('register-gender').value;
                            newUser.location = document.getElementById('register-location').value;
                            newUser.availability = document.getElementById('register-availability').value;
                        }
                        
                        users.push(newUser);
                        localStorage.setItem(CONFIG.STORAGE_KEYS.USERS, JSON.stringify(users));
                        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(newUser));
                        
                        loggedInUser = newUser;
                        domElements.registerModal.style.display = 'none';
                        this.updateAuthUI();
                        alert('Registration successful! You are now logged in.');
                    } catch (error) {
                        console.error('Registration error:', error);
                        alert('An error occurred during registration. Please try again.');
                    } finally {
                        utils.setButtonLoading('register-submit-btn', false);
                    }
                }, 1000); // Simulate network delay
            },

            // Handle proceed to payment
            handleProceedToPayment: function() {
                if (!loggedInUser) {
                    alert('Please login to book a massage');
                    app.showModal(domElements.loginModal);
                    return;
                }
                
                const date = document.getElementById('booking-date').value;
                const time = document.getElementById('booking-time').value;
                
                if (!date || !time) {
                    alert('Please select both date and time');
                    return;
                }
                
                // Validate date is not in the past
                const selectedDateTime = new Date(`${date}T${time}`);
                if (selectedDateTime < new Date()) {
                    alert('Please select a future date and time');
                    return;
                }
                
                // Create booking object
                currentBooking = {
                    id: utils.generateId(),
                    massager: selectedMassager,
                    date,
                    time,
                    user: loggedInUser,
                    total: selectedMassager.price,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                };
                
                // Show payment modal
                const paymentDetails = document.getElementById('payment-details');
                paymentDetails.innerHTML = `
                    <div style="margin-bottom: 1rem;">
                        <h3>Booking Summary</h3>
                        <p>Massager: ${utils.escapeHtml(selectedMassager.name)}</p>
                        <p>Date: ${date}</p>
                        <p>Time: ${time}</p>
                        <p><strong>Total: ${utils.formatCurrency(selectedMassager.price)}</strong></p>
                    </div>
                `;
                
                domElements.bookingModal.style.display = 'none';
                app.showModal(domElements.paymentModal);
            },

            // Handle payment
            handlePayment: function() {
                const telebirrPhone = document.getElementById('telebirr-phone').value;
                
                if (!telebirrPhone) {
                    alert('Please enter your Telebirr phone number');
                    return;
                }
                
                if (!utils.validatePhone(telebirrPhone)) {
                    alert('Please enter a valid Ethiopian phone number (+251XXXXXXXXX)');
                    return;
                }
                
                utils.setButtonLoading('confirm-payment', true);
                
                // Simulate Telebirr payment process
                setTimeout(() => {
                    try {
                        // Update booking status
                        currentBooking.status = 'confirmed';
                        currentBooking.paymentMethod = 'Telebirr';
                        currentBooking.paymentPhone = telebirrPhone;
                        currentBooking.confirmedAt = new Date().toISOString();
                        
                        // Save booking
                        const bookings = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.BOOKINGS) || '[]');
                        bookings.push(currentBooking);
                        localStorage.setItem(CONFIG.STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
                        
                        domElements.paymentModal.style.display = 'none';
                        
                        // Show rating modal
                        const ratingDetails = document.getElementById('rating-details');
                        ratingDetails.innerHTML = `
                            <div style="margin-bottom: 1rem;">
                                <h3>Thank you for your booking!</h3>
                                <p>Your booking with ${utils.escapeHtml(selectedMassager.name)} has been confirmed.</p>
                                <p>We hope you enjoy your massage experience.</p>
                            </div>
                        `;
                        
                        app.showModal(domElements.ratingModal);
                    } catch (error) {
                        console.error('Payment error:', error);
                        alert('An error occurred during payment processing. Please try again.');
                    } finally {
                        utils.setButtonLoading('confirm-payment', false);
                    }
                }, 2000); // Simulate payment processing time
            },

            // Handle rating submission
            handleRating: function() {
                const rating = document.querySelector('input[name="rating"]:checked');
                const reviewText = document.getElementById('review-text').value;
                
                if (!rating) {
                    alert('Please select a rating');
                    return;
                }
                
                utils.setButtonLoading('submit-rating', true);
                
                // Simulate API call
                setTimeout(() => {
                    try {
                        // Save rating
                        const ratings = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.RATINGS) || '[]');
                        ratings.push({
                            id: utils.generateId(),
                            massagerId: selectedMassager.id,
                            massagerName: selectedMassager.name,
                            userId: loggedInUser.id,
                            userName: loggedInUser.name,
                            rating: rating.value,
                            review: reviewText,
                            date: new Date().toISOString()
                        });
                        
                        localStorage.setItem(CONFIG.STORAGE_KEYS.RATINGS, JSON.stringify(ratings));
                        
                        domElements.ratingModal.style.display = 'none';
                        alert('Thank you for your feedback!');
                        
                        // Share to Telegram channel (simulated)
                        app.shareToTelegram();
                    } catch (error) {
                        console.error('Rating submission error:', error);
                        alert('An error occurred while submitting your rating. Please try again.');
                    } finally {
                        utils.setButtonLoading('submit-rating', false);
                    }
                }, 500); // Simulate network delay
            },

            // Share booking
            shareBooking: function(platform) {
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
            },

            // Share to Telegram channel
            shareToTelegram: function() {
                // In a real implementation, this would use the Telegram Bot API
                console.log(`Sharing booking to Telegram channel @lelaworker`);
                // This would typically be done on the server side for security
            },

            // Handle logout
            handleLogout: function() {
                loggedInUser = null;
                localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
                domElements.profileModal.style.display = 'none';
                this.updateAuthUI();
                alert('You have been logged out');
            },

            // Generate PWA manifest
            generateManifest: function() {
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
            },

            // Register Service Worker
            registerServiceWorker: function() {
                if ('serviceWorker' in navigator) {
                    window.addEventListener('load', () => {
                        // Simple service worker for caching
                        const swContent = `
                            self.addEventListener('install', (event) => {
                                console.log('Service Worker installing.');
                            });
                            
                            self.addEventListener('activate', (event) => {
                                console.log('Service Worker activating.');
                            });
                            
                            self.addEventListener('fetch', (event) => {
                                // You can add caching strategies here
                            });
                        `;
                        
                        const swBlob = new Blob([swContent], {type: 'application/javascript'});
                        const swURL = URL.createObjectURL(swBlob);
                        
                        navigator.serviceWorker.register(swURL).then(registration => {
                            console.log('SW registered: ', registration);
                        }).catch(registrationError => {
                            console.log('SW registration failed: ', registrationError);
                        });
                    });
                }
            }
        };

        // Initialize the app
        app.init();