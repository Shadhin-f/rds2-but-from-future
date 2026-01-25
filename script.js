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

// Shape cycling for particles
let currentShape = 'circle'; // Start with circle
const shapes = ['circle', 'triangle', 'rectangle'];
let shapeIndex = 0;

// Change shape every 10 seconds
setInterval(() => {
    shapeIndex = (shapeIndex + 1) % shapes.length;
    currentShape = shapes[shapeIndex];
}, 10000);

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
        ctx.fillStyle = `rgba(20, 138, 173, ${this.opacity})`; // Teal color
        
        switch(currentShape) {
            case 'circle':
                this.drawCircle();
                break;
            case 'triangle':
                this.drawTriangle();
                break;
            case 'rectangle':
                this.drawRectangle();
                break;
        }
    }
    
    drawCircle() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawTriangle() {
        const height = this.size * 2;
        const width = this.size * 1.8;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - height / 2);
        ctx.lineTo(this.x - width / 2, this.y + height / 2);
        ctx.lineTo(this.x + width / 2, this.y + height / 2);
        ctx.closePath();
        ctx.fill();
    }
    
    drawRectangle() {
        const width = this.size * 1.6;
        const height = this.size * 1.6;
        ctx.fillRect(this.x - width / 2, this.y - height / 2, width, height);
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

// Console Easter Egg for Developers
console.log(`
%c🎓 RDS2 BUT FROM FUTURE 🎓
%cBuilt with ❤️ for NSUers
%cFound a bug? Report it on Telegram!
`, 'font-size: 24px; color: #6d28d9;', 'font-size: 14px;', 'font-size: 12px; color: gray;');

// ========== CHANGE THIS VALUE TO UPDATE DEFAULT SEMESTER ==========
const DEFAULT_SEMESTER = '261_v15.csv';
// ===================================================================

let CSV_FILENAME = DEFAULT_SEMESTER;
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
    const wishlistBody = document.getElementById('wishlistBody');
    wishlistBody.innerHTML = '';
    if (!wishlist.length) {
        // Show a message row if empty, but don't hide the table
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="7" style="text-align:center; color:var(--text-muted);">No courses in your wishlist.</td>`;
        wishlistBody.appendChild(tr);
    } else {
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
                    <button class="wishlist-remove-btn" title="Remove from Wishlist" data-course="${escapeHtml(updated.Course)}" data-section="${escapeHtml(updated.Section)}">Remove</button>
                </td>
            `;
            wishlistBody.appendChild(tr);
        });
    }

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

// Remove this existing search code (it's too early)
// const searchInput = document.getElementById('searchInput');
// if (searchInput) {
//     searchInput.addEventListener('input', debounce(function(e) {...}));
// }

// Easter egg: Make page blink when "TBA" is typed
function triggerPageBlink() {
    const body = document.body;
    body.style.animation = 'pageBlink 0.8s';
    setTimeout(() => {
        body.style.animation = '';
    }, 800);
}

// Easter egg: Make page transparent when "vanish" is typed
function triggerPageVanish() {
    const container = document.querySelector('.container');
    if (container) {
        container.style.transition = 'opacity 1s ease-in-out';
        container.style.opacity = '0';
        
        // Make particles move much faster
        particles.forEach(particle => {
            particle.speedX *= 5;
            particle.speedY *= 5;
        });
        
        // Restore opacity and particle speed after 10 seconds
        setTimeout(() => {
            container.style.opacity = '1';
            
            // Restore original particle speeds
            particles.forEach(particle => {
                particle.speedX /= 5;
                particle.speedY /= 5;
            });
        }, 10000);
    }
}

// Easter egg: Make page shake when "shake" is typed
function triggerPageShake() {
    const body = document.body;
    body.style.animation = 'pageShake 4s';
    setTimeout(() => {
        body.style.animation = '';
    }, 4000);
}

