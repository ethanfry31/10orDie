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

//timer logic
const timerElement = document.getElementById("timeLeft");
const now = new Date();
const target = new Date();
target.setHours(20, 0, 0, 0); // Set to 8 PM

setInterval(() => {
  const diff = target - new Date();
  if (diff <= 0) {
    timerElement.textContent = "00:00:00";

    if (count < 10) {
      punishmentBanner.classList.remove("hidden");
      streak = 0;
      updateUI();
      saveData();
    }
    target.setDate(target.getDate() + 1); // Move to next day
  } else {
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    const h = hours.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    const s = seconds.toString().padStart(2, "0");
    timerElement.textContent = `${h}:${m}:${s}`;
  }
}, 1000);

//End of the day function
function getDayEndTimestamp() {
  const end = new Date();
  end.setHours(20, 0, 0, 0); // Set to 8 PM today
  if (end < new Date()) {
    end.setDate(end.getDate() + 1); // If past 8 PM, set to next day
  }
  return end.getTime();
}

// Load data from localStorage
function loadData() {
  const data = localStorage.getItem("approachData");

  if (data) {
    const parsed = JSON.parse(data);
    const now = Date.now();

    // If same day, restore count
    if (parsed.dayEnd && now >= parsed.dayEnd) {
      if (parsed.count < 10) {
        punishmentBanner.classList.remove("hidden");
        streak = 0;
      }
      count = 0;
    }
    // More than one day gap - reset streak
    else {
      count = parsed.count || 0;
    }
  } else {
    streak = 0;
    count = 0;
  }

  updateUI();
  saveData();
}
// Save data to localStorage
function saveData() {
  const data = {
    date: getTodayString(),
    count: count,
    streak: streak,
    dayEnd: getDayEndTimestamp(),
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
  approachBtn.classList.remove("animate");
  void approachBtn.offsetWidth; // Trigger reflow
  approachBtn.classList.add("animate");
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
