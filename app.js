// ============================================
// DOM ELEMENT REFERENCES
// ============================================
// Cache all DOM elements at the top for better performance
// This way we only query the DOM once instead of repeatedly
const counter = document.getElementById("counter");
const progressFill = document.getElementById("progressFill");
const approachBtn = document.getElementById("approachBtn");
const resetBtn = document.getElementById("resetBtn");
const streakCount = document.getElementById("streakCount");
const punishmentBanner = document.getElementById("punishmentBanner");
const successBanner = document.getElementById("successBanner");
const timerElement = document.getElementById("timeLeft");

// ============================================
// STATE VARIABLES
// ============================================
let count = 0; // Current approach count for today
let streak = 0; // Current streak of consecutive days (stored separately, top-level only)

// Daily data storage structure:
// dailyDataStore[date] = { date, approachCount, notes: [...] }
// This is loaded from localStorage on page init
let dailyDataStore = {};

// ============================================
// DATE & TIME UTILITIES
// ============================================

/**
 * Get today's date as a string for comparison
 * Example: "Mon Dec 16 2024"
 * Using toDateString() ensures we ignore time and only compare dates
 */
function getTodayString() {
  return new Date().toDateString();
}

/**
 * Get timestamp for end of day (8 PM today or tomorrow)
 * Returns: Unix timestamp in milliseconds
 * This is used to check if a day has passed
 */
function getDayEndTimestamp() {
  const end = new Date();
  end.setHours(20, 0, 0, 0); // Set to 8 PM today

  // If it's already past 8 PM, move to 8 PM tomorrow
  if (end < new Date()) {
    end.setDate(end.getDate() + 1);
  }

  return end.getTime(); // Return as timestamp (number)
}

/**
 * Check if a given date string was yesterday
 * This is KEY for streak logic - determines if streak continues
 * @param {string} dateString - Date in format "Mon Dec 16 2024"
 * @returns {boolean} - True if date was yesterday
 */
function wasYesterday(dateString) {
  if (!dateString) return false;

  const lastDate = new Date(dateString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time to midnight for both dates so we only compare the DATE part
  // Without this, times would interfere with comparison
  lastDate.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);

  return lastDate.getTime() === yesterday.getTime();
}

// ============================================
// COUNTDOWN TIMER
// ============================================

/**
 * Update countdown timer every second
 * Shows time remaining until 8 PM deadline
 * At deadline: saves approachCount to dailyData, resets count to 0 for next day
 * If count < 10 at deadline, shows punishment and resets streak
 */
let deadlinePassed = false; // Flag to track if we've already handled deadline for today

function updateTimer() {
  const target = new Date();
  target.setHours(20, 0, 0, 0); // 8 PM today

  // If already past 8 PM, target tomorrow's 8 PM
  if (target < new Date()) {
    target.setDate(target.getDate() + 1);
  }

  const diff = target - new Date();

  if (diff <= 0) {
    timerElement.textContent = "00:00:00";

    // Only handle deadline once per day
    if (!deadlinePassed) {
      deadlinePassed = true;

      const today = getTodayString();

      // END-OF-DAY CHECKPOINT: Save today's count to approachCount
      dailyDataStore[today].approachCount = count;

      // Check if user failed today (didn't hit 10 approaches)
      if (count < 10) {
        punishmentBanner.classList.remove("hidden");
        streak = 0; // Reset streak on failure
      }

      // Reset global count to 0 for next day
      count = 0;

      updateUI();
      saveData();
    }
  } else {
    // Recalculate hours, minutes, seconds remaining
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    // Format with leading zeros (e.g., "03:05:09")
    const h = hours.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    const s = seconds.toString().padStart(2, "0");

    timerElement.textContent = `${h}:${m}:${s}`;

    // Reset deadline flag if we cross midnight (new day)  *This might not be in the right place*
    deadlinePassed = false;
  }
}

// Start the timer and update every second
setInterval(updateTimer, 1000);
updateTimer(); // Call immediately so we don't wait 1 second for first update

// ============================================
// LOCAL STORAGE - SAVE & LOAD
// ============================================

/**
 * Save all app state to localStorage
 * dailyDataStore: Object with all daily data keyed by date
 * streak: Top-level value for current streak only
 */
function saveData() {
  // Save the entire dailyDataStore
  localStorage.setItem("dailyDataStore", JSON.stringify(dailyDataStore));

  // Save streak separately (top-level)
  localStorage.setItem("currentStreak", JSON.stringify(streak));
}

