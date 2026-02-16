#!/usr/bin/env python3
"""gTTS - Google Text-to-Speech. Usage: echo "text" | tts_gtts.py [lang]"""
import sys
import io

def main():
    lang = sys.argv[1] if len(sys.argv) > 1 else "ro"
    text = sys.stdin.read().strip()
    if not text:
        sys.exit(1)
    from gtts import gTTS
    tts = gTTS(text=text, lang=lang)
    buf = io.BytesIO()
    tts.write_to_fp(buf)
    sys.stdout.buffer.write(buf.getvalue())

if __name__ == "__main__":
    main()
