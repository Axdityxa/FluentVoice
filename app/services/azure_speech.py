"""
Azure Speech SDK wrapper for pronunciation assessment.
"""

import json
import azure.cognitiveservices.speech as speechsdk

from app.config import settings


def assess_pronunciation(audio_path: str, reference_text: str) -> dict:
    """
    Run Azure pronunciation assessment on a WAV file.

    Returns a dict with:
        - text:     recognised transcription
        - phonemes: list of {phoneme, accuracyScore, fromWord, duration, offset}
    """

    speech_config = speechsdk.SpeechConfig(
        subscription=settings.SPEECH_KEY,
        region=settings.SPEECH_REGION,
    )
    speech_config.speech_recognition_language = "en-US"

    # Request detailed JSON output
    speech_config.set_property(
        speechsdk.PropertyId.SpeechServiceResponse_PostProcessingOption,
        "detailed",
    )

    pronunciation_config = speechsdk.PronunciationAssessmentConfig(
        reference_text=reference_text,
        grading_system=speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
        granularity=speechsdk.PronunciationAssessmentGranularity.Phoneme,
        enable_miscue=True,
    )

    audio_config = speechsdk.audio.AudioConfig(filename=audio_path)
    recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config,
        audio_config=audio_config,
    )
    pronunciation_config.apply_to(recognizer)

    # Collect results
    assessment_results: list[dict] = []

    def _on_recognized(evt: speechsdk.SpeechRecognitionEventArgs):
        if not evt.result.text:
            return

        raw_json = evt.result.properties.get(
            speechsdk.PropertyId.SpeechServiceResponse_JsonResult
        )
        if not raw_json:
            return

        properties = json.loads(raw_json)
        phonemes: list[dict] = []

        words = (properties.get("NBest") or [{}])[0].get("Words", [])
        for word in words:
            for phoneme in word.get("Phonemes", []):
                pa = phoneme.get("PronunciationAssessment", {})
                phonemes.append(
                    {
                        "phoneme": phoneme.get("Phoneme", ""),
                        "accuracyScore": round(pa.get("AccuracyScore", 0)),
                        "fromWord": word.get("Word", ""),
                        "duration": phoneme.get("Duration"),
                        "offset": phoneme.get("Offset"),
                    }
                )

        assessment_results.append({"text": evt.result.text, "phonemes": phonemes})

    recognizer.recognized.connect(_on_recognized)

    # Perform one-shot recognition (blocking)
    result = recognizer.recognize_once()

    return {
        "text": result.text or "",
        "phonemes": assessment_results[0]["phonemes"] if assessment_results else [],
    }
