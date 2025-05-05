// --- Firebase Config (replace with your own config) ---
const firebaseConfig = {
    apiKey: "AIzaSyCeNm72HlqDo5ItkDXmoeuL2jpvU2WXyOI",
    authDomain: "rds2-but-from-future.firebaseapp.com",
    databaseURL: "https://rds2-but-from-future-default-rtdb.firebaseio.com/",
    projectId: "rds2-but-from-future",
    storageBucket: "rds2-but-from-future.firebasestorage.app",
    messagingSenderId: "458629377988",
    appId: "1:458629377988:web:370a24b3fd97fb74657e91",
    measurementId: "G-3K7SQY4J6V"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const ENCRYPTION_KEY = "rds2future2025";
const SESSION_START = Date.now();

let activeUserId = null;
let activeUsersRef = db.ref("chat_active_users");

// Add page viewers tracking
const pageViewersRef = db.ref("page_viewers");
let pageViewerId = null;

// Initialize page viewer presence
function setPageViewerPresence() {
    if (!pageViewerId) {
        pageViewerId = "viewer_" + Math.random().toString(36).substr(2, 9);
    }
    pageViewersRef.child(pageViewerId).set({
        ts: Date.now()
    });
    pageViewersRef.child(pageViewerId).onDisconnect().remove();
}

function removePageViewerPresence() {
    if (pageViewerId) {
        pageViewersRef.child(pageViewerId).remove();
        pageViewerId = null;
    }
}

// Listen for page viewers count
pageViewersRef.on("value", snap => {
    const count = snap.numChildren();
    const el = document.getElementById("pageActiveUsers");
    if (el) el.textContent = `🟢 ${count} active viewer${count !== 1 ? 's' : ''}`;
});

function encrypt(text) {
    return btoa(unescape(encodeURIComponent(text.split('').map((c,i)=>String.fromCharCode(c.charCodeAt(0)^ENCRYPTION_KEY.charCodeAt(i%ENCRYPTION_KEY.length))).join(''))));
}
function decrypt(text) {
    try {
        const decoded = decodeURIComponent(escape(atob(text)));
        return decoded.split('').map((c,i)=>String.fromCharCode(c.charCodeAt(0)^ENCRYPTION_KEY.charCodeAt(i%ENCRYPTION_KEY.length))).join('');
    } catch {
        return "[decryption error]";
    }
}

// --- UI Elements ---
const chatPopup = document.getElementById("chatPopup");
const openChatBtn = document.getElementById("openChatBtn");
const closeChat = document.getElementById("closeChat");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatWarning = document.getElementById("chatWarning");
const chatNameForm = document.getElementById("chatNameForm");
const chatNameInput = document.getElementById("chatNameInput");
const setNameBtn = document.getElementById("setNameBtn");
const chatUserBar = document.getElementById("chatUserBar");
const currentUserName = document.getElementById("currentUserName");
const changeNameBtn = document.getElementById("changeNameBtn");
const chatRooms = document.getElementById("chatRooms");
const chatBody = document.getElementById("chatBody");

// --- Chat Room Logic ---
const ROOMS = ["global", "room1", "room2", "room3", "room4"];
let currentRoom = "global";
let lastSeen = {};
let unreadCounts = { global: 0, room1: 0, room2: 0, room3: 0, room4: 0 };
let chatListeners = {};
let chatUser = localStorage.getItem("chatUser") || "";

// --- Name Handling ---
function showNameForm() {
    chatNameForm.style.display = "flex";
    chatUserBar.style.display = "none";
    chatRooms.style.display = "none";
    chatBody.style.display = "none";
    chatForm.style.display = "none";
}
function showChatUI() {
    chatNameForm.style.display = "none";
    chatUserBar.style.display = "flex";
    chatRooms.style.display = "flex";
    chatBody.style.display = "flex";
    chatForm.style.display = "flex";
    setUserNameBar();
}
function setUserNameBar() {
    chatUser = localStorage.getItem("chatUser") || "";
    currentUserName.textContent = chatUser ? "👤 " + chatUser : "";
}
function handleNameSubmit() {
    const name = chatNameInput.value.trim();
    if (
        name.length < 3 ||
        name.length > 20 ||
        name.toLowerCase() === "admin"
    ) {
        chatNameInput.style.borderColor = "#e11d48";
        chatNameInput.value = "";
        chatNameInput.placeholder = 'Invalid name';
        chatNameInput.focus();
        return;
    }
    localStorage.setItem("chatUser", name);
    chatUser = name;
    chatNameInput.value = "";
    chatNameInput.style.borderColor = "";
    chatNameInput.placeholder = "Enter name (3-20 chars)";
    showChatUI();
    setActiveUserPresence();
}
setNameBtn.onclick = handleNameSubmit;
chatNameInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        e.preventDefault();
        handleNameSubmit();
    }
});
changeNameBtn.onclick = () => {
    showNameForm();
    setTimeout(() => chatNameInput.focus(), 100);
};

