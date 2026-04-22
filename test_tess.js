import Tesseract from 'tesseract.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  try {
    const res = await Tesseract.recognize(path.join(__dirname, 'public/favicon.ico'), 'eng');
    console.log('Success:', res.data.text);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
