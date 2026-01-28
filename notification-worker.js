// Service Worker for Calendar Event Notifications
const CACHE_NAME = 'rds2-notifications-v1';

// Calendar events data
const CALENDAR_EVENTS = [
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
];

// Install event
self.addEventListener('install', (event) => {
    console.log('[SW] Service Worker installed');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker activated');
    event.waitUntil(clients.claim());
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CHECK_NOTIFICATIONS') {
        checkAndShowNotifications();
    }
});

// Check for events and show notifications
function checkAndShowNotifications() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Find events happening tomorrow
    const tomorrowEvents = CALENDAR_EVENTS.filter(event => event.date === tomorrowStr);
    
    // Get notified events from storage
    const notifiedKey = `notified_${tomorrowStr}`;
    
    tomorrowEvents.forEach(event => {
        // Show notification
        self.registration.showNotification('📅 NSU Calendar Reminder', {
            body: `Tomorrow: ${event.content}`,
            icon: '/images/index.png',
            badge: '/images/index.png',
            tag: `event-${event.date}`,
            requireInteraction: true,
            data: {
                url: '/calendar.html',
                eventDate: event.date
            }
        });
    });
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/calendar.html';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if there's already a window open
                for (const client of clientList) {
                    if (client.url.includes('rds2') && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Open a new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Periodic sync (if supported) - checks daily
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-calendar-events') {
        event.waitUntil(checkAndShowNotifications());
    }
});
