import { BACKEND_URL } from "./config.js";
const backendUrl = BACKEND_URL || 'http://localhost:3000';

// Reference Elements
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const submitBtn = document.getElementById('submitBtn');
const toggleLink = document.getElementById('toggleLink');
const registerFields = document.getElementById('registerFields');
const modalTitle = document.getElementById('modalTitle');
const catalogArea = document.querySelector('.container');

let isLoginMode = true;
let currentUser = null; // Track logged-in user

// 1. Toggle Login/Register Fields
toggleLink.onclick = (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    modalTitle.innerText = isLoginMode ? "Welcome Back" : "Create Account";
    submitBtn.innerText = isLoginMode ? "Continue" : "Register Now";
    registerFields.classList.toggle('hidden', isLoginMode);
    toggleLink.innerText = isLoginMode ? "Register here" : "Login here";
};

// 2. Open/Close Modal
loginBtn.onclick = () => loginModal.style.display = "flex";
document.getElementById('closeModal').onclick = () => loginModal.style.display = "none";

// 3. Login/Register Logic
submitBtn.onclick = async () => {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const email = document.getElementById('regEmail').value;

    if (!user || !pass || (!isLoginMode && !email)) {
        alert("Please fill in all fields.");
        return;
    }

    if (isLoginMode) {
        // Login with database
        try {
            const res = await fetch(`${backendUrl}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const data = await res.json();
            if (res.ok) {
                loginSuccess(data.user);
                // Load user's borrowed books
                loadUserBorrowedBooks(data.user.id);
            } else {
                alert(data.error || "Invalid credentials.");
            }
        } catch (err) {
            console.error(err);
            alert("Login failed.");
        }
    } else {
        // Register with database
        try {
            const res = await fetch(`${backendUrl}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass, email: email })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Account created! Please login.");
                toggleLink.click();
            } else {
                alert(data.error || "Registration failed.");
            }
        } catch (err) {
            console.error(err);
            alert("Registration failed.");
        }
    }
};

function loginSuccess(user) {
    currentUser = user;
    catalogArea.classList.remove('content-hidden');
    loginModal.style.display = "none";
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('regEmail').value = '';
    loginBtn.innerText = `Logout (${user.username})`;
    loginBtn.onclick = () => {
        currentUser = null;
        location.reload();
    };
}

// Load borrowed books for current user
async function loadUserBorrowedBooks(userId) {
    try {
        const res = await fetch(`${backendUrl}/api/user/${userId}/borrowed`);
        const borrowedBooks = await res.json();
        console.log('User borrowed books:', borrowedBooks);
        // This data can be displayed in a user profile/dashboard if desired
    } catch (err) {
        console.error('Failed to load borrowed books:', err);
    }
}

// 4. Update Stats Board
function updateStats() {
    const total = document.querySelectorAll('.book-card').length;
    const avail = document.querySelectorAll('.status.available').length;
    const borro = document.querySelectorAll('.status.borrow').length;

    document.getElementById('total-count').innerText = total;
    document.getElementById('available-count').innerText = avail;
    document.getElementById('borrowed-count').innerText = borro;
}

// Initial Run
updateStats();

// Add this logic inside your toggleLink.onclick function
toggleLink.onclick = (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    // Update visuals
    modalTitle.innerText = isLoginMode ? "Welcome Back" : "Create Account";
    document.getElementById('modalSubtitle').innerText = isLoginMode 
        ? "Please enter your details to access the library." 
        : "Join our community to borrow and track books.";
        
    submitBtn.innerText = isLoginMode ? "Continue" : "Register Now";
    registerFields.classList.toggle('hidden', isLoginMode);
    
    toggleText.innerHTML = isLoginMode 
        ? 'Don\'t have an account? <a href="#" id="toggleLink">Create one now</a>'
        : 'Already have an account? <a href="#" id="toggleLink">Sign in here</a>';

    // Important: Re-attach listener to the new link we just created in innerHTML
    document.getElementById('toggleLink').onclick = toggleLink.onclick;
};