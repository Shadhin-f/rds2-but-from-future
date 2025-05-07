// Add this at the very top, before any firebase.database() calls
if (!firebase.apps.length) {
    firebase.initializeApp({
        apiKey: "AIzaSyCeNm72HlqDo5ItkDXmoeuL2jpvU2WXyOI",
        authDomain: "rds2-but-from-future.firebaseapp.com",
        databaseURL: "https://rds2-but-from-future-default-rtdb.firebaseio.com/",
        projectId: "rds2-but-from-future",
        storageBucket: "rds2-but-from-future.firebasestorage.app",
        messagingSenderId: "458629377988",
        appId: "1:458629377988:web:370a24b3fd97fb74657e91",
        measurementId: "G-3K7SQY4J6V"
    });
}

// Firebase config is already initialized by previous scripts

const db = firebase.database();
const resourcesRef = db.ref("shared_resources");

// Listen for resource updates
resourcesRef.on("value", snap => {
    const val = snap.val() || {};
    const resourcesArr = Object.entries(val).map(([id, data]) => ({ id, ...data }));
    renderResourceList(resourcesArr);

    // Update total resources counter using the shared function
    if (window.updateTotalResourcesCounter) {
        updateTotalResourcesCounter(resourcesArr.length);
    } else {
        const counter = document.getElementById("totalResourcesCounter");
        if (counter) {
            counter.textContent = `📦 ${resourcesArr.length} resource${resourcesArr.length === 1 ? "" : "s"} shared`;
        }
    }
});

function renderResourceList(resources) {
    const search = document.getElementById("resourceSearchInput").value.trim().toLowerCase();
    const list = document.getElementById("resourceList");
    list.innerHTML = "";

    // Filter by search
    resources = resources.filter(r =>
        r.name.toLowerCase().includes(search) ||
        r.semester.toLowerCase().includes(search) ||
        r.course.toLowerCase().includes(search) ||
        r.link.toLowerCase().includes(search)
    );

    if (resources.length === 0) {
        list.innerHTML = `<div class="no-results">No resources found.</div>`;
        return;
    }

    // Sort by upvotes - downvotes
    resources.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));

    resources.forEach(resource => {
        const div = document.createElement("div");
        div.className = "resource-item";
        div.innerHTML = `
            <div class="resource-meta">
                <span><strong>${escapeHtml(resource.course)}</strong> | ${escapeHtml(resource.semester)}</span>
                <span style="float:right;font-size:0.96em;color:#c4b5fd;">Shared by: ${escapeHtml(resource.name)}</span>
            </div>
            <a class="resource-link" href="${escapeHtml(resource.link)}" target="_blank">
                <i class="fa fa-link"></i> ${escapeHtml(resource.link)}
            </a>
            <div class="resource-actions">
                <button class="resource-upvote" title="Upvote" data-id="${resource.id}">▲ ${resource.upvotes || 0}</button>
                <button class="resource-downvote" title="Downvote" data-id="${resource.id}">▼ ${resource.downvotes || 0}</button>
                <button class="resource-report" title="Report Spam" data-id="${resource.id}">🚩 Report</button>
                <span class="resource-reports">${resource.reports > 0 ? `(${resource.reports} report${resource.reports > 1 ? 's' : ''})` : ""}</span>
            </div>
        `;
        list.appendChild(div);
    });

    // Attach upvote/downvote/report handlers
    document.querySelectorAll(".resource-upvote").forEach(btn => {
        btn.onclick = () => voteResource(btn.dataset.id, "upvotes");
    });
    document.querySelectorAll(".resource-downvote").forEach(btn => {
        btn.onclick = () => voteResource(btn.dataset.id, "downvotes");
    });
    document.querySelectorAll(".resource-report").forEach(btn => {
        btn.onclick = () => reportResource(btn.dataset.id);
    });
}

function voteResource(id, type) {
    const userKey = `resource_vote_${id}`;
    if (localStorage.getItem(userKey)) return; // Prevent multiple votes
    resourcesRef.child(id).transaction(resource => {
        if (resource) {
            resource[type] = (resource[type] || 0) + 1;
        }
        return resource;
    });
    localStorage.setItem(userKey, "1");
}

function reportResource(id) {
    const userKey = `resource_report_${id}`;
    if (localStorage.getItem(userKey)) return; // Prevent multiple reports
    resourcesRef.child(id).transaction(resource => {
        if (resource) {
            resource.reports = (resource.reports || 0) + 1;
        }
        return resource;
    });
    localStorage.setItem(userKey, "1");
}

document.getElementById("resourceSearchInput").addEventListener("input", function() {
    resourcesRef.once("value").then(snap => {
        const val = snap.val() || {};
        renderResourceList(Object.entries(val).map(([id, data]) => ({ id, ...data })));
    });
});

function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}