// Add the search initialization to DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize search functionality
    const searchInput = document.getElementById('searchInput');
    const timeSearchInput = document.getElementById('timeSearchInput');
    const facultySearchInput = document.getElementById('facultySearchInput');
    
    function applyFilters() {
        currentPage = 1; // Reset to first page
        const searchTerm = (searchInput?.value || '').toLowerCase();
        const timeTerm = (timeSearchInput?.value || '').toLowerCase();
        const facultyTerm = (facultySearchInput?.value || '').toLowerCase();
        
        // Easter egg: Check if search term is "tba"
        if (searchTerm === 'tba') {
            triggerPageBlink();
        }
        
        // Easter egg: Check if search term is "vanish" or "snap"
        if (searchTerm === 'vanish' || searchTerm === 'snap') {
            triggerPageVanish();
        }
        
        // Easter egg: Check if search term triggers page shake
        // Existing triggers: exact 'shake' or 'msk1'
        // New triggers: includes 'mana' or 'dbs search' (case-insensitive)
        if (
            searchTerm === 'shake' ||
            searchTerm === 'msk1' ||
            searchTerm.includes('mana') ||
            searchTerm.includes('dbs')
        ) {
            triggerPageShake();
        }
        
        // Easter egg: Check if search term is "thank you" or "thanks"
        if (searchTerm === 'thank you' || searchTerm === 'thanks') {
            alert('You are welcome!! 😊');
        }
        
        filteredData = courseData.filter(course => {
            // Main search filter (course, faculty, semester)
            const matchesMain = !searchTerm || 
                course.Course?.toLowerCase().includes(searchTerm) ||
                course.Faculty?.toLowerCase().includes(searchTerm) ||
                course.Semester?.toLowerCase().includes(searchTerm);
            
            // Time filter
            const matchesTime = !timeTerm || 
                course.Time?.toLowerCase().includes(timeTerm);
            
            // Faculty filter
            const matchesFaculty = !facultyTerm || 
                course.Faculty?.toLowerCase().includes(facultyTerm);
            
            return matchesMain && matchesTime && matchesFaculty;
        });
        
        renderTable(filteredData.length > 0 || searchTerm || timeTerm || facultyTerm ? filteredData : courseData);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyFilters, 300));
    }
    
    if (timeSearchInput) {
        timeSearchInput.addEventListener('input', debounce(applyFilters, 300));
    }
    
    if (facultySearchInput) {
        facultySearchInput.addEventListener('input', debounce(applyFilters, 300));
    }

    // Add semester change handler
    setupSemesterChange();
});

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
    if (!tableBody) return; // Table not present on this page

    const noResults = document.getElementById('noResults');
    const loading = document.getElementById('loading');
    const pagination = document.querySelector('.pagination');

    tableBody.innerHTML = '';

    if(!data || data.length === 0) {
        if (noResults) noResults.classList.remove('hidden');
        if (loading) loading.style.display = 'none';
        if (pagination) pagination.style.display = 'none';
        return;
    }

    if (noResults) noResults.classList.add('hidden');
    if (loading) loading.style.display = 'none';
    if (pagination) pagination.style.display = 'flex';

    // Calculate pagination
    const totalPages = Math.ceil(data.length / rowsPerPage);
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedData = data.slice(start, end);

    // Update pagination info (if controls exist)
    const currentPageEl = document.getElementById('currentPage');
    const totalPagesEl = document.getElementById('totalPages');
    const prevPageEl = document.getElementById('prevPage');
    const nextPageEl = document.getElementById('nextPage');
    const entryCountEl = document.getElementById('entryCount');

    if (currentPageEl) currentPageEl.textContent = currentPage;
    if (totalPagesEl) totalPagesEl.textContent = totalPages;
    if (prevPageEl) prevPageEl.disabled = currentPage === 1;
    if (nextPageEl) nextPageEl.disabled = currentPage === totalPages;
    if (entryCountEl) entryCountEl.textContent = data.length;

    // Render table rows
    paginatedData.forEach((row, index) => {
        // Get all routines this course is in
        const routineIndices = getRoutineIndicesForCourse(row.Course, row.Section);
        const isInAnyRoutine = routineIndices.length > 0;
        
        // Check for time conflict and exam clash (only if not already in current routine)
        const isInCurrentRoutine = isInRoutine(row.Course, row.Section);
        const hasTimeConflict = !isInCurrentRoutine && hasTimeConflictWithRoutine(row.Time);
        const hasExamClash = !isInCurrentRoutine && hasExamClashWithRoutine(row.Time);
        
        // Build colored dots for routines this course belongs to
        const routineDots = routineIndices.map(idx => 
            `<span class="course-routine-indicator" style="background-color: ${ROUTINE_COLORS[idx]}" title="In Routine ${idx + 1}"></span>`
        ).join('');
        
        // Build course display with indicators
        let courseDisplay = routineDots + escapeHtml(row.Course || '');
        if (hasTimeConflict) courseDisplay += ' 🕛';
        if (hasExamClash) courseDisplay += ' ⚠️';
        
        // Build add button with routine dots
        const addBtnDots = routineIndices.map(idx => 
            `<span class="course-routine-dot" style="background-color: ${ROUTINE_COLORS[idx]}"></span>`
        ).join('');
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${start + index + 1}</td>
            <td>${courseDisplay}</td>
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
                <button class="view-details-btn add-to-wishlist-btn"
                    title="${isInAnyRoutine ? 'In Routine ' + routineIndices.map(i => i + 1).join(', ') : 'Add to Routine'}"
                    data-course="${escapeHtml(row.Course)}" 
                    data-section="${escapeHtml(row.Section)}"
                >
                    ${addBtnDots}<i class="fas fa-plus"></i> Add
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
                    showAddToModal(row);
                }
            });
        }
    });
}

function showModal(data) {
    const modalBody = document.querySelector('.modal-body');
    if (!modalBody) return;

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
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Add modal functionality (guard for pages without the modal)
const modal = document.getElementById('detailsModal');
const closeModal = document.querySelector('.close-modal');

if (modal && closeModal) {
    closeModal.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

// --- Add-to Modal Logic ---
const addToModal = document.getElementById('addToModal');
const closeAddToModal = document.getElementById('closeAddToModal');

// Store current row data for modal operations
let currentModalRow = null;

function showAddToModal(row) {
    // Show modal with routine selection options
    const modalBody = document.getElementById('addToModalBody');
    if (!modalBody || !addToModal) {
        // Fallback: add to current routine directly
        addCourseToRoutine(row);
        updateAddButtonState(row.Course, row.Section);
        return;
    }
    
    // Store row for later use in event handlers
    currentModalRow = row;
    
    renderRoutineModalButtons(modalBody, row);
    addToModal.classList.remove('hidden');
}

// Render the routine selection buttons in the modal
function renderRoutineModalButtons(modalBody, row) {
    // Get which routines already have this course
    const existingIndices = getRoutineIndicesForCourse(row.Course, row.Section);
    
    // Build the routine selection UI
    let html = `<div class="routine-select-title">Manage routines for this course:</div>`;
    html += `<div class="routine-select-list">`;
    
    for (let i = 0; i < TOTAL_ROUTINES; i++) {
        const isAdded = existingIndices.includes(i);
        const color = ROUTINE_COLORS[i];
        
        if (isAdded) {
            // Show added state with remove button
            html += `
                <div class="routine-select-row">
                    <span class="routine-select-label">
                        <span class="routine-select-dot" style="background-color: ${color}"></span>
                        Routine ${i + 1}
                        <i class="fas fa-check" style="color: #10b981; margin-left: 4px;"></i>
                    </span>
                    <button class="routine-remove-modal-btn" data-routine-index="${i}" title="Remove from Routine ${i + 1}">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            `;
        } else {
            // Show add button
            html += `
                <div class="routine-select-row">
                    <span class="routine-select-label">
                        <span class="routine-select-dot" style="background-color: ${color}"></span>
                        Routine ${i + 1}
                    </span>
                    <button class="routine-add-modal-btn" data-routine-index="${i}" title="Add to Routine ${i + 1}">
                        <i class="fas fa-plus"></i> Add
                    </button>
                </div>
            `;
        }
    }
    
    html += `</div>`;
    html += `<div class="routine-select-info">
        <strong>${row.Course}</strong> - Sec ${row.Section}<br>
        <span style="color: var(--text-muted); font-size: 0.9em;">${row.Faculty || 'TBA'}</span>
    </div>`;
    
    modalBody.innerHTML = html;
    
    // Attach click handlers for Add buttons
    modalBody.querySelectorAll('.routine-add-modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const routineIdx = parseInt(btn.getAttribute('data-routine-index'));
            if (addCourseToRoutineByIndex(row, routineIdx)) {
                // Re-render the modal to show updated state
                renderRoutineModalButtons(modalBody, row);
            }
        });
    });
    
    // Attach click handlers for Remove buttons
    modalBody.querySelectorAll('.routine-remove-modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const routineIdx = parseInt(btn.getAttribute('data-routine-index'));
            // Find and remove the course from the specified routine
            const courseIndex = allRoutines[routineIdx].findIndex(
                c => c.code === row.Course && c.section === row.Section
            );
            if (courseIndex !== -1) {
                removeCourseFromRoutineByIndex(courseIndex, routineIdx);
                // Re-render the modal to show updated state
                renderRoutineModalButtons(modalBody, row);
            }
        });
    });
}

