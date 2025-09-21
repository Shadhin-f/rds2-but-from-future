const STORAGE_KEY = 'coursemap_data';
let currentMajor = 'cse';
let courseMapData = [];
let userMapData = null;

// Map majors to CSV filenames
const MAJOR_CSV_MAP = {
    cse: 'CourseMaps/cse.csv',
    eee: 'CourseMaps/eee.csv',
    ete: 'CourseMaps/ete.csv',
    cee: 'CourseMaps/cee.csv',
    arch: 'CourseMaps/arch.csv',
    bbt: 'CourseMaps/bbt.csv',
    envscience: 'CourseMaps/envscience.csv',
    envmanage: 'CourseMaps/envmanagement.csv',
    mic: 'CourseMaps/mic.csv',
    bpharm: 'CourseMaps/bpharm.csv',
    act: 'CourseMaps/act.csv',
    fin: 'CourseMaps/fin.csv',
    eco: 'CourseMaps/eco.csv',
    etr: 'CourseMaps/etr.csv',
    hrm: 'CourseMaps/hrm.csv',
    ib: 'CourseMaps/ib.csv',
    mgt: 'CourseMaps/mgt.csv',
    mis: 'CourseMaps/mis.csv',
    mkt: 'CourseMaps/mkt.csv',
    scm: 'CourseMaps/scm.csv',
    bseco: 'CourseMaps/bseco.csv',
    eng: 'CourseMaps/eng.csv',
    law: 'CourseMaps/law.csv',
    mcj: 'CourseMaps/mcj.csv',
};

// Load CSV data with better error handling
async function loadCourseData(csvFile = MAJOR_CSV_MAP[currentMajor]) {
    try {
        //console.log('Starting to load CSV data...');
        const response = await fetch(csvFile);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        //console.log('CSV content:', csvText); // Debug log
        
        if (!csvText) {
            throw new Error('CSV file is empty');
        }

        courseMapData = parseCSV(csvText);
        //console.log('Parsed course data:', courseMapData);
        
        if (courseMapData.length === 0) {
            throw new Error('No courses were parsed from the CSV');
        }

        initializeMap();
    } catch (error) {
        console.error('Detailed error loading course data:', error);
        alert(`Error loading course data: ${error.message}`);
    }
}

// Parse CSV with improved error handling
function parseCSV(csv) {
    try {
        const lines = csv.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV must have at least a header row and one data row');
        }

        // Auto-detect delimiter (tab or comma)
        let delimiter = '\t';
        if (lines[0].includes(',')) delimiter = ',';

        // Get headers
        const headers = lines[0].split(delimiter).map(header => header.trim());
        //console.log('CSV Headers:', headers);

        // Check for new format columns
        const hasNewPrereq = headers.includes('Prerequisite1');
        const hasCreditReq = headers.includes('CreditReq');
        const hasPrereq4 = headers.includes('Prerequisite4');

        // Required columns for both formats
        const baseColumns = ['Semester', 'Course', 'Credits'];
        const oldColumns = ['Credits/Sem', 'Prerequisites'];
        // Now support up to Prerequisite4
        const newColumns = hasPrereq4
            ? ['Prerequisite1', 'Prerequisite2', 'Prerequisite3', 'Prerequisite4', 'CreditReq']
            : ['Prerequisite1', 'Prerequisite2', 'Prerequisite3', 'CreditReq'];

        let missingColumns = baseColumns.filter(col => !headers.includes(col));
        if (hasNewPrereq && hasCreditReq) {
            missingColumns = missingColumns.concat(newColumns.filter(col => !headers.includes(col)));
        } else {
            missingColumns = missingColumns.concat(oldColumns.filter(col => !headers.includes(col)));
        }
        if (missingColumns.length > 0) {
            throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
        }

        const result = [];
        for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i].split(delimiter);
            if (currentLine.length !== headers.length) continue;

            const courseData = {};
            headers.forEach((header, index) => {
                courseData[header] = currentLine[index]?.trim() || '';
            });

            let prereqs = [];
            let creditReq = null;
            let creditsPerSem = 0;

            if (hasNewPrereq && hasCreditReq) {
                // Collect up to 4 prerequisites
                prereqs = ['Prerequisite1', 'Prerequisite2', 'Prerequisite3', 'Prerequisite4']
                    .filter(key => headers.includes(key))
                    .map(key => courseData[key])
                    .filter(p => p && p !== '');
                creditReq = courseData.CreditReq && !isNaN(courseData.CreditReq) ? parseInt(courseData.CreditReq) : null;
                creditsPerSem = parseInt(courseData['Credits/Sem']) || 0;
            } else {
                prereqs = courseData.Prerequisites ?
                    courseData.Prerequisites.split(',').map(p => p.trim()).filter(p => p) : [];
                creditReq = null;
                creditsPerSem = parseInt(courseData['Credits/Sem']) || 0;
            }

            const course = {
                semester: courseData.Semester.replace(/[^\d]/g, ''),
                courseCode: courseData.Course.split(':')[0].trim(),
                courseName: courseData.Course.split(':')[1]?.trim() || courseData.Course,
                credits: parseInt(courseData.Credits) || 0,
                creditsPerSem: creditsPerSem,
                prerequisites: prereqs,
                creditReq: creditReq,
                originalSemester: courseData.Semester
            };
            result.push(course);
        }
        return result;
    } catch (error) {
        console.error('Error parsing CSV:', error);
        throw new Error(`Failed to parse CSV: ${error.message}`);
    }
}

