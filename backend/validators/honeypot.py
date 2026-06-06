from fastapi import HTTPException


def validate_honeypot(website: str) -> None:
    if website:
        raise HTTPException(status_code=400, detail="Bot detected")