// Add this new function to update button states
function updateAddButtonState(course, section) {
    document.querySelectorAll('.add-to-wishlist-btn').forEach(btn => {
        if (
            btn.getAttribute('data-course') === course &&
            btn.getAttribute('data-section') === section
        ) {
            const routineIndices = getRoutineIndicesForCourse(course, section);
            const hasAnyRoutine = routineIndices.length > 0;
            
            if (hasAnyRoutine) {
                // Show colored dots for which routines contain this course
                const dots = routineIndices.map(idx => 
                    `<span class="course-routine-dot" style="background-color: ${ROUTINE_COLORS[idx]}"></span>`
                ).join('');
                btn.classList.remove('added'); // Don't disable the button
                btn.disabled = false;
                btn.title = `In Routine ${routineIndices.map(i => i + 1).join(', ')}`;
                btn.innerHTML = `${dots} <i class="fas fa-plus"></i> Add`;
            } else {
                btn.classList.remove('added');
                btn.disabled = false;
                btn.title = 'Add to Routine';
                btn.innerHTML = '<i class="fas fa-plus"></i> Add';
            }
        }
    });
}

// Add this helper function to check if a course is in routine
function isInRoutine(course, section) {
    return routineCourses.some(c => c.code === course && c.section === section);
}

// Check if a course's time overlaps with any course in the routine
function hasTimeConflictWithRoutine(timeStr) {
    if (!routineCourses.length) return false;
    const parsed = parseRoutineTime(timeStr);
    if (!parsed) return false;
    
    const courseStartMin = timeToMinutes(parsed.start);
    const courseEndMin = timeToMinutes(parsed.end);
    const courseDays = parsed.days;
    
    for (const routineCourse of routineCourses) {
        // Check if days overlap
        const daysOverlap = courseDays.some(day => routineCourse.days.includes(day));
        if (!daysOverlap) continue;
        
        // Check if times overlap
        const timesOverlap = !(courseEndMin <= routineCourse.startMin || courseStartMin >= routineCourse.endMin);
        if (timesOverlap) return true;
    }
    return false;
}

// Check if a course would have an exam clash with any course in the routine
function hasExamClashWithRoutine(timeStr) {
    if (!routineCourses.length) return false;
    const parsed = parseRoutineTime(timeStr);
    if (!parsed) return false;
    
    const courseStartMin = timeToMinutes(parsed.start);
    const courseEndMin = timeToMinutes(parsed.end);
    const slotKey = `${courseStartMin}-${courseEndMin}`;
    const slotInfo = EXAM_SLOT_INFO.get(slotKey);
    if (!slotInfo) return false; // Not a recognized exam slot
    
    // Get the day group(s) for this course's days
    const courseDayGroups = new Set();
    parsed.days.forEach(day => {
        const group = DAY_TO_EXAM_GROUP[day];
        if (group) courseDayGroups.add(group);
    });
    
    // Check each routine course for potential exam clash
    for (const routineCourse of routineCourses) {
        const routineSlotKey = `${routineCourse.startMin}-${routineCourse.endMin}`;
        const routineSlotInfo = EXAM_SLOT_INFO.get(routineSlotKey);
        if (!routineSlotInfo) continue;
        
        // Get day groups for routine course
        const routineDayGroups = new Set();
        routineCourse.days.forEach(day => {
            const group = DAY_TO_EXAM_GROUP[day];
            if (group) routineDayGroups.add(group);
        });
        
        // Check if same day group AND same exam date (Date 1 or Date 2)
        for (const dayGroup of courseDayGroups) {
            if (routineDayGroups.has(dayGroup) && slotInfo.dateGroup === routineSlotInfo.dateGroup) {
                return true;
            }
        }
    }
    return false;
}

// Close modal logic
if (addToModal) {
    if (closeAddToModal) {
        closeAddToModal.onclick = () => addToModal.classList.add('hidden');
    }
    addToModal.addEventListener('click', (e) => {
        if (e.target === addToModal) addToModal.classList.add('hidden');
    });
}

// Add pagination event listeners (only if controls exist on this page)
const prevPageBtn = document.getElementById('prevPage');
if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            const searchTerm = document.getElementById('searchInput')?.value.trim() || '';
            const timeTerm = document.getElementById('timeSearchInput')?.value.trim() || '';
            const facultyTerm = document.getElementById('facultySearchInput')?.value.trim() || '';
            const hasAnyFilter = searchTerm || timeTerm || facultyTerm;
            renderTable(hasAnyFilter ? filteredData : courseData);
        }
    });
}

