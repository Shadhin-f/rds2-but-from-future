// Particle animation
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Particle class
class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1.5; // Increased size range (1.5 to 4.5)
        this.speedX = Math.random() * 1 - 0.5; // Increased speed range (-0.5 to 0.5)
        this.speedY = Math.random() * 1 - 0.5; // Increased speed range (-0.5 to 0.5)
        this.opacity = Math.random() * 0.7 + 0.3; // Increased opacity range (0.3 to 1.0)
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.reset();
        }
    }

    draw() {
        ctx.fillStyle = `rgba(147, 51, 234, ${this.opacity})`; // Brighter purple color
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Create particles
const particles = Array.from({ length: 75 }, () => new Particle()); // Increased number of particles

// Animation loop
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });
    requestAnimationFrame(animate);
}

animate();

const CSV_FILENAME = 'l76.csv';
const CACHE_KEY = `courseData_${CSV_FILENAME}`;
let courseData = [];
let filteredData = []; // Add this line to store filtered data globally
let currentPage = 1;
const rowsPerPage = 30;

const WISHLIST_KEY = 'wishlist_courses';
let wishlist = [];

// Load wishlist from localStorage
function loadWishlist() {
    try {
        wishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
    } catch {
        wishlist = [];
    }
}

// Save wishlist to localStorage
function saveWishlist() {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
}

