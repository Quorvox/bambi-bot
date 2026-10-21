#!/usr/bin/env python3
"""Локальный STT: ogg/opus/mp3/mp4 -> ffmpeg(16k mono) -> Vosk small-ru -> JSON в stdout.
Использование: python3 stt.py /path/to/model /path/to/audio
Печатает: {"text": "..."} — пустой текст значит "не разобрал".
"""
import json
import subprocess
import sys
import tempfile
import os


def main():
    model_dir = sys.argv[1]
    audio_in = sys.argv[2]
    from vosk import Model, KaldiRecognizer
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", audio_in,
             "-ar", "16000", "-ac", "1", "-f", "wav", tmp.name],
            check=True, timeout=60,
        )
        model = Model(model_dir)
        rec = KaldiRecognizer(model, 16000)
        text_parts = []
        with open(tmp.name, "rb") as f:
            f.read(44)  # wav-заголовок
            while True:
                chunk = f.read(8000)
                if not chunk:
                    break
                if rec.AcceptWaveform(chunk):
                    try:
                        r = json.loads(rec.Result())
                        if r.get("text"):
                            text_parts.append(r["text"])
                    except Exception:
                        pass
        try:
            r = json.loads(rec.FinalResult())
            if r.get("text"):
                text_parts.append(r["text"])
        except Exception:
            pass
        print(json.dumps({"text": " ".join(text_parts).strip()}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"text": "", "error": str(e)[:200]}, ensure_ascii=False))
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


if __name__ == "__main__":
    main()