const nextPageBtn = document.getElementById('nextPage');
if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
        const searchTerm = document.getElementById('searchInput')?.value.trim() || '';
        const timeTerm = document.getElementById('timeSearchInput')?.value.trim() || '';
        const facultyTerm = document.getElementById('facultySearchInput')?.value.trim() || '';
        const hasAnyFilter = searchTerm || timeTerm || facultyTerm;
        const data = hasAnyFilter ? filteredData : courseData;
        const totalPages = Math.ceil(data.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable(data);
        }
    });
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- Flexible Routine Maker Logic ---
// Multi-routine support: 5 independent routines
const ROUTINE_KEY_PREFIX = 'routine_courses_';
const CURRENT_ROUTINE_KEY = 'current_routine_index';
const TOTAL_ROUTINES = 5;

// Colors for each routine (used for dots and visual indicators)
const ROUTINE_COLORS = [
    '#e11d48', // Red/Rose
    '#f59e0b', // Amber/Orange
    '#10b981', // Emerald/Green
    '#3b82f6', // Blue
    '#8b5cf6'  // Purple
];

const routineDays = ['Sat','Sun','Mon','Tue','Wed','Thu','Fri'];
const dayMap = {A:'Sat',S:'Sun',M:'Mon',T:'Tue',W:'Wed',R:'Thu',F:'Fri'};

// Exam day groups: courses with same day group have exams on same dates
// ST = Sun+Tue, MW = Mon+Wed, RA = Thu+Sat
const EXAM_DAY_GROUPS = {
    'ST': ['Sun', 'Tue'],
    'MW': ['Mon', 'Wed'],
    'RA': ['Thu', 'Sat']
};

// Map each day to its group
const DAY_TO_EXAM_GROUP = {};
Object.entries(EXAM_DAY_GROUPS).forEach(([group, days]) => {
    days.forEach(day => { DAY_TO_EXAM_GROUP[day] = group; });
});

// Exam slots grouped by exam date within each day group
// Date 1 slots: 8:00-9:30, 11:20-12:50, 2:40-4:10
// Date 2 slots: 9:40-11:10, 1:00-2:30, 4:20-5:50
const EXAM_DATE_1_SLOTS = [
    { label: '8:00 AM - 9:30 AM', start: '8:00 AM', end: '9:30 AM' },
    { label: '11:20 AM - 12:50 PM', start: '11:20 AM', end: '12:50 PM' },
    { label: '2:40 PM - 4:10 PM', start: '2:40 PM', end: '4:10 PM' }
];
const EXAM_DATE_2_SLOTS = [
    { label: '9:40 AM - 11:10 AM', start: '9:40 AM', end: '11:10 AM' },
    { label: '1:00 PM - 2:30 PM', start: '1:00 PM', end: '2:30 PM' },
    { label: '4:20 PM - 5:50 PM', start: '4:20 PM', end: '5:50 PM' }
];

// Build a map: "startMin-endMin" -> { dateGroup: 1 or 2, label }
const EXAM_SLOT_INFO = new Map();
EXAM_DATE_1_SLOTS.forEach(slot => {
    const startMin = timeToMinutes(slot.start);
    const endMin = timeToMinutes(slot.end);
    EXAM_SLOT_INFO.set(`${startMin}-${endMin}`, { dateGroup: 1, label: slot.label });
});
EXAM_DATE_2_SLOTS.forEach(slot => {
    const startMin = timeToMinutes(slot.start);
    const endMin = timeToMinutes(slot.end);
    EXAM_SLOT_INFO.set(`${startMin}-${endMin}`, { dateGroup: 2, label: slot.label });
});

// Multi-routine data structure
let allRoutines = [[], [], [], [], []]; // 5 independent routines
let currentRoutineIndex = 0;
let routineCourses = []; // Current active routine (reference to allRoutines[currentRoutineIndex])

// Load all routines from localStorage
function loadAllRoutines() {
    for (let i = 0; i < TOTAL_ROUTINES; i++) {
        try {
            allRoutines[i] = JSON.parse(localStorage.getItem(ROUTINE_KEY_PREFIX + i)) || [];
        } catch {
            allRoutines[i] = [];
        }
    }
    // Load current routine index
    try {
        currentRoutineIndex = parseInt(localStorage.getItem(CURRENT_ROUTINE_KEY)) || 0;
        if (currentRoutineIndex < 0 || currentRoutineIndex >= TOTAL_ROUTINES) {
            currentRoutineIndex = 0;
        }
    } catch {
        currentRoutineIndex = 0;
    }
    routineCourses = allRoutines[currentRoutineIndex];
    updateRoutineDotColor();
}

// Save a specific routine to localStorage
function saveRoutine(index = currentRoutineIndex) {
    localStorage.setItem(ROUTINE_KEY_PREFIX + index, JSON.stringify(allRoutines[index]));
}

// Save current routine index
function saveCurrentRoutineIndex() {
    localStorage.setItem(CURRENT_ROUTINE_KEY, currentRoutineIndex.toString());
}

// Switch to a different routine
function switchToRoutine(index) {
    if (index < 0 || index >= TOTAL_ROUTINES) return;
    currentRoutineIndex = index;
    routineCourses = allRoutines[currentRoutineIndex];
    saveCurrentRoutineIndex();
    updateRoutineDotColor();
    renderRoutineTable();
    // Re-render main table to update indicators
    renderTable(filteredData.length ? filteredData : courseData);
}

// Update the routine header dot color
function updateRoutineDotColor() {
    const dot = document.getElementById('currentRoutineDot');
    if (dot) {
        dot.style.backgroundColor = ROUTINE_COLORS[currentRoutineIndex];
    }
}

// Check if a course is in a specific routine
function isInRoutineByIndex(course, section, routineIndex) {
    return allRoutines[routineIndex].some(c => c.code === course && c.section === section);
}

