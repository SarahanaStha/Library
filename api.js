import { BACKEND_URL } from "./config.js";
import { currentUser, updateStats } from "./login.js";

let allBooks = [];

async function fetchBooks() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/books`);
        if (!res.ok) throw new Error("Failed to load books");
        allBooks = await res.json();
        renderBooks(allBooks);
        updateStats(allBooks);
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

function renderBooks(books) {
    const catalog = document.querySelector('.catalog');
    if (!catalog) return;
    catalog.innerHTML = '';

    books.forEach(b => {
        const card = document.createElement('div');
        card.className = 'book-card';
        
        const isAvailable = b.status === 'Available';
        // Check if the current logged-in user is the one who borrowed it
        const isBorrowedByMe = currentUser && b.borrowed_by && String(b.borrowed_by) === String(currentUser.id);
        const isBorrowedByOthers = !isAvailable && !isBorrowedByMe;

        let btnText = "Borrow";
        let btnClass = "";
        let btnDisabled = false;

        if (isBorrowedByMe) {
            btnText = "Return";
            btnClass = "return-btn"; // Red button
        } else if (isBorrowedByOthers) {
            btnText = "Occupied";
            btnDisabled = true;
            btnClass = "disabled-btn"; // Gray button
        }

        card.innerHTML = `
            <div class="book-cover">
                <img src="${BACKEND_URL}/${b.image}" alt="${b.title}" onerror="this.src='https://via.placeholder.com/150x220?text=No+Cover'">
            </div>
            <div class="book-info">
                <span class="genre">${b.genre || 'Romance'}</span>
                <h3>${b.title}</h3>
                <p>${b.author}</p>
                <span class="status ${isAvailable ? 'available' : 'borrow'}">
                    ${isBorrowedByOthers ? 'Unavailable' : b.status}
                </span>
                <button class="borrow-btn ${btnClass}" ${btnDisabled ? 'disabled' : ''}>${btnText}</button>
            </div>
        `;

        card.querySelector('.borrow-btn').addEventListener('click', async () => {
            if (!currentUser) {
                document.getElementById('loginModal').style.display = "flex";
                return;
            }

            try {
                const response = await fetch(`${BACKEND_URL}/api/borrow/${b.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.id }) // Sending the ID is crucial
                });

                if (response.ok) {
                    fetchBooks(); // Refresh the list
                } else {
                    const errorData = await response.json();
                    alert(errorData.error); // Show "Only the borrower can return this"
                }
            } catch (err) {
                alert("Action failed. Check connection.");
            }
        });

        catalog.appendChild(card);
    });
}

// Search Logic
document.addEventListener('DOMContentLoaded', () => {
    fetchBooks();
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.onclick = () => {
            const q = document.getElementById('searchInput').value.toLowerCase();
            const filtered = allBooks.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
            renderBooks(filtered);
        };
    }
});