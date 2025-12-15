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
let streak = 0; // Current streak of consecutive days

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
 * If deadline passes and count < 10, streak resets and punishment shows
 */
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

    // Check if user failed today (didn't hit 10 approaches)
    if (count < 10) {
      punishmentBanner.classList.remove("hidden");
      streak = 0; // Reset streak on failure
      updateUI();
      saveData();
    }
  } else {
    // Calculate hours, minutes, seconds remaining
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    // Format with leading zeros (e.g., "03:05:09")
    const h = hours.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    const s = seconds.toString().padStart(2, "0");

    timerElement.textContent = `${h}:${m}:${s}`;
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
 * This makes data persistent across browser sessions
 * Structure: { date, count, streak, dayEnd }
 */
function saveData() {
  const data = {
    date: getTodayString(), // "Mon Dec 16 2024"
    count: count, // 0-10
    streak: streak, // Current streak number (THIS IS THE KEY FIX!)
    dayEnd: getDayEndTimestamp(), // Timestamp for 8 PM deadline
  };

  // Convert object to JSON string and save
  localStorage.setItem("approachData", JSON.stringify(data));
}

/**
 * Load saved data from localStorage and restore state
 * This runs when page loads to restore previous session
 *
 * CRITICAL STREAK LOGIC:
 * - If same day: restore count and streak
 * - If yesterday and completed (count >= 10): continue streak
 * - If yesterday but failed (count < 10): reset streak to 0
 * - If more than 1 day gap: reset streak to 0
 */
function loadData() {
  const stored = localStorage.getItem("approachData");

  if (!stored) {
    // No saved data - this is first time using app
    streak = 0;
    count = 0;
    updateUI();
    saveData();
    return;
  }

  const data = JSON.parse(stored);
  const today = getTodayString();
  const savedDate = data.date;

  // CASE 1: Same day - restore everything as-is
  if (savedDate === today) {
    count = data.count || 0;
    streak = data.streak || 0; // FIX: Now we load saved streak!
  }
  // CASE 2: Yesterday - check if they completed
  else if (wasYesterday(savedDate)) {
    // They completed yesterday (10/10) - continue streak!
    if (data.count >= 10) {
      streak = data.streak || 0; // Keep streak alive
      count = 0; // New day, reset count
    }
    // They failed yesterday - reset streak
    else {
      streak = 0;
      count = 0;
      punishmentBanner.classList.remove("hidden");
    }
  }
  // CASE 3: More than 1 day gap - streak broken
  else {
    streak = 0;
    count = 0;
    // Show punishment if they had incomplete progress
    if (data.count < 10) {
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
 * Save a new note to localStorage
 * Notes are stored in allTimeNotes organized by date
 * This allows notes to persist across days and be viewed in notes.html
 */
function saveNote() {
  const noteText = document.getElementById("noteText").value.trim();

  if (!noteText) {
    alert("Please enter a note");
    return;
  }

  // Get today's date string for organizing notes
  const today = getTodayString();

  // Load all time notes from localStorage
  let allTimeNotes = {};
  const stored = localStorage.getItem("allTimeNotes");
  if (stored) {
    try {
      allTimeNotes = JSON.parse(stored);
    } catch (error) {
      console.error("Error loading all time notes:", error);
      allTimeNotes = {};
    }
  }

  // Initialize today's notes array if it doesn't exist
  if (!allTimeNotes[today]) {
    allTimeNotes[today] = [];
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

  // Add to today's notes array
  allTimeNotes[today].push(newNote);

  // Save to localStorage
  localStorage.setItem("allTimeNotes", JSON.stringify(allTimeNotes));

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
loadData();
