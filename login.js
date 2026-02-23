import { BACKEND_URL } from "./config.js";

// 1. References
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const closeModal = document.getElementById('closeModal');
const submitBtn = document.getElementById('submitBtn');
const toggleLink = document.getElementById('toggleLink');

const registerFields = document.getElementById('registerFields');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const toggleText = document.getElementById('toggleText');

// 2. State
export let currentUser = JSON.parse(localStorage.getItem('libraryUser')) || null;
let isLoginMode = true;

// 3. Initialize UI
if (currentUser && loginBtn) {
    loginBtn.innerText = `Logout (${currentUser.username})`;
}

// 4. Open/Close Logic
if (loginBtn) {
    loginBtn.onclick = () => {
        if (currentUser) {
            localStorage.removeItem('libraryUser');
            location.reload(); // Logout
        } else {
            loginModal.style.display = "flex";
        }
    };
}

if (closeModal) {
    closeModal.onclick = () => {
        loginModal.style.display = "none";
    };
}

// Close modal if user clicks outside the white card
window.onclick = (event) => {
    if (event.target == loginModal) {
        loginModal.style.display = "none";
    }
};

// 5. Toggle Login/Register Mode
if (toggleLink) {
    toggleLink.onclick = (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;

        // Update UI
        modalTitle.innerText = isLoginMode ? "Welcome Back" : "Create Account";
        modalSubtitle.innerText = isLoginMode 
            ? "Please enter your details to access the library." 
            : "Join our community to borrow and track books.";
        
        submitBtn.innerText = isLoginMode ? "Continue" : "Register Now";
        
        // Show/Hide Email
        registerFields.classList.toggle('hidden', isLoginMode);

        // Update Footer Link Text
        toggleText.innerHTML = isLoginMode 
            ? 'Don\'t have an account? <a href="#" id="toggleLink">Create one now</a>'
            : 'Already have an account? <a href="#" id="toggleLink">Sign in here</a>';
        
        // RE-ATTACH listener because we replaced the innerHTML
        document.getElementById('toggleLink').onclick = toggleLink.onclick;
    };
}

// 6. Login/Register Submission
if (submitBtn) {
    submitBtn.onclick = async () => {
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        const email = document.getElementById('regEmail').value;

        if (!user || !pass) {
            alert("Username and Password are required.");
            return;
        }

        const endpoint = isLoginMode ? '/api/login' : '/api/register';
        const payload = isLoginMode 
            ? { username: user, password: pass } 
            : { username: user, password: pass, email: email };

        try {
            const res = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                if (isLoginMode) {
                    // Success Login
                    localStorage.setItem('libraryUser', JSON.stringify(data.user));
                    location.reload(); 
                } else {
                    // Success Register
                    alert("Account created successfully! Please log in.");
                    // Switch back to login mode automatically
                    isLoginMode = false; 
                    toggleLink.click(); 
                }
            } else {
                alert(data.error || "Authentication failed");
            }
        } catch (err) {
            console.error(err);
            alert("Connection error to server.");
        }
    };
}

// 7. Stats Function
export function updateStats(books) {
    const total = document.getElementById('total-count');
    const avail = document.getElementById('available-count');
    const borrowed = document.getElementById('borrowed-count');

    if (total) total.innerText = books.length;
    if (avail) avail.innerText = books.filter(b => b.status === 'Available').length;
    if (borrowed) borrowed.innerText = books.filter(b => b.status !== 'Available').length;
}