/**
 * Run one-time data migration from old storage format to new dailyDataStore
 * Imports old notes from "allTimeNotes" key into the new dailyDataStore structure
 */
function migrateOldData() {
  // Check if old notes data exists
  const oldNotes = localStorage.getItem("allTimeNotes");
  if (oldNotes) {
    try {
      const oldNotesData = JSON.parse(oldNotes);

      // Import old notes into dailyDataStore
      Object.keys(oldNotesData).forEach((date) => {
        if (!dailyDataStore[date]) {
          dailyDataStore[date] = {
            date: date,
            approachCount: 0, // No historical count data available
            notes: oldNotesData[date] ?? [],
          };
        } else {
          // Merge notes if date already exists
          dailyDataStore[date].notes = oldNotesData[date] ?? [];
        }
      });

      // IMPORTANT: Save the migrated data back to localStorage
      localStorage.setItem("dailyDataStore", JSON.stringify(dailyDataStore));

      // Delete old notes key
      localStorage.removeItem("allTimeNotes");
      console.log("Data migration complete");
    } catch (error) {
      console.error("Error during data migration:", error);
    }
  }
}

/**
 * Load saved data from localStorage and restore state
 * This runs when page loads to restore previous session
 *
 * CRITICAL STREAK LOGIC:
 * - If same day: restore count and streak
 * - If yesterday and completed (approachCount >= 10): continue streak
 * - If yesterday but failed (approachCount < 10): reset streak to 0
 * - If more than 1 day gap: reset streak to 0
 */
