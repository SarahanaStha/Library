import { BACKEND_URL } from "./config.js";
import { currentUser, updateStats } from "./login.js";

let allBooks = [];

async function fetchBooks() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/books`);
        if (!response.ok) throw new Error("Server error");
        allBooks = await response.json();
        
        console.log("Books loaded:", allBooks); // Check your console for this!
        renderBooks(allBooks);
        
        // Only update stats if the stats function exists
        if (typeof updateStats === 'function') updateStats(allBooks);
    } catch (err) {
        console.error("Fetch error:", err);
        document.querySelector('.catalog').innerHTML = `<p style="color:red">Error loading books. Please check server connection.</p>`;
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
        // Ensure comparison works even if one is a string and one is a number
        const isBorrowedByMe = currentUser && b.borrowed_by && String(b.borrowed_by) === String(currentUser.id);
        const isBorrowedByOthers = !isAvailable && !isBorrowedByMe;

        let btnText = "Borrow";
        let btnClass = "";
        let btnDisabled = false;

        if (isBorrowedByMe) {
            btnText = "Return";
            btnClass = "return-btn";
        } else if (isBorrowedByOthers) {
            btnText = "Occupied";
            btnDisabled = true;
            btnClass = "disabled-btn";
        }

        // Image path fix: Handle relative vs absolute paths
        const imageSrc = b.image.startsWith('http') ? b.image : `${BACKEND_URL}/${b.image}`;

        card.innerHTML = `
            <div class="book-cover">
                <img src="${imageSrc}" alt="${b.title}" onerror="this.src='https://via.placeholder.com/150x220?text=No+Cover'">
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
                const res = await fetch(`${BACKEND_URL}/api/borrow/${b.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.id })
                });
                if (res.ok) fetchBooks();
                else {
                    const errorData = await res.json();
                    alert(errorData.error || "Action failed");
                }
            } catch (err) {
                alert("Connection failed");
            }
        });
        catalog.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', fetchBooks);

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