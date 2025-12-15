// ============================================
// NOTES HISTORY PAGE LOGIC
// ============================================

/**
 * Store all notes data globally for search/filter
 */
let allNotesData = {};

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
 * Load all notes from localStorage
 * This runs when the page loads
 * Notes are organized by date in format: { "Mon Dec 16 2024": [...notes] }
 */
function loadNotesHistory() {
  const stored = localStorage.getItem("allTimeNotes");

  if (!stored) {
    // No notes exist yet
    displayNoNotes();
    updateStats(0, 0, 0);
    return;
  }

  try {
    allNotesData = JSON.parse(stored);
    
    // Validate that allNotesData is a proper object
    if (typeof allNotesData !== 'object' || Array.isArray(allNotesData)) {
      throw new Error("Invalid notes data format");
    }
    
    displayAllNotes(allNotesData);
    calculateAndDisplayStats(allNotesData);
  } catch (error) {
    console.error("Error loading notes:", error);
    displayNoNotes();
    updateStats(0, 0, 0);
  }
}

/**
 * Display all notes organized by day
 * Most recent days appear first
 */
function displayAllNotes(notesData) {
  const container = document.getElementById("notesHistory");

  // Get all dates and sort them (newest first)
  const dates = Object.keys(notesData).sort((a, b) => {
    return new Date(b) - new Date(a); // Descending order
  });

  if (dates.length === 0) {
    displayNoNotes();
    return;
  }

  let html = "";

  // Build HTML for each day
  dates.forEach((date) => {
    const notes = notesData[date];

    // Skip if no notes for this day (shouldn't happen, but safety check)
    if (!notes || notes.length === 0) return;

    const dayLabel = getDayLabel(date);
    const noteCount = notes.length;

    html += `
      <div class="day-section" data-date="${date}">
        <h3 class="day-header">
          <span>${dayLabel}</span>
          <span class="day-count">${noteCount} ${
      noteCount === 1 ? "note" : "notes"
    }</span>
        </h3>
        <div class="day-notes">
          ${notes
            .map(
              (note, index) => `
            <div class="note-card-history" data-note-id="${note.id}">
              <p class="note-text-history">${escapeHtml(note.text)}</p>
              <span class="note-time-history">${note.timestamp}</span>
            </div>
          `
            )
            .join("")}
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
        <a href="index.html" style="color: #d4a574; text-decoration: underline;">
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
 * Total notes, total days, average per day
 */
function calculateAndDisplayStats(notesData) {
  let totalNotes = 0;
  let totalDays = 0;

  // Count notes and days
  Object.keys(notesData).forEach((date) => {
    const notes = notesData[date];
    if (notes && notes.length > 0) {
      totalDays++;
      totalNotes += notes.length;
    }
  });

  // Calculate average (rounded to 1 decimal)
  const avgNotesPerDay =
    totalDays > 0 ? (totalNotes / totalDays).toFixed(1) : 0;

  updateStats(totalNotes, totalDays, avgNotesPerDay);
}

/**
 * Update statistics display in DOM
 */
function updateStats(totalNotes, totalDays, avgPerDay) {
  document.getElementById("totalNotes").textContent = totalNotes;
  document.getElementById("totalDays").textContent = totalDays;
  document.getElementById("avgNotesPerDay").textContent = avgPerDay;
}

// ============================================
// SEARCH/FILTER FUNCTIONALITY
// ============================================

/**
 * Filter notes based on search input
 * Searches through note text content
 */
function filterNotes() {
  const searchTerm = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();

  // If no search term, show all notes
  if (!searchTerm) {
    displayAllNotes(allNotesData);
    return;
  }

  // Filter notes that match search term
  const filteredData = {};

  Object.keys(allNotesData).forEach((date) => {
    const notes = allNotesData[date];
    const matchingNotes = notes.filter((note) =>
      note.text.toLowerCase().includes(searchTerm)
    );

    // Only include dates that have matching notes
    if (matchingNotes.length > 0) {
      filteredData[date] = matchingNotes;
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
    displayAllNotes(filteredData);
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
 * Optional: Export notes as text file
 * You can add a button in HTML to trigger this
 */
function exportNotesAsText() {
  if (Object.keys(allNotesData).length === 0) {
    alert("No notes to export");
    return;
  }

  let textContent = "NOTES EXPORT\n";
  textContent += "Generated: " + new Date().toLocaleString() + "\n";
  textContent += "=".repeat(50) + "\n\n";

  // Sort dates
  const dates = Object.keys(allNotesData).sort((a, b) => {
    return new Date(b) - new Date(a);
  });

  // Build text content
  dates.forEach((date) => {
    const notes = allNotesData[date];
    textContent += getDayLabel(date) + "\n";
    textContent += "-".repeat(30) + "\n";

    notes.forEach((note, index) => {
      textContent += `${index + 1}. [${note.timestamp}]\n`;
      textContent += `   ${note.text}\n\n`;
    });

    textContent += "\n";
  });

  // Create download
  const blob = new Blob([textContent], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `notes-export-${new Date().toISOString().split("T")[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Optional: Clear all notes (with confirmation)
 * You can add a button in HTML to trigger this
 */
function clearAllNotes() {
  const confirmed = confirm(
    "Are you sure you want to delete ALL notes? This cannot be undone."
  );

  if (confirmed) {
    const doubleCheck = confirm(
      "This will permanently delete all your notes. Are you absolutely sure?"
    );

    if (doubleCheck) {
      localStorage.removeItem("allTimeNotes");
      allNotesData = {};
      displayNoNotes();
      updateStats(0, 0, 0);
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
