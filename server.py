import os
from flask import Flask, request, jsonify, send_from_directory
from groq import Groq


GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("Please set GROQ_API_KEY in your environment.")

client = Groq(api_key=GROQ_API_KEY)

# role System Prompt
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

# ====== Flask app ======
app = Flask(__name__, static_folder="static", static_url_path="")

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/api/chat", methods=["POST"])
def chat():
    """
    请求体：
    {
      "message": "string",
      "history": [ {"role": "user"|"assistant", "content": "text"}, ... ],
      "character": "Cat"|"Friend"|"Therapist"
    }
    返回：
    { "reply": "string" }
    """
    data = request.get_json(force=True)
    message = (data.get("message") or "").strip()
    history = data.get("history") or []
    character = data.get("character") or "Cat"

    if not message:
        return jsonify({"reply": ""})

    system_prompt = CHAR_PROMPTS.get(character, CHAR_PROMPTS["Cat"])

    # construct messages（only role+content）
    messages = [{"role": "system", "content": system_prompt}]
    for h in history:
        role = h.get("role")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

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

    return jsonify({"reply": reply})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