// Get all routine indices that contain a course
function getRoutineIndicesForCourse(course, section) {
    const indices = [];
    for (let i = 0; i < TOTAL_ROUTINES; i++) {
        if (isInRoutineByIndex(course, section, i)) {
            indices.push(i);
        }
    }
    return indices;
}

// Legacy function for backward compatibility
function loadRoutine() {
    loadAllRoutines();
}

// Parse time string like "11:20 AM - 12:50 PM RA"
function parseRoutineTime(timeStr) {
    const match = timeStr.match(/^(\d{1,2}:\d{2} [AP]M)\s*-\s*(\d{1,2}:\d{2} [AP]M)\s*([A-Z]+)$/i);
    if (!match) return null;
    const [, start, end, days] = match;
    const dayArr = days.split('').map(d => dayMap[d]).filter(Boolean);
    return {start, end, days: dayArr};
}

// Convert time string to minutes since midnight
function timeToMinutes(t) {
    const [time, ampm] = t.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
}

// Add course to a specific routine (prevent duplicates)
function addCourseToRoutineByIndex({Course, Section, Faculty, Time, Room}, routineIndex) {
    const parsed = parseRoutineTime(Time);
    if (!parsed) return false;
    
    // Check for existing course in that routine
    if (isInRoutineByIndex(Course, Section, routineIndex)) return false;
    
    allRoutines[routineIndex].push({
        code: Course,
        section: Section,
        faculty: Faculty,
        room: Room,
        start: parsed.start,
        end: parsed.end,
        startMin: timeToMinutes(parsed.start),
        endMin: timeToMinutes(parsed.end),
        days: parsed.days
    });
    
    saveRoutine(routineIndex);
    
    // If adding to current routine, re-render
    if (routineIndex === currentRoutineIndex) {
        renderRoutineTable();
    }
    
    // Update the add button state
    updateAddButtonState(Course, Section);
    // Re-render main table to update conflict indicators
    renderTable(filteredData.length ? filteredData : courseData);
    return true;
}

// Legacy function - adds to current routine
function addCourseToRoutine({Course, Section, Faculty, Time, Room}) {
    return addCourseToRoutineByIndex({Course, Section, Faculty, Time, Room}, currentRoutineIndex);
}

// Remove course from a specific routine by index
function removeCourseFromRoutineByIndex(courseIndex, routineIndex = currentRoutineIndex) {
    const removed = allRoutines[routineIndex][courseIndex];
    allRoutines[routineIndex].splice(courseIndex, 1);
    saveRoutine(routineIndex);
    
    if (routineIndex === currentRoutineIndex) {
        renderRoutineTable();
    }
    
    // Update the add button state for the removed course
    if (removed) {
        updateAddButtonState(removed.code, removed.section);
    }
    // Re-render main table to update conflict indicators
    renderTable(filteredData.length ? filteredData : courseData);
}

// Legacy function for removing from current routine
function removeCourseFromRoutine(index) {
    removeCourseFromRoutineByIndex(index, currentRoutineIndex);
}

// Render routine table with flexible slots and remove button
function renderRoutineTable() {
    const tbody = document.querySelector('#routineTable tbody');
    if (!tbody) {
        updateExamConflictWarnings();
        return; // Routine table not present on this page
    }
    tbody.innerHTML = '';
    if (routineCourses.length === 0) {
        // No courses, nothing to render
        updateExamConflictWarnings();
        return;
    }

    // Pre-compute clash segments and per-course-name colors
    const { segments: clashSegments, courseColor } = computeClashSegmentsWithColors();

    // Collect all unique time points (start/end of all courses)
    let timePoints = [];
    routineCourses.forEach(c => {
        timePoints.push(c.startMin, c.endMin);
    });
    timePoints = Array.from(new Set(timePoints)).sort((a, b) => a - b);

    // Build time slot ranges, skipping 10-minute empty gaps
    let timeSlots = [];
    for (let i = 0; i < timePoints.length - 1; i++) {
        const slotStart = timePoints[i];
        const slotEnd = timePoints[i + 1];
        const duration = slotEnd - slotStart;

        // Check if any course uses this interval on any day
        const hasAnyCourse = routineCourses.some(c =>
            c.startMin < slotEnd && c.endMin > slotStart
        );

        // If this is a 10-minute completely empty gap, skip rendering this row
        if (duration === 10 && !hasAnyCourse) continue;

        timeSlots.push([slotStart, slotEnd]);
    }

    // For each slot, build a row
    for (const [slotStart, slotEnd] of timeSlots) {
        const row = document.createElement('tr');
        // Time label
        const timeLabel = document.createElement('td');
        timeLabel.textContent = minutesToTime(slotStart) + ' - ' + minutesToTime(slotEnd);
        row.appendChild(timeLabel);

        // For each day, check if courses cover this slot
        for (const day of routineDays) {
            const cell = document.createElement('td');
            // Find all courses for this slot and day (overlaps)
            const coursesInCell = routineCourses
                .map((c, idx) => ({...c, _idx: idx}))
                .filter(c =>
                    c.days.includes(day) &&
                    c.startMin <= slotStart &&
                    c.endMin > slotStart
                );
            if (coursesInCell.length > 0) {
                cell.style.whiteSpace = "normal";
                cell.style.padding = "2px 2px";
                cell.innerHTML = coursesInCell.map(course => {
                    // Find a clash segment matching this day, slot, and course
                    const segment = clashSegments.find(seg =>
                        seg.day === day &&
                        (seg.aIdx === course._idx || seg.bIdx === course._idx) &&
                        seg.overlapStartMin <= slotStart &&
                        seg.overlapEndMin > slotStart
                    );
                    // Use the course name (code) to look up a stable color
                    const color = segment ? courseColor.get(course.code) : null;
                    const borderStyle = color ? `border:1px solid ${color};border-radius:4px;` : '';
                    return `
                    <span class="routine-course-block" title="${course.code} Sec-${course.section} (${course.faculty})" style="margin:1px 2px;display:inline-block;${borderStyle}">
                        ${course.code} - ${course.section}<br>
                        <span style="font-size:0.85em;">${course.faculty}</span>
                        <button class="routine-remove-btn" data-index="${course._idx}" title="Remove from routine" style="margin-left:4px;background:none;border:none;color:#e11d48;cursor:pointer;font-size:1em;">✕</button>
                    </span>
                `;
                }).join('');
            }
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }

    // Attach remove event
    document.querySelectorAll('.routine-remove-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-index'));
            removeCourseFromRoutine(idx);
        });
    });
    updateExamConflictWarnings();
}

