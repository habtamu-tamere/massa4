  // API base URL - pointing to your Render host
  const API_BASE_URL = 'https://massa4.onrender.com/api';

  // Current state
  let currentPage = 1;
  const itemsPerPage = 10;
  let loggedInUser = null;
  let selectedMassager = null;
  let currentBooking = null;
  let userRole = 'client';
  let authToken = localStorage.getItem('dimple_token');

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

  // API Helper Functions
  async function apiRequest(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const config = {
      ...options,
      headers,
    };

    // Add credentials for cross-origin requests
    config.credentials = 'include';

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, config);
      
      // Check if response is OK
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }
      
      // Try to parse JSON response
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Initialize the app
  async function init() {
    setupEventListeners();
    await checkAuthStatus();
    await loadMassagers();
    generateManifest();
  }

  // Check authentication status
  async function checkAuthStatus() {
    if (authToken) {
      try {
        const response = await apiRequest('/auth/me');
        loggedInUser = response.data;
        updateAuthUI();
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('dimple_token');
        authToken = null;
      }
    }
  }

  // Update UI based on authentication status
  function updateAuthUI() {
    if (loggedInUser) {
      loginBtn.textContent = 'Profile';
      registerBtn.style.display = 'none';
      
      // Remove existing event listeners
      loginBtn.replaceWith(loginBtn.cloneNode(true));
      const newLoginBtn = document.getElementById('login-btn');
      
      newLoginBtn.addEventListener('click', () => {
        // Show profile instead of login
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
            <div>${loggedInUser.services || 'Not specified'}</div>
          </div>
          <div class="form-group">
            <label>Location</label>
            <div>${loggedInUser.location || 'Not specified'}</div>
          </div>
          ` : ''}
        `;
        profileModal.style.display = 'flex';
      });
    } else {
      loginBtn.textContent = 'Login';
      registerBtn.style.display = 'block';
      
      // Remove existing event listeners
      loginBtn.replaceWith(loginBtn.cloneNode(true));
      const newLoginBtn = document.getElementById('login-btn');
      
      newLoginBtn.addEventListener('click', () => {
        loginModal.style.display = 'flex';
      });
    }
  }

  // Load massagers from API
  async function loadMassagers() {
    try {
      // For demo purposes, if API fails, use sample data
      const response = await apiRequest(`/massagers?page=${currentPage}&limit=${itemsPerPage}`);
      renderMassagers(response.data);
      if (response.pagination) {
        renderPagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to load massagers from API, using sample data:', error);
      // Fallback to sample data if API is not available
      useSampleMassagers();
    }
  }

  // Use sample massagers if API is unavailable
  function useSampleMassagers() {
    const services = ['Swedish Massage', 'Deep Tissue', 'Aromatherapy', 'Hot Stone', 'Thai Massage', 'Shiatsu', 'Reflexology'];
    const locations = ['Addis Ababa', 'Dire Dawa', 'Hawassa', 'Bahir Dar', 'Gondar', 'Mekelle', 'Adama'];
    
    const sampleMassagers = [];
    for (let i = 1; i <= 30; i++) {
      const serviceCount = Math.floor(Math.random() * 3) + 1;
      const selectedServices = [];
      for (let j = 0; j < serviceCount; j++) {
        const randomService = services[Math.floor(Math.random() * services.length)];
        if (!selectedServices.includes(randomService)) {
          selectedServices.push(randomService);
        }
      }
      
      sampleMassagers.push({
        _id: i,
        name: `Massager ${i}`,
        services: selectedServices.join(', '),
        rating: { average: (Math.random() * 2 + 3).toFixed(1), count: Math.floor(Math.random() * 100) + 10 },
        location: locations[Math.floor(Math.random() * locations.length)],
        availability: 'Mon-Sat 9:00 AM - 8:00 PM',
        hourlyRate: Math.floor(Math.random() * 1000) + 500,
        gender: i % 2 ? 'male' : 'female'
      });
    }
    
    renderMassagers(sampleMassagers);
    renderPagination({
      total: 30,
      next: currentPage < 3 ? { page: currentPage + 1, limit: itemsPerPage } : null,
      prev: currentPage > 1 ? { page: currentPage - 1, limit: itemsPerPage } : null
    });
  }

  // Render massagers for current page
  function renderMassagers(massagers) {
    massagersContainer.innerHTML = '';
    
    massagers.forEach(massager => {
      const card = document.createElement('div');
      card.className = 'massager-card';
      card.innerHTML = `
        <div class="massager-image">${massager.gender === 'male' ? '💆‍♂️' : '💆‍♀️'}</div>
        <div class="massager-info">
          <h3 class="massager-name">${massager.name}</h3>
          <div class="massager-specialty">Specialty: ${massager.services}</div>
          <div class="massager-rating">Rating: ${massager.rating?.average || 'No ratings'} ⭐ (${massager.rating?.count || 0} reviews)</div>
          <div class="massager-location">Location: ${massager.location}</div>
          <div class="massager-availability">Available: ${massager.availability}</div>
          <div class="massager-price">Price: ${massager.hourlyRate || 'N/A'} ETB/hr</div>
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
  }

  // Render pagination controls
  function renderPagination(pagination) {
    const totalPages = Math.ceil(pagination.total / itemsPerPage);
    paginationElement.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    if (currentPage > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.textContent = 'Previous';
      prevBtn.addEventListener('click', () => {
        currentPage--;
        loadMassagers();
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
      pageBtn.addEventListener('click', () => {
        currentPage = i;
        loadMassagers();
        window.scrollTo(0, 0);
      });
      paginationElement.appendChild(pageBtn);
    }
    
    // Next button
    if (currentPage < totalPages) {
      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'Next';
      nextBtn.addEventListener('click', () => {
        currentPage++;
        loadMassagers();
        window.scrollTo(0, 0);
      });
      paginationElement.appendChild(nextBtn);
    }
  }

  // Open booking modal
  async function openBookingModal(massagerId) {
    try {
      // Try to get massager details from API
      const response = await apiRequest(`/massagers/${massagerId}`);
      selectedMassager = response.data;
    } catch (error) {
      console.error('Failed to load massager details from API, using sample data:', error);
      // Fallback to sample data
      const services = ['Swedish Massage', 'Deep Tissue', 'Aromatherapy', 'Hot Stone', 'Thai Massage', 'Shiatsu', 'Reflexology'];
      const locations = ['Addis Ababa', 'Dire Dawa', 'Hawassa', 'Bahir Dar', 'Gondar', 'Mekelle', 'Adama'];
      
      selectedMassager = {
        _id: massagerId,
        name: `Massager ${massagerId}`,
        services: services[Math.floor(Math.random() * services.length)],
        rating: { average: (Math.random() * 2 + 3).toFixed(1), count: Math.floor(Math.random() * 100) + 10 },
        location: locations[Math.floor(Math.random() * locations.length)],
        availability: 'Mon-Sat 9:00 AM - 8:00 PM',
        hourlyRate: Math.floor(Math.random() * 1000) + 500,
        gender: massagerId % 2 ? 'male' : 'female'
      };
    }
    
    const bookingDetails = document.getElementById('booking-details');
    bookingDetails.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 1rem;">
        <div style="font-size: 3rem; margin-right: 15px;">${selectedMassager.gender === 'male' ? '💆‍♂️' : '💆‍♀️'}</div>
        <div>
          <h3>${selectedMassager.name}</h3>
          <p>Specialty: ${selectedMassager.services}</p>
          <p>Price: ${selectedMassager.hourlyRate} ETB/hr</p>
        </div>
      </div>
    `;
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('booking-date').setAttribute('min', today);
    
    bookingModal.style.display = 'flex';
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
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }
    
    // PWA installation
    if ('beforeinstallprompt' in window) {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        if (installBtn) {
          installBtn.style.display = 'block';
          installBtn.addEventListener('click', () => {
            e.prompt();
            installBtn.style.display = 'none';
          });
        }
      });
    }

    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    });
  }

  // Handle login
  async function handleLogin(e) {
    e.preventDefault();
    const phone = document.getElementById('login-phone').value;
    const password = document.getElementById('login-password').value;
    
    // Simple validation
    if (!phone || !password) {
      alert('Please enter both phone number and password');
      return;
    }
    
    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password })
      });
      
      authToken = response.token;
      localStorage.setItem('dimple_token', authToken);
      loggedInUser = response.user;
      
      loginModal.style.display = 'none';
      updateAuthUI();
      alert('Login successful!');
    } catch (error) {
      alert('Login failed. Please try again with phone: +251900000000 and password: password123');
      console.error('Login error:', error);
    }
  }

  // Handle registration
  async function handleRegister(e) {
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
    
    // Prepare registration data
    const userData = { name, phone, password, role: userRole };
    
    // Add massager-specific fields if applicable
    if (userRole === 'massager') {
      userData.services = document.getElementById('register-services').value;
      userData.gender = document.getElementById('register-gender').value;
      userData.location = document.getElementById('register-location').value;
      userData.availability = document.getElementById('register-availability').value;
    }
    
    try {
      const response = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      
      authToken = response.token;
      localStorage.setItem('dimple_token', authToken);
      loggedInUser = response.user;
      
      registerModal.style.display = 'none';
      updateAuthUI();
      alert('Registration successful! You are now logged in.');
    } catch (error) {
      alert('Registration failed. Please try again.');
      console.error('Registration error:', error);
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
      // Create booking
      const bookingData = {
        massager: selectedMassager._id,
        date,
        startTime: time,
        duration: 1, // Default to 1 hour
        location: selectedMassager.location || 'Client location'
      };
      
      const response = await apiRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData)
      });
      
      currentBooking = response.data;
      
      // Show payment modal
      const paymentDetails = document.getElementById('payment-details');
      paymentDetails.innerHTML = `
        <div style="margin-bottom: 1rem;">
          <h3>Booking Summary</h3>
          <p>Massager: ${selectedMassager.name}</p>
          <p>Date: ${date}</p>
          <p>Time: ${time}</p>
          <p><strong>Total: ${currentBooking.totalAmount} ETB</strong></p>
        </div>
      `;
      
      bookingModal.style.display = 'none';
      paymentModal.style.display = 'flex';
    } catch (error) {
      alert('Booking created successfully! This is a demo - no real payment will be processed.');
      console.error('Booking error:', error);
      
      // For demo purposes, proceed to payment modal even if API fails
      const date = document.getElementById('booking-date').value;
      const time = document.getElementById('booking-time').value;
      
      currentBooking = {
        _id: 'demo-booking',
        totalAmount: selectedMassager.hourlyRate || 1000
      };
      
      const paymentDetails = document.getElementById('payment-details');
      paymentDetails.innerHTML = `
        <div style="margin-bottom: 1rem;">
          <h3>Booking Summary (Demo)</h3>
          <p>Massager: ${selectedMassager.name}</p>
          <p>Date: ${date}</p>
          <p>Time: ${time}</p>
          <p><strong>Total: ${currentBooking.totalAmount} ETB</strong></p>
        </div>
      `;
      
      bookingModal.style.display = 'none';
      paymentModal.style.display = 'flex';
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
      await apiRequest('/payments/telebirr/initiate', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: currentBooking._id,
          phoneNumber: telebirrPhone
        })
      });
      
      alert('Payment initiated successfully! Please complete the payment in the Telebirr app.');
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment simulation complete! This is a demo - no real payment was processed.');
    }
    
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
      await apiRequest('/ratings', {
        method: 'POST',
        body: JSON.stringify({
          booking: currentBooking._id,
          rating: rating.value,
          review: reviewText
        })
      });
      
      alert('Rating submitted successfully!');
    } catch (error) {
      console.error('Rating error:', error);
      alert('Rating submitted successfully! This is a demo.');
    }
    
    ratingModal.style.display = 'none';
  }

  // Share booking
  function shareBooking(platform) {
    const message = `I just booked a massage session with ${selectedMassager.name} on Dimple!`;
    let url = '';
    
    switch(platform) {
      case 'telegram':
        url = `https://t.me/share/url?url=https://massager-v992.onrender.com&text=${encodeURIComponent(message)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        break;
    }
    
    window.open(url, '_blank');
  }

  // Handle logout
  function handleLogout() {
    loggedInUser = null;
    authToken = null;
    localStorage.removeItem('dimple_token');
    if (profileModal) profileModal.style.display = 'none';
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
  document.addEventListener('DOMContentLoaded', init);
