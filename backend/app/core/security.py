"""
Security layer:
  1. Prompt Injection Guard  — blocks jailbreak-style inputs with witty responses
  2. SQL Guard               — ensures only SELECT/WITH queries execute
"""
import re
import random

# ── Prompt injection patterns ─────────────────────────────────────────
INJECTION_PHRASES = [
    "ignore previous instructions",
    "ignore all instructions",
    "forget your system prompt",
    "disregard all previous",
    "you are now",
    "act as",
    "pretend you are",
    "jailbreak",
    "do anything now",
]

# ── Witty rejection messages (mixed tones: savage, professional, playful) ──
REJECTION_MESSAGES = [
    "🛡️ Nice try, but my security protocols aren't that gullible. I'm here to analyze data, not play pretend.",
    "🔒 That prompt injection attempt was bold — I respect the hustle, but no. Ask me something about your data instead!",
    "⚔️ Prompt injection detected and neutralized. I've seen better attempts in a cybersecurity textbook. Try asking a real question!",
    "🚫 I appreciate the creativity, but I'm a data analyst — not a chatbot you can reprogram at a coffee shop. What data can I help with?",
    "🛡️ Security checkpoint! Your request was flagged as a manipulation attempt. My instructions are tamper-proof. What data would you like to explore?",
    "😎 I'm flattered you think I'd fall for that, but my system prompt is locked down tighter than Fort Knox. Let's talk data!",
    "🔐 Access denied. That's a classic prompt injection pattern, and I was literally built to catch those. What real question can I help with?",
    "⛔ Request blocked. I only answer to my creators — and they told me to analyze databases, not to follow strangers' instructions.",
    "🤖 Prompt injection attempt logged and blocked. Fun fact: I flag these faster than you can type them. Need help with actual data?",
    "🛡️ This request has been blocked for security reasons. I'm designed to be a data assistant, and that's exactly what I'll remain. How can I help with your data?",
]

# ── Dangerous SQL keywords ────────────────────────────────────────────
BLOCKED_SQL_PATTERN = re.compile(
    r"\b(DROP|DELETE|TRUNCATE|UPDATE|INSERT INTO|ALTER|CREATE|GRANT|REVOKE"
    r"|EXEC|EXECUTE|COPY|pg_sleep|pg_read_file)\b",
    re.IGNORECASE,
)

# ── Comment-based bypass patterns ────────────────────────────────────
COMMENT_BYPASS_PATTERN = re.compile(r"(--|#|/\*|\*/)", re.IGNORECASE)


def guard_prompt(user_input: str) -> None:
    """
    Raises ValueError with a witty message if a prompt injection attempt is detected.
    Call this before sending user input to any LLM.
    """
    lower = user_input.lower()
    for phrase in INJECTION_PHRASES:
        if phrase in lower:
            rejection = random.choice(REJECTION_MESSAGES)
            raise ValueError(rejection)


def guard_sql(sql: str) -> None:
    """
    Raises ValueError if SQL contains write/DDL operations or comment bypasses.
    Call this before executing any LLM-generated SQL.
    """
    # Strip leading whitespace and check for allowed prefix
    stripped = sql.strip().upper()
    if not (stripped.startswith("SELECT") or stripped.startswith("WITH")):
        raise ValueError(
            f"Security: Only SELECT or WITH queries are permitted. "
            f"Received: {stripped[:50]}..."
        )

    # Block dangerous keywords
    match = BLOCKED_SQL_PATTERN.search(sql)
    if match:
        raise ValueError(
            f"Security: Blocked SQL keyword detected: '{match.group()}'. "
            f"Only read-only queries are allowed."
        )

    # Block SQL comment injections
    if COMMENT_BYPASS_PATTERN.search(sql):
        raise ValueError(
            "Security: SQL comment syntax detected. This is not permitted."
        )
