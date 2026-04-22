import fetch from 'node-fetch';

async function testOllama() {
  const OLLAMA_URL = 'http://localhost:11434/api/chat';
  const MODEL = 'llama3:latest';

  try {
    const ollamaRes = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' }
        ],
        options: { temperature: 0.7, num_ctx: 4096 },
      }),
    });
    console.log('Status:', ollamaRes.status);
    console.log('Body:', await ollamaRes.text());
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
testOllama();
