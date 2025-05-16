// Uses the same firebaseConfig as chat.js (firebase already initialized)
const commentDb = firebase.database().ref("popupcomments");
const reportDb = firebase.database().ref("popupcomment_reports");

const commentForm = document.getElementById("commentForm");
const commentInput = document.getElementById("commentInput");
const commentName = document.getElementById("commentName");
const commentList = document.getElementById("commentList");
const commentSearchInput = document.getElementById("commentSearchInput");
const commentOrder = document.getElementById("commentOrder");

let allComments = [];
let filteredComments = [];
let currentOrder = "recent";

// Track votes in localStorage per user/browser
const VOTE_KEY = "commentVotes";
const REPORT_KEY = "commentReports";
function getVoted() {
    try {
        return JSON.parse(localStorage.getItem(VOTE_KEY)) || {};
    } catch { return {}; }
}
function setVoted(obj) {
    localStorage.setItem(VOTE_KEY, JSON.stringify(obj));
}
function getReported() {
    try {
        return JSON.parse(localStorage.getItem(REPORT_KEY)) || {};
    } catch { return {}; }
}
function setReported(obj) {
    localStorage.setItem(REPORT_KEY, JSON.stringify(obj));
}

// Helper: escape HTML
function escapeHtmlComment(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Render replies for a review
function renderReplies(replies, parentId, searchTerm) {
    const reported = getReported();
    if (!Array.isArray(replies) || replies.length === 0) return '';
    // Filter replies if searchTerm is present
    let filtered = replies;
    if (searchTerm) {
        filtered = replies.filter(r =>
            (r.name && r.name.toLowerCase().includes(searchTerm)) ||
            (r.text && r.text.toLowerCase().includes(searchTerm))
        );
        if (filtered.length === 0) return '';
    }
    return `
        <div class="comment-replies">
            ${filtered.map((r, idx) => {
                const replyKey = `${parentId}_reply_${idx}`;
                const reportedReply = !!reported[replyKey];
                return `
                <div class="comment-reply-item">
                    <span class="comment-meta">
                        <strong>${escapeHtmlComment(r.name)}</strong>
                        <span style="margin-left:8px;">${new Date(r.ts).toLocaleString()}</span>
                    </span>
                    <span class="comment-text" style="white-space: pre-wrap;">${escapeHtmlComment(r.text)}</span>
                    <button class="comment-report-btn" data-type="reply" data-parent="${parentId}" data-idx="${idx}" style="margin-top:4px;background:none;border:none;color:#e11d48;cursor:pointer;font-size:0.93em;" ${reportedReply ? "disabled" : ""}>
                        ${reportedReply ? "Reported" : "Report"}
                    </button>
                </div>
            `;
            }).join('')}
        </div>
    `;
}

// Render reviews with voting, reply, and report
function renderComments(comments, searchTerm = "") {
    commentList.innerHTML = "";
    const voted = getVoted();
    const reported = getReported();
    searchTerm = (searchTerm || "").toLowerCase();

    // Ordering
    let ordered = [...comments];
    if (currentOrder === "top") {
        ordered.sort((a, b) => {
            const av = (b.upvotes || 0) - (b.downvotes || 0);
            const bv = (a.upvotes || 0) - (a.downvotes || 0);
            if (av !== bv) return av - bv;
            return b.ts - a.ts; // Most recent first for equal votes
        });
    } else {
        // "recent" order - most recent first
        ordered.sort((a, b) => b.ts - a.ts);
    }

    ordered.forEach(c => {
        const id = c.id;
        const up = c.upvotes || 0;
        const down = c.downvotes || 0;
        const userVote = voted[id] || 0;
        const reportedComment = !!reported[id];

        // Filter: show review if matches or any reply matches
        let show = true;
        if (searchTerm) {
            const matchesReview = (c.name && c.name.toLowerCase().includes(searchTerm)) ||
                                   (c.text && c.text.toLowerCase().includes(searchTerm));
            const matchesReply = Array.isArray(c.replies) && c.replies.some(r =>
                (r.name && r.name.toLowerCase().includes(searchTerm)) ||
                (r.text && r.text.toLowerCase().includes(searchTerm))
            );
            show = matchesReview || matchesReply;
        }
        if (!show) return;

        const div = document.createElement("div");
        div.className = "comment-item";
        div.innerHTML = `
            <span class="comment-meta">
                <strong>${escapeHtmlComment(c.name)}</strong>
                <span style="margin-left:8px;">${new Date(c.ts).toLocaleString()}</span>
            </span>
            <span class="comment-text" style="white-space: pre-wrap;">${escapeHtmlComment(c.text)}</span>
            <div style="margin-top:6px;display:flex;align-items:center;gap:8px;">
                <button class="comment-upvote" data-id="${id}" style="background:none;border:none;cursor:pointer;color:${userVote===1?'#6d28d9':'#94a3b8'};font-size:1.1em;" title="Upvote" aria-label="Upvote">&#x25B2;</button>
                <span class="comment-votes" style="min-width:24px;text-align:center;">${up-down}</span>
                <button class="comment-downvote" data-id="${id}" style="background:none;border:none;cursor:pointer;color:${userVote===-1?'#e11d48':'#94a3b8'};font-size:1.1em;" title="Downvote" aria-label="Downvote">&#x25BC;</button>
                <button class="comment-reply-btn" data-id="${id}" style="margin-left:12px;background:none;border:none;color:#6d28d9;cursor:pointer;font-size:0.95em;">Reply</button>
                <button class="comment-report-btn" data-type="comment" data-id="${id}" style="margin-left:8px;background:none;border:none;color:#e11d48;cursor:pointer;font-size:0.93em;" ${reportedComment ? "disabled" : ""}>
                    ${reportedComment ? "Reported" : "Report"}
                </button>
            </div>
            <div class="comment-reply-form-container" id="reply-form-${id}" style="display:none;margin-top:8px;">
                <form class="comment-reply-form" data-id="${id}" style="display:flex;flex-direction:column;gap:6px;">
                    <input type="text" class="reply-name" maxlength="20" placeholder="Your name" required 
                        style="flex:1;max-width:120px;background:#1a1c23;color:#e2e8f0;border:1px solid #334155;padding:8px;border-radius:4px;">
                    <textarea class="reply-input" maxlength="500" placeholder="Write a reply..." required 
                        style="width:100%;min-height:60px;resize:vertical;padding:8px;border-radius:4px;background:#1a1c23;color:#e2e8f0;border:1px solid #334155;"></textarea>
                    <div style="display:flex;gap:8px;">
                        <button type="submit" style="padding:4px 12px;background:#6d28d9;color:#fff;border:none;border-radius:4px;cursor:pointer;">Reply</button>
                        <button type="button" class="reply-cancel" style="padding:4px 8px;background:none;border:none;color:#e11d48;cursor:pointer;">Cancel</button>
                    </div>
                </form>
            </div>
            ${renderReplies(c.replies, id, searchTerm)}
        `;
        commentList.appendChild(div);
    });

    // Voting event listeners
    commentList.querySelectorAll(".comment-upvote").forEach(btn => {
        btn.onclick = function() {
            const id = btn.getAttribute("data-id");
            handleVote(id, 1);
        };
    });
    commentList.querySelectorAll(".comment-downvote").forEach(btn => {
        btn.onclick = function() {
            const id = btn.getAttribute("data-id");
            handleVote(id, -1);
        };
    });

    // Reply button event listeners
    commentList.querySelectorAll(".comment-reply-btn").forEach(btn => {
        btn.onclick = function() {
            const id = btn.getAttribute("data-id");
            // Hide all other reply forms
            commentList.querySelectorAll(".comment-reply-form-container").forEach(f => f.style.display = "none");
            const formDiv = document.getElementById("reply-form-" + id);
            if (formDiv) {
                formDiv.style.display = "block";
                formDiv.querySelector(".reply-name").focus();
            }
        };
    });

    // Reply form submit/cancel
    commentList.querySelectorAll(".comment-reply-form").forEach(form => {
        // Autofill reply name from localStorage if available
        const replyNameInput = form.querySelector(".reply-name");
        if (localStorage.getItem("reviewUserName")) {
            replyNameInput.value = localStorage.getItem("reviewUserName");
        }
        form.onsubmit = function(e) {
            e.preventDefault();
            const id = form.getAttribute("data-id");
            const name = replyNameInput.value.trim();
            const text = form.querySelector(".reply-input").value.trim();
            if (name.length < 3 || name.length > 20) {
                replyNameInput.value = "";
                replyNameInput.placeholder = "Invalid name";
                replyNameInput.style.borderColor = "#e11d48";
                replyNameInput.focus();
                return;
            }
            if (!text) return;
            // Save reply name to localStorage for future replies
            localStorage.setItem("reviewUserName", name);
            // Push reply to Firebase under review id
            commentDb.child(id).child("replies").transaction(arr => {
                if (!Array.isArray(arr)) arr = [];
                arr.push({
                    name: name,
                    text: text,
                    ts: Date.now()
                });
                return arr;
            });
            form.querySelector(".reply-input").value = "";
            form.parentElement.style.display = "none";
        };
        // Cancel button
        form.querySelector(".reply-cancel").onclick = function() {
            form.parentElement.style.display = "none";
        };
        // Remove error style on input and save as user types
        replyNameInput.addEventListener("input", () => {
            replyNameInput.style.borderColor = "";
            replyNameInput.placeholder = "Your name";
            if (replyNameInput.value.trim().length >= 3 && replyNameInput.value.trim().length <= 20) {
                localStorage.setItem("reviewUserName", replyNameInput.value.trim());
            }
        });
    });

    // Report button event listeners (reviews and replies)
    commentList.querySelectorAll(".comment-report-btn").forEach(btn => {
        btn.onclick = function() {
            if (btn.disabled) return;
            const type = btn.getAttribute("data-type");
            const reported = getReported();
            if (type === "comment") {
                const id = btn.getAttribute("data-id");
                reported[id] = true;
                setReported(reported);
                reportDb.push({
                    type: "comment",
                    commentId: id,
                    ts: Date.now()
                });
                btn.textContent = "Reported";
                btn.disabled = true;
            } else if (type === "reply") {
                const parent = btn.getAttribute("data-parent");
                const idx = btn.getAttribute("data-idx");
                const replyKey = `${parent}_reply_${idx}`;
                reported[replyKey] = true;
                setReported(reported);
                // For admin: include parent review id and reply index
                reportDb.push({
                    type: "reply",
                    commentId: parent,
                    replyIndex: idx,
                    ts: Date.now()
                });
                btn.textContent = "Reported";
                btn.disabled = true;
            }
        };
    });
}

// Voting logic
function handleVote(id, dir) {
    if (!id) return;
    const voted = getVoted();
    if (voted[id] === dir) return; // Already voted this way
    // Remove previous vote if exists
    const prev = voted[id] || 0;
    voted[id] = dir;
    setVoted(voted);
    // Transactionally update upvotes/downvotes
    commentDb.child(id).transaction(c => {
        if (!c) return c;
        if (!c.upvotes) c.upvotes = 0;
        if (!c.downvotes) c.downvotes = 0;
        if (prev === 1) c.upvotes--;
        if (prev === -1) c.downvotes--;
        if (dir === 1) c.upvotes++;
        if (dir === -1) c.downvotes++;
        return c;
    });
}

// Listen for reviews (history never cleared)
commentDb.limitToLast(500).on("value", snap => {
    const val = snap.val() || {};
    // Changed sorting to be consistent with renderComments
    let comments = Object.entries(val).map(([id, c]) => ({...c, id}));
    if (comments.length > 500) comments = comments.slice(-50);
    allComments = comments;
    const searchTerm = (commentSearchInput && commentSearchInput.value) ? commentSearchInput.value.trim().toLowerCase() : "";
    if (searchTerm) {
        filteredComments = filterCommentsBySearch(allComments, searchTerm);
        renderComments(filteredComments, searchTerm);
    } else {
        renderComments(allComments, "");
    }
});

// Filter reviews and replies by search term
function filterCommentsBySearch(comments, searchTerm) {
    searchTerm = (searchTerm || "").toLowerCase();
    return comments.filter(c => {
        const matchesReview = (c.name && c.name.toLowerCase().includes(searchTerm)) ||
                               (c.text && c.text.toLowerCase().includes(searchTerm));
        const matchesReply = Array.isArray(c.replies) && c.replies.some(r =>
            (r.name && r.name.toLowerCase().includes(searchTerm)) ||
            (r.text && r.text.toLowerCase().includes(searchTerm))
        );
        return matchesReview || matchesReply;
    });
}

// Review search input event
if (commentSearchInput) {
    commentSearchInput.addEventListener("input", function(e) {
        const searchTerm = e.target.value.trim().toLowerCase();
        if (searchTerm) {
            filteredComments = filterCommentsBySearch(allComments, searchTerm);
            renderComments(filteredComments, searchTerm);
        } else {
            renderComments(allComments, "");
        }
    });
}

// Ordering dropdown event
if (commentOrder) {
    commentOrder.addEventListener("change", function(e) {
        currentOrder = e.target.value;
        const searchTerm = (commentSearchInput && commentSearchInput.value) ? commentSearchInput.value.trim().toLowerCase() : "";
        if (searchTerm) {
            renderComments(filteredComments, searchTerm);
        } else {
            renderComments(allComments, "");
        }
    });
}

// On page load, restore name from localStorage if present
if (localStorage.getItem("reviewUserName")) {
    commentName.value = localStorage.getItem("reviewUserName");
}

// Save name to localStorage on submit and allow change
commentForm.onsubmit = e => {
    e.preventDefault();
    const name = commentName.value.trim();
    const text = commentInput.value.trim();
    if (name.length < 3 || name.length > 20) {
        commentName.value = "";
        commentName.placeholder = "Invalid name";
        commentName.style.borderColor = "#e11d48";
        commentName.focus();
        return;
    }
    if (!text) return;
    localStorage.setItem("reviewUserName", name); // Save name for future
    commentDb.push({
        name: name,
        text: text,
        ts: Date.now(),
        upvotes: 0,
        downvotes: 0
    });
    commentInput.value = "";
};

// Optional: allow user to clear/change name by focusing and editing
commentName.addEventListener("input", () => {
    commentName.style.borderColor = "";
    commentName.placeholder = "Your name (3-20 chars)";
    // Save as user types for persistence
    if (commentName.value.trim().length >= 3 && commentName.value.trim().length <= 20) {
        localStorage.setItem("reviewUserName", commentName.value.trim());
    }
});
