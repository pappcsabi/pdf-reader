const fs = require('fs').promises;
const path = require('path');

async function extractFromPdf(filePath) {
  const pdfParse = require('pdf-parse');
  const data = await fs.readFile(filePath);
  const result = await pdfParse(data);
  return result.text || '';
}

async function extractFromDocx(filePath) {
  const mammoth = require('mammoth');
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

async function extractFromTxt(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function extractText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = mimeType || '';

  if (ext === '.pdf' || mime.includes('pdf')) {
    return extractFromPdf(filePath);
  }
  if (ext === '.docx' || mime.includes('wordprocessingml')) {
    return extractFromDocx(filePath);
  }
  if (ext === '.txt' || mime.includes('text/plain')) {
    return extractFromTxt(filePath);
  }

  throw new Error('Tip fișier nesuportat pentru extragere text');
}

module.exports = { extractText };
