import { BACKEND_URL } from "./config.js";
import { currentUser, updateStats } from "./login.js";

let allBooks = []; // Global storage for all books from DB
const backendUrl = BACKEND_URL;

async function fetchBooks() {
    try {
        const res = await fetch(`${backendUrl}/api/books`);
        allBooks = await res.json();
        renderBooks(allBooks); // Initial render
        updateStats(allBooks);
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

function renderBooks(books) {
    const catalog = document.querySelector('.catalog');
    catalog.innerHTML = '';

    if (books.length === 0) {
        catalog.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 50px;">No books found matching your search.</p>';
        return;
    }

    books.forEach(b => {
        const card = document.createElement('div');
        card.className = 'book-card';
        const isAvail = b.status === 'Available';

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
            await fetch(`${backendUrl}/api/borrow/${b.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id })
            });
            fetchBooks(); // Refresh data and stats
        });

        catalog.appendChild(card);
    });
}

// SEARCH FUNCTION
function handleSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    
    // Filter the global allBooks array
    const filtered = allBooks.filter(book => 
        book.title.toLowerCase().includes(query) || 
        book.author.toLowerCase().includes(query) ||
        (book.genre && book.genre.toLowerCase().includes(query))
    );
    
    renderBooks(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
    fetchBooks();
    
    // Bind Search Button
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }

    // Bind Search on Enter Key
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }
});