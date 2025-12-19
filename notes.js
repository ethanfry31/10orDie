// ============================================
// NOTES HISTORY PAGE LOGIC
// ============================================

/**
 * Store all daily data globally for search/filter
 * dailyDataStore[date] = { date, approachCount, notes: [...] }
 */
let dailyDataStore = {};

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Get today's date as a string
 * Returns: "Mon Dec 16 2024"
 */
function getTodayString() {
  return new Date().toDateString();
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
 * Save a new note to dailyDataStore from notes.html
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
      approachCount: 0,
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
  localStorage.setItem("dailyDataStore", JSON.stringify(dailyDataStore));

  // Reload and display notes
  loadNotesHistory();

  // Hide input form and clear
  hideNoteInput();
}

/**
 * Convert date string to readable label
 * "Mon Dec 16 2024" -> "Today", "Yesterday", or "Monday, Dec 16, 2024"
 */
function getDayLabel(dateString) {
  const today = getTodayString();
  const date = new Date(dateString);

  // Check if it's today
  if (dateString === today) {
    return "Today";
  }

  // Check if it's yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateString === yesterday.toDateString()) {
    return "Yesterday";
  }

  // Check if it's within the last week
  const daysAgo = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
  if (daysAgo < 7) {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }

  // Format as full date
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ============================================
// LOAD AND DISPLAY FUNCTIONS
// ============================================

/**
 * Load all daily data from localStorage
 * This runs when the page loads
 * Daily data is stored as dailyDataStore: { "Mon Dec 16 2024": { date, approachCount, notes } }
 */
function loadNotesHistory() {
  const stored = localStorage.getItem("dailyDataStore");

  if (!stored) {
    // No daily data exists yet
    displayNoNotes();
    updateStats(0, 0, 0, 0, 0);
    return;
  }

  try {
    dailyDataStore = JSON.parse(stored);

    // Validate that dailyDataStore is a proper object
    if (typeof dailyDataStore !== "object" || Array.isArray(dailyDataStore)) {
      throw new Error("Invalid daily data format");
    }

    displayAllDailyData(dailyDataStore);
    calculateAndDisplayStats(dailyDataStore);
  } catch (error) {
    console.error("Error loading daily data:", error);
    displayNoNotes();
    updateStats(0, 0, 0, 0, 0);
  }
}

/**
 * Calculate total approaches by summing all daily approach counts
 * This is the single source of truth - always accurate since it's derived from actual data
 */
function calculateTotalApproaches() {
  let total = 0;
  Object.keys(dailyDataStore).forEach((date) => {
    const entry = dailyDataStore[date];
    total += entry.approachCount || 0;
  });
  return total;
}

/**
 * Display all daily data organized by day with approach counts
 * Most recent days appear first
 */
