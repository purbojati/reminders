const tg = window.Telegram.WebApp;

// Initialize app with proper event handling
document.addEventListener('DOMContentLoaded', () => {
    // Inform Telegram that the Mini App is ready
    tg.ready();
    
    // Expand to full height
    tg.expand();

    // Set viewport height and handle theme
    const setViewportHeight = () => {
        document.documentElement.style.setProperty('--tg-viewport-height', `${window.innerHeight}px`);
    }
    
    setViewportHeight();
    setThemeClass();
    loadReminders();

    // Handle viewport changes
    window.addEventListener('resize', setViewportHeight);

    // Handle theme changes
    tg.onEvent('themeChanged', () => {
        setThemeClass();
        setViewportHeight();
    });

    // Handle viewport changes
    tg.onEvent('viewportChanged', ({ isStateStable }) => {
        if (isStateStable) {
            setViewportHeight();
        }
    });

    // Handle back button
    tg.BackButton.onClick(() => {
        if (reminderModal.style.display === 'block') {
            closeModal();
            return;
        }
        tg.close();
    });

    // Handle main button
    const mainButton = tg.MainButton;
    mainButton.setText('Save Reminder');
    mainButton.onClick(saveReminder);

    // Handle closing confirmation
    tg.enableClosingConfirmation();
});

// Initialize theme with CSS variables
const setThemeClass = () => {
    document.documentElement.className = tg.colorScheme;
    
    // Set theme colors from Telegram theme params
    const root = document.documentElement;
    const params = tg.themeParams;
    
    root.style.setProperty('--tg-theme-bg-color', params.bg_color);
    root.style.setProperty('--tg-theme-text-color', params.text_color);
    root.style.setProperty('--tg-theme-hint-color', params.hint_color);
    root.style.setProperty('--tg-theme-link-color', params.link_color);
    root.style.setProperty('--tg-theme-button-color', params.button_color);
    root.style.setProperty('--tg-theme-button-text-color', params.button_text_color);
}

// DOM Elements
const reminderInput = document.getElementById('reminderTitle');
const reminderList = document.getElementById('reminderList');
const reminderModal = document.getElementById('reminderModal');
const modalReminderTitle = document.getElementById('modalReminderTitle');
const modalDateTime = document.getElementById('modalDateTime');
let editingReminderId = null;

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
    
    // Show back button and main button
    tg.BackButton.show();
    tg.MainButton.show();
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
    
    // Hide back button and main button
    tg.BackButton.hide();
    tg.MainButton.hide();
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