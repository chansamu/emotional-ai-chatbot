// ========== DOM References ==========
const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("message");
const sendBtn = document.getElementById("send");
const clearBtn = document.getElementById("clear");
const roleEl = document.getElementById("role");
const recordBtn = document.getElementById("record");

let history = [];
let currentRole = roleEl.value;
let recognizing = false;
let recognition;

// Emojis for assistant roles
const assistantEmoji = {
  Cat: "🐱",
  Friend: "🙂",
  Therapist: "🧑‍⚕️"
};

// ========== Helper Functions ==========

// Get current time in HH:MM (24h)
function nowHHMM() {
  const d = new Date();
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

// Role-based voice mapping (customized)
const voiceMapping = {
  Cat: { name: "Google US English", rate: 1.1, pitch: 1.3 },
  Friend: { name: "Nicky, US", rate: 1.2, pitch: 1.1 },
  Therapist: { name: "Google UK English Female", rate: 1.1, pitch: 1.0 }
};

// Safely pick a voice by name, with fallback to partial match or any English voice
function pickVoice(preferredName) {
  const voices = speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Try exact match
  let v = voices.find(x => x.name === preferredName);
  if (!v) {
    // Try partial, case-insensitive
    v = voices.find(x => x.name.toLowerCase().includes(preferredName.toLowerCase()));
  }
  // Fallback to any en-* voice or first available
  if (!v) {
    v = voices.find(x => x.lang && x.lang.startsWith("en")) || voices[0];
  }
  return v;
}

// Ensure voices are cached when browser loads them
let allVoices = [];
window.speechSynthesis.onvoiceschanged = () => {
  allVoices = speechSynthesis.getVoices();
};

// ========== Playback Manager ==========
/*
  currentPlayback stores which bubble is currently playing (or paused):
  {
    utterance: SpeechSynthesisUtterance | null,
    controls: DOM element of controls for that bubble,
    isPaused: boolean
  }
*/
const currentPlayback = {
  utterance: null,
  controls: null,
  isPaused: false
};

// Utility: find the three control buttons inside controls container
function getControlButtons(controlsEl) {
  const btns = controlsEl.querySelectorAll(".speak-btn");
  // order: play, pause, stop (as constructed)
  return {
    playBtn: btns[0],
    pauseBtn: btns[1],
    stopBtn: btns[2]
  };
}

// Reset UI for a controls element (show play only, hide pause/stop)
function resetControlsUI(controlsEl) {
  if (!controlsEl) return;
  const { playBtn, pauseBtn, stopBtn } = getControlButtons(controlsEl);
  playBtn.classList.remove("hidden");
  pauseBtn.classList.add("hidden");
  stopBtn.classList.add("hidden");
  pauseBtn.textContent = "⏸️"; // reset icon for next use
}

// Set UI for playing state (hide play, show pause+stop)
function setPlayingUI(controlsEl) {
  const { playBtn, pauseBtn, stopBtn } = getControlButtons(controlsEl);
  playBtn.classList.add("hidden");
  pauseBtn.classList.remove("hidden");
  stopBtn.classList.remove("hidden");
  pauseBtn.textContent = "⏸️";
}

// Set UI for paused state (show play as resume, hide pause)
function setPausedUI(controlsEl) {
  const { playBtn, pauseBtn, stopBtn } = getControlButtons(controlsEl);
  playBtn.classList.remove("hidden");    // visible resume button
  pauseBtn.classList.add("hidden");     // hidden
  stopBtn.classList.remove("hidden");   // keep stop visible
  // playBtn already visually shows ▶️; pauseBtn text reset when needed
}

// Stop any currently playing utterance and reset its UI
function stopCurrentPlayback() {
  if (currentPlayback.utterance) {
    // cancel global synthesis (this stops playback)
    speechSynthesis.cancel();
  }
  if (currentPlayback.controls) {
    resetControlsUI(currentPlayback.controls);
  }
  currentPlayback.utterance = null;
  currentPlayback.controls = null;
  currentPlayback.isPaused = false;
}

// ========== UI Append Functions ==========

// Append user message bubble
function appendUserBubble(text) {
  const row = document.createElement("div");
  row.className = "msg-row user";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const msgText = document.createElement("span");
  msgText.textContent = text;
  bubble.appendChild(msgText);

  const ts = document.createElement("span");
  ts.className = "timestamp";
  ts.textContent = nowHHMM();
  bubble.appendChild(ts);

  row.appendChild(bubble);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// Append assistant bubble with audio controls
function appendAssistantBubble(text) {
  const row = document.createElement("div");
  row.className = "msg-row assistant";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = assistantEmoji[currentRole];

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const replyText = document.createElement("span");
  replyText.textContent = text;
  bubble.appendChild(replyText);

  const footer = document.createElement("div");
  footer.className = "bubble-footer";

  const controls = document.createElement("div");
  controls.className = "audio-controls";

  // Create buttons: play, pause, stop (play visible by default)
  const playBtn = document.createElement("button");
  playBtn.className = "speak-btn";
  playBtn.textContent = "▶️";

  const pauseBtn = document.createElement("button");
  pauseBtn.className = "speak-btn hidden";
  pauseBtn.textContent = "⏸️";

  const stopBtn = document.createElement("button");
  stopBtn.className = "speak-btn hidden";
  stopBtn.textContent = "⏹️";

  const ts = document.createElement("span");
  ts.className = "timestamp";
  ts.textContent = nowHHMM();

  // Append buttons to controls
  controls.appendChild(playBtn);
  controls.appendChild(pauseBtn);
  controls.appendChild(stopBtn);

  // Append footer
  footer.appendChild(controls);
  footer.appendChild(ts);
  bubble.appendChild(footer);

  row.appendChild(avatar);
  row.appendChild(bubble);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;

  // --- Button logic ---

  // PLAY button: either resume (if paused and same bubble) OR start new playback
  playBtn.onclick = () => {
    // If this bubble is the one currently paused, resume playback
    if (currentPlayback.isPaused && currentPlayback.controls === controls) {
      speechSynthesis.resume();
      currentPlayback.isPaused = false;
      setPlayingUI(controls);
      return;
    }

    // Otherwise start fresh playback for this bubble
    // If something else is playing, stop it first (and reset its UI)
    if (currentPlayback.utterance) {
      stopCurrentPlayback();
    }

    const config = voiceMapping[currentRole] || {};
    const utter = new SpeechSynthesisUtterance(text);

    // Apply voice safely (pickVoice will fallback if necessary)
    const picked = pickVoice(config.name || "");
    if (picked) utter.voice = picked;
    if (config.rate) utter.rate = config.rate;
    if (config.pitch) utter.pitch = config.pitch;

    // Keep reference in playback manager
    currentPlayback.utterance = utter;
    currentPlayback.controls = controls;
    currentPlayback.isPaused = false;

    // Bind end handler to reset UI only for this bubble
    utter.onend = () => {
      // Only reset if this utterance is still the current one
      if (currentPlayback.utterance === utter) {
        resetControlsUI(controls);
        currentPlayback.utterance = null;
        currentPlayback.controls = null;
        currentPlayback.isPaused = false;
      }
    };

    // Optional: handle onpause/onresume for extra robustness
    utter.onpause = () => {
      currentPlayback.isPaused = true;
      setPausedUI(controls);
    };
    utter.onresume = () => {
      currentPlayback.isPaused = false;
      setPlayingUI(controls);
    };

    // Speak and update UI
    speechSynthesis.speak(utter);
    setPlayingUI(controls);
  };

  // PAUSE button: pause the currently speaking utterance (if belongs to this bubble)
  pauseBtn.onclick = () => {
    // Only act if this controls is the current one
    if (currentPlayback.controls !== controls) return;

    if (!currentPlayback.isPaused) {
      // Pause global synthesis
      speechSynthesis.pause();
      currentPlayback.isPaused = true;
      // Show resume (play) button instead of pause
      setPausedUI(controls);
    } else {
      // If somehow paused flag is set and pauseBtn is clicked, try resume
      speechSynthesis.resume();
      currentPlayback.isPaused = false;
      setPlayingUI(controls);
    }
  };

  // STOP button: fully stop and reset
  stopBtn.onclick = () => {
    // Cancel global synthesis
    speechSynthesis.cancel();
    // Reset UI for this bubble
    resetControlsUI(controls);
    // If this was current playback, clear manager
    if (currentPlayback.controls === controls) {
      currentPlayback.utterance = null;
      currentPlayback.controls = null;
      currentPlayback.isPaused = false;
    }
  };
}

// ========== Typing Indicator ==========
let typingRow = null;
function showTyping() {
  typingRow = document.createElement("div");
  typingRow.className = "msg-row assistant";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = assistantEmoji[currentRole];

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = `<span class="typing"></span>`;

  typingRow.appendChild(avatar);
  typingRow.appendChild(bubble);
  chatEl.appendChild(typingRow);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function hideTyping() {
  if (typingRow && typingRow.parentNode) {
    chatEl.removeChild(typingRow);
  }
  typingRow = null;
}

// ========== Chat API (send & receive) ==========
async function sendMessage() {
  const text = (inputEl.value || "").trim();
  if (!text) return;

  appendUserBubble(text);
  history.push({ role: "user", content: text });

  inputEl.value = "";
  inputEl.disabled = true;
  sendBtn.disabled = true;
  showTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history,
        character: currentRole
      })
    });

    const data = await res.json();
    hideTyping();

    const reply = data.reply || "";
    appendAssistantBubble(reply);
    history.push({ role: "assistant", content: reply });
  } catch (err) {
    hideTyping();
    appendAssistantBubble(`⚠️ Error: ${err}`);
  } finally {
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

// ========== Event Listeners ==========

// Send message
sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Clear chat
clearBtn.addEventListener("click", () => {
  history = [];
  chatEl.innerHTML = "";
  inputEl.focus();
});

// Switch role
roleEl.addEventListener("change", () => {
  currentRole = roleEl.value;
  history = [];
  chatEl.innerHTML = "";
  appendAssistantBubble(
    `Hi! I'm your ${currentRole.toLowerCase()}. How can I support you today?`
  );
});

// Default greeting on page load
window.addEventListener("load", () => {
  appendAssistantBubble(
    `Hi! I'm your ${currentRole.toLowerCase()}. How can I support you today?`
  );
});

// Voice recording (SpeechRecognition API)
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US"; 
  recognition.continuous = true; // keep listening until manually stopped
  recognition.interimResults = false;

  let userStopped = false; // track manual stop

  recognition.onstart = () => {
    recognizing = true;
    recordBtn.textContent = "🛑"; // change icon when recording
  };

  recognition.onend = () => {
    recognizing = false;
    recordBtn.textContent = "🎙️";

    // if it ended NOT because of user stop, restart automatically
    if (!userStopped) {
      recognition.start();
    }
  };

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    inputEl.value += " " + transcript; // append instead of overwrite
  };

  recordBtn.addEventListener("click", () => {
    if (recognizing) {
      userStopped = true; // mark manual stop
      recognition.stop();
      return;
    }
    userStopped = false;
    recognition.start();
  });
} else {
  recordBtn.disabled = true;
  recordBtn.title = "SpeechRecognition not supported in this browser.";
}