// Render Wishlist Table
function renderWishlist() {
    const wishlistContainer = document.getElementById('wishlistContainer');
    const wishlistBody = document.getElementById('wishlistBody');
    wishlistBody.innerHTML = '';
    if (!wishlist.length) {
        wishlistContainer.style.display = 'none';
        return;
    }
    wishlistContainer.style.display = 'block';

    // Find latest data for each wishlisted course (by Course+Section)
    wishlist.forEach((wish, idx) => {
        // Find updated data from courseData
        const updated = courseData.find(row =>
            row.Course === wish.Course &&
            row.Section === wish.Section
        ) || wish; // fallback to old if not found

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${escapeHtml(updated.Course || '')}</td>
            <td>${escapeHtml(updated.Section || '')}</td>
            <td>${escapeHtml(updated.Faculty || '')}</td>
            <td>${escapeHtml(updated.Time || '')}</td>
            <td>${escapeHtml(updated.Room || '')}</td>
            <td>
                <button class="wishlist-remove-btn" title="Remove from Wishlist" data-course="${escapeHtml(updated.Course)}" data-section="${escapeHtml(updated.Section)}"> <i class="fas fa-minus"></i> Remove</button>
            </td>
        `;
        wishlistBody.appendChild(tr);
    });

    // Remove event
    document.querySelectorAll('.wishlist-remove-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const course = btn.getAttribute('data-course');
            const section = btn.getAttribute('data-section');
            wishlist = wishlist.filter(item => !(item.Course === course && item.Section === section));
            saveWishlist();
            renderWishlist();
            renderTable(filteredData.length ? filteredData : courseData); // update add buttons
        });
    });
}

// Add to Wishlist
function addToWishlist(row) {
    // Prevent duplicates (by Course+Section)
    if (!wishlist.some(item => item.Course === row.Course && item.Section === row.Section)) {
        wishlist.push({
            Course: row.Course,
            Section: row.Section,
            Faculty: row.Faculty,
            Time: row.Time,
            Room: row.Room,
            Semester: row.Semester,
            Prediction: row.Prediction,
            Records: row.Records
        });
        saveWishlist();
        renderWishlist();
    }
}

// Load CSV data directly from file
async function loadCSVData() {
    try {
        document.getElementById('loading').style.display = 'block';
        const response = await fetch(CSV_FILENAME);
        const csvData = await response.text();
        courseData = parseCSV(csvData);
        renderTable(courseData);
        renderWishlist(); // <-- update wishlist with latest data
        // localStorage.setItem(CACHE_KEY, JSON.stringify(courseData));
    } catch (error) {
        console.error('Error loading CSV:', error);
        alert('Error loading course data');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Update the parseCSV function to properly handle all columns
function parseCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];
    // Adjust headers to match your CSV: 8 columns, last is Records
    // Course, Section, Faculty, Time, Room, Semester, Predicted Faculty, Records
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        // Split only first 7 commas, the rest is records (handles commas in records)
        let parts = lines[i].split(',');
        if (parts.length < 8) continue;
        const obj = {
            Course: parts[0]?.trim() || '',
            Section: parts[1]?.trim() || '',
            Faculty: parts[2]?.trim() || '',
            Time: parts[3]?.trim() || '',
            Room: parts[4]?.trim() || '',
            Semester: parts[5]?.trim() || '',
            Prediction: parts[6]?.trim() || '',
            Records: parts.slice(7).join(',').trim() // join in case records has commas
        };
        result.push(obj);
    }
    return result;
}

// Update search functionality to use exact column names
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', debounce(function(e) {
        currentPage = 1; // Reset to first page
        const searchTerm = e.target.value.toLowerCase();
        filteredData = courseData.filter(course => 
            course.Course?.toLowerCase().includes(searchTerm) ||
            course.Faculty?.toLowerCase().includes(searchTerm) ||
            course.Semester?.toLowerCase().includes(searchTerm)
        );
        renderTable(filteredData.length > 0 || searchTerm ? filteredData : courseData);
    }, 300));
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Update renderTable to include Add to Wishlist button
function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    const noResults = document.getElementById('noResults');
    const loading = document.getElementById('loading');

    tableBody.innerHTML = '';

    if(!data || data.length === 0) {
        noResults.classList.remove('hidden');
        loading.style.display = 'none';
        document.querySelector('.pagination').style.display = 'none';
        return;
    }

    noResults.classList.add('hidden');
    loading.style.display = 'none';
    document.querySelector('.pagination').style.display = 'flex';

    // Calculate pagination
    const totalPages = Math.ceil(data.length / rowsPerPage);
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedData = data.slice(start, end);

    // Update pagination info
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;

    // Render table rows
    paginatedData.forEach((row, index) => {
        const isWishlisted = wishlist.some(item => item.Course === row.Course && item.Section === row.Section);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${start + index + 1}</td>
            <td>${escapeHtml(row.Course || '')}</td>
            <td>${escapeHtml(row.Section || '')}</td>
            <td>${escapeHtml(row.Faculty || '')}</td>
            <td>${escapeHtml(row.Time || '')}</td>
            <td>${escapeHtml(row.Room || '')}</td>
            <td style="display: none;">${escapeHtml(row.Prediction || '')}</td>
            <td>
                <button class="view-details-btn"
                    data-course="${escapeHtml(row.Course || '')}"
                    data-section="${escapeHtml(row.Section || '')}"
                    data-faculty="${escapeHtml(row.Faculty || '')}"
                    data-time="${escapeHtml(row.Time || '')}"
                    data-room="${escapeHtml(row.Room || '')}"
                    data-semester="${escapeHtml(row.Semester || '')}"
                    data-prediction="${escapeHtml(row.Prediction || '')}"
                    data-records="${escapeHtml(row.Records || '')}"
                >View</button>
                <button class="view-details-btn add-to-wishlist-btn${isWishlisted ? ' added' : ''}" 
                    title="${isWishlisted ? 'Already in Wishlist' : 'Add to Wishlist'}"
                    data-course="${escapeHtml(row.Course)}" 
                    data-section="${escapeHtml(row.Section)}"
                    ${isWishlisted ? 'disabled' : ''}
                >
                    <i class="fas fa-plus"></i> Add
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Attach event listeners after rendering
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        // Only attach modal event for the actual View button, not Add to Wishlist
        if (
            !btn.classList.contains('add-to-wishlist-btn') &&
            !btn.classList.contains('wishlist-remove-btn')
        ) {
            btn.addEventListener('click', function() {
                showModal({
                    Course: btn.getAttribute('data-course'),
                    Section: btn.getAttribute('data-section'),
                    Faculty: btn.getAttribute('data-faculty'),
                    Time: btn.getAttribute('data-time'),
                    Room: btn.getAttribute('data-room'),
                    Semester: btn.getAttribute('data-semester'),
                    Prediction: btn.getAttribute('data-prediction'),
                    Records: btn.getAttribute('data-records')
                });
            });
        }
    });

    // Add to Wishlist event
    document.querySelectorAll('.add-to-wishlist-btn').forEach(btn => {
        if (!btn.classList.contains('added')) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent triggering parent events
                const course = btn.getAttribute('data-course');
                const section = btn.getAttribute('data-section');
                // Find the row in courseData
                const row = courseData.find(item => item.Course === course && item.Section === section);
                if (row) {
                    addToWishlist(row);
                    renderTable(data); // update button state
                }
            });
        }
    });
}

function showModal(data) {
    const modalBody = document.querySelector('.modal-body');
    
    // Format records by splitting on pipe and joining with newlines
    const formattedRecords = (data.Records || '')
        .split('|')
        .map(record => record.trim())
        .filter(record => record.length > 0)
        .join('\n');
    
    modalBody.innerHTML = `
        <p><strong>Course:</strong> ${escapeHtml(data.Course || '')}</p>
        <p><strong>Section:</strong> ${escapeHtml(data.Section || '')}</p>
        <p><strong>Faculty:</strong> ${escapeHtml(data.Faculty || '')}</p>
        <p><strong>Time:</strong> ${escapeHtml(data.Time || '')}</p>
        <p><strong>Seats:</strong> ${escapeHtml(data.Room || '')}</p>
        <p><strong>Semester:</strong> ${escapeHtml(data.Semester || '')}</p>
        <p style="display: none;"><strong>Prediction:</strong> ${escapeHtml(data.Prediction || '')}</p>
        <div class="records-section" style="display: none;">
            <strong>Historical Records:</strong>
            <pre class="records-list">${escapeHtml(formattedRecords)}</pre>
        </div>
    `;
    modal.classList.remove('hidden');
}

// Add modal functionality
const modal = document.getElementById('detailsModal');
const closeModal = document.querySelector('.close-modal');

closeModal.addEventListener('click', () => {
    modal.classList.add('hidden');
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
});

// Add pagination event listeners
document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        // Use filteredData if search is active, else courseData
        const searchTerm = document.getElementById('searchInput').value.trim();
        renderTable(searchTerm ? filteredData : courseData);
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    // Use filteredData if search is active, else courseData
    const searchTerm = document.getElementById('searchInput').value.trim();
    const data = searchTerm ? filteredData : courseData;
    const totalPages = Math.ceil(data.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable(data);
    }
});

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Replace load event listener
window.addEventListener('load', () => {
    // Clear cache on refresh
    localStorage.removeItem(CACHE_KEY);
    filteredData = []; // Reset filteredData on load
    loadCSVData();
    loadWishlist();
    renderWishlist();
});