// --- Chat Room Tabs ---
function switchRoom(room) {
    if (currentRoom === room) return;
    document.querySelectorAll(".chat-room-tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.room === room);
    });
    currentRoom = room;
    renderMessages([]);
    listenChatRoom(room);
    unreadCounts[room] = 0;
    updateUnreadIndicators();
    lastSeen[room] = Date.now();
    localStorage.setItem("chatLastSeen", JSON.stringify(lastSeen));
}
document.querySelectorAll(".chat-room-tab").forEach(tab => {
    tab.onclick = () => switchRoom(tab.dataset.room);
});

// --- Unread Indicator ---
function updateUnreadIndicators() {
    ROOMS.forEach(room => {
        const el = document.getElementById("unread-" + room);
        if (unreadCounts[room] > 0) {
            el.textContent = unreadCounts[room];
            el.style.display = "inline-block";
        } else {
            el.textContent = "";
            el.style.display = "none";
        }
    });
}

// --- Listen to Chat Room ---
function listenChatRoom(room) {
    if (chatListeners[room]) db.ref("popupchat_" + room).off("value", chatListeners[room]);
    chatListeners[room] = db.ref("popupchat_" + room).limitToLast(30).on("value", snap => {
        const val = snap.val() || {};
        // Only show messages from this session
        const messages = Object.values(val).filter(msg => msg.ts >= SESSION_START);
        // Unread logic
        const lastSeenTime = lastSeen[room] || 0;
        if (room !== currentRoom) {
            unreadCounts[room] = messages.filter(msg => msg.ts > lastSeenTime).length;
            updateUnreadIndicators();
        } else {
            unreadCounts[room] = 0;
            updateUnreadIndicators();
            lastSeen[room] = Date.now();
            localStorage.setItem("chatLastSeen", JSON.stringify(lastSeen));
        }
        if (room === currentRoom) renderMessages(messages);
    });
}
function renderMessages(messages) {
    chatBody.innerHTML = "";
    messages.forEach(msg => {
        const div = document.createElement("div");
        div.className = "chat-message";
        div.innerHTML = `<span class="chat-user">${decrypt(msg.user)}</span>: ${decrypt(msg.text)}`;
        chatBody.appendChild(div);
    });
    chatBody.scrollTop = chatBody.scrollHeight;
}

// --- Restore last seen times ---
try {
    lastSeen = JSON.parse(localStorage.getItem("chatLastSeen")) || {};
} catch { lastSeen = {}; }
ROOMS.forEach(room => {
    if (!lastSeen[room]) lastSeen[room] = Date.now();
    listenChatRoom(room);
});
switchRoom("global");

// --- Show/Hide Chat ---
openChatBtn.onclick = () => {
    chatPopup.style.display = "flex";
    openChatBtn.style.display = "none";
    chatWarning.style.display = "block";
    if (!localStorage.getItem("chatUser")) {
        showNameForm();
        setTimeout(() => chatNameInput.focus(), 100);
    } else {
        showChatUI();
        setTimeout(()=>chatInput.focus(), 200);
    }
    setActiveUserPresence();
};
closeChat.onclick = () => {
    chatPopup.style.display = "none";
    openChatBtn.style.display = "flex";
    chatWarning.style.display = "none";
    removeActiveUserPresence();
};

// --- Send Message ---
chatForm.onsubmit = e => {
    e.preventDefault();
    const text = chatInput.value.trim();
    const user = localStorage.getItem("chatUser") || "Anonymous";
    if (!text || !user) return;
    db.ref("popupchat_" + currentRoom).push({
        user: encrypt(user),
        text: encrypt(text),
        ts: Date.now()
    });
    chatInput.value = "";
};

// --- Clear session last seen on reload ---
window.addEventListener("beforeunload", () => {
    localStorage.removeItem("chatLastSeen");
    removeActiveUserPresence();
    removePageViewerPresence();
});

// --- Active User Presence ---
function setActiveUserPresence() {
    if (!activeUserId) {
        activeUserId = "user_" + Math.random().toString(36).substr(2, 9);
    }
    // Set presence
    activeUsersRef.child(activeUserId).set({
        name: chatUser || "Anonymous",
        ts: Date.now()
    });
    // Remove on disconnect
    activeUsersRef.child(activeUserId).onDisconnect().remove();
}
function removeActiveUserPresence() {
    if (activeUserId) {
        activeUsersRef.child(activeUserId).remove();
        activeUserId = null;
    }
}
// Listen for active users count
activeUsersRef.on("value", snap => {
    const count = snap.numChildren();
    const el = document.getElementById("activeUsersCount");
    if (el) el.textContent = `🟢 ${count} active`;
});

// Update window load event
window.addEventListener("load", () => {
    setPageViewerPresence();
    // Clear cache on refresh
    localStorage.removeItem("chatLastSeen");
});