function displayAllDailyData(dailyData) {
  const container = document.getElementById("notesHistory");

  // Get all dates and sort them (newest first)
  const dates = Object.keys(dailyData).sort((a, b) => {
    return new Date(b) - new Date(a); // Descending order
  });

  if (dates.length === 0) {
    displayNoNotes();
    return;
  }

  let html = "";

  // Build HTML for each day
  dates.forEach((date) => {
    const dailyEntry = dailyData[date];
    const approachCount = dailyEntry.approachCount || 0;
    const notes = dailyEntry.notes || [];

    // Skip if no data for this day
    if (notes.length === 0 && approachCount === 0) return;

    const dayLabel = getDayLabel(date);
    const noteCount = notes.length;

    // Determine completion status styling
    const isComplete = approachCount >= 10;
    const completionClass = isComplete ? "day-complete" : "";

    html += `
      <div class="day-section ${completionClass}" data-date="${date}">
        <div class="day-header-container">
          <h3 class="day-header">
            <span>${dayLabel}</span>
          </h3>
          <div class="day-info">
            <span class="approach-badge">${approachCount}/10 approaches</span>
            <span class="day-count">${noteCount} ${
      noteCount === 1 ? "note" : "notes"
    }</span>
          </div>
        </div>
        <div class="day-notes">
          ${
            notes.length > 0
              ? notes
                  .map(
                    (note) => `
            <div class="note-card-history" data-note-id="${note.id}">
              <p class="note-text-history">${escapeHtml(note.text)}</p>
              <span class="note-time-history">${note.timestamp}</span>
            </div>
          `
                  )
                  .join("")
              : '<p class="no-notes-for-day">No notes recorded this day</p>'
          }
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Display message when no notes exist
 */
function displayNoNotes() {
  const container = document.getElementById("notesHistory");
  container.innerHTML = `
    <div class="no-notes-history">
      <p>No notes recorded yet.</p>
      <p style="margin-top: 16px; font-size: 13px;">
        <a href="index.html" style="color: #ef4444; text-decoration: none;">
          Go to dashboard
        </a> to start logging notes.
      </p>
    </div>
  `;
}

// ============================================
// STATISTICS
// ============================================

/**
 * Calculate and display statistics
 * Total notes, total days, average per day, days completed (10/10)
 */
function calculateAndDisplayStats(dailyData) {
  let totalNotes = 0;
  let totalDays = 0;
  let daysCompleted = 0;

  // Count notes, days, and completed days
  Object.keys(dailyData).forEach((date) => {
    const entry = dailyData[date];
    const notes = entry.notes || [];
    const approachCount = entry.approachCount || 0;

    if (notes.length > 0 || approachCount > 0) {
      totalDays++;
      totalNotes += notes.length;

      if (approachCount >= 10) {
        daysCompleted++;
      }
    }
  });

  // Calculate average notes per day (rounded to 1 decimal)
  const avgNotesPerDay =
    totalDays > 0 ? (totalNotes / totalDays).toFixed(1) : 0;

  updateStats(
    totalNotes,
    totalDays,
    avgNotesPerDay,
    daysCompleted,
    calculateTotalApproaches()
  );
}

/**
 * Update statistics display in DOM
 */
function updateStats(
  totalNotes,
  totalDays,
  avgPerDay,
  daysCompleted = 0,
  totalApproaches
) {
  document.getElementById("totalNotes").textContent = totalNotes;
  document.getElementById("totalDays").textContent = totalDays;
  document.getElementById("avgNotesPerDay").textContent = avgPerDay;
  document.getElementById("totalApproaches").textContent = totalApproaches;

  // Display days completed (goals met) if element exists
  const daysCompletedElement = document.getElementById("daysCompleted");
  if (daysCompletedElement) {
    daysCompletedElement.textContent = daysCompleted;
  }

  // Show stats container after updating values
  const statsContainer = document.getElementById("statsContainer");
  if (statsContainer) {
    statsContainer.style.opacity = "1";
  }
}

// ============================================
// SEARCH/FILTER FUNCTIONALITY
// ============================================

/**
 * Filter daily data based on search input
 * Searches through note text content
 */
function filterNotes() {
  const searchTerm = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();

  // If no search term, show all daily data
  if (!searchTerm) {
    displayAllDailyData(dailyDataStore);
    return;
  }

  // Filter daily entries that have matching notes
  const filteredData = {};

  Object.keys(dailyDataStore).forEach((date) => {
    const entry = dailyDataStore[date];
    const notes = entry.notes || [];

    const matchingNotes = notes.filter((note) =>
      note.text.toLowerCase().includes(searchTerm)
    );

    // Only include dates that have matching notes
    if (matchingNotes.length > 0) {
      filteredData[date] = {
        date: entry.date,
        approachCount: entry.approachCount,
        notes: matchingNotes,
      };
    }
  });

  // Display filtered results
  if (Object.keys(filteredData).length === 0) {
    const container = document.getElementById("notesHistory");
    container.innerHTML = `
      <div class="no-notes-history">
        <p>No notes found matching "${escapeHtml(searchTerm)}"</p>
      </div>
    `;
  } else {
    displayAllDailyData(filteredData);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Escape HTML to prevent XSS attacks
 * Converts special characters to HTML entities
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Optional: Export daily data as text file
 * Includes approach counts and notes for each day
 */
function exportNotesAsText() {
  if (Object.keys(dailyDataStore).length === 0) {
    alert("No data to export");
    return;
  }

  let textContent = "10 OR DIE - DAILY DATA EXPORT\n";
  textContent += "Generated: " + new Date().toLocaleString() + "\n";
  textContent += "=".repeat(50) + "\n\n";

  // Sort dates (newest first)
  const dates = Object.keys(dailyDataStore).sort((a, b) => {
    return new Date(b) - new Date(a);
  });

  // Build text content
  dates.forEach((date) => {
    const entry = dailyDataStore[date];
    const approachCount = entry.approachCount || 0;
    const notes = entry.notes || [];

    textContent += getDayLabel(date) + "\n";
    textContent += "-".repeat(30) + "\n";
    textContent += `Approaches: ${approachCount}/10\n`;

    if (notes.length > 0) {
      textContent += `Notes (${notes.length}):\n`;
      notes.forEach((note, index) => {
        textContent += `  ${index + 1}. [${note.timestamp}] ${note.text}\n`;
      });
    } else {
      textContent += "No notes recorded.\n";
    }

    textContent += "\n";
  });

  // Create download
  const blob = new Blob([textContent], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `10ordie-export-${new Date().toISOString().split("T")[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Optional: Clear all daily data (with confirmation)
 * Permanently deletes all stored daily data
 */
function clearAllNotes() {
  const confirmed = confirm(
    "Are you sure you want to delete ALL data? This cannot be undone."
  );

  if (confirmed) {
    const doubleCheck = confirm(
      "This will permanently delete all your daily data (approaches and notes). Are you absolutely sure?"
    );

    if (doubleCheck) {
      localStorage.removeItem("dailyDataStore");
      dailyDataStore = {};
      displayNoNotes();
      updateStats(0, 0, 0, 0);
    }
  }
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the page when DOM is ready
 * Load notes and set up any event listeners
 */
document.addEventListener("DOMContentLoaded", function () {
  loadNotesHistory();

  // Attach event listeners for notes
  document
    .getElementById("addNoteBtn")
    .addEventListener("click", showNoteInput);
  document.getElementById("saveNoteBtn").addEventListener("click", saveNote);
  document
    .getElementById("cancelNoteBtn")
    .addEventListener("click", hideNoteInput);

  // Optional: Add keyboard shortcut for search (Ctrl/Cmd + F)
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "f") {
      e.preventDefault();
      document.getElementById("searchInput").focus();
    }
  });
});

// Optional: Reload notes when page becomes visible again
// (In case notes were added from another tab)
document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    loadNotesHistory();
  }
});
