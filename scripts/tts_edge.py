#!/usr/bin/env python3
"""Edge TTS - Microsoft neural voices. Usage: echo "text" | tts_edge.py [voice]"""
import asyncio
import sys
import io

async def main():
    voice = sys.argv[1] if len(sys.argv) > 1 else "ro-RO-EmilNeural"
    text = sys.stdin.read().strip()
    if not text:
        sys.exit(1)
    from edge_tts import Communicate
    communicate = Communicate(text, voice)
    buf = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk.get("type") == "audio":
            buf.write(chunk["data"])
    sys.stdout.buffer.write(buf.getvalue())

if __name__ == "__main__":
    asyncio.run(main())
