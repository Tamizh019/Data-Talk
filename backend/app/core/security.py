"""
Security layer:
  1. Prompt Injection Guard  — blocks jailbreak-style inputs
  2. SQL Guard               — ensures only SELECT/WITH queries execute
"""
import re

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
    Raises ValueError if a prompt injection attempt is detected.
    Call this before sending user input to any LLM.
    """
    lower = user_input.lower()
    for phrase in INJECTION_PHRASES:
        if phrase in lower:
            raise ValueError(
                f"Security: Potential prompt injection detected. "
                f"Phrase blocked: '{phrase}'"
            )


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