function loadData() {
  const today = getTodayString();

  // Load dailyDataStore from localStorage
  const storedDailyData = localStorage.getItem("dailyDataStore");
  if (storedDailyData) {
    try {
      dailyDataStore = JSON.parse(storedDailyData);
    } catch (error) {
      console.error("Error loading dailyDataStore:", error);
      dailyDataStore = {};
    }
  }

  // Load streak from localStorage
  const storedStreak = localStorage.getItem("currentStreak");
  if (storedStreak) {
    try {
      streak = JSON.parse(storedStreak);
    } catch (error) {
      console.error("Error loading streak:", error);
      streak = 0;
    }
  }

  // Initialize today's entry if it doesn't exist
  if (!dailyDataStore[today]) {
    dailyDataStore[today] = {
      date: today,
      approachCount: 0,
      notes: [],
    };
  }

  // Get yesterday's date string for streak logic
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toDateString();

  // CASE 1: Same day - restore count from today's approachCount
  if (dailyDataStore[today].approachCount !== undefined) {
    count = dailyDataStore[today].approachCount;
  } else {
    count = 0;
  }

  // CASE 2: Check yesterday's completion for streak logic
  if (dailyDataStore[yesterdayString]) {
    const yesterdayApproaches =
      dailyDataStore[yesterdayString].approachCount || 0;

    // They completed yesterday (10/10) - continue streak!
    if (yesterdayApproaches >= 10) {
      // Streak continues - keep as-is
    }
    // They failed yesterday - reset streak
    else {
      streak = 0;
      punishmentBanner.classList.remove("hidden");
    }
  }

  updateUI();
  saveData(); // Save the potentially updated state
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

/**
 * Update all UI elements to reflect current state
 * This is called whenever count or streak changes
 * Centralizing UI updates prevents inconsistencies
 */
function updateUI() {
  // Update counter text (e.g., "7/10")
  counter.textContent = `${count}/10`;

  // Update progress bar width (0% to 100%)
  progressFill.style.width = `${(count / 10) * 100}%`;

  // Update streak display
  streakCount.textContent = streak;

  // Check if daily goal completed
  const isComplete = count >= 10;

  if (isComplete) {
    // Add "complete" styling (green colors)
    counter.classList.add("complete");
    progressFill.classList.add("complete");

    // Disable button and change text
    approachBtn.disabled = true;
    approachBtn.textContent = "Complete!";

    // Show success banner
    successBanner.classList.remove("hidden");
  } else {
    // Remove "complete" styling
    counter.classList.remove("complete");
    progressFill.classList.remove("complete");

    // Enable button
    approachBtn.disabled = false;
    approachBtn.textContent = "Approach Done ✓";

    // Hide success banner
    successBanner.classList.add("hidden");
  }

  // Update today's approach count display
  displayTodayApproachCount();
}

/**
 * Display today's approach count and notes
 * Shows the approach count badge and all notes for today
 */
function displayTodayApproachCount() {
  const todayApproachCountElement =
    document.getElementById("todayApproachCount");
  if (todayApproachCountElement) {
    todayApproachCountElement.textContent = `${count}/10`;
  }

  displayTodayNotes();
}

/**
 * Display today's notes from dailyDataStore
 * Shows all notes saved for today in the todayNotesList container
 */
function displayTodayNotes() {
  const today = getTodayString();
  const notesListContainer = document.getElementById("todayNotesList");

  if (!notesListContainer) return;

  // Get today's notes from dailyDataStore
  const todayData = dailyDataStore[today];

  if (notes.length === 0) {
    notesListContainer.innerHTML =
      '<p class="no-notes-today">No notes yet today. Add one to get started!</p>';
    return;
  }

  // Build HTML for today's notes
  let html = '<div class="today-notes-list">';
  notes.forEach((note) => {
    html += `
      <div class="note-card-today">
        <p class="note-text">${escapeHtml(note.text)}</p>
        <span class="note-time">${note.timestamp}</span>
      </div>
    `;
  });
  html += "</div>";

  notesListContainer.innerHTML = html;
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle approach button click
 * Increments count and streak when goal is reached
 */
approachBtn.addEventListener("click", () => {
  // Only increment if under 10
  if (count < 10) {
    count++;

    // If just completed daily goal (hit 10), increment streak
    if (count === 10) {
      streak++;
    }

    // Hide punishment banner when user starts making progress
    punishmentBanner.classList.add("hidden");

    // Update display and save to localStorage
    updateUI();
    saveData(); // FIX: Now saves streak too!
  }

  // Add animation effect
  approachBtn.classList.remove("animate");
  void approachBtn.offsetWidth; // Force browser reflow to restart animation
  approachBtn.classList.add("animate");
});

/**
 * Handle reset button click
 * Resets count for today (but keeps streak intact)
 */
resetBtn.addEventListener("click", () => {
  if (confirm("Reset today's count? This won't affect your streak.")) {
    count = 0;
    punishmentBanner.classList.add("hidden");
    updateUI();
    saveData();
  }
});

// ============================================
// NOTES FUNCTIONALITY
// ============================================

/**
 * Initialize notes section when DOM is ready
 * Event listeners for note creation form
 */
document.addEventListener("DOMContentLoaded", function () {
  displayDate();
  displayTodayApproachCount();

  // Attach event listeners for notes
  document
    .getElementById("addNoteBtn")
    .addEventListener("click", showNoteInput);
  document.getElementById("saveNoteBtn").addEventListener("click", saveNote);
  document
    .getElementById("cancelNoteBtn")
    .addEventListener("click", hideNoteInput);
});

/**
 * Display current date in readable format
 */
function displayDate() {
  const dateElement = document.querySelector(".date-display");
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  dateElement.textContent = today;
}

/**
 * Show the note input form
 */
function showNoteInput() {
  document.getElementById("noteInput").style.display = "block";
  document.getElementById("addNoteBtn").style.display = "none";
  document.getElementById("noteText").focus();
}

/**
 * Hide the note input form
 */
function hideNoteInput() {
  document.getElementById("noteInput").style.display = "none";
  document.getElementById("addNoteBtn").style.display = "block";
  document.getElementById("noteText").value = "";
}

/**
 * Save a new note to dailyDataStore
 * Notes are stored within today's dailyData object
 */
function saveNote() {
  const noteText = document.getElementById("noteText").value.trim();

  if (!noteText) {
    alert("Please enter a note");
    return;
  }

  // Get today's date string
  const today = getTodayString();

  // Ensure today's dailyData exists
  if (!dailyDataStore[today]) {
    dailyDataStore[today] = {
      date: today,
      approachCount: count,
      notes: [],
    };
  }

  // Create new note object with unique ID
  const newNote = {
    id: Date.now(), // Unix timestamp ensures uniqueness
    text: noteText,
    timestamp: new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };

  // Add note to today's dailyData
  dailyDataStore[today].notes.push(newNote);

  // Save to localStorage
  saveData();

  // Refresh today's notes display
  displayTodayNotes();

  // Hide input form and clear
  hideNoteInput();
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Load saved data when page first loads
 * This runs immediately when script loads
 */
migrateOldData(); // One-time migration of old data structure
loadData();
