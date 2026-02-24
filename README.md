# emotional-ai-chatbot
 
# 🐾 Emotional Support Chatbot

A simple web-based emotional support chatbot with multiple character roles (Cat, Friend, Therapist). Built as a proof-of-concept for my master's thesis project. The project explores how different conversational personas influence perceived emotional support and user experience.

---

## Project Goal
The goal was not to build a production-ready therapy tool, but to:
- Experiment with persona-driven prompt design
- Explore human-centered interaction in AI systems
- Evaluate how tone and framing affect user perception

---

## Features
- Three selectable characters:
  - **Cat 🐱** – playful, cute, and comforting
  - **Friend 🙂** – warm, empathetic, encouraging
  - **Therapist 🧑‍⚕️** – reflective, gentle guidance, CBT-style suggestions
- Keeps conversation history
- Mobile-friendly web interface
- Uses [Groq](https://www.groq.com/) LLM for AI responses
- Supports 24-hour format timestamps in chat

---

## Tech Stack
- **Backend**: Python, Flask
- **Frontend**: HTML/CSS/JavaScript (static files in `static/`)
- **AI**: Groq LLM (`llama-3.1-8b-instant`)
- **Deployment**: Local development server (`http://localhost:5001`)

---

## Architecture
The system consists of:
- A Flask backend handling prompt construction and API communication
- Persona-specific prompt templates
- A lightweight frontend that manages chat state and UI rendering
<img width="415" height="214" alt="image" src="https://github.com/user-attachments/assets/3de8fc45-6afd-4b31-a3f1-25f765d9d759" />

---

## Limitations & Future Improvements

If I were to revisit this project, I would:
- Refactor backend logic into a more modular structure
- Add systematic logging and evaluation metrics
- Implement conversation state validation
- Explore deployment beyond local development