// Compute same-day exam conflicts based on day groups and exam date slots
// Conflict occurs when: same day group (ST/MW/RA) AND same exam date (Date 1 or Date 2)
function computeExamConflicts() {
    if (!routineCourses.length) return [];
    
    // Group courses by: dayGroup + dateGroup (e.g., "ST|1" or "MW|2")
    const conflictsByKey = new Map();

    routineCourses.forEach(course => {
        const slotKey = `${course.startMin}-${course.endMin}`;
        const slotInfo = EXAM_SLOT_INFO.get(slotKey);
        if (!slotInfo) return; // Not a recognized exam slot

        // Get the day group(s) for this course's days
        const dayGroups = new Set();
        course.days.forEach(day => {
            const group = DAY_TO_EXAM_GROUP[day];
            if (group) dayGroups.add(group);
        });

        // For each day group this course belongs to, add to conflict tracking
        dayGroups.forEach(dayGroup => {
            const key = `${dayGroup}|${slotInfo.dateGroup}`;
            if (!conflictsByKey.has(key)) {
                conflictsByKey.set(key, {
                    dayGroup,
                    dateGroup: slotInfo.dateGroup,
                    courses: []
                });
            }
            conflictsByKey.get(key).courses.push({
                ...course,
                slotLabel: slotInfo.label
            });
        });
    });

    // Filter to only entries with 2+ courses (actual conflicts)
    return Array.from(conflictsByKey.values()).filter(entry => entry.courses.length > 1);
}

function formatCourseLabel(course) {
    const code = course.code || 'Course';
    const section = course.section ? ` Sec-${course.section}` : '';
    return `${code}${section}`;
}

function updateExamConflictWarnings() {
    const warningEl = document.getElementById('routineClashes');
    if (!warningEl) return;
    const conflicts = computeExamConflicts();
    if (!conflicts.length) {
        warningEl.textContent = '';
        return;
    }

    warningEl.innerHTML = '';
    const title = document.createElement('div');
    title.textContent = '⚠️ Same-day final exam conflicts detected:';
    title.style.fontWeight = '600';
    title.style.color = '#fbbf24';
    title.style.marginBottom = '6px';
    warningEl.appendChild(title);

    conflicts.forEach(conflict => {
        const line = document.createElement('div');
        const courseList = conflict.courses.map(c => `${formatCourseLabel(c)} (${conflict.dayGroup})`).join(', ');
        line.textContent = courseList;
        line.style.marginLeft = '8px';
        warningEl.appendChild(line);
    });
}

// Convert minutes to "hh:mm AM/PM"
function minutesToTime(mins) {
    let h = Math.floor(mins / 60);
    let m = mins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')} ${ampm}`;
}

// Update your DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // Keep only the routine toggle
    const routineBtn = document.getElementById('toggleRoutineBtn');
    if (routineBtn) {
        routineBtn.addEventListener('click', function() {
            const visible = localStorage.getItem(ROUTINE_VIS_KEY) !== '0';
            setRoutineVisible(!visible);
        });
    }
    
    // Remove wishlist visibility setting
    // setWishlistVisible(localStorage.getItem(WISHLIST_VIS_KEY) !== '0');
    setRoutineVisible(localStorage.getItem(ROUTINE_VIS_KEY) !== '0');
    
    // Keep the rest of your initialization code
    // ...existing code...
});

// Update the DOMContentLoaded event listener to remove wishlist visibility toggle
document.addEventListener('DOMContentLoaded', function() {
    // Remove the wishlist toggle button code
    // const wishlistBtn = document.getElementById('toggleWishlistBtn');
    // if (wishlistBtn) {...}

    // Keep only the routine toggle
    const routineBtn = document.getElementById('toggleRoutineBtn');
    if (routineBtn) {
        routineBtn.addEventListener('click', function() {
            const visible = localStorage.getItem(ROUTINE_VIS_KEY) !== '0';
            setRoutineVisible(!visible);
        });
    }
    
    // Routine selector change handler
    const routineSelector = document.getElementById('routineSelector');
    if (routineSelector) {
        // Set initial value from saved index
        routineSelector.value = currentRoutineIndex.toString();
        
        routineSelector.addEventListener('change', function() {
            const newIndex = parseInt(routineSelector.value);
            switchToRoutine(newIndex);
        });
    }
    
    // Remove wishlist visibility setting
    // setWishlistVisible(localStorage.getItem(WISHLIST_VIS_KEY) !== '0');
    setRoutineVisible(localStorage.getItem(ROUTINE_VIS_KEY) !== '0');
    
    // Keep the rest of your initialization code
    // ...existing code...
});

// Update loadCSVData to remove wishlist rendering and be safe on other pages
async function loadCSVData() {
    const loadingEl = document.getElementById('loading');
    const tableBody = document.getElementById('tableBody');

    // If the core table UI is not present (e.g., on routine.html), skip loading
    if (!loadingEl || !tableBody) {
        return;
    }

    try {
        loadingEl.style.display = 'block';
        const response = await fetch(CSV_FILENAME);
        const csvData = await response.text();
        courseData = parseCSV(csvData);
        renderTable(courseData);
        // renderWishlist(); // no longer needed
    } catch (error) {
        console.error('Error loading CSV:', error);
        alert('Error loading course data');
    } finally {
        loadingEl.style.display = 'none';
    }
}

