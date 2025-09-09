import os
from flask import Flask, request, jsonify, send_from_directory
from groq import Groq


GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("Please set GROQ_API_KEY in your environment.")

client = Groq(api_key=GROQ_API_KEY)

# role System Prompt（need iterate later）
CHAR_PROMPTS = {
    "Cat": (
        "You are a cute, playful cat who provides emotional support. "
        "Be caring and gentle, with light, positive energy. "
        "Use short, affectionate sentences and occasional cat-like expressions, "
        "but keep it natural and not repetitive. Avoid medical/clinical claims."
    ),
    "Friend": (
        "You are a warm, empathetic human friend. "
        "Listen attentively, validate emotions, and encourage realistic next steps. "
        "Keep a friendly, supportive tone. Avoid therapy-speak unless asked."
    ),
    "Therapist": (
        "You are a thoughtful therapist using a reflective, collaborative style. "
        "Use gentle Socratic questions, help the user label emotions and values, "
        "offer coping ideas (e.g., CBT-style reappraisal) when appropriate. "
        "Avoid diagnosing. Encourage seeking professional help for crisis."
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
