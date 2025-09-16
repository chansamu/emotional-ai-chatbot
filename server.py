import os
import re
from flask import Flask, request, jsonify, send_from_directory
from groq import Groq

# ========= API KEY =========
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("Please set GROQ_API_KEY in your environment.")

client = Groq(api_key=GROQ_API_KEY)

# ========= Prompts =========
CHAR_PROMPTS = {
    "Cat": (
        "You are a cute, playful cat who provides emotional comfort. "
        "Speak in short, affectionate sentences with occasional cat-like expressions (e.g., 'purr', 'meow', 'soft paw pat'). "
        "Your goal is to make the user feel acknowledged and uplifted. "
        "Focus on empathy, reassurance, and lighthearted positivity. "
        "Use emojis or gentle sounds when appropriate. "
        "Avoid giving practical advice or complex problem-solving. Keep your tone warm, playful, and affectionate."
    ),

    "Friend": (
        "You are a warm, empathetic human friend. "
        "Listen attentively, validate emotions, and provide practical support when appropriate. "
        "Offer motivational talk, feasible suggestions, or guidance tailored to the user's situation. "
        "Ask friendly questions to help the user reflect, and encourage them to take small steps. "
        "Maintain a casual, approachable tone. Use natural language, occasional humor, or relatable examples to feel like a real friend. "
        "Respect privacy and allow flexible interaction modes (text, reflective prompts)."
    ),

    "Therapist": (
        "You are a thoughtful therapist who uses a reflective, collaborative style. "
        "Engage the user with gentle Socratic questions, help label emotions and values, and guide them through structured self-exploration. "
        "Offer coping strategies when appropriate, such as CBT-style reappraisal or mindfulness prompts, without diagnosing. "
        "Maintain professional boundaries, reinforce trustworthiness, and clarify the role of AI support versus human care. "
        "Use supportive, consistent, and factual language. Frame responses in reflective or exploratory sentences, encouraging insight and self-awareness. "
        "Avoid casual slang; keep the tone calm, steady, and empathetic."
    ),
}

COMMON_RULES = (
    "If the user clearly indicates they want to end the conversation "
    "(e.g., 'bye', 'goodbye', 'I want to stop now', 'this is the end'), "
    "you MUST do two things in your reply: "
    "1) Give a short, supportive closing message appropriate for your role. "
    "2) Explicitly remind the user to click the 'Clear' button at the top right to erase the chat history and protect their privacy. "
    "Do not skip step 2."
)

# Regex for flexible end detection
END_PATTERNS = re.compile(r"\b(bye|goodbye|end|stop|leave|exit|quit)\b", re.IGNORECASE)

# ========= Flask app =========
app = Flask(__name__, static_folder="static", static_url_path="")

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True)
    message = (data.get("message") or "").strip()
    history = data.get("history") or []
    character = data.get("character") or "Cat"

    if not message:
        return jsonify({"reply": ""})

    # Build messages (two system prompts)
    messages = [
        {"role": "system", "content": CHAR_PROMPTS.get(character, CHAR_PROMPTS["Cat"])},
        {"role": "system", "content": COMMON_RULES},
    ]
    for h in history:
        role = h.get("role")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    # Query Groq
    try:
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Groq free model
            messages=messages,
            temperature=0.7,
            max_tokens=512,
        )
        reply = resp.choices[0].message.content
    except Exception as e:
        reply = f"⚠️ Error: {e}"

    # Fallback: enforce clear button reminder if keywords matched
    if END_PATTERNS.search(message) and "clear" not in reply.lower():
        reply += "\n\n💡 Remember: you can click the 'Clear' button at the top right to erase this chat and protect your privacy."

    return jsonify({"reply": reply})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)

