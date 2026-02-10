import { BACKEND_URL } from "./config.js";
const backendUrl = BACKEND_URL;

export let currentUser = JSON.parse(localStorage.getItem('user')) || null;

const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const submitBtn = document.getElementById('submitBtn');
const toggleLink = document.getElementById('toggleLink');
const registerFields = document.getElementById('registerFields');

let isLoginMode = true;

if (currentUser) {
    loginBtn.innerText = `Logout (${currentUser.username})`;
}

loginBtn.onclick = () => {
    if (currentUser) {
        localStorage.removeItem('user');
        location.reload();
    } else {
        loginModal.style.display = "flex";
    }
};

document.getElementById('closeModal').onclick = () => loginModal.style.display = "none";

toggleLink.onclick = (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    document.getElementById('modalTitle').innerText = isLoginMode ? "Welcome Back" : "Create Account";
    submitBtn.innerText = isLoginMode ? "Continue" : "Register Now";
    registerFields.classList.toggle('hidden', isLoginMode);
};

submitBtn.onclick = async () => {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const email = document.getElementById('regEmail').value;

    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    const body = isLoginMode ? { username: user, password: pass } : { username: user, password: pass, email };

    const res = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    if (res.ok) {
        if (isLoginMode) {
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(data.user));
            location.reload();
        } else {
            alert("Registered! Please login.");
            toggleLink.click();
        }
    } else {
        alert(data.error);
    }
};

export function updateStats(books) {
    document.getElementById('total-count').innerText = books.length;
    document.getElementById('available-count').innerText = books.filter(b => b.status === 'Available').length;
    document.getElementById('borrowed-count').innerText = books.filter(b => b.status === 'Borrowed').length;
}