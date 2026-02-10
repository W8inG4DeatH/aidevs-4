from flask import Blueprint, request, jsonify
import logging
import requests
from urllib.parse import quote

BASE_URL = "https://story.aidevs.pl"

# Nagłówki dla requestów do zewnętrznego API (niektóre API zwracają 403 bez User-Agent)
EXTERNAL_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; AidevsLesson/1.0)",
    "Accept": "application/json",
    "Content-Type": "application/json",
}

lesson_s00e01_bp = Blueprint("lesson_s00e01_bp", __name__)


@lesson_s00e01_bp.route("/weryfikacja", methods=["GET"], strict_slashes=False)
def get_weryfikacja():
    """Proxy: GET api-weryfikacja → zwraca pytania i token."""
    try:
        r = requests.get(f"{BASE_URL}/api-weryfikacja", headers=EXTERNAL_HEADERS, timeout=10)
        r.raise_for_status()
        return jsonify(r.json()), r.status_code
    except requests.RequestException as e:
        logging.warning("get_weryfikacja: %s", e)
        return jsonify({"error": str(e)}), getattr(e, "response", None) and e.response.status_code or 500


@lesson_s00e01_bp.route("/wiedza/<path:query>", methods=["GET"], strict_slashes=False)
def get_wiedza(query: str):
    """Proxy: GET api-wiedza/{query} → zwraca odpowiedź z bazy wiedzy."""
    try:
        encoded = quote(query.strip(), safe="")
        url = f"{BASE_URL}/api-wiedza/{encoded}"
        r = requests.get(url, headers=EXTERNAL_HEADERS, timeout=10)
        if r.status_code != 200:
            return jsonify({"error": r.text or "error", "status": r.status_code}), r.status_code
        ct = r.headers.get("content-type", "")
        if "json" in ct:
            return jsonify(r.json()), 200
        return r.text, 200
    except requests.RequestException as e:
        logging.warning("get_wiedza: %s", e)
        return jsonify({"error": str(e)}), 500


@lesson_s00e01_bp.route("/weryfikacja", methods=["POST"], strict_slashes=False)
def post_weryfikacja():
    """Proxy: POST api-weryfikacja z body { odpowiedzi, token }."""
    try:
        data = request.get_json() or {}
        odpowiedzi = data.get("odpowiedzi", [])
        token = data.get("token", "")
        payload = {"odpowiedzi": odpowiedzi, "token": token}
        logging.info("POST api-weryfikacja payload: odpowiedzi=%s, token_len=%s", odpowiedzi, len(token))
        r = requests.post(
            f"{BASE_URL}/api-weryfikacja",
            json=payload,
            headers=EXTERNAL_HEADERS,
            timeout=10,
        )
        if r.headers.get("content-type", "").startswith("application/json"):
            body = r.json()
        else:
            body = {"text": r.text, "status": r.status_code}
        if r.status_code >= 400:
            logging.warning("POST api-weryfikacja %s: %s", r.status_code, body)
        return jsonify(body), r.status_code
    except requests.RequestException as e:
        logging.warning("post_weryfikacja: %s", e)
        return jsonify({"error": str(e)}), 500