// Initialize map with error handling
function initializeMap() {
    try {
        //console.log('Initializing map...');
        const semesterGrid = document.querySelector('.semester-grid');
        
        if (!semesterGrid) {
            throw new Error('Semester grid element not found');
        }

        semesterGrid.innerHTML = '';

        // Create semester boxes
        for (let i = 1; i <= 12; i++) {
            const semesterBox = createSemesterBox(i);
            semesterGrid.appendChild(semesterBox);
        }

        loadUserData();
        renderCourses();
        
        //console.log('Map initialized successfully');
    } catch (error) {
        console.error('Error initializing map:', error);
        alert(`Error initializing course map: ${error.message}`);
    }
}

// Create a semester box with credit count
function createSemesterBox(semesterNum) {
    const box = document.createElement('div');
    box.className = 'semester-box';
    box.innerHTML = `
        <div class="semester-header">
            <h3 class="semester-title">Semester ${semesterNum}</h3>
            <span class="semester-credits">0 Credits</span>
        </div>
        <div class="course-list" data-semester="${semesterNum}"></div>
    `;

    const courseList = box.querySelector('.course-list');
    courseList.addEventListener('dragover', handleDragOver);
    courseList.addEventListener('drop', handleDrop);

    return box;
}

// Render courses with error handling
function renderCourses() {
    try {
        //console.log('Starting to render courses...');
        //console.log('Total courses to render:', courseMapData.length);

        const courseLists = document.querySelectorAll('.course-list');
        courseLists.forEach(list => list.innerHTML = '');

        courseMapData.forEach((course, index) => {
            //console.log(`Rendering course ${index + 1}:`, course);
            const semester = userMapData?.[course.courseCode] || course.semester;
            const courseElement = createCourseElement(course);
            const targetList = document.querySelector(`.course-list[data-semester="${semester}"]`);

            if (targetList) {
                targetList.appendChild(courseElement);
                updateSemesterCredits(semester);
            } else {
                console.error(`No target list found for semester ${semester}`);
            }
        });

        //console.log('Finished rendering courses');
    } catch (error) {
        console.error('Error rendering courses:', error);
        alert(`Error rendering courses: ${error.message}`);
    }
}

// Create a course element with prerequisites
function createCourseElement(course) {
    const div = document.createElement('div');
    div.className = 'course-item';
    div.draggable = true;
    div.dataset.code = course.courseCode;

    // Build prerequisites display
    let prereqDisplay = '';
    if (course.prerequisites.length) {
        prereqDisplay += `
            <div class="course-prereqs">
                <i class="fas fa-link"></i> Prerequisites: ${course.prerequisites.join(', ')}
            </div>
        `;
    }
    if (course.creditReq) {
        prereqDisplay += `
            <div class="course-prereqs">
                <i class="fas fa-coins"></i> Credit Requirement: ${course.creditReq}
            </div>
        `;
    }

    div.innerHTML = `
        <div class="course-header">
            <span class="course-code">${course.courseCode}</span>
            <span class="course-credits">${course.credits} Credits</span>
        </div>
        <div class="course-name">${course.courseName}</div>
        ${prereqDisplay}
    `;

    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);
    div.addEventListener('click', () => highlightPrerequisites(course));

    return div;
}

// Highlight prerequisites when a course is selected
function highlightPrerequisites(course) {
    // Remove existing highlights
    document.querySelectorAll('.course-item').forEach(item => {
        item.classList.remove('selected', 'prerequisite');
    });

    // Highlight selected course
    const selectedElement = document.querySelector(`[data-code="${course.courseCode}"]`);
    if (selectedElement) {
        selectedElement.classList.add('selected');
    }

    // Highlight prerequisites (match by "contains" for codes)
    course.prerequisites.forEach(prereq => {
        document.querySelectorAll('.course-item').forEach(item => {
            if (item.dataset.code.includes(prereq)) {
                item.classList.add('prerequisite');
            }
        });
    });
}

