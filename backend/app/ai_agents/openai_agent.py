# openai_agent.py (GPT-5 only, Responses API only)
from flask import Blueprint, request, jsonify, current_app
import requests
import logging
from datetime import datetime
import os
from pathlib import Path
from openai import RateLimitError
import backoff

ai_agents_openai_agent_bp = Blueprint("openai_agent", __name__)
logging.basicConfig(level=logging.INFO)


def is_gpt5_model(model: str) -> bool:
    # Handles: gpt-5, gpt-5-mini, gpt-5-pro, gpt-5-codex, gpt-5.2, gpt-5.2-mini, etc.
    return isinstance(model, str) and model.startswith("gpt-5")


def normalize_reasoning_effort(val: str) -> str:
    # Based on your real API error for gpt-5-mini:
    # Supported values: minimal, low, medium, high
    if not val:
        return "minimal"
    v = str(val).strip().lower()
    allowed = {"minimal", "low", "medium", "high"}
    return v if v in allowed else "minimal"


def normalize_text_verbosity(val: str) -> str:
    if not val:
        return "medium"
    v = str(val).strip().lower()
    allowed = {"low", "medium", "high"}
    return v if v in allowed else "medium"


@backoff.on_exception(backoff.expo, RateLimitError, max_tries=6)
def responses_with_backoff(payload: dict, headers: dict):
    url = current_app.config["OPENAI_RESPONSES_API_URL"]
    response = requests.post(url, json=payload, headers=headers, timeout=120)

    # Critical: log error body so you see exact param issues
    if not response.ok:
        logging.error(f"OpenAI error {response.status_code}: {response.text}")

    response.raise_for_status()
    return response.json()


def extract_text_from_responses_api(response_json: dict) -> str:
    """
    Extract assistant text from Responses API structure:
    response_json.output[] -> {type:'message', content:[{type:'output_text'|'text', text:'...'}]}
    """
    full_text = ""

    output = response_json.get("output", [])
    if isinstance(output, list):
        for out_item in output:
            if not isinstance(out_item, dict):
                continue
            if out_item.get("type") != "message":
                continue
            content_list = out_item.get("content", [])
            if not isinstance(content_list, list):
                continue
            for c in content_list:
                if not isinstance(c, dict):
                    continue
                if c.get("type") in ("output_text", "text"):
                    full_text += c.get("text", "") or ""

    # Fallbacks (defensive)
    if not full_text:
        content = response_json.get("content")
        if isinstance(content, list):
            for c in content:
                if isinstance(c, dict) and c.get("type") == "text":
                    full_text += c.get("text", "") or ""
        elif isinstance(content, str):
            full_text = content

    return full_text


@ai_agents_openai_agent_bp.route("/send-prompt", methods=["POST"])
def send_prompt():
    data = request.json or {}

    openai_model = data.get("openAiModel")
    prompt = data.get("myAIPrompt")

    response_file_name = (data.get("responseFileName", "") or "").strip()
    forced_ai_response = data.get("forcedAiResponse")

    reasoning_effort = normalize_reasoning_effort(data.get("reasoning", "minimal"))
    text_verbosity = normalize_text_verbosity(data.get("text", "medium"))
    max_tokens = int(data.get("maxTokens", 1024))
    with_cleaned_raw = bool(data.get("withCleanedRaw", True))

    if not openai_model or not prompt:
        return jsonify({"error": "Invalid input"}), 400

    if not is_gpt5_model(openai_model):
        return (
            jsonify({"error": f"Only GPT-5 models are supported. Got: {openai_model}"}),
            400,
        )

    # If forcedAiResponse is provided, skip calling OpenAI
    if forced_ai_response:
        message_content = forced_ai_response
    else:
        api_key = current_app.config.get("OPENAI_API_KEY")
        if not api_key:
            return jsonify({"error": "Missing OPENAI_API_KEY"}), 500

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        # IMPORTANT:
        # Your API rejected "temperature" for gpt-5-mini, so we DO NOT send it at all.
        payload = {
            "model": openai_model,
            "input": prompt,
            "reasoning": {"effort": reasoning_effort},
            "text": {"verbosity": text_verbosity},
            "max_output_tokens": max_tokens,
        }

        logging.info(f"Model: {openai_model}")
        logging.info(f"Prompt length: {len(prompt)}")
        logging.info(f"[Responses API] payload={payload}")

        try:
            response_json = responses_with_backoff(payload, headers)
            message_content = extract_text_from_responses_api(response_json)
        except requests.exceptions.RequestException as e:
            logging.error(f"Error communicating with OpenAI API: {e}")
            return jsonify({"error": str(e)}), 500

    # Ensure message_content is a string (not None)
    if message_content is None:
        message_content = ""
    
    # Save to file (same behavior as your working app)
    if message_content:
        texts_folder = current_app.config["TEXTS_FOLDER"]

        if response_file_name:
            text_file_path = Path(texts_folder) / f"{response_file_name}.txt"
        else:
            timestamp = datetime.now().strftime("%Y-%m-%d--%H-%M-%S")
            text_file_path = Path(texts_folder) / f"{timestamp}.txt"

        os.makedirs(text_file_path.parent, exist_ok=True)

        if with_cleaned_raw:
            message_content = message_content.replace("\\n", "\n")

        with open(text_file_path, "w", encoding="utf-8") as text_file:
            text_file.write(message_content)

        logging.info(f"Response saved to: {text_file_path}")
    
    logging.info(f"Returning response with content length: {len(message_content)}")

    # Return the same structure your frontend expects
    return jsonify({"choices": [{"message": {"content": message_content}}]})
