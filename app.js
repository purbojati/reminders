const tg = window.Telegram.WebApp;
const APP_VERSION = '0.001';
tg.ready();
tg.expand();

// Initialize MainButton
const mainButton = tg.MainButton;
mainButton.setText('Save Reminder');
mainButton.hide();

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
tg.onEvent('themeChanged', setThemeClass);

// Update the reminder input handler
reminderInput.addEventListener('input', (e) => {
    if (e.target.value.trim()) {
        mainButton.show();
    } else {
        mainButton.hide();
    }
});

// Update MainButton click handler
mainButton.onClick(() => {
    const title = reminderInput.value.trim();
    if (!title) return;
    
    // Open modal instead of directly creating reminder
    openModal(title);
    mainButton.hide();
});

// Add these new functions
function openModal(title = '', date = '', id = null) {
    // Get the current input value if title is empty
    const finalTitle = title || reminderInput.value.trim();
    modalReminderTitle.value = finalTitle;
    modalDateTime.value = date;
    editingReminderId = id;
    reminderModal.style.display = 'block';
}

function closeModal() {
    reminderModal.style.display = 'none';
    editingReminderId = null;
}

// Update saveReminder function
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

    if (editingReminderId) {
        // Update existing reminder
        const reminders = getReminders();
        const index = reminders.findIndex(r => r.id === editingReminderId);
        if (index !== -1) {
            reminder.completed = reminders[index].completed;
            reminders[index] = reminder;
            localStorage.setItem('reminders', JSON.stringify(reminders));
            document.getElementById(`reminder_${editingReminderId}`).remove();
        }
    } else {
        // Store new reminder
        storeReminder(reminder);
    }

    addReminderToUI(reminder);
    closeModal();
    reminderInput.value = ''; // Clear input field

    // Send data to Telegram Bot
    const reminderData = {
        type: editingReminderId ? 'edit_reminder' : 'new_reminder',
        reminder: reminder
    };
    tg.sendData(JSON.stringify(reminderData));
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
        // Add to completed section
        let completedSection = document.querySelector('.completed-section');
        if (!completedSection) {
            completedSection = document.createElement('div');
            completedSection.className = 'completed-section';
            completedSection.innerHTML = '<div class="completed-header">Completed</div>';
            reminderList.appendChild(completedSection);
        }
        completedSection.appendChild(div);
        
        // Style the checkbox
        const checkbox = div.querySelector('.reminder-checkbox');
        checkbox.style.backgroundColor = 'var(--tg-theme-button-color)';
    } else {
        // Add to active reminders
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
        
        // Remove the element from its current position
        const element = document.getElementById(`reminder_${id}`);
        element.remove();
        
        // Re-add it to the correct section
        addReminderToUI(reminder);
        
        // Ensure completed section exists if needed
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
    // First add uncompleted reminders
    reminders.filter(r => !r.completed).forEach(reminder => addReminderToUI(reminder));
    // Then add completed reminders
    reminders.filter(r => r.completed).forEach(reminder => addReminderToUI(reminder));
}

// Add this after tg.ready();
document.documentElement.style.setProperty('--tg-viewport-height', `${window.innerHeight}px`);
window.addEventListener('resize', () => {
    document.documentElement.style.setProperty('--tg-viewport-height', `${window.innerHeight}px`);
});

// Add keyboard event handler for the input
reminderInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const title = reminderInput.value.trim();
        if (!title) return;
        
        openModal(title);
        mainButton.hide();
    }
});

loadReminders(); 