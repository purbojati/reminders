const tg = window.Telegram.WebApp;
const APP_VERSION = '0.002';
tg.ready(() => {
    document.documentElement.style.setProperty('--tg-viewport-height', `${window.innerHeight}px`);
    setThemeClass();
    loadReminders();
});
tg.expand();

// DOM Elements
const reminderInput = document.getElementById('reminderTitle');
const reminderList = document.getElementById('reminderList');
const reminderModal = document.getElementById('reminderModal');
const modalReminderTitle = document.getElementById('modalReminderTitle');
const modalDateTime = document.getElementById('modalDateTime');
let editingReminderId = null;

// Initialize theme
const setThemeClass = () => {
    document.documentElement.className = tg.colorScheme;
}
setThemeClass();
tg.onEvent('themeChanged', () => {
    setThemeClass();
    document.documentElement.style.setProperty('--tg-viewport-height', `${window.innerHeight}px`);
});

// Update the reminder input handler - simplified
reminderInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const title = reminderInput.value.trim();
        if (!title) return;
        openModal(title);
    }
});

// Simplified modal handling
function openModal(title = '') {
    modalReminderTitle.value = title || reminderInput.value.trim();
    modalDateTime.value = '';
    editingReminderId = null;
    reminderModal.style.display = 'block';
    modalReminderTitle.focus();
}

// Simplified saveReminder function
function saveReminder() {
    const title = modalReminderTitle.value.trim();
    const date = modalDateTime.value;
    
    if (!title) return;

    const reminder = {
        id: editingReminderId || Date.now(),
        title: title,
        date: date ? new Date(date).toISOString() : null,
        completed: false
    };

    storeReminder(reminder);
    addReminderToUI(reminder);
    closeModal();
    reminderInput.value = '';

    tg.sendData(JSON.stringify({
        type: 'new_reminder',
        reminder: reminder
    }));
}

// Add these new functions
function closeModal() {
    reminderModal.style.display = 'none';
    editingReminderId = null;
}

// Add reminder to UI
function addReminderToUI(reminder) {
    const div = document.createElement('div');
    div.className = 'reminder-item';
    div.id = `reminder_${reminder.id}`;
    
    div.innerHTML = `
        <div class="reminder-checkbox" onclick="toggleReminder(${reminder.id})"></div>
        <div class="reminder-info" onclick="openModal('${reminder.title}', '${reminder.date ? new Date(reminder.date).toISOString().slice(0, 16) : ''}', ${reminder.id})">
            <div class="reminder-title">${reminder.title}</div>
            ${reminder.date ? `<div class="reminder-date">${new Date(reminder.date).toLocaleString()}</div>` : ''}
        </div>
        <button onclick="deleteReminder(${reminder.id})" class="delete-btn">✕</button>
    `;
    
    if (reminder.completed) {
        let completedSection = document.querySelector('.completed-section');
        if (!completedSection) {
            completedSection = document.createElement('div');
            completedSection.className = 'completed-section';
            completedSection.innerHTML = '<div class="completed-header">Completed</div>';
            reminderList.appendChild(completedSection);
        }
        completedSection.appendChild(div);
        
        const checkbox = div.querySelector('.reminder-checkbox');
        checkbox.style.backgroundColor = 'var(--tg-theme-button-color)';
    } else {
        const newReminderInput = document.querySelector('.new-reminder');
        reminderList.insertBefore(div, newReminderInput);
    }
}

// Toggle reminder completion
function toggleReminder(id) {
    const reminders = getReminders();
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
        reminder.completed = !reminder.completed;
        localStorage.setItem('reminders', JSON.stringify(reminders));
        
        const element = document.getElementById(`reminder_${id}`);
        element.remove();
        
        addReminderToUI(reminder);
        
        updateCompletedSection();
    }
}

// Add function to manage completed section
function updateCompletedSection() {
    let completedSection = document.querySelector('.completed-section');
    const reminders = getReminders();
    const completedReminders = reminders.filter(r => r.completed);
    
    if (completedReminders.length > 0) {
        if (!completedSection) {
            completedSection = document.createElement('div');
            completedSection.className = 'completed-section';
            completedSection.innerHTML = '<div class="completed-header">Completed</div>';
            reminderList.appendChild(completedSection);
        }
    } else if (completedSection) {
        completedSection.remove();
    }
}

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

// Delete reminder
function deleteReminder(id) {
    const reminders = getReminders().filter(r => r.id !== id);
    localStorage.setItem('reminders', JSON.stringify(reminders));
    
    const element = document.getElementById(`reminder_${id}`);
    if (element) {
        element.remove();
    }

    const deleteData = {
        type: 'delete_reminder',
        id: id
    };
    tg.sendData(JSON.stringify(deleteData));
}

// Load reminders on startup
function loadReminders() {
    const reminders = getReminders();
    reminders.filter(r => !r.completed).forEach(reminder => addReminderToUI(reminder));
    reminders.filter(r => r.completed).forEach(reminder => addReminderToUI(reminder));
}

// Add this after tg.ready();
document.documentElement.style.setProperty('--tg-viewport-height', `${window.innerHeight}px`);
window.addEventListener('resize', () => {
    document.documentElement.style.setProperty('--tg-viewport-height', `${window.innerHeight}px`);
}); 