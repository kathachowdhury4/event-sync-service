import re
from datetime import datetime
from typing import Optional


def normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    value = str(value).strip().lower()

    if not value:
        return None

    value = re.sub(r"\s+", " ", value)

    value = re.sub(
        r"[^a-z0-9\s]",
        "",
        value
    )

    return value.strip()


def normalize_name(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    value = normalize_text(value)

    if not value:
        return None

    return value


def normalize_company(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    value = normalize_text(value)

    if not value:
        return None

    suffixes = [
        "inc",
        "incorporated",
        "llc",
        "ltd",
        "limited",
        "corp",
        "corporation",
        "capital",
        "partners",
        "group",
    ]

    words = value.split()

    words = [
        word
        for word in words
        if word not in suffixes
    ]

    return " ".join(words)


def normalize_title(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    value = normalize_text(value)

    if not value:
        return None

    replacements = {
        "discussion": "discuss",
        "meeting": "meet",
        "session": "session",
        "review": "review",
        "sync": "sync",
        "follow up": "followup",
    }

    for old, new in replacements.items():
        value = value.replace(old, new)

    return value


def parse_date(
    value: Optional[str]
) -> Optional[datetime]:

    if not value:
        return None

    value = str(value).strip()

    formats = [
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%d",
        "%m-%d/%Y",
        "%m/%d/%Y",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(
                value,
                fmt
            )
        except ValueError:
            continue

    # Python ISO parser fallback
    try:
        normalized = value.replace(
            "Z",
            "+00:00"
        )

        return datetime.fromisoformat(
            normalized
        ).replace(tzinfo=None)

    except ValueError:
        return None


def parse_time(
    value: Optional[str]
) -> Optional[datetime]:

    if not value:
        return None

    value = str(value).strip()

    formats = [
        "%H:%M",
        "%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(
                value,
                fmt
            )
        except ValueError:
            continue

    try:
        normalized = value.replace(
            "Z",
            "+00:00"
        )

        return datetime.fromisoformat(
            normalized
        ).replace(tzinfo=None)

    except ValueError:
        return None


def time_to_minutes(
    value: Optional[datetime]
) -> Optional[int]:

    if not value:
        return None

    return (
        value.hour * 60
        + value.minute
    )


def extract_email_name(
    email: Optional[str]
) -> Optional[str]:

    if not email:
        return None

    email = email.strip()

    if "@" not in email:
        return None

    local_part = email.split("@")[0]

    local_part = re.sub(
        r"[._-]+",
        " ",
        local_part
    )

    return normalize_name(local_part)


def token_similarity(
    first: Optional[str],
    second: Optional[str]
) -> float:

    first = normalize_text(first)
    second = normalize_text(second)

    if not first or not second:
        return 0.0

    first_tokens = set(first.split())
    second_tokens = set(second.split())

    if not first_tokens or not second_tokens:
        return 0.0

    intersection = (
        first_tokens &
        second_tokens
    )

    union = (
        first_tokens |
        second_tokens
    )

    return len(intersection) / len(union)