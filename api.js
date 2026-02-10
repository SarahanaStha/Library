import { BACKEND_URL } from "./config.js";

// Store all books globally for search/filter
let allBooks = [];
const backendUrl = BACKEND_URL || 'http://localhost:3000';

// Fetch books from backend and render into the catalog
async function fetchBooks() {
    try {
        const res = await fetch(`${backendUrl}/api/books`);
        if (!res.ok) throw new Error('Failed to fetch books');
        allBooks = await res.json();
        renderBooks(allBooks);
        // Update stats if available
        if (typeof updateStats === 'function') updateStats();
    } catch (err) {
        console.error(err);
    }
}

// Render books into the catalog
function renderBooks(books) {
    const catalog = document.querySelector('.catalog');
    catalog.innerHTML = '';
    if (books.length === 0) {
        catalog.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px;">No books found</p>';
        return;
    }
    books.forEach(b => {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.dataset.id = b.id;
        card.dataset.category = b.genre || '';

        card.innerHTML = `
            <div class="book-cover">
                <img src="${escapeHtml(b.image || '')}" alt="${escapeHtml(b.title)}">
            </div>
            <div class="book-info">
                <span class="genre">${escapeHtml(b.genre || '')}</span>
                <h3>${escapeHtml(b.title)}</h3>
                <p>${escapeHtml(b.author || '')}</p>
                <span class="status ${b.status === 'Available' ? 'available' : 'borrow'}">${escapeHtml(b.status)}</span>
                <button class="borrow-btn">${b.status === 'Available' ? 'Borrow' : 'Return'}</button>
            </div>
        `;

        // button handler
        card.querySelector('.borrow-btn').addEventListener('click', async () => {
            if (!currentUser) {
                // Redirect to login modal
                document.getElementById('loginModal').style.display = "flex";
                return;
            }
            try {
                const r = await fetch(`${backendUrl}/api/borrow/${b.id}`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.id })
                });
                const updated = await r.json();
                // refresh list
                fetchBooks();
            } catch (err) { 
                console.error(err); 
                alert('Failed to update book status'); 
            }
        });

        catalog.appendChild(card);
    });
}

// Search/filter books by title or author
function searchBooks() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!query) {
        renderBooks(allBooks);
        return;
    }
    const filtered = allBooks.filter(b => 
        (b.title && b.title.toLowerCase().includes(query)) ||
        (b.author && b.author.toLowerCase().includes(query))
    );
    renderBooks(filtered);
}

function escapeHtml(s){
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]);
}

async function initDB() {
    try {
        console.log(`Initializing database at ${backendUrl}/api/init...`);
        const res = await fetch(`${backendUrl}/api/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('Failed to initialize database');
        const response = await res.json();
        // renderBooks(allBooks);
        // Update stats if available
console.log('Database initialized:', response);

        // if (typeof updateStats === 'function') updateStats();
    } catch (err) {
        console.error(err);
    }
}

// Load on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // initDB()
    fetchBooks();
    
    // Search button handler
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchBooks);
    }
    
    // Search on Enter key
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchBooks();
        });
    }
});
