"""
Fenced LLM variety layer for HeartLink's companion voice.

Design contract (capstone defense summary):
- The endpoint VARINISHES a deterministic template; it never authors guidance.
- Input carries abstract facts only (slot, streak counts, log kind) — no names,
  no readings, no user IDs inside the prompt.
- The model output must preserve the template's meaning, stay short, contain
  no banned clinical phrases, and introduce no new numbers (blocks hallucinated
  readings). ANY failure returns the template verbatim with source="template".
- Kill switch: COMPANION_LLM_ENABLED=false (default) short-circuits to template
  with zero network calls — the demo runs keyless and offline-proof.
- Provider-agnostic OpenAI-compatible chat endpoint. Free-tier friendly:
  Groq free tier (default below) or Google Gemini via its OpenAI-compatible
  endpoint — both are config, not code. Keys live in backend env only.

Requires: httpx (already in requirements).
"""

import logging
import os
import re
from datetime import date
from typing import Any, Dict, Tuple

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.utils.security import get_current_user

logger = logging.getLogger("heartlink.companion")

router = APIRouter(prefix="/api/companion", tags=["Companion"])

# ─── Flag + provider config (env only; safe defaults = dormant) ──────────────
LLM_ENABLED = os.getenv("COMPANION_LLM_ENABLED", "false").lower() == "true"
LLM_BASE_URL = os.getenv("COMPANION_LLM_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
LLM_API_KEY = os.getenv("COMPANION_LLM_API_KEY", "")
LLM_MODEL = os.getenv("COMPANION_LLM_MODEL", "llama-3.1-8b-instant")
LLM_TIMEOUT_S = float(os.getenv("COMPANION_LLM_TIMEOUT_S", "8"))
LLM_DAILY_CAP = int(os.getenv("COMPANION_LLM_DAILY_CAP", "10"))

# Must mirror HeartLink-mobile/services/companionCopy.ts BANNED_PHRASES.
BANNED_PHRASES = [
    "you have",
    "you suffer",
    "diagnos",
    "your heart is",
    "your heart's",
    "disease",
    "disorder",
    "syndrome",
    "prescrib",
    "you should take",
    "you must take",
    "stop taking",
    "stop your meds",
    "skip your meds",
    "you are fine",
    "you're fine",
    "nothing to worry",
    "don't worry about",
]

SYSTEM_PROMPT = (
    "You are the voice of HeartLink, a warm, respectful Filipino health companion. "
    "Rephrase the given TEMPLATE in first person, warm Taglish, at most 25 words, "
    "keeping EXACTLY the same meaning. Rules you must never break: "
    "never interpret health data, never mention diseases or conditions, "
    "never give medical or medication advice, never add facts or numbers "
    "that are not already in the template."
)

FEW_SHOTS = [
    {"template": "Take a calm seated moment to record your morning blood pressure and pulse check.",
     "output": "Shall we take a calm moment together for your morning BP check?"},
    {"template": "Great job completing 20 minutes of cardio today! Regular movement keeps your vascular rhythm resilient.",
     "output": "20 minutes of movement today — I'm really proud of you, let's keep it going!"},
]


class VarnishRequest(BaseModel):
    slot: str = Field(pattern="^(greeting|post_log|evening)$")
    template: str = Field(min_length=1, max_length=600)
    facts: Dict[str, Any] = Field(default_factory=dict)
    locale: str = "tl-en"


class VarnishResponse(BaseModel):
    text: str
    source: str  # "ai" | "template"


# Naïve per-process daily cap (production would use Redis).
_usage: Dict[str, Tuple[str, int]] = {}


def _under_cap(user_id: str) -> bool:
    today = date.today().isoformat()
    key = user_id or "anon"
    day, count = _usage.get(key, (today, 0))
    if day != today:
        _usage[key] = (today, 0)
        return True
    if count >= LLM_DAILY_CAP:
        return False
    _usage[key] = (today, count + 1)
    return True


def _allowed(output: str, template: str) -> bool:
    """Server-side output contract. Rejects -> template fallback."""
    text = (output or "").strip().strip('"').strip()
    if not text:
        return False
    if len(text) > len(template) + 60:
        return False
    lowered = text.lower()
    if any(p in lowered for p in BANNED_PHRASES):
        logger.warning("companion varnish rejected: banned phrase")
        return False
    # No new numbers: every digit group must already exist in the template.
    for group in re.findall(r"\d+", text):
        if group not in template:
            logger.warning("companion varnish rejected: novel number %s", group)
            return False
    return True


def _call_llm(slot: str, template: str, facts: Dict[str, Any]) -> str:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for ex in FEW_SHOTS:
        messages.append({"role": "user", "content": f"TEMPLATE: {ex['template']}"})
        messages.append({"role": "assistant", "content": ex["output"]})
    messages.append({
        "role": "user",
        "content": f"SLOT: {slot}\nFACTS: {facts}\nTEMPLATE: {template}\nRephrase:",
    })
    resp = httpx.post(
        f"{LLM_BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {LLM_API_KEY}", "Content-Type": "application/json"},
        json={"model": LLM_MODEL, "messages": messages, "temperature": 0.7, "max_tokens": 80},
        timeout=LLM_TIMEOUT_S,
    )
    resp.raise_for_status()
    data = resp.json()
    return (data["choices"][0]["message"]["content"] or "").strip()


@router.post("/varnish", response_model=VarnishResponse)
def varnish_companion_line(body: VarnishRequest, current_user: dict = Depends(get_current_user)):
    """Rephrase a deterministic companion template. Always safe to call:
    any failure mode returns the template with source='template'."""
    template = body.template.strip()
    user_id = str(current_user.get("user_id") or "anon")

    if not LLM_ENABLED or not LLM_API_KEY:
        return VarnishResponse(text=template, source="template")
    if not _under_cap(user_id):
        logger.info("companion varnish capped for user %s", user_id)
        return VarnishResponse(text=template, source="template")

    try:
        # Facts are abstract by contract; defense-in-depth: drop anything
        # that looks like a reading, name, or identifier if ever sent.
        safe_facts = {
            k: v for k, v in (body.facts or {}).items()
            if k in {"streak_days", "kind", "slot", "hour_daypart"}
        }
        output = _call_llm(body.slot, template, safe_facts)
        if _allowed(output, template):
            logger.info("companion varnish ok (slot=%s, len=%d)", body.slot, len(output))
            return VarnishResponse(text=output.strip().strip('"').strip(), source="ai")
        return VarnishResponse(text=template, source="template")
    except Exception as exc:  # network, auth, model, parse — all fall back
        logger.warning("companion varnish fallback: %s", exc)
        return VarnishResponse(text=template, source="template")
