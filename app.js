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

    // Set up native input field
    tg.CloudStorage.getItem('draft_reminder', (err, value) => {
        if (!err && value) {
            tg.MainButton.setText('Add Reminder');
            tg.MainButton.show();
        }
    });

    // Handle back button for modal only
    tg.BackButton.onClick(() => {
        if (reminderModal.style.display === 'block') {
            closeModal();
        }
    });

    // Set up the input field
    tg.MainButton.setText('Add Reminder');
    tg.MainButton.hide();
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
    modalReminderTitle.value = title || '';
    modalDateTime.value = '';
    editingReminderId = null;
    reminderModal.style.display = 'block';
    modalReminderTitle.focus();
    
    tg.BackButton.show();
    tg.MainButton.setText('Save Reminder');
    tg.MainButton.show();
    tg.MainButton.onClick(handleMainButtonClick);
}

// New function to handle MainButton clicks
function handleMainButtonClick() {
    const title = modalReminderTitle.value.trim();
    const date = modalDateTime.value;
    
    if (!title) return;

    const reminder = {
        id: editingReminderId || Date.now(),
        title: title,
        date: date ? new Date(date).toISOString() : null,
        completed: false
    };

    // Save to localStorage
    const reminders = getReminders();
    const existingIndex = reminders.findIndex(r => r.id === reminder.id);
    
    if (existingIndex !== -1) {
        reminders[existingIndex] = reminder;
    } else {
        reminders.push(reminder);
    }
    localStorage.setItem('reminders', JSON.stringify(reminders));

    // Update UI
    loadReminders();

    // Close modal
    closeModal();

    // Send to Telegram
    tg.sendData(JSON.stringify({
        type: 'new_reminder',
        reminder: reminder
    }));
}

function closeModal() {
    reminderModal.style.display = 'none';
    modalReminderTitle.value = '';
    modalDateTime.value = '';
    editingReminderId = null;
    
    tg.BackButton.hide();
    tg.MainButton.hide();
    tg.MainButton.offClick(handleMainButtonClick);
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
    // Clear existing reminders first
    const completedSection = document.querySelector('.completed-section');
    if (completedSection) {
        completedSection.remove();
    }
    
    // Get all reminders and sort them
    const reminders = getReminders();
    
    // Add uncompleted reminders
    reminders.filter(r => !r.completed).forEach(reminder => addReminderToUI(reminder));
    
    // Add completed reminders
    reminders.filter(r => r.completed).forEach(reminder => addReminderToUI(reminder));
}

// Add this after tg.ready();
document.documentElement.style.setProperty('--tg-viewport-height', `${window.innerHeight}px`);
window.addEventListener('resize', () => {
    document.documentElement.style.setProperty('--tg-viewport-height', `${window.innerHeight}px`);
});

// Add new function to handle reminder creation from native input
function handleNativeInput(text) {
    if (!text.trim()) return;
    
    const reminder = {
        id: Date.now(),
        title: text.trim(),
        date: null,
        completed: false
    };

    storeReminder(reminder);
    addReminderToUI(reminder);
    
    tg.sendData(JSON.stringify({
        type: 'new_reminder',
        reminder: reminder
    }));

    // Clear the input
    tg.CloudStorage.removeItem('draft_reminder');
}

// Update the MainButton click handler
tg.MainButton.onClick(() => {
    if (reminderModal.style.display === 'block') {
        handleMainButtonClick();
    } else {
        tg.CloudStorage.getItem('draft_reminder', (err, value) => {
            if (!err && value) {
                handleNativeInput(value);
            }
        });
    }
});

// Add new function to show bottom drawer
function showNewReminderPopup() {
    document.body.style.overflow = 'hidden';
    reminderModal.style.display = 'block';
    modalReminderTitle.value = '';
    modalDateTime.value = '';
    
    reminderModal.offsetHeight;
    
    setTimeout(() => {
        modalReminderTitle.focus();
    }, 300);
    
    tg.MainButton.setText('Add Reminder');
    tg.MainButton.show();
    tg.BackButton.show();
    
    tg.MainButton.onClick(handleMainButtonClick);
    
    window.visualViewport.addEventListener('resize', handleViewportResize);
}

// Handle viewport resize (keyboard appearance)
function handleViewportResize() {
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.bottom = `${window.visualViewport.height - window.innerHeight}px`;
    }
} 