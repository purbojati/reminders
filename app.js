const tg = window.Telegram.WebApp;
tg.ready();

// Initialize theme
const setThemeClass = () => {
    document.documentElement.className = tg.colorScheme;
}
setThemeClass();
tg.onEvent('themeChanged', setThemeClass);

// DOM Elements
const modal = document.getElementById('newReminderModal');
const newReminderBtn = document.getElementById('newReminderBtn');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');
const reminderList = document.getElementById('reminderList');

// Show/Hide Modal
const showModal = () => modal.style.display = 'block';
const hideModal = () => {
    modal.style.display = 'none';
    document.getElementById('reminderTitle').value = '';
    document.getElementById('reminderDate').value = '';
}

// Event Listeners
newReminderBtn.addEventListener('click', showModal);
cancelBtn.addEventListener('click', hideModal);

// Save Reminder
saveBtn.addEventListener('click', () => {
    const title = document.getElementById('reminderTitle').value;
    const date = document.getElementById('reminderDate').value;
    
    if (!title) {
        alert('Please enter a reminder title');
        return;
    }

    const reminder = {
        id: Date.now(),
        title,
        date: date || null  // If date is empty, set to null
    };

    // Store in localStorage
    storeReminder(reminder);
    
    // Add to UI
    addReminderToUI(reminder);
    
    // Hide modal
    hideModal();

    // Send data to Telegram Bot
    const reminderData = {
        type: 'new_reminder',
        reminder: reminder
    };
    tg.sendData(JSON.stringify(reminderData));
});

// Store reminder in localStorage
function storeReminder(reminder) {
    const reminders = getReminders();
    reminders.push(reminder);
    localStorage.setItem('reminders', JSON.stringify(reminders));
}

// Get reminders from localStorage
function getReminders() {
    const reminders = localStorage.getItem('reminders');
    return reminders ? JSON.parse(reminders) : [];
}

// Add reminder to UI
function addReminderToUI(reminder) {
    const div = document.createElement('div');
    div.className = 'reminder-item';
    div.id = `reminder_${reminder.id}`;
    
    const dateDisplay = reminder.date 
        ? new Date(reminder.date).toLocaleString()
        : '';
    
    div.innerHTML = `
        <div class="reminder-info">
            <div class="reminder-title">${reminder.title}</div>
            ${dateDisplay ? `<div class="reminder-date">${dateDisplay}</div>` : ''}
        </div>
        <button onclick="deleteReminder(${reminder.id})" class="delete-btn">✕</button>
    `;
    
    reminderList.appendChild(div);
}

// Delete reminder
function deleteReminder(id) {
    // Remove from localStorage
    const reminders = getReminders().filter(r => r.id !== id);
    localStorage.setItem('reminders', JSON.stringify(reminders));
    
    // Remove from UI
    const element = document.getElementById(`reminder_${id}`);
    if (element) {
        element.remove();
    }

    // Send delete event to Telegram Bot
    const deleteData = {
        type: 'delete_reminder',
        id: id
    };
    tg.sendData(JSON.stringify(deleteData));
}

// Load reminders on startup
function loadReminders() {
    const reminders = getReminders();
    reminders.forEach(reminder => addReminderToUI(reminder));
}

loadReminders(); 