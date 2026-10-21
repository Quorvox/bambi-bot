'use strict';
// Локальный STT: Vosk (small-ru) + ffmpeg через python. Без ключей, без интернета.
// transcribeOgg(buffer, modelPath) -> текст или null
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

function runPy(script, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const p = spawn('python3', [script, ...args]);
    let out = '';
    let err = '';
    const to = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} reject(new Error('stt timeout')); }, timeoutMs || 120000);
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => { clearTimeout(to); reject(e); });
    p.on('close', (code) => {
      clearTimeout(to);
      if (code !== 0) return reject(new Error('stt exit ' + code + ' ' + String(err).slice(0, 200)));
      try {
        const j = JSON.parse(out.trim().split('\n').pop());
        resolve(j);
      } catch (e) { reject(new Error('stt bad json')); }
    });
  });
}

async function transcribeOgg(buffer, modelPath, timeoutMs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stt-'));
  const inF = path.join(dir, 'in.bin');
  try {
    fs.writeFileSync(inF, Buffer.from(buffer));
    const script = path.join(__dirname, 'stt.py');
    const j = await runPy(script, [modelPath, inF], timeoutMs || 120000);
    const text = String((j && j.text) || '').trim();
    return text || null;
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { transcribeOgg };
