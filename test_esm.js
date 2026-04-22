import Tesseract from 'tesseract.js';

async function test() {
  try {
    console.log(typeof Tesseract.recognize);
    // await Tesseract.recognize('test.png', 'ind+eng');
  } catch (e) {
    console.error(e);
  }
}
test();
