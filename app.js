// Get elements
const counter = document.getElementById("counter");
const progressFill = document.getElementById("progressFill");
const approachBtn = document.getElementById("approachBtn");
const resetBtn = document.getElementById("resetBtn");
const streakCount = document.getElementById("streakCount");
const punishmentBanner = document.getElementById("punishmentBanner");
const successBanner = document.getElementById("successBanner");

// State
let count = 0;
let streak = 0;

// Get today's date string
function getTodayString() {
  return new Date().toDateString();
}

// Load data from localStorage
function loadData() {
  const data = localStorage.getItem("approachData");

  if (data) {
    const parsed = JSON.parse(data);
    const today = getTodayString();

    // If same day, restore count
    if (parsed.date === today) {
      count = parsed.count;
      streak = parsed.streak;
      updateUI();
      return;
    }

    // Different day - check if yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();

    // If yesterday and failed (< 10), show punishment
    if (parsed.date === yesterdayString && parsed.count < 10) {
      punishmentBanner.classList.remove("hidden");
      streak = 0;
    }
    // If yesterday and succeeded, increment streak
    else if (parsed.date === yesterdayString && parsed.count >= 10) {
      streak = parsed.streak;
    }
    // More than one day gap - reset streak
    else {
      streak = 0;
    }
  }

  // Reset count for new day
  count = 0;
  updateUI();
  saveData();
}

// Save data to localStorage
function saveData() {
  const data = {
    date: getTodayString(),
    count: count,
    streak: streak,
  };
  localStorage.setItem("approachData", JSON.stringify(data));
}

// Update UI
function updateUI() {
  counter.textContent = `${count}/10`;
  progressFill.style.width = `${(count / 10) * 100}%`;
  streakCount.textContent = streak;

  const isComplete = count >= 10;

  // Toggle complete styling
  if (isComplete) {
    counter.classList.add("complete");
    progressFill.classList.add("complete");
    approachBtn.disabled = true;
    approachBtn.textContent = "Complete!";
    successBanner.classList.remove("hidden");
  } else {
    counter.classList.remove("complete");
    progressFill.classList.remove("complete");
    approachBtn.disabled = false;
    approachBtn.textContent = "Approach Done ✓";
    successBanner.classList.add("hidden");
  }
}

// Handle approach button click
approachBtn.addEventListener("click", () => {
  if (count < 10) {
    count++;

    // If just hit 10, increment streak
    if (count === 10) {
      streak++;
    }

    // Hide punishment banner when user starts tracking
    punishmentBanner.classList.add("hidden");

    updateUI();
    saveData();
  }
});

// Handle reset button click
resetBtn.addEventListener("click", () => {
  if (confirm("Reset today's count?")) {
    count = 0;
    punishmentBanner.classList.add("hidden");
    updateUI();
    saveData();
  }
});

// Initialize on load
loadData();