// Keep the wishlist data structure and storage functions
// but remove the rendering function
// const WISHLIST_KEY = 'wishlist_courses';
// let wishlist = [];

function loadWishlist() {
    try {
        wishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
    } catch {
        wishlist = [];
    }
}

function saveWishlist() {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
}

// Remove the renderWishlist function since we don't show the table anymore
// function renderWishlist() {...}

// Keep the addToWishlist function for other features that might use it
function addToWishlist(row) {
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
        // Remove this line as we no longer render the wishlist table
        // renderWishlist();
    }
}

// --- Routine Visibility Toggle ---
const ROUTINE_VIS_KEY = 'routine_visible';

function setRoutineVisible(visible) {
    const wrapper = document.getElementById('routineTableWrapper');
    const btn = document.getElementById('toggleRoutineBtn');
    const clashesEl = document.getElementById('routineClashes');
    if (!wrapper || !btn) return;
    wrapper.style.display = visible ? '' : 'none';
    if (clashesEl) clashesEl.style.display = visible ? '' : 'none';
    btn.textContent = visible ? 'Hide' : 'Show';
    localStorage.setItem(ROUTINE_VIS_KEY, visible ? '1' : '0');
}

document.addEventListener('DOMContentLoaded', function() {
    // Routine toggle (already correct)
    const routineBtn = document.getElementById('toggleRoutineBtn');
    if (routineBtn) {
        routineBtn.addEventListener('click', function() {
            const visible = localStorage.getItem(ROUTINE_VIS_KEY) !== '0';
            setRoutineVisible(!visible);
        });
    }
    // On load, set visibility from storage (default to visible if not set)
    setRoutineVisible(localStorage.getItem(ROUTINE_VIS_KEY) !== '0');
});

// Hook into Add to Wishlist to also add to routine
const _origAddToWishlist = addToWishlist;
addToWishlist = function(row) {
    _origAddToWishlist(row);
    // addCourseToRoutine(row);
}

// On page load, initialize everything
window.addEventListener('load', () => {
    // Clear cache on refresh
    localStorage.removeItem(CACHE_KEY);
    filteredData = [];
    
    // Load wishlist
    loadWishlist();
    
    // Load all routines from storage
    loadAllRoutines();
    
    // Set up routine selector with current value
    const routineSelector = document.getElementById('routineSelector');
    if (routineSelector) {
        routineSelector.value = currentRoutineIndex.toString();
    }
    
    renderRoutineTable();
    
    // Hook up PDF download button
    const pdfBtn = document.getElementById('downloadRoutinePdfBtn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', generateRoutinePdf);
    }
});

let currentSemester = DEFAULT_SEMESTER;

// Add this function to handle semester changes
async function changeSemester(semesterFile) {
    const warningCard = document.getElementById('semesterWarning');
    const fileExists = await checkSemesterFileExists(semesterFile);
    
    if (!fileExists) {
        // Show warning card
        warningCard.style.display = 'block';
        // Hide table and pagination
        document.querySelector('.table-container').style.display = 'none';
        document.querySelector('.pagination').style.display = 'none';
        document.getElementById('loading').style.display = 'none';
        document.getElementById('noResults').classList.add('hidden');
        return;
    }

    // Hide warning card and show table
    warningCard.style.display = 'none';
    document.querySelector('.table-container').style.display = 'block';
    
    // Continue with normal semester change
    currentSemester = semesterFile;
    currentPage = 1;
    document.getElementById('searchInput').value = '';
    filteredData = [];
    loadCSVData();
}

