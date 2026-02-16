const Chapters = {
  detect(text, chunks) {
    if (!chunks || chunks.length === 0) return [];
    const result = [{ title: 'Început', startIndex: 0 }];
    const chapterPatterns = [
      /^(capitol(ul)?|chapter)\s*[:\s]*(?:nr\.?)?\s*\d+/i,
      /^partea\s+[IVXLCDM0-9]+/i,
      /^\d+\.\s+[A-ZĂÂÎȘȚ][^.!?]{2,}/,
      /^[IVXLCDM]+\.\s+[A-ZĂÂÎȘȚ][^.!?]{2,}/,
    ];

    for (let i = 1; i < chunks.length; i++) {
      const chunk = chunks[i].trim();
      for (const re of chapterPatterns) {
        if (re.test(chunk) && chunk.length < 150) {
          const title = chunk.length > 50 ? chunk.slice(0, 47) + '…' : chunk;
          result.push({ title, startIndex: i });
          break;
        }
      }
    }

    return result;
  },
};
