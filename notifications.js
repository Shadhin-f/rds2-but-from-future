// Calendar Notification System
// This handles browser notifications for upcoming academic calendar events

const CalendarNotifications = {
    STORAGE_KEY: 'rds2_notified_events',
    PERMISSION_ASKED_KEY: 'rds2_notification_asked',
    ENABLED_KEY: 'rds2_notifications_enabled',
    
    // Calendar events (same as in script.js)
    events: [
        { date: '2026-01-29', content: 'Last day of online drop with 100% refund' },
        { date: '2026-02-04', content: 'Holiday – Shab-e-Barat' },
        { date: '2026-02-09', content: 'Last day of online drop with 50% refund' },
        { date: '2026-02-16', content: 'Last day of payment without late fee' },
        { date: '2026-02-17', content: 'Payment with late fee of Tk. 2,000/-: BEGINS' },
        { date: '2026-02-21', content: 'Holiday – Martyrs Day & International Mother Language Day' },
        { date: '2026-03-02', content: 'Last day of payment with late fee of Tk. 2,000/-' },
        { date: '2026-03-04', content: 'Last day of online drop with "W" grade' },
        { date: '2026-03-08', content: 'Online Teaching Evaluation: BEGINS' },
        { date: '2026-03-09', content: 'Last day of payment for financial aid recipients without late fee' },
        { date: '2026-04-28', content: 'Last day of ST classes' },
        { date: '2026-05-02', content: 'Final Exam: BEGINS' },
        { date: '2026-05-08', content: 'Final Exam: ENDS' },
        { date: '2026-05-12', content: 'Last day of grade submission Spring 2026' }
    ],
    
    // Check if notifications are enabled by user
    isEnabled() {
        return localStorage.getItem(this.ENABLED_KEY) !== 'false';
    },
    
    // Set enabled state
    setEnabled(enabled) {
        localStorage.setItem(this.ENABLED_KEY, enabled ? 'true' : 'false');
        this.updateToggleButton();
    },
    
    // Update the floating toggle button appearance
    updateToggleButton() {
        const btn = document.getElementById('notificationToggleBtn');
        if (!btn) return;
        
        const icon = btn.querySelector('i');
        const enabled = this.isEnabled() && Notification.permission === 'granted';
        
        if (enabled) {
            btn.classList.remove('disabled');
            btn.title = 'Notifications Enabled - Click to Disable';
            if (icon) {
                icon.className = 'fas fa-bell';
            }
        } else {
            btn.classList.add('disabled');
            if (Notification.permission === 'denied') {
                btn.title = 'Notifications Blocked by Browser';
            } else if (Notification.permission !== 'granted') {
                btn.title = 'Click to Enable Notifications';
            } else {
                btn.title = 'Notifications Disabled - Click to Enable';
            }
            if (icon) {
                icon.className = 'fas fa-bell-slash';
            }
        }
    },
    
    // Setup the floating toggle button
    setupToggleButton() {
        const btn = document.getElementById('notificationToggleBtn');
        if (!btn) return;
        
        // Initial state
        this.updateToggleButton();
        
        // Click handler
        btn.addEventListener('click', async () => {
            // If notifications not supported
            if (!('Notification' in window)) {
                alert('Notifications are not supported in your browser.');
                return;
            }
            
            // If permission denied by browser
            if (Notification.permission === 'denied') {
                alert('Notifications are blocked by your browser. Please enable them in your browser settings.');
                return;
            }
            
            // If permission not yet granted, request it
            if (Notification.permission !== 'granted') {
                const permission = await Notification.requestPermission();
                localStorage.setItem(this.PERMISSION_ASKED_KEY, 'true');
                
                if (permission === 'granted') {
                    this.setEnabled(true);
                    this.showTestNotification();
                    this.checkUpcomingEvents();
                } else {
                    this.updateToggleButton();
                }
                return;
            }
            
            // Toggle enabled state
            const currentlyEnabled = this.isEnabled();
            this.setEnabled(!currentlyEnabled);
            
            if (!currentlyEnabled) {
                // Just enabled
                this.showTestNotification();
                this.checkUpcomingEvents();
            }
        });
    },
    
    // Initialize the notification system
    async init() {
        // Setup toggle button first
        this.setupToggleButton();
        
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('[Notifications] Not supported in this browser');
            return;
        }
        
        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/notification-worker.js');
                console.log('[Notifications] Service Worker registered:', registration.scope);
                
                // Try to register periodic sync (for background checks)
                if ('periodicSync' in registration) {
                    try {
                        await registration.periodicSync.register('check-calendar-events', {
                            minInterval: 24 * 60 * 60 * 1000 // 24 hours
                        });
                        console.log('[Notifications] Periodic sync registered');
                    } catch (e) {
                        console.log('[Notifications] Periodic sync not available:', e);
                    }
                }
            } catch (e) {
                console.log('[Notifications] Service Worker registration failed:', e);
            }
        }
        
        // Check permission and prompt if needed
        await this.checkPermissionAndPrompt();
        
        // Check for events to notify about (only if enabled)
        if (this.isEnabled()) {
            this.checkUpcomingEvents();
        }
    },
    
    // Check permission and show prompt if not asked yet
    async checkPermissionAndPrompt() {
        const permissionAsked = localStorage.getItem(this.PERMISSION_ASKED_KEY);
        
        if (Notification.permission === 'granted') {
            return true;
        }
        
        if (Notification.permission === 'denied') {
            return false;
        }
        
        // Show custom prompt after a short delay (better UX)
        if (!permissionAsked) {
            setTimeout(() => {
                this.showPermissionPrompt();
            }, 3000);
        }
        
        return false;
    },
    
    // Show a custom permission prompt
    showPermissionPrompt() {
        // Check if prompt already exists
        if (document.getElementById('notificationPrompt')) return;
        
        const prompt = document.createElement('div');
        prompt.id = 'notificationPrompt';
        prompt.className = 'notification-prompt';
        prompt.innerHTML = `
            <div class="notification-prompt-content">
                <div class="notification-prompt-icon">🔔</div>
                <div class="notification-prompt-text">
                    <strong>Never miss an important date!</strong>
                    <p>Get notified one day before academic calendar events like payment deadlines, drop dates, and exams.</p>
                </div>
                <div class="notification-prompt-buttons">
                    <button id="notificationAllow" class="notification-btn allow">Enable Notifications</button>
                    <button id="notificationDeny" class="notification-btn deny">Not Now</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(prompt);
        
        // Add animation after a frame
        requestAnimationFrame(() => {
            prompt.classList.add('show');
        });
        
        // Handle button clicks
        document.getElementById('notificationAllow').addEventListener('click', async () => {
            localStorage.setItem(this.PERMISSION_ASKED_KEY, 'true');
            this.hidePrompt();
            
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.showTestNotification();
                this.checkUpcomingEvents();
            }
        });
        
        document.getElementById('notificationDeny').addEventListener('click', () => {
            localStorage.setItem(this.PERMISSION_ASKED_KEY, 'true');
            this.hidePrompt();
        });
    },
    
    // Hide the permission prompt
    hidePrompt() {
        const prompt = document.getElementById('notificationPrompt');
        if (prompt) {
            prompt.classList.remove('show');
            setTimeout(() => prompt.remove(), 300);
        }
    },
    
    // Show a test notification
    showTestNotification() {
        if (Notification.permission === 'granted') {
            new Notification('🎉 Notifications Enabled!', {
                body: 'You\'ll now receive reminders one day before important academic events.',
                icon: '/images/index.png',
                tag: 'test-notification'
            });
        }
    },
    
    // Check for upcoming events and notify
    checkUpcomingEvents() {
        if (Notification.permission !== 'granted') return;
        if (!this.isEnabled()) return;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Find the next upcoming event (today or future)
        const upcomingEvents = this.events
            .filter(event => {
                const eventDate = new Date(event.date);
                eventDate.setHours(0, 0, 0, 0);
                return eventDate >= today;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (upcomingEvents.length > 0) {
            const nextEvent = upcomingEvents[0];
            this.showUpcomingEventNotification(nextEvent);
        }
    },
    
    // Show notification for the upcoming event on page visit
    showUpcomingEventNotification(event) {
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);
        
        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let timeText;
        if (diffDays === 0) {
            timeText = 'Today';
        } else if (diffDays === 1) {
            timeText = 'Tomorrow';
        } else {
            timeText = `In ${diffDays} days`;
        }
        
        // Format date for display
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        const formattedDate = eventDate.toLocaleDateString('en-US', options);
        
        new Notification('📅 NSU Calendar Reminder', {
            body: `${timeText} (${formattedDate}): ${event.content}`,
            icon: '/images/index.png',
            tag: 'upcoming-event-reminder',
            requireInteraction: false
        });
    },
    
    // Show notification for an event
    showEventNotification(event) {
        // Try to use service worker notification first (works in background)
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'CHECK_NOTIFICATIONS'
            });
        } else {
            // Fallback to regular notification
            new Notification('📅 NSU Calendar Reminder', {
                body: `Tomorrow: ${event.content}`,
                icon: '/images/index.png',
                tag: `event-${event.date}`,
                requireInteraction: true
            });
        }
    },
    
    // Clean up old notification records
    cleanupOldNotifications() {
        const notified = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const filtered = notified.filter(item => {
            const dateStr = item.substring(0, 10);
            const eventDate = new Date(dateStr);
            return eventDate > thirtyDaysAgo;
        });
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    },
    
    // Manual trigger for testing
    testNotification() {
        if (Notification.permission === 'granted') {
            new Notification('📅 Test: NSU Calendar Reminder', {
                body: 'This is a test notification. You\'ll receive real reminders one day before events!',
                icon: '/images/index.png',
                tag: 'test'
            });
        } else {
            alert('Please enable notifications first!');
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    CalendarNotifications.init();
});

// Expose for manual testing

window.CalendarNotifications = CalendarNotifications;

// Floating toast for upcoming event (once per session)
function showFloatingUpcomingEventToast() {
    if (!CalendarNotifications.isEnabled()) return;
    if (sessionStorage.getItem('rds2_upcoming_event_toast_shown')) return;

    // Find the next upcoming event (today or future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingEvents = CalendarNotifications.events
        .filter(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= today;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!upcomingEvents.length) return;
    const event = upcomingEvents[0];

    // Format days remaining
    const eventDate = new Date(event.date);
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let timeText;
    if (diffDays === 0) {
        timeText = 'Today';
    } else if (diffDays === 1) {
        timeText = 'Tomorrow';
    } else {
        timeText = `In ${diffDays} days`;
    }
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const formattedDate = eventDate.toLocaleDateString('en-US', options);

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'upcoming-event-toast';
    toast.innerHTML = `
        <div class="toast-icon">📅</div>
        <div class="toast-content">
            <div class="toast-title">Upcoming Academic Event</div>
            <div class="toast-date">${timeText} <span class="toast-date-detail">(${formattedDate})</span></div>
            <div class="toast-desc">${event.content}</div>
        </div>
        <button class="toast-close" title="Dismiss">&times;</button>
    `;
    document.body.appendChild(toast);

    // Dismiss logic
    function closeToast() {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }
    toast.querySelector('.toast-close').onclick = closeToast;
    setTimeout(closeToast, 9000);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);

    // Mark as shown for this session
    sessionStorage.setItem('rds2_upcoming_event_toast_shown', '1');
}

document.addEventListener('DOMContentLoaded', showFloatingUpcomingEventToast);