// Add this function to check if semester file exists
async function checkSemesterFileExists(filename) {
    try {
        const response = await fetch(filename, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

// Add semester change handler
function setupSemesterChange() {
    const semesterSelect = document.getElementById('semesterSelect');
    if (semesterSelect) {
        semesterSelect.addEventListener('change', async function() {
            CSV_FILENAME = this.value;
            currentPage = 1;
            filteredData = [];
            await loadCSVData();
        });
        // Initial load
        CSV_FILENAME = semesterSelect.value;
        loadCSVData();
    }
}

// Update your DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...

    // Add semester change handler
    setupSemesterChange();
});

// Compute time clashes among routine courses
function computeTimeClashes() {
    const clashes = [];
    for (const day of routineDays) {
        const dayCourses = routineCourses
            .map((c, idx) => ({ ...c, _idx: idx }))
            .filter(c => c.days.includes(day));
        for (let i = 0; i < dayCourses.length; i++) {
            for (let j = i + 1; j < dayCourses.length; j++) {
                const a = dayCourses[i], b = dayCourses[j];
                const overlap = a.startMin < b.endMin && b.startMin < a.endMin;
                if (overlap) {
                    const startOverlap = Math.max(a.startMin, b.startMin);
                    const endOverlap = Math.min(a.endMin, b.endMin);
                    clashes.push({
                        day,
                        a,
                        b,
                        aIdx: a._idx,
                        bIdx: b._idx,
                        overlapStart: minutesToTime(startOverlap),
                        overlapEnd: minutesToTime(endOverlap),
                        overlapStartMin: startOverlap,
                        overlapEndMin: endOverlap
                    });
                }
            }
        }
    }
    return clashes;
}

// Compute clash segments and assign a consistent color per course name
function computeClashSegmentsWithColors() {
    const raw = computeTimeClashes();
    const palette = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
    const courseColor = new Map(); // course code -> color
    let colorIndex = 0;

    function getColorForCourseCode(code) {
        if (!courseColor.has(code)) {
            const color = palette[colorIndex % palette.length];
            courseColor.set(code, color);
            colorIndex++;
        }
        return courseColor.get(code);
    }

    const segments = raw.map(c => {
        // Use course code (name) for color grouping
        const aCode = c.a.code;
        const bCode = c.b.code;
        // Ensure both course codes have assigned colors
        getColorForCourseCode(aCode);
        getColorForCourseCode(bCode);

        return {
            day: c.day,
            overlapStartMin: c.overlapStartMin,
            overlapEndMin: c.overlapEndMin,
            aIdx: c.aIdx,
            bIdx: c.bIdx,
            aCode,
            bCode
        };
    });

    return { segments, courseColor };
}

// Generate a properly formatted PDF of the routine with header and credit
async function generateRoutinePdf() {
    const hasJsPdf = window.jspdf && typeof window.jspdf.jsPDF === 'function';
    const h2c = window.html2canvas || window.html2Canvas;
    if (!hasJsPdf || typeof h2c !== 'function') {
        alert('PDF libraries not loaded yet. Please wait a moment and try again.');
        return;
    }
    if (routineCourses.length === 0) {
        alert('Your routine is empty. Add courses before exporting.');
        return;
    }

    // Prepare timestamp for info and filename
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    // Build a light-themed temporary routine table for export
    const tempContainer = document.createElement('div');
    tempContainer.id = 'printRoutineContainer';
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.background = '#ffffff';
    tempContainer.style.color = '#000000';
    tempContainer.style.padding = '16px';
    tempContainer.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    tempContainer.style.fontSize = '16px';
    tempContainer.style.lineHeight = '1.4';

    const titleEl = document.createElement('h2');
    titleEl.textContent = 'Quick Routine';
    titleEl.style.margin = '0 0 6px 0';
    titleEl.style.fontSize = '20px';
    titleEl.style.fontWeight = '700';
    titleEl.style.color = '#000000';
    tempContainer.appendChild(titleEl);

    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const headerCells = ['Time', ...routineDays];
    headerCells.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.border = '1px solid #000';
        th.style.padding = '6px 8px';
        th.style.background = '#e5e7eb';
        th.style.fontWeight = '600';
        th.style.fontSize = '13px';
        th.style.color = '#000000';
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    // Reuse the same time-slot logic as the on-page routine,
    // including skipping 10-minute empty gaps
    let timePoints = [];
    routineCourses.forEach(c => {
        timePoints.push(c.startMin, c.endMin);
    });
    timePoints = Array.from(new Set(timePoints)).sort((a, b) => a - b);

    const timeSlots = [];
    for (let i = 0; i < timePoints.length - 1; i++) {
        const slotStart = timePoints[i];
        const slotEnd = timePoints[i + 1];
        const duration = slotEnd - slotStart;

        const hasAnyCourse = routineCourses.some(c =>
            c.startMin < slotEnd && c.endMin > slotStart
        );

        if (duration === 10 && !hasAnyCourse) continue;

        timeSlots.push([slotStart, slotEnd]);
    }

    timeSlots.forEach(([slotStart, slotEnd]) => {
        const tr = document.createElement('tr');
        const timeCell = document.createElement('td');
        timeCell.textContent = `${minutesToTime(slotStart)} - ${minutesToTime(slotEnd)}`;
        timeCell.style.border = '1px solid #000';
        timeCell.style.padding = '6px 8px';
        timeCell.style.fontWeight = '600';
        timeCell.style.fontSize = '13px';
        timeCell.style.color = '#000000';
        tr.appendChild(timeCell);

        routineDays.forEach(day => {
            const td = document.createElement('td');
            td.style.border = '1px solid #000';
            td.style.padding = '6px 8px';
            td.style.fontSize = '13px';
            td.style.whiteSpace = 'pre-line';
            td.style.color = '#000000';

            const coursesInCell = routineCourses.filter(c =>
                c.days.includes(day) &&
                c.startMin <= slotStart &&
                c.endMin > slotStart
            );

            if (coursesInCell.length > 0) {
                const lines = coursesInCell.map(c => {
                    const base = `${c.code} - ${c.section} (${c.faculty})`;
                    return c.room ? `${base} [${c.room}]` : base;
                });
                td.textContent = lines.join('\n');
            }

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tempContainer.appendChild(table);

    const examConflicts = computeExamConflicts();
    if (examConflicts.length) {
        const warningWrapper = document.createElement('div');
        warningWrapper.style.marginTop = '12px';
        warningWrapper.style.color = '#b45309';
        const warningTitle = document.createElement('strong');
        warningTitle.textContent = '⚠️ Same-day final exam conflicts detected:';
        warningWrapper.appendChild(warningTitle);
        examConflicts.forEach(conflict => {
            const line = document.createElement('div');
            const courseList = conflict.courses.map(c => `${formatCourseLabel(c)} (${conflict.dayGroup})`).join(', ');
            line.textContent = courseList;
            line.style.marginLeft = '8px';
            warningWrapper.appendChild(line);
        });
        tempContainer.appendChild(warningWrapper);
    }

    document.body.appendChild(tempContainer);

    try {
        // Capture the light-themed routine table area
        const canvas = await h2c(tempContainer, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 12;

        // Top-centered header with credit, link, and timestamp
        const headerLines = [
            'RDS2 BUT FROM FUTURE',
            'https://shadhin-f.github.io/rds2-but-from-future/',
            `Generated on: ${yyyy}-${mm}-${dd} ${hh}:${min}`
        ];

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(12);
        let headerY = margin;
        headerLines.forEach((line) => {
            pdf.text(line, pageWidth / 2, headerY, { align: 'center' });
            headerY += 5;
        });

        // Add routine image scaled to fit width, below header
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const imageY = headerY + 4;
        pdf.addImage(imgData, 'PNG', margin, imageY, imgWidth, imgHeight);

        // Save the PDF
        pdf.save(`routine_${yyyy}-${mm}-${dd}.pdf`);
    } catch (err) {
        console.error('PDF generation failed:', err);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        // Clean up temporary container
        if (tempContainer && tempContainer.parentNode) {
            tempContainer.parentNode.removeChild(tempContainer);
        }
    }
}