// Update semester credits
function updateSemesterCredits(semesterNum) {
    const semesterList = document.querySelector(`.course-list[data-semester="${semesterNum}"]`);
    const creditsSpan = semesterList.parentElement.querySelector('.semester-credits');
    
    let totalCredits = 0;
    semesterList.querySelectorAll('.course-item').forEach(course => {
        const courseData = courseMapData.find(c => c.courseCode === course.dataset.code);
        totalCredits += courseData?.credits || 0;
    });

    creditsSpan.textContent = `${totalCredits} Credits`;
}

// Validate prerequisites when dropping a course
function validatePrerequisites(course, targetSemester) {
    // Gather all previous semesters' course items
    const previousSemesters = Array.from(
        { length: targetSemester - 1 },
        (_, i) => document.querySelector(`.course-list[data-semester="${i + 1}"]`)
    );

    // Flatten all previous course items
    const previousCourseItems = [];
    previousSemesters.forEach(semester => {
        if (semester) {
            semester.querySelectorAll('.course-item').forEach(item => {
                previousCourseItems.push(item);
            });
        }
    });

    // Calculate cumulative credits up to previous semesters
    let completedCredits = 0;
    previousCourseItems.forEach(item => {
        const courseObj = courseMapData.find(c => item.dataset.code === c.courseCode);
        completedCredits += courseObj?.credits || 0;
    });

    // Check all prerequisites (must all be satisfied)
    const prereqOk = course.prerequisites.every(prereq =>
        previousCourseItems.some(item => item.dataset.code.includes(prereq))
    );

    // Check credit requirement if present
    const creditOk = course.creditReq ? completedCredits >= course.creditReq : true;

    return prereqOk && creditOk;
}

function handleDrop(e) {
    e.preventDefault();
    const courseCode = e.dataTransfer.getData('text/plain');
    const targetSemester = parseInt(e.target.closest('.course-list').dataset.semester);
    const course = courseMapData.find(c => c.courseCode === courseCode);

    if (!validatePrerequisites(course, targetSemester)) {
        alert('Prerequisites not met! Please ensure all prerequisites are in earlier semesters.');
        return;
    }

    updateCoursePosition(courseCode, targetSemester);
}

// Update course position
function updateCoursePosition(courseCode, semester) {
    userMapData = userMapData || {};
    userMapData[courseCode] = semester;
    saveUserData();
    renderCourses();
}

// Save user data
function saveUserData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userMapData));
}

// Load user data
function loadUserData() {
    userMapData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
}

// Reset map
function resetMap() {
    if (confirm('Are you sure you want to reset the course map? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        userMapData = null;
        renderCourses();
    }
}

// Handle major selection
function handleMajorChange(major) {
    currentMajor = major;
    if (MAJOR_CSV_MAP[major]) {
        loadCourseData(MAJOR_CSV_MAP[major]);
    }
    if (major === 'cse') {
        document.querySelector('.semester-grid').style.display = 'grid';
        const comingSoon = document.getElementById('comingSoon');
        if (comingSoon) comingSoon.classList.add('hidden');
    } else {
        document.querySelector('.semester-grid').style.display = 'grid';
        let comingSoon = document.getElementById('comingSoon');
        if (!comingSoon) {
            comingSoon = document.createElement('div');
            comingSoon.id = 'comingSoon';
            comingSoon.textContent = '';
            comingSoon.className = '';
            document.querySelector('main').appendChild(comingSoon);
        }
        comingSoon.classList.remove('hidden');
    }
}

// Add missing drag event handlers
function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.code);
    e.target.classList.add('dragging');
}
function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}
function handleDragOver(e) {
    e.preventDefault();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    //console.log('DOM Content Loaded, starting course map initialization...');
    loadCourseData(MAJOR_CSV_MAP[currentMajor]);

    // Add null checks for all button references
    const resetButton = document.getElementById('resetMap');
    if (resetButton) {
        resetButton.addEventListener('click', resetMap);
    }

    const saveButton = document.getElementById('saveMap');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            alert('Changes saved successfully!');
        });
    }

    // Update major button event listeners
    document.querySelectorAll('.major-btn').forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (!btn.disabled) {
                    document.querySelectorAll('.major-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    handleMajorChange(btn.dataset.major);
                }
            });
        }
    });
});