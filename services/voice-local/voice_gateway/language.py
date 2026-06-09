"""Language preference helpers for voice STT/TTS."""

from __future__ import annotations

import re

# Sarvam BCP-47 codes used by Bulbul v3 / Saaras v3
LANGUAGE_ALIASES: dict[str, str] = {
    "english": "en-IN",
    "hindi": "hi-IN",
    "hinglish": "hi-IN",
    "marathi": "mr-IN",
    "tamil": "ta-IN",
    "telugu": "te-IN",
    "kannada": "kn-IN",
    "malayalam": "ml-IN",
    "bengali": "bn-IN",
    "gujarati": "gu-IN",
    "punjabi": "pa-IN",
    "odia": "od-IN",
    "odiya": "od-IN",
}

LANGUAGE_DISPLAY: dict[str, str] = {
    "en-IN": "English",
    "hi-IN": "Hindi",
    "mr-IN": "Marathi",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
    "kn-IN": "Kannada",
    "ml-IN": "Malayalam",
    "bn-IN": "Bengali",
    "gu-IN": "Gujarati",
    "pa-IN": "Punjabi",
    "od-IN": "Odia",
}

SCRIPT_LANGUAGE: list[tuple[str, str]] = [
    (r"[\u0900-\u097F]", "hi-IN"),  # Devanagari — ambiguous; prefer locked language
    (r"[\u0B80-\u0BFF]", "ta-IN"),
    (r"[\u0C00-\u0C7F]", "te-IN"),
    (r"[\u0C80-\u0CFF]", "kn-IN"),
    (r"[\u0D00-\u0D7F]", "ml-IN"),
    (r"[\u0980-\u09FF]", "bn-IN"),
    (r"[\u0A80-\u0AFF]", "gu-IN"),
    (r"[\u0A00-\u0A7F]", "pa-IN"),
    (r"[\u0B00-\u0B7F]", "od-IN"),
]

LANGUAGE_NAME_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"मराठी", re.IGNORECASE), "mr-IN"),
    (re.compile(r"marathi", re.IGNORECASE), "mr-IN"),
    (re.compile(r"(हिंदी|हिन्दी)", re.IGNORECASE), "hi-IN"),
    (re.compile(r"\bhindi\b", re.IGNORECASE), "hi-IN"),
    (re.compile(r"தமிழ்", re.IGNORECASE), "ta-IN"),
    (re.compile(r"\btamil\b", re.IGNORECASE), "ta-IN"),
    (re.compile(r"తెలుగు", re.IGNORECASE), "te-IN"),
    (re.compile(r"\btelugu\b", re.IGNORECASE), "te-IN"),
    (re.compile(r"ಕನ್ನಡ", re.IGNORECASE), "kn-IN"),
    (re.compile(r"\bkannada\b", re.IGNORECASE), "kn-IN"),
    (re.compile(r"മലയാളം", re.IGNORECASE), "ml-IN"),
    (re.compile(r"\bmalayalam\b", re.IGNORECASE), "ml-IN"),
    (re.compile(r"বাংলা", re.IGNORECASE), "bn-IN"),
    (re.compile(r"\bbengali\b", re.IGNORECASE), "bn-IN"),
    (re.compile(r"ગુજરાતી", re.IGNORECASE), "gu-IN"),
    (re.compile(r"\bgujarati\b", re.IGNORECASE), "gu-IN"),
    (re.compile(r"ਪੰਜਾਬੀ", re.IGNORECASE), "pa-IN"),
    (re.compile(r"\bpunjabi\b", re.IGNORECASE), "pa-IN"),
    (re.compile(r"ଓଡ଼ିଆ", re.IGNORECASE), "od-IN"),
    (re.compile(r"\b(odia|odiya)\b", re.IGNORECASE), "od-IN"),
    (re.compile(r"\benglish\b", re.IGNORECASE), "en-IN"),
]

LANGUAGE_SWITCH_CUES = (
    "talk",
    "speak",
    "reply",
    "respond",
    "answer",
    "continue",
    "language",
    "in ",
    "using",
    "बोल",
    "बोलू",
    "बात",
    "जवाब",
    "उत्तर",
    "में",
    "मे",
    "मध्ये",
    "मधे",
    "can we",
    "let's",
    "lets",
    "please",
)


def detect_language_switch(user_text: str) -> str | None:
    """Return a Sarvam language code when the teacher asks to switch language."""
    text = user_text.strip()
    if not text:
        return None

    lower = text.lower()

    for pattern, code in LANGUAGE_NAME_PATTERNS:
        if not pattern.search(text):
            continue

        if any(cue in lower or cue in text for cue in LANGUAGE_SWITCH_CUES):
            return code

        # Short utterance naming only the language ("मराठी", "Tamil").
        if len(text.split()) <= 4:
            return code

    for phrase, code in LANGUAGE_ALIASES.items():
        if phrase in lower and any(cue in lower for cue in LANGUAGE_SWITCH_CUES):
            return code

    return None


def infer_language_from_text(text: str, fallback: str = "en-IN") -> str:
    """Guess TTS/STT language from Unicode script in text."""
    for pattern, code in SCRIPT_LANGUAGE:
        if re.search(pattern, text):
            return code
    return fallback


def append_language_lock(system_prompt: str, language_code: str | None) -> str:
    """Inject a hard reply-language constraint for the LLM."""
    if not language_code:
        return system_prompt

    name = LANGUAGE_DISPLAY.get(language_code, language_code)
    return (
        f"{system_prompt}\n\n"
        f"══ ACTIVE REPLY LANGUAGE: {name} ({language_code}) ══\n"
        f"The teacher is using {name}. Write your ENTIRE reply in {name} only.\n"
        f"- Marathi and Hindi both use Devanagari script but are DIFFERENT languages.\n"
        f"- If active language is Marathi, do NOT reply in Hindi.\n"
        f"- If active language is Tamil, do NOT reply in Hindi or English.\n"
        f"- Do not say you will switch language — just answer in {name}."
    )
