const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("message");
const sendBtn = document.getElementById("send");
const clearBtn = document.getElementById("clear");
const roleEl = document.getElementById("role");

let history = [];
// current role(clear history when switch role)
let currentRole = roleEl.value;

const assistantEmoji = {
  Cat: "🐱",
  Friend: "🙂",
  Therapist: "🧑‍⚕️"
};

function nowHHMM(){
  const d = new Date();
  return d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", hour12: false});
}

function appendUserBubble(text){
  const row = document.createElement("div");
  row.className = "msg-row user";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  const ts = document.createElement("span");
  ts.className = "timestamp";
  ts.textContent = nowHHMM();
  bubble.appendChild(ts);

  row.appendChild(bubble);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function appendAssistantBubble(text){
  const row = document.createElement("div");
  row.className = "msg-row assistant";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = assistantEmoji[currentRole];

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  const ts = document.createElement("span");
  ts.className = "timestamp";
  ts.textContent = nowHHMM();
  bubble.appendChild(ts);

  row.appendChild(avatar);
  row.appendChild(bubble);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
}

let typingRow = null;
function showTyping(){
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

function hideTyping(){
  if (typingRow && typingRow.parentNode) {
    chatEl.removeChild(typingRow);
  }
  typingRow = null;
}

async function sendMessage(){
  const text = (inputEl.value || "").trim();
  if (!text) return;

  // UI
  appendUserBubble(text);

  // add to history
  history.push({ role: "user", content: text });

  // show when typing
  inputEl.value = "";
  inputEl.disabled = true;
  sendBtn.disabled = true;
  showTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
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

    // add assistant's response to history
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


sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

clearBtn.addEventListener("click", () => {
  history = [];
  chatEl.innerHTML = "";
  inputEl.focus();
});

roleEl.addEventListener("change", () => {
  currentRole = roleEl.value;
  // switch role => clear history to avoid mess
  history = [];
  chatEl.innerHTML = "";
  appendAssistantBubble(`Hi! I'm your ${currentRole.toLowerCase()}. How can I support you today?`);
});

