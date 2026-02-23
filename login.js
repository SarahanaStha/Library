import { BACKEND_URL } from "./config.js";

// Load user from storage on startup
export let currentUser = JSON.parse(localStorage.getItem('libraryUser')) || null;

const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const submitBtn = document.getElementById('submitBtn');

// Update UI if already logged in
if (currentUser && loginBtn) {
    loginBtn.innerText = `Logout (${currentUser.username})`;
}

// Auth Submit Logic
if (submitBtn) {
    submitBtn.onclick = async () => {
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        const isLoginMode = document.getElementById('registerFields').classList.contains('hidden');

        const endpoint = isLoginMode ? '/api/login' : '/api/register';
        
        try {
            const res = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: user, 
                    password: pass, 
                    email: document.getElementById('regEmail').value 
                })
            });

            const data = await res.json();
            if (res.ok) {
                if (isLoginMode) {
                    localStorage.setItem('libraryUser', JSON.stringify(data.user));
                    location.reload(); // Refresh to update all variables
                } else {
                    alert("Account created! Please Login.");
                    location.reload();
                }
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("Connection error");
        }
    };
}

export function updateStats(books) {
    const total = document.getElementById('total-count');
    const avail = document.getElementById('available-count');
    const borrowed = document.getElementById('borrowed-count');

    if (total) total.innerText = books.length;
    if (avail) avail.innerText = books.filter(b => b.status === 'Available').length;
    if (borrowed) borrowed.innerText = books.filter(b => b.status !== 'Available').length;
}

// Handle Login/Logout button click
if (loginBtn) {
    loginBtn.onclick = () => {
        if (currentUser) {
            localStorage.removeItem('libraryUser');
            location.reload();
        } else {
            loginModal.style.display = "flex";
        }
    };
}