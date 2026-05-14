# ◈ WebCraft AI — Website Builder (Gemini + Python)

A production-grade AI website builder powered by **Google Gemini 1.5 Flash**, built with **Python + Flask**. Describe your website, configure your stack and design preferences, and watch production-ready code stream live to your screen.

---

## ✦ Features

| Feature | Details |
|---|---|
| AI Engine | Google Gemini 1.5 Flash (streaming SSE) |
| Backend | Python 3.10+ + Flask |
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Prompt Engine | Master prompt builder with 20+ config options |
| Live Preview | Iframe preview with desktop/tablet/mobile modes |
| Code Refinement | Iterative AI refinement of generated code |
| Download | One-click download of generated website |

---

## 🚀 Quick Start

### 1. Clone / Download the project
```
ai_website_builder/
├── app.py                  ← Flask backend + Gemini API
├── requirements.txt
├── .env                    ← Your API key goes here
├── templates/
│   └── index.html          ← Full UI template
└── static/
    ├── css/style.css
    └── js/main.js
```

### 2. Install dependencies
```bash
cd ai_website_builder
pip install -r requirements.txt
```

### 3. Get your Gemini API Key (FREE)
1. Go to → https://aistudio.google.com/app/apikey
2. Click **"Create API Key"**
3. Copy it

### 4. Add your API key
Open `.env` and paste your key:
```
GEMINI_API_KEY=AIzaSy...your_key_here...
```

### 5. Run the app
```bash
python app.py
```

Open your browser at → **http://localhost:5000**

---

## 🧠 How It Works

```
User fills form
      │
      ▼
build_master_prompt() ← constructs advanced structured prompt
      │
      ▼
Gemini 1.5 Flash API ← streaming SSE response
      │
      ▼
Frontend streams code token-by-token
      │
      ▼
Live Preview renders in iframe
```

### Master Prompt Structure
The generated prompt includes:
- **Project Brief** — your idea + tags
- **Design Directives** — style, color, typography
- **Technical Requirements** — stack, browser support
- **Mandatory Features** — from your checkboxes
- **Sections to Build** — nav, hero, features, CTA, footer, etc.
- **Code Quality Standards** — semantic HTML, CSS vars, ES6+
- **Self-Verification Checklist** — AI validates its own output

---

## 🔌 API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | Main UI |
| `POST` | `/generate-prompt` | Returns the master prompt JSON |
| `POST` | `/generate-website` | Streams website code via SSE |
| `POST` | `/refine` | Streams refined code based on instruction |

### Example API call (Python)
```python
import requests

response = requests.post("http://localhost:5000/generate-website", json={
    "idea": "A landing page for a meditation app for busy professionals",
    "stack": "HTML + CSS + Vanilla JS",
    "style": "Modern & minimal",
    "color": "Dark + electric accent",
    "detail": "Advanced (full production)",
    "codeOut": "Single file (all-in-one)",
    "tags": ["landing page", "startup product page"],
    "features": [
        "Responsive, mobile-first layout",
        "Smooth CSS animations and transitions",
        "SEO-optimized HTML structure"
    ]
}, stream=True)

for line in response.iter_lines():
    if line:
        print(line.decode())
```

---

## 📁 Project Structure

```
app.py
│  ├── build_master_prompt()  → assembles the structured AI prompt
│  ├── /generate-prompt       → returns prompt text
│  ├── /generate-website      → SSE stream of Gemini response
│  └── /refine                → SSE stream of refinement

templates/index.html
│  ├── Config Panel (left)    → form, tags, selects, checkboxes
│  └── Output Panel (right)   → code view, live preview, prompt view

static/js/main.js
│  ├── collectData()          → reads all form inputs
│  ├── generatePrompt()       → calls /generate-prompt
│  ├── generateWebsite()      → SSE streaming from /generate-website
│  ├── refineCode()           → SSE streaming from /refine
│  ├── refreshPreview()       → renders code in iframe
│  └── copyCode/downloadCode  → utilities
```

---

## ⚙️ Configuration Options

| Option | Choices |
|---|---|
| Stack | HTML/CSS/JS, React+Tailwind, Next.js, Vue, Astro |
| Style | Minimal, Bold, Dark/Glass, Corporate, Playful, Brutalist |
| Color | Auto, Blue/White, Purple, Dark+Electric, Earthy, Mono |
| Detail | Advanced, Intermediate, Starter |
| Output | Single file, Multi-file, Component-based |
| Features | 8 toggleable: responsive, animations, SEO, dark mode, forms, a11y, CMS, perf |

---

## 🛠️ Tech Stack

- **Backend**: Python 3.10+, Flask 3.0, `google-generativeai` SDK
- **AI Model**: `gemini-1.5-flash` via Google AI Studio
- **Streaming**: Server-Sent Events (SSE) via Flask `stream_with_context`
- **Frontend**: HTML5, CSS3 custom properties, Vanilla ES6+
- **Fonts**: Syne (display) + DM Sans (body) + DM Mono (code)

---

## 📄 License
MIT — free to use and modify.
