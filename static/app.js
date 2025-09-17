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

// Get current time in HH:MM 24h format
function nowHHMM() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

// Append user message bubble with text + timestamp
function appendUserBubble(text) {
  const row = document.createElement("div");
  row.className = "msg-row user";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  // Add message text
  const msgText = document.createElement("span");
  msgText.textContent = text;
  bubble.appendChild(msgText);

  // Add timestamp
  const ts = document.createElement("span");
  ts.className = "timestamp";
  ts.textContent = nowHHMM();
  bubble.appendChild(ts);

  row.appendChild(bubble);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
}


// Role-based voice mapping
const voiceMapping = {
  Cat: { name: "Google US English", rate: 1.1, pitch: 1.3 },
  Friend: { name: "Nicky, US", rate: 1.2, pitch: 1.1 },
  Therapist: { name: "Google UK English Female", rate: 1.1, pitch: 1.0 }
};


// safely pick a voice by name, with fallback
function pickVoice(preferredName) {
  const voices = speechSynthesis.getVoices();
  // Try exact match
  let voice = voices.find(v => v.name === preferredName);
  if (!voice) {
    // Try partial match (case-insensitive)
    voice = voices.find(v => v.name.toLowerCase().includes(preferredName.toLowerCase()));
  }
  // Fallback: any English voice, or first available
  if (!voice) {
    voice = voices.find(v => v.lang.startsWith("en")) || voices[0];
  }
  return voice;
}

// Cache voices once loaded
let allVoices = [];
window.speechSynthesis.onvoiceschanged = () => {
  allVoices = speechSynthesis.getVoices();
};

// Append assistant message bubble with avatar, text, timestamp, and play controls
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

  let utterance = null;

  playBtn.onclick = () => {
    if (speechSynthesis.speaking) speechSynthesis.cancel();

    const config = voiceMapping[currentRole];
    utterance = new SpeechSynthesisUtterance(text);

    // Apply role-specific voice settings
    utterance.voice = pickVoice(config.name);
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;

    utterance.onend = () => {
      playBtn.classList.remove("hidden");
      pauseBtn.classList.add("hidden");
      stopBtn.classList.add("hidden");
      pauseBtn.textContent = "⏸️"; // reset
    };

    speechSynthesis.speak(utterance);

    playBtn.classList.add("hidden");
    pauseBtn.classList.remove("hidden");
    stopBtn.classList.remove("hidden");
  };


  pauseBtn.onclick = () => {
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
      pauseBtn.textContent = "⏸️";
    } else {
      speechSynthesis.pause();
      pauseBtn.textContent = "▶️";
    }
  };

  stopBtn.onclick = () => {
    speechSynthesis.cancel();
    playBtn.classList.remove("hidden");
    pauseBtn.classList.add("hidden");
    stopBtn.classList.add("hidden");
    pauseBtn.textContent = "⏸️";
  };

  controls.appendChild(playBtn);
  controls.appendChild(pauseBtn);
  controls.appendChild(stopBtn);

  footer.appendChild(controls);
  footer.appendChild(ts);
  bubble.appendChild(footer);

  row.appendChild(avatar);
  row.appendChild(bubble);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
}


// Typing indicator
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

// Send message to backend
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

// Event: Send message
sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Event: Clear chat
clearBtn.addEventListener("click", () => {
  history = [];
  chatEl.innerHTML = "";
  inputEl.focus();
});

// Event: Switch role
roleEl.addEventListener("change", () => {
  currentRole = roleEl.value;
  history = [];
  chatEl.innerHTML = "";
  appendAssistantBubble(`Hi! I'm your ${currentRole.toLowerCase()}. How can I support you today?`);
});

// Default greeting on page load
window.onload = () => {
  appendAssistantBubble(`Hi! I'm your ${currentRole.toLowerCase()}. How can I support you today?`);
};

// Voice recording (SpeechRecognition API)
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US"; 
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    recognizing = true;
    recordBtn.textContent = "🛑"; // change icon when recording
  };
  recognition.onend = () => {
    recognizing = false;
    recordBtn.textContent = "🎙️";
  };
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    inputEl.value = transcript; // put recognized text into input
  };

  recordBtn.addEventListener("click", () => {
    if (recognizing) {
      recognition.stop();
      return;
    }
    recognition.start();
  });
} else {
  recordBtn.disabled = true;
  recordBtn.title = "SpeechRecognition not supported in this browser.";
}
