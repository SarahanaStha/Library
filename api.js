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

    books.forEach(b => {
        const card = document.createElement('div');
        card.className = 'book-card';
        
        const isAvailable = b.status === 'Available';
        const isBorrowedByMe = currentUser && parseInt(b.borrowed_by) === parseInt(currentUser.id);
        const isBorrowedByOthers = !isAvailable && !isBorrowedByMe;

        let btnText = "Borrow";
        let btnClass = "";
        let btnDisabled = false;

        if (isBorrowedByMe) {
            btnText = "Return";
            btnClass = "return-btn";
        } else if (isBorrowedByOthers) {
            btnText = "Unavailable";
            btnDisabled = true;
            btnClass = "disabled-btn";
        }

        card.innerHTML = `
            <div class="book-cover">
                <img src="${BACKEND_URL}/${b.image}" alt="${b.title}">
            </div>
            <div class="book-info">
                <span class="genre">${b.genre}</span>
                <h3>${b.title}</h3>
                <p>${b.author}</p>
                <span class="status ${isAvailable ? 'available' : 'borrow'}">
                    ${isBorrowedByOthers ? 'Occupied' : b.status}
                </span>
                <button class="borrow-btn ${btnClass}" ${btnDisabled ? 'disabled' : ''}>${btnText}</button>
            </div>
        `;

        card.querySelector('.borrow-btn').addEventListener('click', async () => {
            if (!currentUser) { document.getElementById('loginModal').style.display = "flex"; return; }
            const res = await fetch(`${BACKEND_URL}/api/borrow/${b.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id })
            });
            if (res.ok) fetchBooks();
            else { const err = await res.json(); alert(err.error); }
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