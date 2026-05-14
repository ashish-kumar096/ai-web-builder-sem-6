import os
import json
import socket
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify, stream_with_context, Response
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_CONFIG_ERROR = None

if not GEMINI_API_KEY:
    GEMINI_CONFIG_ERROR = "GEMINI_API_KEY is missing. Add a valid Google AI Studio key to .env."
elif GEMINI_API_KEY.lower() == "your_gemini_api_key_here":
    GEMINI_CONFIG_ERROR = "GEMINI_API_KEY is still set to the placeholder value. Replace it with a valid Google AI Studio key."
else:
    genai.configure(api_key=GEMINI_API_KEY)

    model = genai.GenerativeModel(
        model_name="gemini-flash-latest",
        generation_config={
            "temperature": 0.85,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
        }
    )


def sse_error(message: str) -> str:
    return f"data: {json.dumps({'error': message})}\n\n"


def normalize_gemini_error(error: Exception) -> str:
    message = str(error)
    lowered = message.lower()

    if "api key not valid" in lowered or "api_key_invalid" in lowered:
        return "Gemini rejected the API key. Replace GEMINI_API_KEY with a valid Google AI Studio key in .env."

    if "quota" in lowered:
        return "Gemini quota exhausted. Check your Google AI Studio usage and billing limits."

    return message


def stream_gemini_response(prompt: str):
    if GEMINI_CONFIG_ERROR:
        yield sse_error(GEMINI_CONFIG_ERROR)
        return

    try:
        response = model.generate_content(prompt, stream=True)
        for chunk in response:
            if chunk.text:
                yield f"data: {json.dumps({'text': chunk.text})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"
    except Exception as error:
        yield sse_error(normalize_gemini_error(error))


def find_available_port(preferred_port: int, max_tries: int = 10) -> int:
    for port in range(preferred_port, preferred_port + max_tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                return port

    return preferred_port


def build_master_prompt(data: dict) -> str:
    """Construct the advanced master prompt from user inputs."""
    idea        = data.get("idea", "").strip()
    stack       = data.get("stack", "HTML + CSS + Vanilla JS")
    style       = data.get("style", "Modern & minimal")
    color       = data.get("color", "Auto (AI decides)")
    detail      = data.get("detail", "Advanced (full production)")
    code_out    = data.get("codeOut", "Single file (all-in-one)")
    tags        = data.get("tags", [])
    features    = data.get("features", [])

    tag_str     = ", ".join(tags) if tags else "general website"
    feat_str    = "\n".join(f"   {i+1}. {f}" for i, f in enumerate(features)) if features else "   (none specified)"

    master_prompt = f"""# MASTER WEBSITE GENERATION PROMPT
## Level: {detail} | Stack: {stack}

---

## PROJECT BRIEF
{idea}
Website Type Tags: {tag_str}

---

## DESIGN DIRECTIVES
- Visual style     : {style}
- Color theme      : {color}
- Typography       : Choose modern, readable type pairings appropriate to the style
- Spacing          : Use a consistent spacing scale (8px base unit)
- Layout           : Fluid grid with clear visual hierarchy — hero → value → proof → CTA
- Imagery          : Use https://placehold.co for all placeholder images with descriptive alt text

---

## TECHNICAL REQUIREMENTS
- Stack            : {stack}
- Output format    : {code_out}
- Browser support  : All modern browsers (Chrome, Firefox, Safari, Edge)
- No external UI libraries unless part of the stack

---

## MANDATORY FEATURES
{feat_str}

---

## SECTIONS TO BUILD
Generate ALL relevant sections based on the project brief, including:
1. Navigation bar  — sticky, with mobile hamburger menu and smooth scroll links
2. Hero section    — compelling headline, subtext, animated CTA button
3. Features        — icon + title + description cards (grid layout)
4. Social proof    — testimonials or logo strip
5. Pricing / Services — tiered pricing cards or services list (if applicable)
6. FAQ             — accordion-style (if applicable)
7. CTA section     — email capture or conversion block
8. Footer          — links, copyright, social icons

---

## CODE QUALITY STANDARDS
- Clean, well-commented, production-ready code
- Semantic HTML5 throughout
- CSS custom properties (variables) for all theme tokens
- Smooth CSS animations and transitions on key elements
- Mobile-first responsive design (375px, 768px, 1280px breakpoints)
- JS: vanilla ES6+ or framework-idiomatic patterns (no jQuery)
- All images: placehold.co with descriptive alt text
- No lorem ipsum — write realistic, convincing copy for the niche
- No TODOs, no placeholders — deliver COMPLETE working code

---

## OUTPUT INSTRUCTIONS
- Deliver ONLY complete, production-ready code
- Output as: {code_out}
- Start immediately with code — no preamble, no explanation before code
- After the code block, add a brief "## How to Run" section

---

## SELF-VERIFICATION CHECKLIST (verify before output)
✅ Mobile responsive at 375px, 768px, 1280px breakpoints
✅ No horizontal scroll or overflow on mobile
✅ All interactive elements have hover/focus states
✅ Color contrast meets WCAG AA minimum
✅ Animations are smooth and purposeful
✅ Copy is professional and tailored to the stated niche
✅ All sections listed above are present and complete
✅ Code runs without errors in browser

---
END OF PROMPT — Generate the website code now.
"""
    return master_prompt


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/generate-prompt", methods=["POST"])
def generate_prompt():
    """Return the constructed master prompt as text."""
    data = request.get_json()
    prompt = build_master_prompt(data)
    return jsonify({"prompt": prompt})


@app.route("/generate-website", methods=["POST"])
def generate_website():
    """Stream Gemini's response for website generation."""
    data = request.get_json()
    master_prompt = build_master_prompt(data)

    return Response(
        stream_with_context(stream_gemini_response(master_prompt)),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


@app.route("/refine", methods=["POST"])
def refine():
    """Refine / iterate on previously generated code."""
    data        = request.get_json()
    prev_code   = data.get("code", "")
    instruction = data.get("instruction", "")

    refine_prompt = f"""You previously generated this website code:

```
{prev_code[:6000]}
```

The user wants the following refinement:
"{instruction}"

Apply ONLY the requested changes. Return the COMPLETE updated code (not just the diff).
Keep all existing sections intact unless the instruction asks to change them.
Start directly with the code."""

    return Response(
        stream_with_context(stream_gemini_response(refine_prompt)),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


if __name__ == "__main__":
    preferred_port = int(os.getenv("PORT", "5000"))
    port = find_available_port(preferred_port)

    if port != preferred_port:
        print(f"Port {preferred_port} is busy, starting on {port} instead.")

    app.run(debug=True, port=port)
