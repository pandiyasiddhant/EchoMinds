import os
from pathlib import Path

import torch
from flask import Flask, jsonify, request
from flask_cors import CORS
import librosa
import numpy as np

from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    Wav2Vec2ForSequenceClassification,
    Wav2Vec2FeatureExtractor,
)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

# Configure allowed browser origins using a comma-separated environment variable.
allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:8000,http://127.0.0.1:8000",
    ).split(",")
    if origin.strip()
]
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

# Override MODEL_DIR on the hosting platform.
BACKEND_DIR = Path(__file__).resolve().parent

MODEL_DIR = Path(
    os.getenv("MODEL_DIR", str(BACKEND_DIR / "models" / "XLM-RoBERTa"))
).expanduser()

LABEL_MAP = {
    0: "Normal",
    1: "Stress",
    2: "Severe",
}

tokenizer = AutoTokenizer.from_pretrained(
    MODEL_DIR,
    local_files_only=True,
)

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_DIR,
    local_files_only=True,
    use_safetensors=True,
)
model.eval()
# Voice model configuration
VOICE_MODEL_DIR = Path(
    os.getenv(
        "VOICE_MODEL_DIR",
        str(BACKEND_DIR / "models" / "wav2vec2_echominds_final"),
    )
).expanduser()

VOICE_LABEL_MAP = {
    0: "Normal",
    1: "Stress",
    2: "Severe",
}

voice_feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(
    VOICE_MODEL_DIR,
    local_files_only=True,
)

voice_model = Wav2Vec2ForSequenceClassification.from_pretrained(
    VOICE_MODEL_DIR,
    local_files_only=True,
    use_safetensors=True,
)

voice_model.eval()


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "project": "EchoMinds",
        "message": "Backend API is running",
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "EchoMinds API",
        "model_loaded": True,
    })


@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "Send a JSON object containing text."
        }), 400

    text = data.get("text")

    if not isinstance(text, str) or not text.strip():
        return jsonify({
            "error": "The text field must not be empty."
        }), 400

    if len(text) > 4000:
        return jsonify({
            "error": "Text must be 4000 characters or fewer."
        }), 400

    inputs = tokenizer(
        text.strip(),
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128,
    )

    with torch.inference_mode():
        logits = model(**inputs).logits
        probabilities = torch.softmax(logits, dim=-1)[0]

    predicted_id = int(torch.argmax(probabilities).item())

    scores = {
        LABEL_MAP[i]: round(float(probabilities[i]), 4)
        for i in range(len(probabilities))
    }

    return jsonify({
        "label": LABEL_MAP[predicted_id],
        "label_id": predicted_id,
        "confidence": round(
            float(probabilities[predicted_id]), 4
        ),
        "all_scores": scores,
        "notice": (
            "This is an experimental text classification result, "
            "not a clinical diagnosis or safety assessment."
        ),
    })

@app.route("/api/predict-voice", methods=["POST"])
def predict_voice():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided."}), 400

    audio_file = request.files["audio"]

    if not audio_file.filename:
        return jsonify({"error": "No audio file selected."}), 400

    temp_path = None

    try:
        import tempfile

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp:
            temp_path = temp.name
            audio_file.save(temp_path)

        audio, sr = librosa.load(
            temp_path,
            sr=16000,
            mono=True,
        )

        if len(audio) == 0:
            return jsonify({"error": "Audio file is empty."}), 400

        inputs = voice_feature_extractor(
            audio,
            sampling_rate=16000,
            return_tensors="pt",
        )

        with torch.inference_mode():
            logits = voice_model(**inputs).logits
            probabilities = torch.softmax(logits, dim=-1)[0]

        predicted_id = int(torch.argmax(probabilities).item())

        scores = {
            VOICE_LABEL_MAP[i]: round(float(probabilities[i]), 4)
            for i in range(len(probabilities))
        }

        return jsonify({
            "label": VOICE_LABEL_MAP[predicted_id],
            "label_id": predicted_id,
            "confidence": round(float(probabilities[predicted_id]), 4),
            "all_scores": scores,
            "notice": (
                "This is an experimental voice emotion classification "
                "result, not a clinical diagnosis or safety assessment."
            ),
        })

    except Exception:
        app.logger.exception("Voice prediction failed.")
        return jsonify({"error": "Unable to process the audio file."}), 400

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
        debug=False,
    )
