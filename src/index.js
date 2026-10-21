'use strict';
// Bambi Bot VPS — точка входа: long-polling + SQLite + cron + сброс статы 30 дней
// Лимиты: RAM <= 530MB (systemd MemoryMax), диск < 30GB (SQLite ~ десятки МБ + logrotate)
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { KV } = require('./kv');
const core = require('./core');

const BOT_TOKEN = (process.env.BOT_TOKEN || process.env.TOKEN || '').trim();
if (!BOT_TOKEN) { console.error('FATAL: нет BOT_TOKEN в .env'); process.exit(1); }

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'bimi.sqlite');

const kv = new KV(DB_PATH);

// env как в Workers (AI нет на VPS — используется бесплатный Pollinations внутри core.js)
const env = {
  BOT_TOKEN,
  TOKEN: BOT_TOKEN,
  SUPPORT_CHAT_ID: process.env.SUPPORT_CHAT_ID || '',
  CHANNEL_ID: process.env.CHANNEL_ID || process.env.SUPPORT_CHAT_ID || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_KEY: process.env.OPENAI_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  OPENROUTER_KEY: process.env.OPENROUTER_KEY || process.env.OPENROUTER_API_KEY || '',
  VT_API_KEY: process.env.VT_API_KEY || '',
  AI: undefined, // нет Workers AI на VPS — core сам уйдёт на Pollinations (бесплатно)
  DB: kv,
};
// Локальный STT (Vosk): моделька лежит в /opt/bimi-bot/stt/model (на dev — ./stt/model)
let VOSK_MODEL = '';
for (const cand of ['/opt/bimi-bot/stt/model', path.join(__dirname, 'stt', 'model'), path.join(__dirname, '..', 'stt', 'model')]) {
  try { if (fs.existsSync(path.join(cand, 'conf')) && fs.existsSync(path.join(cand, 'am'))) { VOSK_MODEL = cand; break; } } catch {}
}
env.VOSK_MODEL = VOSK_MODEL;
const ctx = { waitUntil(p) { try { if (p && p.catch) p.catch(() => {}); } catch {} } };

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;
async function tg(method, payload) {
  const r = await fetch(`${API}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return r.json().catch(() => ({}));
}

function fakeRequest(update) {
  return { method: 'POST', json: async () => update };
}

let offset = 0;
let stopped = false;
let failStreak = 0;

async function handleUpdate(update) {
  try {
    await core.fetch(fakeRequest(update), env, ctx);
  } catch (e) {
    console.log('handle fail:', e && e.message);
  }
}

async function pollOnce() {
  const timeout = Math.min(Math.max(Number(process.env.POLL_TIMEOUT) || 30, 5), 50);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), (timeout + 15) * 1000);
  try {
    const r = await fetch(`${API}/getUpdates?offset=${offset}&timeout=${timeout}&allowed_updates=${encodeURIComponent(JSON.stringify(['message','edited_message','channel_post','edited_channel_post','callback_query','my_chat_member','business_connection','business_message','edited_business_message','deleted_business_messages']))}`, { signal: ctrl.signal });
    clearTimeout(to);
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.log('getUpdates http', r.status, t.slice(0, 200));
      if (r.status === 401) { console.error('FATAL: 401 Unauthorized — неверный BOT_TOKEN'); process.exit(2); }
      if (r.status === 409) { console.log('409 Conflict — где-то ещё висит webhook/polling. Жду 5с...'); await sleep(5000); return; }
      failStreak++;
      await sleep(Math.min(1000 * failStreak, 8000));
      return;
    }
    const j = await r.json().catch(() => null);
    if (!j || !j.ok) { failStreak++; await sleep(1500); return; }
    failStreak = 0;
    for (const u of j.result || []) {
      offset = u.update_id + 1;
      // не ждём — обрабатываем параллельно, но без завала (;font-family)
      handleUpdate(u);
    }
  } catch (e) {
    clearTimeout(to);
    if (e && e.name === 'AbortError') return;
    failStreak++;
    console.log('poll err:', (e && e.message) || e);
    await sleep(Math.min(1000 * failStreak, 8000));
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// cron (замена Workers scheduled)
async function runCron(cronStr) {
  try { await core.scheduled({ cron: cronStr }, env, ctx); }
  catch (e) { console.log('cron fail', cronStr, e && e.message); }
}
function startCrons() {
  // каждую минуту: напоминалки + ежедневки (внутри core есть антидубль по часу)
  setInterval(() => runCron('* * * * *'), 60 * 1000);
  // каждые 10 мин: пары за 30 мин
  setInterval(() => runCron('*/10 * * * *'), 10 * 60 * 1000);
  // каждый час: YT RSS
  setInterval(() => runCron('0 * * * *'), 60 * 60 * 1000);
  // пн 18:00 итоги недели — проверяем каждую минуту внутри? core ждёт строку '0 18 * * 1'.
  // дёргаем каждый час, core сам отфильтрует по cron.includes('18 * * 1')
  setInterval(() => {
    const d = new Date(Date.now() + 5 * 3600e3); // Ташкент
    if (d.getDay() === 1 && d.getHours() === 18 && d.getMinutes() < 10) runCron('0 18 * * 1');
  }, 5 * 60 * 1000);
  // первый прогон через 5с (напоминалки)
  setTimeout(() => runCron('* * * * *'), 5000);
}

// СБРОС СТАТЫ РАЗ В 30 ДНЕЙ
const STATS_PREFIXES = ['messages:', 'chat_total:', 'daily:', 'wmsg:'];
async function checkMonthlyReset(force) {
  try {
    const now = Date.now();
    const THIRTY_D = 30 * 24 * 3600 * 1000;
    let lastRaw = await kv.get('stats_reset_at');
    let last = lastRaw ? Number(lastRaw) : 0;
    if (!last) { await kv.put('stats_reset_at', String(now)); console.log('[reset30] init stats_reset_at'); return; }
    if (!force && now - last < THIRTY_D) return;
    console.log('[reset30] СБРОС СТАТЫ (30 дней прошло). Чищу messages/chat_total/daily/wmsg...');
    let total = 0;
    for (const p of STATS_PREFIXES) total += await kv.deleteByPrefix(p);
    await kv.put('stats_reset_at', String(now));
    // вакуум чтобы файл не рос (диск < 30ГБ с запасом)
    try { kv.exec('VACUUM'); } catch {}
    const size = dbSizeMB();
    console.log(`[reset30] готово. Удалено ключей: ${total}. Размер БД: ${size} МБ. Следующий сброс через 30 дней.`);
  } catch (e) { console.log('[reset30] fail:', e && e.message); }
}
function dbSizeMB() {
  try { return (fs.statSync(DB_PATH).size / 1048576).toFixed(2); } catch { return '?'; }
}
function startMonthlyReset() {
  setTimeout(() => checkMonthlyReset(false), 8000);
  setInterval(() => checkMonthlyReset(false), 6 * 3600 * 1000);
}

// RAM / DISK guard (лимиты 530МБ / 30ГБ)
function startGuard() {
  const log = () => {
    const rss = process.memoryUsage().rss / 1048576;
    const heap = process.memoryUsage().heapUsed / 1048576;
    let disk = '?';
    try {
      const s = fs.statSync(DB_PATH).size / 1048576;
      disk = s.toFixed(2) + ' МБ (БД)';
    } catch {}
    console.log(`[guard] RAM rss=${rss.toFixed(1)}МБ heap=${heap.toFixed(1)}МБ (лимит 530) | диск БД=${disk} (лимит 30ГБ) | uptime=${Math.floor(process.uptime()/60)}мин`);
    if (rss > 480) console.log('[guard] WARNING: RSS > 480МБ, близко к лимиту 530МБ! Проверь утечки. Systemd перезапустит при превышении.');
  };
  setTimeout(log, 10000);
  setInterval(log, 60 * 60 * 1000);
}

async function boot() {
  console.log('Bambi VPS boot... Node', process.version, '| DB:', DB_PATH);
  console.log('STT:', VOSK_MODEL ? ('Vosk ON (' + VOSK_MODEL + ')') : 'Vosk OFF (нет модели)');
  // ВАЖНО: гасим старый Workers-webhook, иначе polling не получит апдейты (409 Conflict)
  try {
    const d = await tg('deleteWebhook', { drop_pending_updates: true });
    console.log('deleteWebhook:', d && d.ok ? 'OK' : JSON.stringify(d).slice(0, 200));
  } catch (e) { console.log('deleteWebhook fail:', e.message); }
  try {
    const me = await tg('getMe', {});
    console.log('Bot:', me && me.ok ? ('@' + me.result.username + ' id=' + me.result.id) : JSON.stringify(me).slice(0, 200));
    if (!me.ok) { console.error('FATAL: getMe failed — проверь токен'); process.exit(2); }
  } catch (e) { console.error('FATAL getMe:', e.message); process.exit(2); }

  startCrons();
  startMonthlyReset();
  startGuard();
  console.log('Polling started. 24/7. Сброс статы: каждые 30 дней. ИИ: бесплатный Pollinations.');

  process.on('SIGTERM', () => { stopped = true; console.log('SIGTERM'); try { kv.close(); } catch {} process.exit(0); });
  process.on('SIGINT', () => { stopped = true; console.log('SIGINT'); try { kv.close(); } catch {} process.exit(0); });

  while (!stopped) await pollOnce();
}

boot();
