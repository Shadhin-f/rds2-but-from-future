// Requires firebase-app-compat.js and firebase-database-compat.js to be loaded before this script

// Firebase config must be initialized before this script runs

const ACTIVE_USERS_PATH = "active_users";
const ACTIVE_USERS_TIMEOUT = 60 * 1000; // 1 minute

let userSessionKey = null;
let activeUsersInterval = null;

// Generate a unique session key for this tab
function generateSessionKey() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
}

// Call this on page load to start tracking active users
function initializeActiveUsers(pageType) {
    if (!window.firebase || !firebase.database) {
        console.warn("Firebase not loaded");
        return;
    }
    const db = firebase.database();
    userSessionKey = generateSessionKey();

    // Write this user's presence to the database
    function updatePresence() {
        db.ref(`${ACTIVE_USERS_PATH}/${userSessionKey}`).set({
            page: pageType,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }

    // Remove this user's presence from the database
    function removePresence() {
        db.ref(`${ACTIVE_USERS_PATH}/${userSessionKey}`).remove();
    }

    // Try to update counter, retry if not found
    function updateCounter(count, tries = 0) {
        const counters = [
            document.getElementById("pageActiveUsers"),
            document.getElementById("activeUsersCount")
        ];
        let updated = false;
        counters.forEach(counter => {
            if (counter) {
                counter.textContent = `🟢 ${count} active viewer${count === 1 ? "" : "s"}`;
                updated = true;
            }
        });
        if (!updated && tries < 10) {
            setTimeout(() => updateCounter(count, tries + 1), 300);
        }
    }

    // Delay to ensure DOM and Firebase are ready
    setTimeout(() => {
        updatePresence();
        activeUsersInterval = setInterval(updatePresence, ACTIVE_USERS_TIMEOUT / 2);

        // Remove presence on unload
        window.addEventListener("beforeunload", removePresence);

        // Listen for changes and update the counter
        db.ref(ACTIVE_USERS_PATH).on("value", snap => {
            const now = Date.now();
            let count = 0;
            snap.forEach(child => {
                const val = child.val();
                if (val && val.timestamp && now - val.timestamp < ACTIVE_USERS_TIMEOUT) {
                    count++;
                }
            });
            // Debug log
            console.log("[activeUsers.js] Active viewers count:", count);
            updateCounter(count);
        });
    }, 800); // 800ms delay to ensure DOM and Firebase are ready
}

// For resources page: update total resources counter
function updateTotalResourcesCounter(count) {
    const counter = document.getElementById("totalResourcesCounter");
    if (counter) {
        counter.textContent = `📦 ${count} resource${count === 1 ? "" : "s"} shared`;
    }
}

// Export functions for use in other scripts
window.initializeActiveUsers = initializeActiveUsers;
window.updateTotalResourcesCounter = updateTotalResourcesCounter;
