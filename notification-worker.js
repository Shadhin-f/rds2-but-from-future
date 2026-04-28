// Service Worker for Calendar Event Notifications
const CACHE_NAME = 'rds2-notifications-v1';

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
async function checkAndShowNotifications() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Parse calendar.html to get events
    let events = [];
    try {
        const response = await fetch('calendar.html');
        if (response.ok) {
            const html = await response.text();
            
            // Basic regex to find timeline items:
            // Match <div class="date">...</div> containing the date, followed by <div class="content">...</div>
            const regex = /<div class="date">\s*([^<]+)\s*<\/div>\s*<div class="content">([\s\S]*?)<\/div>/gi;
            let match;
            
            while ((match = regex.exec(html)) !== null) {
                const dateStr = match[1].trim();
                let contentRaw = match[2];
                // Clean HTML tags and replace br with space
                let content = contentRaw.replace(/<br\s*[\/]?>/gi, " - ").replace(/<[^>]*>?/gm, '').trim();
                
                // Parse date
                let eventDate = null;
                let dateMatch = dateStr.match(/^([A-Za-z]+) (\d+)(?:-(\d+))?, (\d{4})/);
                if (dateMatch) {
                    let month = dateMatch[1];
                    let day = dateMatch[3] ? dateMatch[3] : dateMatch[2];
                    let year = dateMatch[4];
                    eventDate = new Date(`${month} ${day}, ${year}`);
                } else {
                    let d = new Date(dateStr.replace(/\(.*\)/, "").trim());
                    if (!isNaN(d)) eventDate = d;
                }
                
                if (eventDate) {
                    events.push({
                        date: eventDate.toISOString().split('T')[0],
                        content: content
                    });
                }
            }
        }
    } catch (e) {
        console.error('[SW] Failed to fetch calendar.html for events', e);
        return;
    }
    
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Find events happening tomorrow
    const tomorrowEvents = events.filter(event => event.date === tomorrowStr);
    
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
