import os


class Config:
    OPENAI_API_KEY = os.getenv(
        "OPENAI_API_KEY", ""
    )

    OPENAI_API_URL = os.getenv(
        "OPENAI_API_URL",
        "https://api.openai.com/v1/chat/completions"
    )

    OPENAI_RESPONSES_API_URL = os.getenv(
        "OPENAI_RESPONSES_API_URL",
        "https://api.openai.com/v1/responses"
    )
