import { BACKEND_URL } from "./config.js";
import { currentUser, updateStats } from "./login.js";

let allBooks = [];
const backendUrl = BACKEND_URL;

async function fetchBooks() {
    try {
        const res = await fetch(`${backendUrl}/api/books`);
        if (!res.ok) throw new Error("Failed to fetch");
        allBooks = await res.json();
        renderBooks(allBooks);
        updateStats(allBooks);
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

function renderBooks(books) {
    const catalog = document.querySelector('.catalog');
    catalog.innerHTML = '';

    if (books.length === 0) {
        catalog.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No books found</p>';
        return;
    }

    books.forEach(b => {
        const card = document.createElement('div');
        card.className = 'book-card';
        const isAvail = b.status === 'Available';

        // NOTE: The backend URL is prepended to the image name
        card.innerHTML = `
            <div class="book-cover">
                <img src="${backendUrl}/${b.image}" alt="${b.title}" onerror="this.src='https://via.placeholder.com/150x220?text=No+Cover'">
            </div>
            <div class="book-info">
                <span class="genre">${b.genre || 'Romance'}</span>
                <h3>${b.title}</h3>
                <p>${b.author}</p>
                <span class="status ${isAvail ? 'available' : 'borrow'}">${b.status}</span>
                <button class="borrow-btn">${isAvail ? 'Borrow' : 'Return'}</button>
            </div>
        `;

        card.querySelector('.borrow-btn').addEventListener('click', async () => {
            if (!currentUser) {
                document.getElementById('loginModal').style.display = "flex";
                return;
            }
            try {
                await fetch(`${backendUrl}/api/borrow/${b.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.id })
                });
                fetchBooks(); // Refresh list
            } catch (err) {
                alert("Action failed. Check server connection.");
            }
        });

        catalog.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchBooks();
    
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector('.search-btn');

    const handleSearch = () => {
        const q = searchInput.value.toLowerCase();
        const filtered = allBooks.filter(b => 
            b.title.toLowerCase().includes(q) || 
            b.author.toLowerCase().includes(q)
        );
        renderBooks(filtered);
    };

    if (searchBtn) searchBtn.onclick = handleSearch;
    if (searchInput) searchInput.onkeyup = (e) => { if (e.key === 'Enter') handleSearch(); };
});