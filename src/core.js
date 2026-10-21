// Bambi Bot VPS (Node + SQLite) — порт с Cloudflare Workers
// владельцы бота — id через запятую в .env (OWNERS)
// CEO даётся: владельцам из списка + создателю чата (creator)
// Канал: лайк под постом + фраза "Ого! Quorvox_team красавчики!"
if (typeof btoa === "undefined") { global.btoa = function (str) { return Buffer.from(String(str), "binary").toString("base64"); }; }

const OWNERS = (process.env.OWNERS || "").split(",").map(s => Number(s.trim())).filter(Boolean);
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || "@Quorvox_team";
const SUPPORT_CHAT_ID = process.env.SUPPORT_CHAT_ID || ""; // группа поддержки, можно переопределить через env.SUPPORT_CHAT_ID

const RANKS = {
  1: { name: "Intern 🌱 Стажёр", level: 1, short: "intern" },
  2: { name: "Junior 👨‍💻 Джун", level: 2, short: "junior" },
  3: { name: "Junior+ 💪 Джун+", level: 3, short: "junior+" },
  4: { name: "Middle ⚙️ Мидл", level: 4, short: "middle" },
  5: { name: "Middle+ 🚀 Мидл+", level: 5, short: "middle+" },
  6: { name: "Senior 🔥 Сеньор", level: 6, short: "senior" },
  7: { name: "Senior+ 💎 Сеньор+", level: 7, short: "senior+" },
  8: { name: "TeamLead 🛡️ Тимлид", level: 8, short: "teamlead" },
  9: { name: "Lead / PM 👑 Лид", level: 9, short: "lead" },
  10: { name: "CEO 🌟 СЕО-Директор", level: 10, short: "ceo" },
};
const MAX_GIVABLE_RANK = 9; // 10 (CEO) только авто: владельцы + создатель чата

function parseRankArg(arg) {
  arg = (arg || "").trim().toLowerCase();
  if (!arg) return 0;
  const num = parseInt(arg, 10);
  if (num >= 1 && num <= MAX_GIVABLE_RANK) return num;
  if (arg.includes("intern") || arg.includes("стаж")) return 1;
  if (arg.includes("junior+") || arg.includes("джун+") || arg.includes("джун плюс")) return 3;
  if (arg.includes("junior") || arg.includes("джун")) return 2;
  if (arg.includes("middle+") || arg.includes("мидл+") || arg.includes("мидл плюс")) return 5;
  if (arg.includes("middle") || arg.includes("мидл")) return 4;
  if (arg.includes("senior+") || arg.includes("сеньор+") || arg.includes("сениор+") || arg.includes("синьор+")) return 7;
  if (arg.includes("senior") || arg.includes("сеньор") || arg.includes("сениор") || arg.includes("синьор")) return 6;
  if (arg.includes("team") || arg.includes("тим")) return 8;
  if (arg.includes("lead") || arg.includes("лид") || arg.includes("pm") || arg.includes("пм")) {
    return arg.includes("team") ? 8 : 9;
  }
  return 0;
}

const MEMES_TEXT = [
  "😂 Почему программисты путают Хэллоуин и Рождество? Потому что Oct 31 == Dec 25!",
  "😂 — Почему ты уволился? — Меня попросили писать читаемый код... как будто это возможно.",
  "😂 rm -rf / — быстрое решение всех багов. И всех файлов. И всей карьеры.",
  "😂 Тестировщик заходит в бар. Заказывает пиво. Заказывает 0 пива. Заказывает 999999 пива. Заказывает -1 пива...",
  "😂 «Работает? Не трогай!» — главный принцип продакшена.",
  "😂 Frontend: «это не баг, это фича анимации». Backend: «это не баг, это недокументированный эндпоинт».",
  "😂 Git push --force в пятницу вечером — экстремальный спорт.",
  "😂 Junior пишет код. Middle пишет код с комментариями. Senior удаляет код.",
  "😂 99 багов в коде, 99 багов. Взял и пофиксил один — 127 багов в коде...",
  "😂 Заказчик: «Сделайте кнопку, чтобы всё работало».",
  "😂 Почему Java-программисты носят очки? Потому что не видят C#.",
  "😂 Мой код вчера: гениально. Мой код сегодня утром: кто это писал?!",
];

const FACTS = [
  "Первая компьютерная мышь была сделана из дерева в 1964 году.",
  "Первый баг (1947 год) — моль, застрявшая в реле компьютера Harvard Mark II.",
  "JavaScript был создан за 10 дней в 1995 году.",
  "Первый сайт (1991 год) до сих пор жив: info.cern.ch.",
  "В мире 700+ языков программирования.",
  "Linux крутится на 96%+ серверов мира и на всех суперкомпьютерах ТОП-500.",
  "Первый вирус для ПК — Brain (1986).",
  "Wi-Fi стандартизирован в 1997 году.",
  "Первый смартфон — IBM Simon (1992).",
  "Google обрабатывает ~8.5 млрд запросов в день.",
  "Самый дорогой баг — Ariane 5 (1996), ~$370 млн из-за переполнения.",
  "Python назван в честь «Монти Пайтона», а не змеи.",
  "Первый программист — Ада Лавлейс (1843).",
  "QWERTY придумана, чтобы ЗАМЕДЛИТЬ печать и не клинило машинки.",
  "Email старше веба: 1971 год.",
  "Первый домен: symbolics.com (1985).",
  "Пароль из 12 случайных символов ломать — тысячи лет, а «qwerty123» — секунды.",
  "SSD живут в среднем 5–10 лет в зависимости от перезаписей.",
  "Квантовые компьютеры уже решают отдельные задачи в миллионы раз быстрее.",
  "CAPTCHA и reCAPTCHA оцифровали миллионы книг.",
  "Первый твит — 2006 год.",
  "Telegram запущен в 2013 году.",
  "Cloudflare обслуживает ~20% всего веба.",
  "Компьютер Apollo 11 был слабее современного калькулятора.",
  "Средний разработчик гуглит ~10 раз в день. Senior — ~20, но быстрее.",
  "«404» — номер комнаты в CERN, где стоял первый веб-сервер (легенда).",
  "Первый баннер в интернете (1994) — CTR 44%!",
  "USB придуман, чтобы воткнуть с третьего раза.",
  "ИИ-модели учатся на триллионах токенов текста.",
  "Твой код без багов? Это просто нетестированный код.",
];

// Канал: рандомные комменты + реакции
const CHANNEL_COMMENTS = [
  "Ого! Quorvox_team красавчики! 🔥",
  "Вау! Круто! 😍🔥",
  "Вот это уровень! 🚀 Респект!",
  "Огонь! Так держать! 👏🔥",
  "Красота! Quorvox как всегда топ 💜",
  "Пушка! 🔥🔥🔥",
  "Ничего себе! Вот это работа! 🤩",
  "Лайк однозначно! 👍✨",
  "Шикарно! Хочу ещё! 😎🚀",
  "Топ контент! Quorvox_team лучшие! 💪",
  "Вау, мурашки! 🥹🔥",
  "Это надо видеть всем! 📢🔥",
  "Браво! 👏👏👏",
  "Разрыв! 💥 Сохраняю в избранное!",
  "Легендарно! 🏆✨",
];
const CHANNEL_REACTIONS = ["👍", "🔥", "❤️", "🎉", "👏", "⚡", "😍"];
function randomChannelComment() {
  return CHANNEL_COMMENTS[Math.floor(Math.random() * CHANNEL_COMMENTS.length)];
}
function randomChannelReaction() {
  return CHANNEL_REACTIONS[Math.floor(Math.random() * CHANNEL_REACTIONS.length)];
}

// RP-действия (ответом на сообщение)
// ключ: триггеры. actor -> target
const RP_ACTIONS = [
  { keys: ["погладить", "погладь", "пат", "pat"], emoji: "🤗", verb: "погладил(а)", templates: ["нежно погладил(а) по голове", "тёпло погладил(а) по плечу", "ласково погладил(а)"] },
  { keys: ["обнять", "обними", "обнимашки", "hug"], emoji: "🫂", verb: "обнял(а)", templates: ["крепко обнял(а)", "тёпло обнял(а)", "обнял(а) как старого друга"] },
  { keys: ["поцеловать", "поцелуй", "чмок", "kiss"], emoji: "💋", verb: "поцеловал(а)", templates: ["чмокнул(а) в щёчку", "нежно поцеловал(а)", "оставил(а) поцелуй"] },
  { keys: ["пнуть", "пинок", "пни"], emoji: "🦵", verb: "пнул(а)", templates: ["слегка пнул(а) для профилактики", "пинанл(а) под зад", "ногой отправил(а) подумать о поведении"] },
  { keys: ["ударить", "ударь", "дать леща", "лещ"], emoji: "🤜", verb: "ударил(а)", templates: ["выдал(а) леща", "слегка стукнул(а)", "проверил(а) прочность лба"] },
  { keys: ["укусить", "укуси", "кусь"], emoji: "😬", verb: "укусил(а)", templates: ["кусь за бок", "цапнул(а) за палец", "сделал(а) кусь"] },
  { keys: ["лизнуть", "лизни"], emoji: "👅", verb: "лизнул(а)", templates: ["лизнул(а) в щёку", "странно, но лизнул(а)"] },
  { keys: ["приручить", "приручи", "tame"], emoji: "🐾", verb: "приручил(а)", templates: ["приручил(а) как питомца", "кинул(а) вкусняшку и приручил(а)", "теперь это твой хозяин"] },
  { keys: ["покормить", "покорми", "кормить"], emoji: "🍪", verb: "покормил(а)", templates: ["угостил(а) печенькой", "покормил(а) пиццей", "дал(а) вкусняшку"] },
  { keys: ["подарить", "подарок", "дарить"], emoji: "🎁", verb: "подарил(а)", templates: ["подарил(а) подарок", "вручил(а) сюрприз", "одарил(а) от всего сердца"] },
  { keys: ["дать пять", "дай пять", "highfive", "пятюня"], emoji: "🙏", verb: "дал(а) пять", templates: ["звонко дал(а) пять", "пятюня принята!"] },
  { keys: ["пожать руку", "пожми", "рукопожатие"], emoji: "🤝", verb: "пожал(а) руку", templates: ["крепко пожал(а) руку", "пожал(а) руку как партнёру"] },
  { keys: ["застрелить", "выстрел", "bang"], emoji: "🔫", verb: "застрелил(а)", templates: ["*бах* — мимо! Но было страшно", "метко выстрелил(а) из водяного пистолета"] },
  { keys: ["спасти", "спаси", "спасибо за спасение"], emoji: "🦸", verb: "спас(ла)", templates: ["героически спас(ла)", "вытащил(а) из беды"] },
  { keys: ["проклясть", "прокляни"], emoji: "🧙", verb: "проклял(а)", templates: ["наложил(а) проклятие вечных багов", "превратил(а) в лягушку на 5 минут"] },
  { keys: ["благословить", "благослови"], emoji: "🙏", verb: "благословил(а)", templates: ["благословил(а) на чистый код без багов", "дал(а) благословение"] },
  { keys: ["бросить", "кинуть", "швырнуть"], emoji: "🎯", verb: "бросил(а)", templates: ["кинул(а) подушкой", "запустил(а) тапочком (мимо)"] },
  { keys: ["похвалить", "похвали", "молодец"], emoji: "🌟", verb: "похвалил(а)", templates: ["похвалил(а) за отличную работу", "сказал(а): ты молодец!"] },
  { keys: ["поругаться", "поругай", "отругать"], emoji: "😤", verb: "поругал(а)", templates: ["слегка поругал(а) и простил(а)", "погрозил(а) пальцем"] },
];

function getToken(env) {
  return env.BOT_TOKEN || env.TOKEN || "";
}
function getSupportChat(env) {
  return env.SUPPORT_CHAT_ID || SUPPORT_CHAT_ID;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function isOwner(userId) {
  return OWNERS.includes(Number(userId));
}
function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function displayName(from) {
  if (!from) return "Без имени";
  if (from.username) return "@" + from.username;
  return (from.first_name || "Без имени") + (from.last_name ? " " + from.last_name : "");
}

// Telegram API
async function sendTelegram(env, method, payload) {
  try {
    const token = getToken(env);
    if (!token) {
      console.log("No BOT_TOKEN in env!");
      return null;
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) console.log(`TG ${method} error:`, JSON.stringify(data).slice(0, 500));
    return data;
  } catch (e) {
    console.log(`TG ${method} fetch fail:`, e.message);
    return null;
  }
}

async function getChatMemberStatus(env, chatId, userId) {
  try {
    const data = await sendTelegram(env, "getChatMember", { chat_id: chatId, user_id: userId });
    if (data && data.ok) return data.result.status; // creator | administrator | member ...
    return null;
  } catch {
    return null;
  }
}

// Дизайн + анимации (v2: карточки)
const DIV = "━━━━━━━━━━━━━━━";
const DIV2 = "┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈";
async function typing(env, chatId) {
  // анимация "печатает..." — как у живых ботов
  try { await sendTelegram(env, "sendChatAction", { chat_id: chatId, action: "typing" }); } catch {}
}
async function say(env, chatId, text, replyId) {
  await typing(env, chatId);
  const payload = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyId) payload.reply_to_message_id = replyId;
  return sendTelegram(env, "sendMessage", payload);
}
async function sayNoPreview(env, chatId, text, replyId) {
  await typing(env, chatId);
  const payload = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (replyId) payload.reply_to_message_id = replyId;
  return sendTelegram(env, "sendMessage", payload);
}
function header(title) {
  return `✨ <b>${esc(title)}</b>\n${DIV}\n`;
}
function footer(hint) {
  return `\n${DIV}\n🤖 <i>Bambi • Quorvox Team</i>${hint ? ` • <i>${esc(hint)}</i>` : ""}`;
}
// Единый стиль карточек v2
function card(emoji, title, body, hint) {
  return `${emoji} <b>${esc(title)}</b>\n${DIV}\n${body}${hint ? `\n${DIV2}\n💡 <i>${esc(hint)}</i>` : ""}\n${DIV}\n🤖 <i>Bambi • Quorvox Team</i>`;
}
function okCard(title, body, hint) { return card("✅", title, body, hint); }
function errCard(title, body, hint) { return card("⛔", title, body, hint); }
function infoCard(title, body, hint) { return card("ℹ️", title, body, hint); }
function progressBar(level, max) {
  const l = Math.max(0, Math.min(max, level));
  return "▰".repeat(l) + "▱".repeat(Math.max(0, max - l));
}
// Кликабельное упоминание (работает даже без username)
function mentionHtml(u) {
  if (!u) return "Без имени";
  if (u.username) return "@" + u.username;
  const nm = esc((u.first_name || u.name || "друг") + (u.last_name ? " " + u.last_name : ""));
  if (u.id || u.uid) return `<a href="tg://user?id=${u.id || u.uid}">${nm}</a>`;
  return nm;
}
function fmtUserFromStored(uid, info) {
  if (info && info.username) return "@" + info.username;
  if (info && info.first_name) return `<a href="tg://user?id=${uid}">${esc(info.first_name)}</a>`;
  return `<a href="tg://user?id=${uid}">user${esc(String(uid).slice(-4))}</a>`;
}
// Отклик на все виды "бот": бот, боты, ботяра, ботик, боттт, bot, bots, bambi...
function isBotCall(text) {
  const t = text.toLowerCase().trim().replace(/[.,!?:;»«"'\-_—–()\[\]{}<>*~`]+/g, "").replace(/\s+/g, " ").slice(0, 60);
  if (!t) return false;
  if (t.length > 40) return false;
  // бот с повторами букв: бот, боот, ботт, боттт, ботяра, ботик, ботя, ботяня...
  if (/^б+[о0аёу]+[тд]+[а-яё]*$/.test(t)) return true;
  if (/^бамби.*$/.test(t)) return true;
  if (/^bot[sy]*.*$/.test(t)) return true; // bot, bots, bott, botik...
  if (/^bambi.*$/.test(t)) return true;
  // "эй бот", "бот ты тут", "привет бот"
  if (/(^|\s)(б+[о0]+[тд][а-яё]*|ботяра|ботик|ботиночек|ботяня|bot|bambi|бамби)(\s|$|[?!.])/i.test(t)) return true;
  return false;
}
function randomBotReply(name) {
  const r = [
    `✋ Я на месте, ${name}! Слушаю 👂`,
    `🤖 Да-да? Я тут! Напиши <code>команды</code> ✨`,
    `👀 Вызывали? Я Bambi, на связи!`,
    `⚡️ На месте! Чем помочь?`,
    `💜 Ау! Я тут, не скучайте!`,
    `🔥 Ботяра на связи! Го играть: <code>!кубик</code> 🎲`,
  ];
  return r[Math.floor(Math.random() * r.length)];
}

// Голос в текст (улучшено v2)
// 1) Cloudflare Workers AI Whisper (бинд AI) — быстро и бесплатно
// 2) Fallback OpenAI Whisper (секрет OPENAI_API_KEY)
// Улучшения: лимит размера для AI, поддержка ogg/mp3/m4a/mp4, авто-удаление статуса, красивый вывод
function getVoiceFileId(msg) {
  if (!msg) return null;
  if (msg.voice && msg.voice.file_id) return { file_id: msg.voice.file_id, kind: "🎤 голосовое", duration: msg.voice.duration || 0 };
  if (msg.audio && msg.audio.file_id) return { file_id: msg.audio.file_id, kind: "🎵 аудио", duration: msg.audio.duration || 0 };
  if (msg.video_note && msg.video_note.file_id) return { file_id: msg.video_note.file_id, kind: "🎥 кружок", duration: msg.video_note.duration || 0 };
  if (msg.video && msg.video.file_id) return { file_id: msg.video.file_id, kind: "🎬 видео", duration: msg.video.duration || 0 };
  if (msg.document && msg.document.mime_type && msg.document.mime_type.startsWith("audio/")) return { file_id: msg.document.file_id, kind: "🎵 аудио-файл", duration: 0 };
  return null;
}

async function transcribeVoiceBytes(env, bytes, filename) {
  // 1) Cloudflare Workers AI — бесплатно в лимите, русский указываем явно
  // Whisper в Workers стабильно тянет до ~8-10МБ массива; большее — только через OpenAI
  if (env.AI && bytes.byteLength < 9 * 1024 * 1024) {
    try {
      const u8 = new Uint8Array(bytes);
      // чанкуем в обычный массив без переполнения стека
      const audio = [];
      const CH = 8192;
      for (let i = 0; i < u8.length; i += CH) audio.push(...u8.subarray(i, i + CH));
      const res = await env.AI.run("@cf/openai/whisper", { audio });
      if (res && typeof res.text === "string" && res.text.trim()) return { text: res.text.trim(), via: "Cloudflare AI" };
      if (typeof res === "string" && res.trim()) return { text: res.trim(), via: "Cloudflare AI" };
    } catch (e) {
      console.log("Workers AI whisper fail:", (e && e.message) || e);
    }
  }
  // 2) Fallback: OpenAI Whisper API (нужен secret OPENAI_API_KEY)
  const key = env.OPENAI_API_KEY || env.OPENAI_KEY || "";
  if (!key) {
    // 2b) Groq Whisper — БЕСПЛАТНЫЙ ключ с console.groq.com (модель whisper-large-v3-turbo, free-tier).
    // На VPS нет Workers AI и локальная модель не влезет в 530МБ — поэтому ГС только через ключ.
    const gq = env.GROQ_API_KEY || "";
    if (!gq) {
      // Нет облачных ключей — пробуем локальный Vosk (бесплатно, без ключей)
      const lv = await transcribeVosk(env, bytes);
      if (lv) return lv;
      return null;
    }
    try {
      const form = new FormData();
      form.append("model", "whisper-large-v3-turbo");
      form.append("response_format", "verbose_json");
      const fname = filename || "voice.ogg";
      const mime = fname.endsWith(".mp4") ? "video/mp4" : fname.endsWith(".mp3") ? "audio/mpeg" : fname.endsWith(".m4a") ? "audio/m4a" : "audio/ogg";
      let fileObj;
      try { fileObj = new File([bytes], fname, { type: mime }); }
      catch { fileObj = new Blob([bytes], { type: mime }); }
      form.append("file", fileObj, fname);
      const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${gq}` },
        body: form,
      });
      const j = await r.json().catch(() => ({}));
      if (j.text && j.text.trim()) return { text: j.text.trim(), via: "Groq Whisper", lang: j.language || "" };
      console.log("Groq whisper fail:", JSON.stringify(j).slice(0, 300));
      return null;
    } catch (e) {
      console.log("Groq fetch fail:", e.message);
      return null;
    }
  }
  try {
    const form = new FormData();
    form.append("model", "whisper-1");
    // авто-язык: не форсим ru чтобы англ/укр тоже распознавались
    form.append("response_format", "verbose_json");
    const fname = filename || "voice.ogg";
    const mime = fname.endsWith(".mp4") ? "video/mp4" : fname.endsWith(".mp3") ? "audio/mpeg" : fname.endsWith(".m4a") ? "audio/m4a" : "audio/ogg";
    let fileObj;
    try { fileObj = new File([bytes], fname, { type: mime }); }
    catch { fileObj = new Blob([bytes], { type: mime }); }
    form.append("file", fileObj, fname);
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const j = await r.json().catch(() => ({}));
    if (j.text && j.text.trim()) return { text: j.text.trim(), via: "OpenAI Whisper", lang: j.language || "" };
    console.log("OpenAI whisper fail:", JSON.stringify(j).slice(0, 300));
    // Облако не справилось — последний шанс: локальный Vosk
    const lv2 = await transcribeVosk(env, bytes);
    if (lv2) return lv2;
    return null;
  } catch (e) {
    console.log("OpenAI fetch fail:", e.message);
    const lv3 = await transcribeVosk(env, bytes);
    if (lv3) return lv3;
    return null;
  }
}

// 2c) Локальный Vosk (small-ru) — бесплатно, без ключей, без интернета.
// Мьютекс: одно распознавание за раз, чтобы не упереться в лимит RAM.
let _sttBusy = Promise.resolve();
async function transcribeVosk(env, bytes) {
  if (!env.VOSK_MODEL) return null;
  let stt;
  try { stt = require('./stt'); }
  catch (e) { console.log('stt module fail:', e.message); return null; }
  let release;
  const prev = _sttBusy;
  _sttBusy = new Promise((r) => { release = r; });
  await prev.catch(() => {});
  try {
    const t = await stt.transcribeOgg(bytes, env.VOSK_MODEL, 120000);
    if (t) return { text: t, via: 'Vosk' };
    return null;
  } catch (e) { console.log('vosk fail:', (e && e.message) || e); return null; }
  finally { try { release(); } catch {} }
}

async function handleTextCommand(env, chatId, replyToId, fileId, kind, durationSec) {
  await sendTelegram(env, "sendChatAction", { chat_id: chatId, action: "typing" });
  const durLine = durationSec ? ` • ⏱ ${durationSec}с` : "";
  const statusMsg = await sendTelegram(env, "sendMessage", {
    chat_id: chatId,
    text: `🎧 <b>Распознаю ${esc(kind || "аудио")}${durLine}...</b>\n${DIV}\n<i>⏳ это займёт пару секунд</i>`,
    parse_mode: "HTML",
    reply_to_message_id: replyToId,
  });
  try {
    const token = getToken(env);
    const fileInfo = await sendTelegram(env, "getFile", { file_id: fileId });
    const filePath = fileInfo && fileInfo.ok && fileInfo.result.file_path;
    if (!filePath) {
      await sendTelegram(env, "sendMessage", { chat_id: chatId, text: errCard("Не скачался файл", "😢 Не смог скачать файл из Telegram.\nПопробуй переслать голосовое ещё раз.", "/text ответом на голосовое"), parse_mode: "HTML", reply_to_message_id: replyToId });
      return;
    }
    const dl = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    if (!dl.ok) {
      await sendTelegram(env, "sendMessage", { chat_id: chatId, text: errCard("Ошибка скачивания", "😢 Telegram не отдал файл. Попробуй ещё раз через минуту."), parse_mode: "HTML", reply_to_message_id: replyToId });
      return;
    }
    const buf = await dl.arrayBuffer();
    if (buf.byteLength > 20 * 1024 * 1024) {
      await sendTelegram(env, "sendMessage", { chat_id: chatId, text: errCard("Файл слишком большой", `📦 <b>${(buf.byteLength / 1048576).toFixed(1)} МБ</b> — лимит 20 МБ.\n✂️ Разбей голосовое на части до 2-3 минут.`, "Кружки до 1 мин распознаются лучше всего"), parse_mode: "HTML", reply_to_message_id: replyToId });
      return;
    }
    if (buf.byteLength < 4000) {
      try { if (statusMsg && statusMsg.ok) await sendTelegram(env, "deleteMessage", { chat_id: chatId, message_id: statusMsg.result.message_id }); } catch {}
      await sendTelegram(env, "sendMessage", { chat_id: chatId, text: errCard("Пустое аудио", "🎤 В сообщении почти нет звука (меньше секунды).\nЗапиши голосовое подольше."), parse_mode: "HTML", reply_to_message_id: replyToId });
      return;
    }
    const res = await transcribeVoiceBytes(env, buf, filePath.split("/").pop() || "voice.ogg");
    if (statusMsg && statusMsg.ok) {
      try { await sendTelegram(env, "deleteMessage", { chat_id: chatId, message_id: statusMsg.result.message_id }); } catch {}
    }
    if (!res || !res.text) {
      await sendTelegram(env, "sendMessage", {
        chat_id: chatId,
        text: errCard("Не смог распознать",
          `😢 Не разобрал что сказано.\n\n🎤 <b>Советы:</b>\n• Сообщение до 1–2 минут\n• Говори чётко, без музыки на фоне\n• Перезапиши погромче и попробуй ещё раз`,
          "Локальное распознавание • бесплатно"),
        parse_mode: "HTML",
        reply_to_message_id: replyToId,
      });
      return;
    }
    const viaLine = res.via ? `\n${DIV2}\n🔍 <i>via ${esc(res.via)}${res.lang ? ` • ${esc(res.lang)}` : ""}${durLine}</i>` : "";
    await sendTelegram(env, "sendMessage", {
      chat_id: chatId,
      text: `📝 <b>Расшифровка ${esc(kind || "")}:</b>\n${DIV}\n${esc(res.text)}${viaLine}`,
      parse_mode: "HTML",
      reply_to_message_id: replyToId,
    });
  } catch (e) {
    console.log("transcribe fail:", e.message);
    await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "❌ Не получилось распознать 😢 Попробуй ещё раз.", reply_to_message_id: replyToId });
  }
}

// Ранги
async function getUserRank(env, userId, chatId) {
  userId = Number(userId);
  if (isOwner(userId)) return RANKS[10];

  let stored = null;
  try {
    stored = await env.DB.get(`user_rank:${chatId}:${userId}`);
  } catch {}
  if (stored === "10") return RANKS[10];

  // Создатель группы/чата — всегда CEO (проверка через API + кэш на час)
  if (String(chatId).startsWith("-")) {
    try {
      const cache = await env.DB.get(`creator_cache:${chatId}:${userId}`);
      if (cache === "creator") return RANKS[10];
      if (!cache) {
        const status = await getChatMemberStatus(env, chatId, userId);
        if (status === "creator") {
          await env.DB.put(`user_rank:${chatId}:${userId}`, "10");
          await env.DB.put(`creator_cache:${chatId}:${userId}`, "creator", { expirationTtl: 3600 });
          return RANKS[10];
        }
        await env.DB.put(`creator_cache:${chatId}:${userId}`, status || "member", { expirationTtl: 3600 });
      }
    } catch (e) {
      console.log("rank check fail:", e.message);
    }
  }

  const level = stored ? parseInt(stored, 10) : 1;
  return RANKS[level] || RANKS[1];
}

async function isCEO(env, userId, chatId) {
  const r = await getUserRank(env, userId, chatId);
  return r.level === 10;
}

// Недельный топ: ключ недели ISO (автосброс сменой ключа + TTL)
function getWeekKey(d) {
  d = d || new Date();
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (utc.getUTCDay() + 6) % 7; // пн=0
  utc.setUTCDate(utc.getUTCDate() - day + 3); // четверг этой недели
  const firstThu = new Date(Date.UTC(utc.getUTCFullYear(), 0, 4));
  const fday = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fday + 3);
  const week = 1 + Math.round((utc - firstThu) / (7 * 864e5));
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Статистика (оптимизировано под Cloudflare: батч KV, waitUntil)
// Оптимизация: userinfo пишем не каждый раз, а раз в ~10 сообщений (счётчик в памяти воркера),
// всё остальное — одним Promise.all в waitUntil, недельный счётчик с TTL 9 дней (автосброс).
const _trackCache = new Map(); // `${chatId}:${userId}` -> count (in-memory, сбрасывается при рестарте isolate)
const _reactCooldown = new Map(); // chatId -> timestamp до которого не ставим реакции (бэк-офф после 429)
const _lastReactAt = new Map(); // chatId -> время последней реакции (антифлуд: не чаще 1 раза в 6с)
async function trackMessage(env, chatId, from) {
  try {
    const userId = from.id;
    const msgKey = `messages:${chatId}:${userId}`;
    const totalKey = `chat_total:${chatId}`;
    const dayKey = `daily:${chatId}:${todayStr()}`;
    const weekKey = getWeekKey();
    const wKey = `wmsg:${chatId}:${weekKey}:${userId}`;
    // 4 чтения параллельно
    const [curS, totalS, dayS, wS] = await Promise.all([
      env.DB.get(msgKey), env.DB.get(totalKey), env.DB.get(dayKey), env.DB.get(wKey),
    ]);
    const cur = (parseInt(curS || "0", 10) || 0) + 1;
    const total = (parseInt(totalS || "0", 10) || 0) + 1;
    const day = (parseInt(dayS || "0", 10) || 0) + 1;
    const w = (parseInt(wS || "0", 10) || 0) + 1;
    const memKey = `${chatId}:${userId}`;
    const memCount = (_trackCache.get(memKey) || 0) + 1;
    _trackCache.set(memKey, memCount);
    const needUserInfo = (memCount % 10 === 1); // каждое 10-е сообщение
    const ops = [
      env.DB.put(msgKey, String(cur)),
      env.DB.put(totalKey, String(total)),
      env.DB.put(dayKey, String(day), { expirationTtl: 90 * 24 * 3600 }),
      env.DB.put(wKey, String(w), { expirationTtl: 9 * 24 * 3600 }), // недельный сам чистится
      env.DB.put(`active_chat:${chatId}`, String(Date.now()), { expirationTtl: 30 * 24 * 3600 }), // для cron-рассылки топа
    ];
    if (needUserInfo) {
      ops.push(env.DB.put(`userinfo:${chatId}:${userId}`,
        JSON.stringify({ username: from.username || "", first_name: from.first_name || "", last: Date.now() })));
    }
    await Promise.all(ops);
  } catch (e) {
    console.log("track fail:", e.message);
  }
}
async function getWeeklyTop(env, chatId, limit = 10) {
  try {
    const weekKey = getWeekKey();
    const list = await env.DB.list({ prefix: `wmsg:${chatId}:${weekKey}:` });
    const arr = [];
    for (const k of list.keys.slice(0, 100)) {
      const uid = k.name.split(":").pop();
      const count = parseInt((await env.DB.get(k.name)) || "0", 10) || 0;
      let name = uid;
      try {
        const raw = await env.DB.get(`userinfo:${chatId}:${uid}`);
        if (raw) { const j = JSON.parse(raw); name = j.username ? "@" + j.username : j.first_name || uid; }
      } catch {}
      arr.push({ uid, name, count });
    }
    arr.sort((a, b) => b.count - a.count);
    return { weekKey, top: arr.slice(0, limit) };
  } catch { return { weekKey: getWeekKey(), top: [] }; }
}
// Неблокирующий трек: вызывай как safeTrack(ctx, env, chatId, from)
function safeTrack(ctx, env, chatId, from) {
  try {
    if (ctx && ctx.waitUntil) ctx.waitUntil(trackMessage(env, chatId, from));
    else trackMessage(env, chatId, from).catch(() => {});
  } catch {}
}

// Простой антифлуд: max 1 команда в 1.5 сек (KV, лёгкий)
async function isFlood(env, chatId, userId) {
  try {
    const k = `flood:${chatId}:${userId}`;
    const last = parseInt((await env.DB.get(k)) || "0", 10) || 0;
    const now = Date.now();
    if (now - last < 1500) return true;
    await env.DB.put(k, String(now), { expirationTtl: 10 });
    return false;
  } catch { return false; }
}

// Настройки чата (авт-commments / автолайки / фильтры / ИИ)
const DEFAULT_SETTINGS = {
  autolike: true, autocomment: true,
  antimat: false, antilink: false, antiflood: false,
  antispam_media: false, smartmat: false,
  ai_reply: true, faq: true,
};
async function getChatSettings(env, chatId) {
  try {
    const raw = await env.DB.get(`settings:${chatId}`);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return Object.assign({ ...DEFAULT_SETTINGS }, JSON.parse(raw));
  } catch { return { ...DEFAULT_SETTINGS }; }
}
async function setChatSettings(env, chatId, patch) {
  const cur = await getChatSettings(env, chatId);
  const next = Object.assign(cur, patch);
  await env.DB.put(`settings:${chatId}`, JSON.stringify(next));
  return next;
}

// Фича 9: резолв юзера по @username / ID из KV
async function resolveUserIdByUsername(env, chatId, username) {
  username = String(username || "").replace(/^@/, "").toLowerCase().trim();
  if (!username) return null;
  if (/^\d{5,}$/.test(username)) return username; // уже ID
  try {
    let cursor = undefined;
    do {
      const page = await env.DB.list({ prefix: `userinfo:${chatId}:`, limit: 100, cursor });
      for (const k of page.keys) {
        try {
          const raw = await env.DB.get(k.name);
          if (!raw) continue;
          const j = JSON.parse(raw);
          if ((j.username || "").toLowerCase() === username) return k.name.split(":").pop();
        } catch {}
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
  } catch {}
  return null;
}
async function getUserDisplayById(env, chatId, userId) {
  try {
    const raw = await env.DB.get(`userinfo:${chatId}:${userId}`);
    if (raw) {
      const j = JSON.parse(raw);
      if (j.username) return "@" + j.username;
      if (j.first_name) return `<a href="tg://user?id=${userId}">${esc(j.first_name)}</a>`;
    }
  } catch {}
  return `<a href="tg://user?id=${userId}">user${String(userId).slice(-4)}</a>`;
}

// Фича 4: юзеры по рангу (для !teg admins/mods)
async function getUsersByMinRank(env, chatId, minLevel, limit = 30) {
  const out = [];
  try {
    let cursor = undefined;
    do {
      const page = await env.DB.list({ prefix: `user_rank:${chatId}:`, limit: 100, cursor });
      for (const k of page.keys) {
        try {
          const lvl = parseInt(await env.DB.get(k.name), 10) || 1;
          if (lvl >= minLevel) {
            const uid = k.name.split(":").pop();
            out.push({ uid, lvl });
          }
        } catch {}
        if (out.length >= 100) break;
      }
      cursor = page.list_complete ? undefined : page.cursor;
      if (out.length >= 100) break;
    } while (cursor);
  } catch {}
  // обогащаем именами
  const enriched = [];
  for (const u of out.slice(0, limit)) {
    try {
      const raw = await env.DB.get(`userinfo:${chatId}:${u.uid}`);
      const j = raw ? JSON.parse(raw) : {};
      enriched.push({ id: u.uid, username: j.username || "", first_name: j.first_name || "", lvl: u.lvl });
    } catch { enriched.push({ id: u.uid, username: "", first_name: "", lvl: u.lvl }); }
  }
  return enriched;
}
async function getTelegramAdmins(env, chatId) {
  try {
    const data = await sendTelegram(env, "getChatAdministrators", { chat_id: chatId });
    if (data && data.ok) {
      return data.result
        .filter((m) => m.user && !m.user.is_bot)
        .map((m) => ({ id: String(m.user.id), username: m.user.username || "", first_name: m.user.first_name || "", status: m.status }));
    }
  } catch {}
  return [];
}
function rankTagQuery(arg) {
  arg = String(arg || "").toLowerCase().trim();
  // возвращает { minLevel, needTgAdmins, label } или null
  if (["admin", "admins", "админ", "админы", "администрация"].includes(arg)) return { minLevel: 8, needTgAdmins: true, label: "админов" };
  if (["mod", "mods", "мод", "моды", "модер", "модеры", "модерация", "модераторы"].includes(arg)) return { minLevel: 4, needTgAdmins: true, label: "модерации" };
  if (["senior", "сеньор", "сеньоры", "синьоры"].includes(arg)) return { minLevel: 6, needTgAdmins: false, label: "сеньоров" };
  if (["lead", "лид", "лиды", "тимлид", "тимлиды"].includes(arg)) return { minLevel: 8, needTgAdmins: false, label: "лидов" };
  return null;
}

// Фича 6: антимат / антиссылки / антифлуд
const MAT_LIST = ["хуй", "пизд", "еба", "бля", "сука", "мудак", "долбо", "уеб", "залуп", "гандон", "пидор", "хуес", "ебан", "наху", "поху", "охуе"];
function containsMat(text) {
  const t = String(text || "").toLowerCase();
  return MAT_LIST.some((w) => t.includes(w));
}
function containsLink(text) {
  const t = String(text || "").toLowerCase();
  if (/(https?:\/\/|www\.|t\.me\/|telegram\.me\/|discord\.gg\/|discord\.com\/invite\/)/i.test(t)) return true;
  return false;
}
// флуд: >5 сообщений за 10 сек -> true (храним timestamps JSON)
async function checkFloodMuted(env, chatId, userId) {
  try {
    const k = `spam:${chatId}:${userId}`;
    const raw = await env.DB.get(k);
    const now = Date.now();
    let arr = raw ? JSON.parse(raw) : [];
    arr = arr.filter((t) => now - t < 10000);
    arr.push(now);
    await env.DB.put(k, JSON.stringify(arr), { expirationTtl: 30 });
    return arr.length > 5;
  } catch { return false; }
}

// Бесплатный ИИ 24/7: Workers AI (Llama, бесплатно) -> Pollinations (без ключа)
// Приоритет: 1) env.AI (10k req/day free) 2) Pollinations.ai (free, no key) 3) OpenRouter/Groq если есть ключ
async function askFreeAI(env, userText, sysPrompt) {
  const prompt = String(userText || "").slice(0, 1500).trim();
  if (!prompt) return null;
  const system = sysPrompt || "Ты Bambi — весёлый бот чата Quorvox Team. Отвечай коротко (до 400 символов), по-русски, с 1-2 эмодзи, дружелюбно. Без мата.";
  // 1) Cloudflare Workers AI — бесплатно, 24/7
  if (env.AI) {
    const models = ["@cf/meta/llama-3.1-8b-instruct", "@cf/mistral/mistral-7b-instruct-v0.2"];
    for (const m of models) {
      try {
        const res = await env.AI.run(m, { messages: [{ role: "system", content: system }, { role: "user", content: prompt }], max_tokens: 400 });
        const txt = (res && (res.response || res.text)) || (typeof res === "string" ? res : "");
        if (txt && txt.trim()) return txt.trim().slice(0, 1500);
      } catch (e) { console.log(`AI ${m} fail:`, (e && e.message) || e); }
    }
  }
  // 2) Pollinations.ai — полностью бесплатно, без ключа, 24/7
  try {
    const q = encodeURIComponent(`${system}\n\nВопрос: ${prompt}`);
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 20000);
    const r = await fetch(`https://text.pollinations.ai/${q}`, { signal: ctrl.signal });
    clearTimeout(to);
    if (r.ok) {
      const t = (await r.text()).trim().slice(0, 1500);
      if (t) return t;
    }
  } catch (e) { console.log("pollinations fail:", (e && e.message) || e); }
  // 3) OpenRouter free (:free модели) — если владелец добавил ключ
  const orKey = env.OPENROUTER_KEY || env.OPENROUTER_API_KEY || "";
  if (orKey) {
    try {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${orKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: env.AI_MODEL || "meta-llama/llama-3.1-8b-instruct:free", messages: [{ role: "system", content: system }, { role: "user", content: prompt }], max_tokens: 400 }),
      });
      const j = await r.json().catch(() => ({}));
      const txt = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (txt && txt.trim()) return txt.trim().slice(0, 1500);
    } catch (e) { console.log("openrouter fail:", (e && e.message) || e); }
  }
  // 4) Groq free-tier — если есть ключ
  const groqKey = env.GROQ_API_KEY || "";
  if (groqKey) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "system", content: system }, { role: "user", content: prompt }], max_tokens: 400 }),
      });
      const j = await r.json().catch(() => ({}));
      const txt = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (txt && txt.trim()) return txt.trim().slice(0, 1500);
    } catch (e) { console.log("groq fail:", (e && e.message) || e); }
  }
  return null;
}
async function aiRateLimited(env, chatId, userId) {
  try {
    const k = `ai_cd:${chatId}:${userId}`;
    const last = parseInt((await env.DB.get(k)) || "0", 10) || 0;
    if (Date.now() - last < 10000) return true;
    await env.DB.put(k, String(Date.now()), { expirationTtl: 20 });
    return false;
  } catch { return false; }
}
// 🔥 Огонёк-стрик в ЛС: считает дни подряд, возвращает {count, isNewDay, milestone}
async function updateStreak(env, userId) {
  try {
    const sk = `streak:${userId}`;
    const raw = await env.DB.get(sk);
    const today = todayStr();
    let st = raw ? JSON.parse(raw) : { count: 0, last: "" };
    if (st.last === today) return { count: st.count, isNewDay: false, milestone: false };
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    st.count = (st.last === y) ? (st.count + 1) : 1;
    st.last = today;
    await env.DB.put(sk, JSON.stringify(st), { expirationTtl: 60 * 86400 });
    const milestone = st.count > 1 && st.count % 5 === 0;
    return { count: st.count, isNewDay: true, milestone };
  } catch { return { count: 0, isNewDay: false, milestone: false }; }
}

// BUSINESS / СЕКРЕТАРЬ (Telegram Business): connection + reply
// Чтобы убрать "бот не поддерживает режим секретаря":
// 1) BotFather -> /mybots -> твой бот -> Bot Settings -> Business Mode -> ON
// 2) Вебхук должен получать business_* апдейты (см. инструкцию внизу)
// 3) Подключение: Настройки TG -> Telegram Business -> Chatbots -> твой бот
async function bizSaveConnection(env, conn) {
  try {
    if (!conn || !conn.id) return;
    const ownerId = conn.user && conn.user.id ? String(conn.user.id) : "owner";
    const data = {
      id: conn.id,
      owner: ownerId,
      chat: conn.user_chat_id || 0,
      enabled: !!conn.is_enabled,
      rights: conn.rights || {},
      date: conn.date || 0,
    };
    await env.DB.put(`bizconn:${conn.id}`, JSON.stringify(data), { expirationTtl: 90 * 86400 });
    await env.DB.put(`bizowner:${ownerId}`, conn.id, { expirationTtl: 90 * 86400 });
  } catch (e) { console.log("biz save fail:", e.message); }
}
async function bizGetConnection(env, connId) {
  try {
    const raw = await env.DB.get(`bizconn:${connId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
// Отправка от имени бизнеса: обязательно business_connection_id
async function bizReply(env, connId, chatId, text, extra) {
  const payload = Object.assign({ chat_id: chatId, business_connection_id: connId, text, parse_mode: "HTML" }, extra || {});
  return sendTelegram(env, "sendMessage", payload);
}
async function bizStreak(env, ownerId, customerId) {
  // огонёк как в ТТ: дни подряд общения клиента с тобой
  try {
    const k = `bizstreak:${ownerId}:${customerId}`;
    const raw = await env.DB.get(k);
    const today = new Date().toISOString().slice(0, 10);
    let st = raw ? JSON.parse(raw) : { count: 0, last: "" };
    if (st.last === today) return st;
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    st.count = (st.last === y) ? st.count + 1 : 1;
    st.last = today;
    await env.DB.put(k, JSON.stringify(st), { expirationTtl: 90 * 86400 });
    return st;
  } catch { return { count: 1, last: "" }; }
}

// PART2: дни рождения, напоминалки, расписание, перевод, QR,
// FAQ, предсказания, антиспам-медиа, YT, праздники, аноним-чат
// Всё под free-tier: KV + cron, без платных API
function parseDuration(str) {
  const m = String(str || "").trim().toLowerCase().match(/^(\d+)\s*([мmчhдdнwсs]|мин|час|день|дня|дней|недел)/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  const u = m[2];
  if (u[0] === "с" || u[0] === "s") return n * 1000;
  if (u[0] === "м" || u[0] === "m") return n * 60 * 1000;
  if (u[0] === "ч" || u[0] === "h") return n * 3600 * 1000;
  if (u[0] === "д" || u[0] === "d") return n * 86400 * 1000;
  if (u[0] === "н" || u[0] === "w") return n * 7 * 86400 * 1000;
  return 0;
}
function parseBirth(str) {
  const m = String(str || "").trim().match(/(\d{1,2})[.\-/](\d{1,2})(?:[.\-/](\d{2,4}))?/);
  if (!m) return null;
  const d = parseInt(m[1], 10), mo = parseInt(m[2], 10);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  let y = 0;
  if (m[3]) {
    y = parseInt(m[3], 10);
    if (m[3].length <= 2) y = y > 30 ? 1900 + y : 2000 + y;
    const curY = new Date().getFullYear();
    if (y < 1900 || y > curY) y = 0; // мусорный год — игнорим, храним только день/месяц
  }
  return { d, m: mo, y };
}
// Сколько дней до ближайшего ДР (0 = сегодня)
function daysUntilBirth(d, m) {
  const now = new Date();
  const curY = now.getFullYear();
  let next = new Date(curY, m - 1, d);
  const today = new Date(curY, now.getMonth(), now.getDate());
  if (next < today) next = new Date(curY + 1, m - 1, d);
  return Math.round((next - today) / 864e5);
}
const PREDICTS = [
  "🔮 Да, звёзды говорят да!",
  "🔮 Точно нет, даже не думай.",
  "🔮 Возможно... шанс 50/50.",
  "🔮 Спроси позже, туман мешает.",
  "🔮 Однозначно да! Действуй!",
  "🔮 Лучше не надо, поверь.",
  "🔮 Всё получится, если не лениться 😄",
  "🔮 Жди знак в ближайшие 3 дня.",
  "🔮 Кто-то рядом поможет тебе.",
  "🔮 Рискни — оно того стоит!",
  "🔮 Сначала выспись, потом решай 😴",
  "🔮 Ответ уже у тебя в голове — слушай себя.",
];
const FAQ_LIST = [
  { keys: ["где пополнить стим", "пополнить стим", "steam пополнить", "стим пополнение"], reply: "🎮 <b>Пополнить Steam:</b>\n👉 https://store.steampowered.com/digitalgiftcards/\n🎁 Промокод: <code>BimiBot</code> (-скидка!)" },
  { keys: ["правила", "правило чата"], reply: "📜 <b>Правила:</b> без мата, спама и ссылок.\nНарушил 3 раза = мут. Уважаем друг друга 💜" },
  { keys: ["как заработать", "где взять монет", "как получить монеты"], reply: "💰 Монеты: <code>!дай</code> (раз в день), <code>!работать</code>, <code>!quiz</code>, игры <code>!кубик</code> <code>!дуэль</code>" },
  { keys: ["как тегнуть", "как позвать всех"], reply: "📣 <code>!teg all</code> — всех\n<code>!teg admins</code> — админов\n<code>!add group AF @user</code> — своя группа" },
  { keys: ["гс в текст", "голос в текст", "распознать голос"], reply: "🎤 Ответь на голосовое командой <code>/text</code> — переведу в текст!" },
];
function faqMatch(lower) {
  for (const f of FAQ_LIST) if (f.keys.some((k) => lower.includes(k))) return f.reply;
  return null;
}
// Бесплатный перевод через Google gtx (без ключа). Не 100% стабилен, но free.
// На IP дата-центров Google иногда отвечает 429 — делаем 1 повтор через 2с.
async function freeTranslate(text, target) {
  try {
    target = (target || "ru").slice(0, 5).toLowerCase();
    const q = encodeURIComponent(String(text || "").slice(0, 800));
    if (!q) return null;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${q}`;
    let r = await fetch(url);
    if (r.status === 429) {
      await new Promise((res) => setTimeout(res, 2000));
      r = await fetch(url);
    }
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    if (!j || !j[0]) return null;
    return j[0].map((x) => x[0]).join("").slice(0, 1500);
  } catch { return null; }
}
// Эскалация антиспама: 1-й раз мут 30м, 2-3-й варн, 4-й кик
async function spamEscalate(env, chatId, userId) {
  try {
    const k = `spamlevel:${chatId}:${userId}`;
    const cur = (parseInt((await env.DB.get(k)) || "0", 10) || 0) + 1;
    await env.DB.put(k, String(cur), { expirationTtl: 86400 });
    return cur;
  } catch { return 1; }
}
// Трекинг медиа/стикеров: окно 10 сек, считаем отдельно
async function trackMediaSpam(env, chatId, userId, isSticker) {
  try {
    const k = `media:${chatId}:${userId}`;
    const raw = await env.DB.get(k);
    const now = Date.now();
    let arr = raw ? JSON.parse(raw) : [];
    arr = arr.filter((t) => now - t < 10000);
    arr.push(now);
    await env.DB.put(k, JSON.stringify(arr), { expirationTtl: 30 });
    // порог: 6 любых медиа за 5с ИЛИ 4 стикера подряд за 10с считаем спамом
    const in5s = arr.filter((t) => now - t < 5000).length;
    if (in5s >= 6) return "флуд медиа (6 за 5 сек)";
    if (isSticker && arr.length >= 4) {
      // проверяем что последние 4 — быстро (окно 10с уже отфильтровано)
      if (arr.length >= 10) return "спам стикерами (10 подряд)";
      if (arr.length >= 4) return null; // пока терпим, но считаем
    }
    if (arr.length >= 10) return "флуд (10 сообщений за 10 сек)";
    return null;
  } catch { return null; }
}
// Смарт-антимат через Workers AI (только если включён, только на подозрительных)
async function smartMatCheck(env, text) {
  try {
    if (!env.AI) return null;
    const r = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "Ты модератор. Ответь одним словом: INSULT если текст — оскорбление/наезд на человека, JOKE если мат в шутке/дружески, CLEAN если мата нет." },
        { role: "user", content: String(text).slice(0, 300) },
      ], max_tokens: 10,
    });
    const t = ((r && (r.response || r.text)) || "").toUpperCase();
    if (t.includes("INSULT")) return "INSULT";
    if (t.includes("JOKE")) return "JOKE";
    return "CLEAN";
  } catch { return null; }
}
// Проверка URL: эвристика + VirusTotal если есть ключ, иначе ссылка на проверку
async function checkUrlSafe(env, url) {
  const shorteners = ["bit.ly", "tinyurl", "t.co", "goo.gl", "cutt.ly"];
  const riskyExt = [".exe", ".scr", ".bat", ".ps1", ".apk"];
  const low = url.toLowerCase();
  const heur = [];
  if (shorteners.some((s) => low.includes(s))) heur.push("сокращатель ссылок");
  if (riskyExt.some((e) => low.includes(e))) heur.push("исполняемый файл");
  if (/[а-яё].*\.com|\.ru.*[a-z]{15,}/i.test(url)) heur.push("подозрительный вид");
  const vtKey = env.VT_API_KEY || "";
  if (!vtKey) return { verdict: heur.length ? "suspicious" : "unknown", heur, needKey: true };
  try {
    const id = btoa(url).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const r = await fetch(`https://www.virustotal.com/api/v3/urls/${id}`, { headers: { "x-apikey": vtKey } });
    if (r.status === 404) {
      // сабмитим
      const f = new FormData(); f.append("url", url);
      await fetch("https://www.virustotal.com/api/v3/urls", { method: "POST", headers: { "x-apikey": vtKey }, body: f });
      return { verdict: "queued", heur, needKey: false };
    }
    const j = await r.json().catch(() => ({}));
    const s = j.data && j.data.attributes && j.data.attributes.last_analysis_stats;
    if (s && (s.malicious || s.suspicious)) return { verdict: "malicious", heur, stats: s, needKey: false };
    return { verdict: "clean", heur, stats: s, needKey: false };
  } catch (e) { return { verdict: "error", heur, needKey: false }; }
}
function holidayToday() {
  const n = new Date();
  const md = `${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  // День программиста — 256-й день года
  const start = new Date(n.getFullYear(), 0, 0);
  const doy = Math.floor((n - start) / 864e5);
  if (md === "01-01") return { key: "ny", text: "🎄 <b>С НОВЫМ ГОДОМ!!! 🎉</b>\nПусть код компилится с первого раза, а баги обходят стороной! 💜", img: "🎅🎁✨" };
  if (md === "06-01") return { key: "summer", text: "☀️ <b>С ПЕРВЫМ ДНЁМ ЛЕТА!! 🎉</b>\nСолнца, отдыха и крутых проектов!", img: "🌊🍉😎" };
  if (md === "08-31") return { key: "endsummer", text: "🍂 <b>Последний день лета :(</b>\nЗабираем тепло с собой в осень! 💛", img: "🌅😢" };
  if (doy === 256) return { key: "progday", text: "💻 <b>С Днём программиста!!! 🎉</b>\n<code>while(alive){code(); coffee();}</code>\nВы — лучшие! 🔥", img: "👨‍💻👩‍💻" };
  return null;
}

// Тег-группы (!add group / !teg)
function normGroupName(s) {
  return String(s || "").trim().toLowerCase().replace(/^[@#]/, "").replace(/\s+/g, "_").slice(0, 32);
}
function parseUsernamesFromText(text) {
  // находит @user, user, через запятую/пробел. Игнорирует слова команды.
  const out = [];
  const re = /@([A-Za-z0-9_]{4,32})/g;
  let m;
  while ((m = re.exec(text || ""))) out.push(m[1].toLowerCase());
  return [...new Set(out)];
}
async function getTagGroup(env, chatId, name) {
  name = normGroupName(name);
  if (!name) return null;
  try {
    const raw = await env.DB.get(`taggroup:${chatId}:${name}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
async function saveTagGroup(env, chatId, name, data) {
  name = normGroupName(name);
  await env.DB.put(`taggroup:${chatId}:${name}`, JSON.stringify(data));
  // индекс для !группы (список имён)
  try {
    const idxRaw = await env.DB.get(`taggroups_index:${chatId}`);
    const idx = idxRaw ? JSON.parse(idxRaw) : [];
    if (!idx.includes(name)) {
      idx.push(name);
      await env.DB.put(`taggroups_index:${chatId}`, JSON.stringify(idx));
    }
  } catch {}
}
async function deleteTagGroup(env, chatId, name) {
  name = normGroupName(name);
  await env.DB.delete(`taggroup:${chatId}:${name}`);
  try {
    const idxRaw = await env.DB.get(`taggroups_index:${chatId}`);
    if (idxRaw) {
      const idx = JSON.parse(idxRaw).filter((x) => x !== name);
      await env.DB.put(`taggroups_index:${chatId}`, JSON.stringify(idx));
    }
  } catch {}
}
async function listTagGroups(env, chatId) {
  try {
    const idxRaw = await env.DB.get(`taggroups_index:${chatId}`);
    if (idxRaw) {
      const idx = JSON.parse(idxRaw);
      if (idx.length) return idx;
    }
    // fallback: через KV list (если индекс потерян)
    const list = await env.DB.list({ prefix: `taggroup:${chatId}:` });
    return list.keys.map((k) => k.name.split(":").pop());
  } catch { return []; }
}
// Все известные участники чата (для !teg all) — с пагинацией KV
async function getAllChatUsers(env, chatId, limit = 60) {
  const users = [];
  try {
    let cursor = undefined;
    do {
      const page = await env.DB.list({ prefix: `userinfo:${chatId}:`, limit: 100, cursor });
      for (const k of page.keys) {
        const uid = k.name.split(":")[2];
        try {
          const raw = await env.DB.get(k.name);
          if (!raw) continue;
          const info = JSON.parse(raw);
          users.push({ id: uid, username: info.username || "", first_name: info.first_name || "" });
        } catch {}
        if (users.length >= limit) break;
      }
      cursor = page.list_complete ? undefined : page.cursor;
      if (users.length >= limit) break;
    } while (cursor);
  } catch {}
  return users;
}
function buildTagChunks(members, perChunk = 25) {
  // members: [{id, username, first_name}] -> массив строк-чанков (лимит TG 4096)
  const chunks = [];
  let cur = "";
  for (const m of members) {
    const tag = m.username ? `@${m.username}` : `<a href="tg://user?id=${m.id}">${esc(m.first_name || "друг")}</a>`;
    const add = (cur ? " " : "") + tag;
    if ((cur + add).length > 3500) { chunks.push(cur); cur = tag; }
    else cur += add;
    if (cur.split(" ").length >= perChunk && cur.length > 500) { /* мягкий лимит */ }
  }
  if (cur) chunks.push(cur);
  // режем по 25 тегов на сообщение чтобы не спамить
  const byCount = [];
  for (const c of chunks) {
    const parts = c.split(" ");
    for (let i = 0; i < parts.length; i += perChunk) byCount.push(parts.slice(i, i + perChunk).join(" "));
  }
  return byCount.slice(0, 4); // максимум 4 сообщения (100 тегов)
}

async function getTopUsers(env, chatId, limit = 10) {
  try {
    const list = await env.DB.list({ prefix: `messages:${chatId}:` });
    const users = [];
    for (const k of list.keys) {
      const parts = k.name.split(":");
      const uid = parts[2];
      const count = parseInt((await env.DB.get(k.name)) || "0", 10) || 0;
      let name = uid;
      try {
        const infoRaw = await env.DB.get(`userinfo:${chatId}:${uid}`);
        if (infoRaw) {
          const info = JSON.parse(infoRaw);
          name = info.username ? "@" + info.username : info.first_name || uid;
        }
      } catch {}
      users.push({ uid, name, count });
    }
    users.sort((a, b) => b.count - a.count);
    return users.slice(0, limit);
  } catch {
    return [];
  }
}

// Баланс / экономика для игр
async function getBalance(env, chatId, userId) {
  const v = await env.DB.get(`balance:${chatId}:${userId}`);
  if (v === null) {
    await env.DB.put(`balance:${chatId}:${userId}`, "1000");
    return 1000;
  }
  return parseInt(v, 10) || 0;
}
async function addBalance(env, chatId, userId, delta) {
  const cur = await getBalance(env, chatId, userId);
  const next = cur + delta;
  await env.DB.put(`balance:${chatId}:${userId}`, String(next));
  return next;
}

// UI
async function showMainMenu(env, chatId) {
  await typing(env, chatId);
  await sendTelegram(env, "sendMessage", {
    chat_id: chatId,
    text:
      header("💜 BAMBI • Главное меню") +
      `🚀 <b>Quorvox Team Core</b>\n💫 выбери кнопку ниже 👇` +
      footer(),
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Добавить в группу/канал 🚀", url: "https://t.me/Bambi_QuorvoxBot?startgroup=true" }],
        [
          { text: "🎮 Играть", callback_data: "ls_bot" },
          { text: "📋 Команды", callback_data: "commands" },
        ],
        [
          { text: "👤 Профиль", callback_data: "profile" },
          { text: "🏆 Топ", callback_data: "top" },
        ],
        [{ text: "📊 Статистика чата 📈", callback_data: "stats" }],
      ],
    },
  });
}

async function showAllCommands(env, chatId, page) {
  await typing(env, chatId);
  page = page || "main";
  if (page === "main") {
    const t =
      `📋 <b>КОМАНДЫ BAMBI</b>\n${DIV}\n` +
      `👋 Привет! Я умею много всего.\nВыбери раздел кнопкой 👇\n\n` +
      `📣 <b>Теги:</b> <code>!add group</code> → <code>!teg</code>\n` +
      `💜 <b>РП:</b> <code>!обнять</code> <i>(ответом)</i>\n` +
      `🎮 <b>Игры:</b> <code>!кубик</code> <code>!дуэль</code>\n` +
      `🎤 <b>Голос в текст:</b> <code>/text</code>\n` +
      `🧰 <b>Полезное:</b> <code>!др</code> <code>!qr</code> <code>!tr</code>\n` +
      DIV + `\n🤖 <i>Bambi • Quorvox Team • жми кнопки!</i>`;
    await sendTelegram(env, "sendMessage", {
      chat_id: chatId, text: t, parse_mode: "HTML",
      reply_markup: { inline_keyboard: [
        [{ text: "📣 Теги и группы", callback_data: "cmd_tags" }, { text: "💜 РП-действия", callback_data: "cmd_rp" }],
        [{ text: "🎮 Игры", callback_data: "cmd_games" }, { text: "💰 Экономика", callback_data: "cmd_eco" }],
        [{ text: "💍 Социалка", callback_data: "cmd_social" }, { text: "📊 Ранги", callback_data: "cmd_ranks" }],
        [{ text: "🛡️ Модерация", callback_data: "cmd_mod" }, { text: "🎤 Голос+Канал", callback_data: "cmd_voice" }],
        [{ text: "🧰 Полезное", callback_data: "cmd_tools" }],
      ]},
    });
    return;
  }
  const pages = {
    tags:
      `📣 <b>ТЕГИ И ГРУППЫ</b>\n${DIV}\n` +
      `🆕 <b>Создать:</b>\n<code>!add group AF @user1 @user2</code>\n` +
      `↳ можно через запятую, можно ответом на сообщение\n<i>Пример: !add group Дизайн @anna, @bob</i>\n\n` +
      `📝 <b>Тегнуть:</b>\n├ <code>!teg AF</code> — тегнуть группу AF\n` +
      `├ <code>!тег AF</code> / <code>!tag AF</code> — то же самое\n` +
      `├ <code>!teg all</code> — 📢 ВСЕХ участников\n` +
      `├ <code>!teg admins</code> — 👑 админов (TG + ранг 8+)\n` +
      `├ <code>!teg mods</code> — 🛡️ модерацию (ранг 4+)\n` +
      `├ <code>!teg seniors</code> / <code>!teg leads</code>\n` +
      `└ <code>!all</code> / <code>!тег все</code> — тоже всех\n\n` +
      `📂 <b>Управление:</b>\n├ <code>!groups</code> — список групп\n` +
      `├ <code>!group info AF</code> — кто внутри\n` +
      `├ <code>!del group AF</code> — удалить\n` +
      `└ <code>!add group AF @new</code> — добавить ещё\n\n` +
      `⚠️ <i>Создавать — от Мидла (4+). Тегать — все.</i>`,
    rp:
      `💜 <b>РП-ДЕЙСТВИЯ</b> <i>(только ответом!)</i>\n${DIV}\n` +
      `🤗 <code>!погладить</code> • 🫂 <code>!обнять</code>\n` +
      `💋 <code>!поцеловать</code> • 🍪 <code>!покормить</code>\n` +
      `🐾 <code>!приручить</code> • 🎁 <code>!подарить</code>\n` +
      `🙏 <code>!дать пять</code> • 🤝 <code>!пожать руку</code>\n` +
      `🌟 <code>!похвалить</code> • 🦸 <code>!спасти</code>\n` +
      `🙏 <code>!благословить</code>\n\n` +
      `😈 <b>Дерзкие:</b>\n` +
      `🦵 <code>!пнуть</code> • 🤜 <code>!ударить</code>\n` +
      `😬 <code>!укусить</code> • 👅 <code>!лизнуть</code>\n` +
      `🔫 <code>!застрелить</code> • 🎯 <code>!бросить</code>\n` +
      `🧙 <code>!проклясть</code> • 😤 <code>!поругать</code>\n\n` +
      `💡 <i>Как: ответь на сообщение → напиши !обнять</i>`,
    games:
      `🎮 <b>ИГРЫ</b>\n${DIV}\n` +
      `├ 🎲 <code>!кубик</code> — настоящий дайс\n` +
      `├ 🔮 <code>!угадай</code> → <code>!угадай 5</code> <i>(1-10, 3 попытки, +100)</i>\n` +
      `├ 🎰 <code>!слот</code> — слоты <i>(50 монет)</i>\n` +
      `├ ✂️ <code>!кнб камень</code> <i>/ножницы/бумага, +50</i>\n` +
      `├ 🎡 <code>!r красное 100</code> <i>/черное</i>\n` +
      `├ 🪙 <code>!монетка</code> — орёл/решка\n` +
      `├ 🎱 <code>!шар люблю ли я код?</code>\n` +
      `├ 🎯 <code>!рандом 1-100</code>\n` +
      `├ 🧠 <code>!викторина</code> → <code>!ответ ...</code> <i>(+150)</i>\n` +
      `├ ⚔️ <code>!дуэль</code> <i>(ответом, +50)</i>\n` +
      `└ 😂 <code>!мем</code> • 💡 <code>!факт</code>`,
    eco:
      `💰 <b>ЭКОНОМИКА</b> <i>как в Iris</i>\n${DIV}\n` +
      `├ 💰 <code>!баланс</code> — мой кошелёк\n` +
      `├ 🎁 <code>!дай</code> — бонус +500 <i>(раз в 24ч)</i>\n` +
      `├ 💼 <code>!работать</code> — <i>раз в 4ч, +200-500</i>\n` +
      `├ 🤝 <code>!передать 100</code> <i>(ответом)</i>\n` +
      `├ 🦹 <code>!ограбить</code> <i>(ответом, риск, раз в час)</i>\n` +
      `├ 🎲 <code>!казино 100</code>\n` +
      `└ 🏆 <code>!топб</code> — топ богачей`,
    social:
      `💜 <b>СОЦИАЛКА</b>\n${DIV}\n` +
      `├ 💍 <code>!жениться</code> <i>(ответом)</i>\n` +
      `├ ✅ <code>!согласен</code> / <code>!отказ</code>\n` +
      `├ 💔 <code>!развод</code> • 💑 <code>!пара</code>\n` +
      `├ ✨ <b>Аура:</b> ответь <code>+</code> / <code>-</code> / <code>спасибо</code>\n` +
      `└ 🏆 <code>!топаура</code> — топ по ауре`,
    ranks:
      `📊 <b>РАНГИ 1-10</b>\n${DIV}\n` +
      `1️⃣ 🌱 Стажёр • 2️⃣ Джун • 3️⃣ Джун+\n` +
      `4️⃣ ⚙️ Мидл • 5️⃣ Мидл+ • 6️⃣ 🔥 Сеньор\n` +
      `7️⃣ 💎 Сеньор+ • 8️⃣ 🛡️ Тимлид\n` +
      `9️⃣ 👑 Лид • 🔟 🌟 СЕО\n\n` +
      `├ <code>!myrank</code> — мой грейд\n` +
      `├ <code>!top</code> • <code>!stats</code> • <code>!профиль</code>\n` +
      `└ <code>!setrank 5</code> <i>(ответом, Тимлид 8+)</i>`,
    mod:
      `🛡️ <b>МОДЕРАЦИЯ</b> <i>(ответом)</i>\n${DIV}\n` +
      `├ 🔇 <code>!mut 10</code> / <code>!unmut</code> <i>(Мидл 4+)</i>\n` +
      `├ 👢 <code>!kick</code> <i>(Мидл 4+)</i>\n` +
      `├ ⚠️ <code>!warn</code> <i>(3 варна = бан)</i>\n` +
      `└ 🛑 <code>!ban</code> / <code>!unban</code> <i>(Сеньор 6+)</i>\n\n` +
      `💬 <code>Жалоба ...</code> / <code>Предложение ...</code>\n` +
      `📩 <i>улетит владельцам</i>`,
    voice:
      `🎤 <b>ГОЛОС + КАНАЛ</b>\n${DIV}\n` +
      `🎧 <b>Распознавание:</b>\n├ Ответь на ГС → <code>/text</code>\n` +
      `├ Или ГС с подписью <code>/text</code>\n` +
      `├ Поддержаны: ГС, аудио, кружки, видео\n` +
      `└ 🌍 авто-язык: RU/EN/UK\n\n` +
      `📢 <b>Канал (авто):</b>\n├ ❤️ лайк + 🎲 рандом-реакция\n` +
      `├ 💬 рандом-коммент: <i>«Вау! Круто!»</i>\n` +
      `├ <code>!autolike on/off</code> <i>(админ)</i>\n` +
      `└ <code>!autocomment on/off</code> <i>(админ)</i>`,
    tools:
      `🧰 <b>ПОЛЕЗНОЕ</b>\n${DIV}\n` +
      `├ 🎂 <code>!др 12.05.2005</code> — ДР (+500 в праздник, список с возрастом)\n` +
      `├ 📊 <code>!опрос Гуляем?</code> — голосование Да/Нет\n` +
      `├ ⏰ <code>!напомни 10м текст</code> — тегну тебя\n` +
      `├ 🔮 <code>!predict</code> — предсказание\n` +
      `├ 🌍 <code>!tr en Привет</code> — перевод (free)\n` +
      `├ 🔳 <code>!qr текст</code> — QR-картинка\n` +
      `├ 🔗 <code>!url ссылка</code> — проверка ссылки\n` +
      `├ 📅 <code>!sched add Пн 09:00 Матанализ</code>\n` +
      `├ 📺 <code>!yt add UCxxxx</code> — новые видео в чат\n` +
      `└ 💬 <code>!chat</code> / <code>!stop</code> — аноним-чат (ЛС)\n\n` +
      `🛒 <code>!shop</code> — щит, титул, бонусы за монеты`,
  };
  const body = pages[page] || pages.tags;
  await sendTelegram(env, "sendMessage", {
    chat_id: chatId, text: body + `\n${DIV}\n🤖 <i>Bambi • напиши </i><code>команды</code><i> для меню</i>`,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [[{ text: "⬅️ Назад в меню", callback_data: "commands" }]] },
  });
}

async function showStats(env, chatId) {
  try {
    await typing(env, chatId);
    const total = (await env.DB.get(`chat_total:${chatId}`)) || "0";
    const today = (await env.DB.get(`daily:${chatId}:${todayStr()}`)) || "0";
    const list = await env.DB.list({ prefix: `messages:${chatId}:` });
    const top = await getTopUsers(env, chatId, 3);
    let topLine = "<i>пока пусто — стань первым! 🔥</i>";
    if (top.length) topLine = top.map((u, i) => `${["🥇", "🥈", "🥉"][i]} ${esc(u.name)} — <b>${u.count}</b>`).join("\n");
    const text =
      header("📊 Статистика чата") +
      `💬 Всего сообщений: <b>${esc(total)}</b>\n` +
      `📅 Сегодня: <b>${esc(today)}</b>\n` +
      `👥 Активных: <b>${list.keys.length}</b>\n\n` +
      `🏆 <b>Топ-3:</b>\n${topLine}` +
      `\n\n🚀 <b>Quorvox Team Core</b>` +
      footer();
    await sendTelegram(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
  } catch (e) {
    await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "❌ Не смог собрать статистику 😢" });
  }
}

async function showTopUsers(env, chatId) {
  await typing(env, chatId);
  const top = await getTopUsers(env, chatId, 10);
  if (!top.length) {
    await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "🏆 Пока тихо... Напиши что-нибудь! 💬" });
    return;
  }
  const medals = ["🥇", "🥈", "🥉"];
  let t = header("🏆 Топ-10 за всё время");
  top.forEach((u, i) => {
    const m = medals[i] || `${i + 1}.`;
    t += `${m} ${esc(u.name)} — <b>${u.count}</b> 💬\n`;
  });
  t += `\n${DIV2}\n📅 <i>Недельный: <code>!топ недели</code> — сброс каждый понедельник!</i>`;
  t += footer();
  await sendTelegram(env, "sendMessage", { chat_id: chatId, text: t, parse_mode: "HTML" });
}
async function showWeeklyTop(env, chatId) {
  await typing(env, chatId);
  const { weekKey, top } = await getWeeklyTop(env, chatId, 10);
  if (!top.length) {
    await sendTelegram(env, "sendMessage", { chat_id: chatId, text: card("🏆", `Топ недели ${weekKey}`, "😴 На этой неделе пока тихо.\nНапиши что-нибудь — стань первым! 🔥", "Сброс — каждый понедельник 18:00"), parse_mode: "HTML" });
    return;
  }
  const medals = ["🥇", "🥈", "🥉"];
  let t = `🏆 <b>ТОП НЕДЕЛИ ${esc(weekKey)}</b>\n${DIV}\n`;
  top.forEach((u, i) => { t += `${medals[i] || `${i + 1}.`} ${esc(u.name)} — <b>${u.count}</b> 💬\n`; });
  t += `\n${DIV2}\n🎁 <i>Победитель получит +500 монет в понедельник 18:00!</i>\n📊 <i>Общий топ: <code>!top</code></i>`;
  t += footer();
  await sendTelegram(env, "sendMessage", { chat_id: chatId, text: t, parse_mode: "HTML" });
}

async function showProfile(env, chatId, userId, from) {
  await typing(env, chatId);
  const rank = await getUserRank(env, userId, chatId);
  const msgs = (await env.DB.get(`messages:${chatId}:${userId}`)) || "0";
  const aura = (await env.DB.get(`aura:${chatId}:${userId}`)) || "0";
  const bal = await getBalance(env, chatId, userId);
  const warns = (await env.DB.get(`warns:${chatId}:${userId}`)) || "0";
  const marryRaw = await env.DB.get(`marry:${chatId}:${userId}`);
  let marryLine = "💔 <i>свободен(а)</i>";
  if (marryRaw) {
    try {
      const m = JSON.parse(marryRaw);
      marryLine = `💍 в браке с ${esc(m.name || m.uid)}`;
    } catch {}
  }
  const crown = rank.level === 10 ? " 👑" : "";
  let titleLine = "";
  try {
    const inv = JSON.parse((await env.DB.get(`shop:${chatId}:${userId}`)) || "{}");
    if (inv.title) titleLine = `✏️ Титул: <b>${esc(inv.title)}</b>\n`;
  } catch {}
  const t =
    header(`👤 Профиль ${displayName(from)}`) +
    `🆔 ID: <code>${userId}</code>\n` +
    titleLine +
    `📊 Ранг: <b>${esc(rank.name)}</b>${crown} <i>[${rank.level}/10]</i>\n` +
    `${"▰".repeat(Math.min(rank.level, 10))}${"▱".repeat(10 - Math.min(rank.level, 10))}\n\n` +
    `💬 Сообщений: <b>${esc(msgs)}</b>\n` +
    `✨ Аура: <b>${esc(aura)}</b>\n` +
    `💰 Баланс: <b>${bal}</b> монет\n` +
    `⚠️ Варны: <b>${esc(warns)}/3</b>\n` +
    `${marryLine}` +
    footer();
  await sendTelegram(env, "sendMessage", { chat_id: chatId, text: t, parse_mode: "HTML" });
}

async function checkSubscription(env, userId) {
  try {
    const channelId = env.CHANNEL_ID || SUPPORT_CHAT_ID;
    const data = await sendTelegram(env, "getChatMember", { chat_id: channelId, user_id: userId });
    if (!data || !data.ok) return true; // если не смогли проверить — не блокируем
    return ["member", "administrator", "creator"].includes(data.result.status);
  } catch {
    return true;
  }
}

// MAIN
module.exports = {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("Bambi OK", { status: 200 });
    if (!env.DB) return new Response("Missing KV binding DB", { status: 500 });

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("OK");
    }

    try {
      // 0-BIZ. Telegram Business: подключение / отключение секретаря
      if (update.business_connection) {
        const bc = update.business_connection;
        await bizSaveConnection(env, bc);
        // уведомляем владельца в личку подключения
        try {
          if (bc.user_chat_id) {
            const onOff = bc.is_enabled ? "✅ <b>Секретарь ВКЛ!</b>\nТеперь я отвечаю твоим клиентам: огонёк 🔥, ГС в текст 🎤, FAQ, !ai." : "❌ <b>Секретарь ВЫКЛ.</b> Отключён в Telegram Business.";
            await sendTelegram(env, "sendMessage", { chat_id: bc.user_chat_id, text: `${onOff}\n${DIV}\n💡 Проверка: попроси друга написать тебе в личку.`, parse_mode: "HTML" });
          }
        } catch {}
        return new Response("OK");
      }
      if (update.deleted_business_messages) {
        return new Response("OK"); // чистить нечего, просто игнорим
      }
      // 0-BIZ2. Входящее клиенту владельца (секретарь)
      const bizMsg = update.business_message || update.edited_business_message;
      if (bizMsg) {
        const connId = bizMsg.business_connection_id;
        const conn = await bizGetConnection(env, connId);
        // Не отвечаем на свои же исходящие (from.is_bot) и на edited
        if (!bizMsg.from || bizMsg.from.is_bot || update.edited_business_message) return new Response("OK");
        const ownerId = (conn && conn.owner) || "";
        const customerId = bizMsg.from.id;
        const chatId = bizMsg.chat.id;
        const bText = (bizMsg.text || bizMsg.caption || "").trim();
        const bLower = bText.toLowerCase();
        // огонёк 🔥 как в ТТ: дни подряд
        try {
          const st = await bizStreak(env, ownerId || "biz", customerId);
          if (st.count > 1 && (st.count === 2 || st.count % 5 === 0)) {
            await bizReply(env, connId, chatId, `🔥 <b>Огонёк ${st.count}!</b> Ты с нами ${st.count} дн. подряд! 💜`);
          }
        } catch {}
        // ГС в текст — авто: если голосовое без команды, сразу распознаём
        try {
          const vf = getVoiceFileId(bizMsg);
          if (vf) {
            await sendTelegram(env, "sendMessage", { chat_id: chatId, business_connection_id: connId, text: "🎧 Распознаю голосовое... ⏳" });
            const token = getToken(env);
            const fi = await sendTelegram(env, "getFile", { file_id: vf.file_id });
            const fp = fi && fi.ok && fi.result.file_path;
            if (fp) {
              const dl = await fetch(`https://api.telegram.org/file/bot${token}/${fp}`);
              if (dl.ok) {
                const buf = await dl.arrayBuffer();
                if (buf.byteLength < 9 * 1024 * 1024) {
                  const res = await transcribeVoiceBytes(env, buf, "voice.ogg");
                  if (res && res.text) {
                    await bizReply(env, connId, chatId, `📝 <b>ГС в текст:</b>\n${DIV}\n${esc(res.text)}`);
                    return new Response("OK");
                  }
                }
              }
            }
            await bizReply(env, connId, chatId, "😢 Не смог распознать ГС. Попробуй короче.");
            return new Response("OK");
          }
        } catch (e) { console.log("biz voice fail:", e.message); }
        if (!bText) return new Response("OK");
        // FAQ-авто (Steam/Lynx и т.д.)
        try {
          const fr = faqMatch(bLower);
          if (fr) { await bizReply(env, connId, chatId, fr); return new Response("OK"); }
        } catch {}
        // Простые команды секретаря
        if (["команды", "!команды", "/help", "помощь"].includes(bLower)) {
          await bizReply(env, connId, chatId, `🤖 <b>Я на связи!</b>\n${DIV}\n🎤 Кидай голосовое — переведу в текст\n🔮 <code>!predict</code> — предсказание\n🌍 <code>!tr en текст</code> — перевод\n🔳 <code>!qr текст</code> — QR\n⏰ <code>!напомни 10м текст</code>\n💬 Просто напиши вопрос — отвечу!`);
          return new Response("OK");
        }
        if (/^!predict/i.test(bLower) || /^!предсказани/i.test(bLower)) {
          const p = PREDICTS[Math.floor(Math.random() * PREDICTS.length)];
          await bizReply(env, connId, chatId, `🔮 ${p}`);
          return new Response("OK");
        }
        if (/^!qr(\s|$)/i.test(bLower)) {
          const rest = bText.replace(/^!qr\s*/i, "").trim().slice(0, 300);
          if (rest) {
            const bqr1 = await sendTelegram(env, "sendPhoto", { chat_id: chatId, business_connection_id: connId, photo: `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(rest)}`, caption: `🔳 QR: ${rest.slice(0, 150)}` });
            if (!bqr1 || bqr1.ok === false) {
              await sendTelegram(env, "sendPhoto", { chat_id: chatId, business_connection_id: connId, photo: `https://quickchart.io/qr?text=${encodeURIComponent(rest)}&size=400`, caption: `🔳 QR: ${rest.slice(0, 150)}` });
            }
          } else await bizReply(env, connId, chatId, "Формат: <code>!qr текст</code>");
          return new Response("OK");
        }
        if (/^!tr(\s|$)/i.test(bLower) || /^!перевод/i.test(bLower)) {
          let rest = bText.replace(/^!(tr|перевод|translate)\s*/i, "").trim();
          let target = "ru";
          const m = rest.match(/^([a-z]{2})\s+([\s\S]+)/i);
          if (m) { target = m[1].toLowerCase(); rest = m[2]; }
          const t = rest ? await freeTranslate(rest, target) : null;
          await bizReply(env, connId, chatId, t ? `🌍 <b>${esc(target.toUpperCase())}:</b>\n${esc(t)}` : "Формат: <code>!tr en Привет</code>");
          return new Response("OK");
        }
        if (/^!напомни/i.test(bLower)) {
          const rest = bText.replace(/^!напомни\s*/i, "").trim();
          const dm = rest.match(/^(\S+)\s+([\s\S]+)/);
          const ms = dm ? parseDuration(dm[1]) : 0;
          if (!dm || !ms || ms < 30000 || ms > 7 * 864e5) {
            await bizReply(env, connId, chatId, "Формат: <code>!напомни 10м текст</code>");
          } else {
            const rid = `r${Date.now().toString(36)}`;
            // для бизнес-напоминалки храним connId чтобы ответить в тот же чат клиента
            await env.DB.put(`remind:${rid}`, JSON.stringify({ chatId, userId: customerId, bizConn: connId, name: displayName(bizMsg.from), text: dm[2].slice(0, 300), due: Date.now() + ms }), { expirationTtl: 8 * 86400 });
            await bizReply(env, connId, chatId, `⏰ Запомнил! Напомню через <b>${esc(dm[1])}</b>.`);
          }
          return new Response("OK");
        }
        // !ai / вопрос — бесплатно через Workers AI
        if (/^!(ai|gpt|гпт|ии|спроси|ask)\b/i.test(bLower)) {
          const q = bText.replace(/^!(ai|gpt|гпт|ии|спроси|ask)\b\s*/i, "").trim();
          if (!q) { await bizReply(env, connId, chatId, "Спроси так: <code>!ai сколько варить пельмени?</code>"); return new Response("OK"); }
          if (await aiRateLimited(env, chatId, customerId)) { await bizReply(env, connId, chatId, "⏳ Раз в 10 сек, подожди!"); return new Response("OK"); }
          const ans = await askFreeAI(env, q);
          await bizReply(env, connId, chatId, ans ? `🤖 ${esc(ans)}` : "😢 ИИ устал, попробуй позже.");
          return new Response("OK");
        }
        // Дефолт: умный автоответ (чтобы чат не молчал). Только если вопрос/длинное сообщение, чтобы не спамить на "ок"
        if (bText.length > 6 && (bText.includes("?") || bText.length > 20)) {
          if (!(await aiRateLimited(env, chatId, customerId))) {
            const ans = await askFreeAI(env, bText, "Ты секретарь владельца в Telegram Business. Отвечай вежливо, коротко (до 300 символов), по-русски, как помощник. Если не знаешь — предложи подождать владельца.");
            if (ans) { await bizReply(env, connId, chatId, `🤖 ${esc(ans)}\n${DIV2}\n<i>автоответ секретаря • владелец скоро подключится</i>`); return new Response("OK"); }
          }
        }
        // короткое "привет/ок" — просто вежливо здороваемся, без ИИ (экономим free-лимит)
        if (/^(привет|здравствуй|добрый|hello|hi|салют|йо)\b/i.test(bLower)) {
          await bizReply(env, connId, chatId, `👋 Привет! Я помощник на связи 💜\nНапиши вопрос — помогу! 🎤 <i>голосовые тоже понимаю</i>`);
          return new Response("OK");
        }
        return new Response("OK");
      }

      // 0. Бота добавили/поменяли права (канал или группа)
      if (update.my_chat_member) {
        const mcm = update.my_chat_member;
        const chat = mcm.chat;
        const newStatus = mcm.new_chat_member && mcm.new_chat_member.status;
        if (newStatus === "administrator" || newStatus === "member") {
          if (chat.type === "channel") {
            await sendTelegram(env, "sendMessage", {
              chat_id: chat.id,
              text: `🚀 <b>Всем привет! Я Bambi!</b>\n${DIV}\n💜 Спасибо, что добавили меня в канал!\n👍 Буду ставить реакции\n💬 И писать комменты: <i>«${esc(randomChannelComment())}»</i>\n\n⚙️ Админ: <code>!autolike off</code> / <code>!autocomment off</code> — чтобы выключить`,
              parse_mode: "HTML",
            });
          } else {
            await sendTelegram(env, "sendMessage", {
              chat_id: chat.id,
              text: card("👋", "Всем привет! Я Bambi!",
                `🚀 Я бот <b>Quorvox Team</b>\n\n📣 Теги: <code>!add group AF @user</code>\n💜 РП: <code>!обнять</code> <i>(ответом)</i>\n🎮 Игры: <code>!кубик</code>\n\n👇 Напиши <code>команды</code> — покажу всё с кнопками!`),
              parse_mode: "HTML",
            });
          }
        }
        return new Response("OK");
      }

      // 1. Посты в канале: рандом-реакция + рандом-коммент
      const channelPost = update.channel_post || update.edited_channel_post;
      if (channelPost) {
        const chatId = channelPost.chat.id;
        const messageId = channelPost.message_id;
        const settings = await getChatSettings(env, chatId);
        // 1) реакция (если включено + защита от 429: не чаще 1/6с, бэк-офф по retry_after)
        if (settings.autolike) {
          const nowMs = Date.now();
          const cdUntil = _reactCooldown.get(String(chatId)) || 0;
          const lastAt = _lastReactAt.get(String(chatId)) || 0;
          if (nowMs >= cdUntil && nowMs - lastAt >= 6000) {
            _lastReactAt.set(String(chatId), nowMs);
            const rr = await sendTelegram(env, "setMessageReaction", {
              chat_id: chatId,
              message_id: messageId,
              reaction: [{ type: "emoji", emoji: randomChannelReaction() }],
              is_big: false,
            });
            if (rr && rr.ok === false) {
              const desc = JSON.stringify(rr).slice(0, 300);
              const m = desc.match(/retry after (\d+)/i);
              const wait = m ? parseInt(m[1], 10) : 30;
              _reactCooldown.set(String(chatId), Date.now() + wait * 1000);
              console.log(`autolike cooldown ${chatId} ${wait}s`);
            }
          }
        }
        // 2) рандом-коммент (не отвечаем на свои + не на edited)
        // Если у бота нет прав админа в канале — выключаем автокомменты для этого чата сами,
        // чтобы не спамить ошибками (включить обратно: !autocomment on от админа канала).
        const isOwn = channelPost.from && channelPost.from.is_bot;
        if (settings.autocomment && !isOwn && !update.edited_channel_post) {
          const cr = await sendTelegram(env, "sendMessage", { chat_id: chatId, text: randomChannelComment() });
          if (cr && cr.ok === false) {
            const s = JSON.stringify(cr).toLowerCase();
            if (s.includes("administrator rights") || s.includes("not enough rights") || s.includes("chat not found")) {
              await setChatSettings(env, chatId, { autocomment: false });
              console.log(`autocomment auto-OFF ${chatId} (no admin rights)`);
            }
          }
        }
        return new Response("OK");
      }

      // 2. Кнопки (callback_query) — ВАЖНО: отдельно от message!
      if (update.callback_query) {
        const cq = update.callback_query;
        const data = cq.data || "";
        const cqMsg = cq.message;
        const chatId = cqMsg ? cqMsg.chat.id : cq.from.id;
        const userId = cq.from.id;

        await sendTelegram(env, "answerCallbackQuery", { callback_query_id: cq.id });

        if (data === "ls_bot") {
          await sendTelegram(env, "sendMessage", {
            chat_id: chatId,
            text: card("💬", "ЛС-бот",
              `🎮 <code>!кубик</code>, <code>!угадай</code>, <code>!слот</code>\n📊 <code>!myrank</code>, <code>!top</code>, <code>!профиль</code>\n📣 <code>!teg all</code> — тегнуть всех\n\n⚠️ Жалобы — только по серьёзным нарушениям:\nнапиши <code>Жалоба ...</code>`),
            parse_mode: "HTML",
          });
        } else if (data === "commands") {
          await showAllCommands(env, chatId, "main");
        } else if (data.startsWith("cmd_")) {
          await showAllCommands(env, chatId, data.replace("cmd_", ""));
        } else if (data === "profile") {
          await showProfile(env, chatId, userId, cq.from);
        } else if (data === "top") {
          await showTopUsers(env, chatId);
        } else if (data === "stats") {
          await showStats(env, chatId);
        } else if (data.startsWith("vote:")) {
          // голосование в опросе: vote:<pid>:yes/no
          try {
            const [, pid, v] = data.split(":");
            const raw = await env.DB.get(`poll:${chatId}:${pid}`);
            if (!raw) { await sendTelegram(env, "answerCallbackQuery", { callback_query_id: cq.id, text: "Опрос закрыт" }); return new Response("OK"); }
            const p = JSON.parse(raw);
            p.voters = p.voters || {};
            const prev = p.voters[userId];
            if (prev === v) { return new Response("OK"); }
            if (prev === "yes") p.yes = Math.max(0, p.yes - 1);
            if (prev === "no") p.no = Math.max(0, p.no - 1);
            p.voters[userId] = v;
            if (v === "yes") p.yes++; else p.no++;
            await env.DB.put(`poll:${chatId}:${pid}`, JSON.stringify(p), { expirationTtl: 86400 });
            try {
              await sendTelegram(env, "editMessageText", {
                chat_id: chatId, message_id: cqMsg.message_id, parse_mode: "HTML",
                text: `📊 <b>Опрос:</b> ${esc(p.q)}\n${DIV}\n✅ Да: ${p.yes} | ❌ Нет: ${p.no}`,
                reply_markup: { inline_keyboard: [[{ text: `✅ Да (${p.yes})`, callback_data: `vote:${pid}:yes` }, { text: `❌ Нет (${p.no})`, callback_data: `vote:${pid}:no` }]] },
              });
            } catch {}
          } catch {}
        }
        return new Response("OK");
      }

      // 3. Новые участники
      if (update.message && update.message.new_chat_members) {
        const chatId = update.message.chat.id;
        const names = update.message.new_chat_members.map((u) => displayName(u)).join(", ");
        await sendTelegram(env, "sendMessage", {
          chat_id: chatId,
          text: card("👋", "Добро пожаловать!",
            `🎉 ${esc(names)} — с нами!\n\n📣 Теги: <code>!teg all</code>\n🎮 Игры: <code>!кубик</code>\n👇 Жми <code>команды</code> — там всё с кнопками!`),
          parse_mode: "HTML",
        });
        return new Response("OK");
      }

      // 4. Обычные сообщения
      if (!update.message) return new Response("OK");
      const message = update.message;
      if (!message.from || message.from.is_bot) return new Response("OK");

      const chatId = message.chat.id;
      const userId = message.from.id;
      const chatType = message.chat.type; // private | group | supergroup | channel
      const text = (message.text || message.caption || "").trim();

      // Автолайк + автокоммент для постов из канала в привязанной группе
      // (когда канал привязан к группе, посты приходят как sender_chat type=channel)
      if ((chatType === "group" || chatType === "supergroup") && message.sender_chat && message.sender_chat.type === "channel" && !message.from.is_bot) {
        const settings = await getChatSettings(env, chatId);
        if (settings.autolike) {
          try { await sendTelegram(env, "setMessageReaction", { chat_id: chatId, message_id: message.message_id, reaction: [{ type: "emoji", emoji: randomChannelReaction() }], is_big: false }); } catch {}
        }
        if (settings.autocomment) {
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: randomChannelComment(), reply_to_message_id: message.message_id });
        }
        return new Response("OK");
      }

      // /text: голос в текст (любой ранг, без проверки ранга)
      // Сценарий: ответом на ГС написать /text. Либо: ГС с подписью /text.
      const ownVoice = getVoiceFileId(message);
      if (ownVoice && /^\/text\b|^!text\b/i.test(text)) {
        safeTrack(ctx, env, chatId, message.from);
        await handleTextCommand(env, chatId, message.message_id, ownVoice.file_id, ownVoice.kind, ownVoice.duration);
        return new Response("OK");
      }
      // Запоминаем последнее ГС, чтобы /text следующим сообщением тоже работал
      if (ownVoice) {
        try {
          await env.DB.put(`voice_last:${chatId}:${userId}`, JSON.stringify({ file_id: ownVoice.file_id, kind: ownVoice.kind, duration: ownVoice.duration || 0 }), { expirationTtl: 300 });
        } catch (e) { console.log("voice_last save fail:", e.message); }
        safeTrack(ctx, env, chatId, message.from);
        // в ЛС — сразу распознаём, без лишнего /text (стрик тоже считаем)
        if (chatType === "private") {
          try {
            const s = await updateStreak(env, userId);
            if (s.milestone) {
              try { await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `🔥 <b>Огонёк ${s.count} дней подряд!</b> Так держать!`, parse_mode: "HTML" }); } catch {}
            }
          } catch {}
          await handleTextCommand(env, chatId, message.message_id, ownVoice.file_id, ownVoice.kind, ownVoice.duration);
          return new Response("OK");
        }
        await sendTelegram(env, "sendMessage", {
          chat_id: chatId,
          text: card("🎤", "Голосовое принято!",
            `${esc(ownVoice.kind)} ${ownVoice.duration ? `• ⏱ <b>${ownVoice.duration}с</b>` : ""}\n\n📝 Ответь на него <code>/text</code> — переведу в текст!\n🌍 <i>RU / EN / UK — авто</i>`),
          parse_mode: "HTML",
          reply_to_message_id: message.message_id,
        });
        return new Response("OK");
      }
      if (/^\/text\b|^!text\b/i.test(text)) {
        safeTrack(ctx, env, chatId, message.from);
        const replied = message.reply_to_message ? getVoiceFileId(message.reply_to_message) : null;
        if (replied) {
          await handleTextCommand(env, chatId, message.message_id, replied.file_id, replied.kind, replied.duration);
          return new Response("OK");
        }
        let saved = null;
        try { saved = await env.DB.get(`voice_last:${chatId}:${userId}`); } catch {}
        if (saved) {
          try {
            const s = JSON.parse(saved);
            await handleTextCommand(env, chatId, message.message_id, s.file_id, s.kind, s.duration);
          } catch {
            await say(env, chatId, errCard("Нет голосового", "🎤 Ответь командой <code>/text</code> <b>на голосовое</b>.", "Зажми микрофон → отправь → ответь /text"), message.message_id);
          }
          return new Response("OK");
        }
        await say(env, chatId, errCard("Как распознать голос?",
          `🎤 Ответь командой <code>/text</code> <b>на голосовое сообщение</b>\n\n📌 <b>3 способа:</b>\n1️⃣ Ответом на ГС → <code>/text</code>\n2️⃣ ГС с подписью <code>/text</code>\n3️⃣ Отправь ГС → следующим сообщением <code>/text</code>\n\n🌍 <i>Понимаю RU / EN / UK</i>`), message.message_id);
        return new Response("OK");
      }

      // Антиспам медиа/стикеров (работает и без текста)
      if ((chatType === "group" || chatType === "supergroup") && (message.sticker || message.photo || message.video || message.animation || message.document)) {
        try {
          const stM = await getChatSettings(env, chatId);
          if (stM.antispam_media || stM.antiflood) {
            const sRankM = await getUserRank(env, userId, chatId);
            let immuneM = isOwner(userId) || sRankM.level >= 4;
            if (!immuneM) {
              const ts = await getChatMemberStatus(env, chatId, userId);
              immuneM = ts === "creator" || ts === "administrator";
            }
            if (!immuneM) {
              try {
                const inv = JSON.parse((await env.DB.get(`shop:${chatId}:${userId}`)) || "{}");
                if (!(inv.noFloodUntil > Date.now())) {
                  const hit = await trackMediaSpam(env, chatId, userId, !!message.sticker);
                  if (hit) {
                    try { await sendTelegram(env, "deleteMessage", { chat_id: chatId, message_id: message.message_id }); } catch {}
                    const lvl = await spamEscalate(env, chatId, userId);
                    if (lvl === 1) {
                      const until = Math.floor(Date.now() / 1000) + 1800;
                      try { await sendTelegram(env, "restrictChatMember", { chat_id: chatId, user_id: userId, permissions: { can_send_messages: false }, until_date: until }); } catch {}
                      await say(env, chatId, `🔇 ${esc(displayName(message.from))} — мут 30 мин за ${esc(hit)} (1-й раз)`, null);
                    } else if (lvl <= 3) {
                      const wk = `warns:${chatId}:${userId}`;
                      const cur = (parseInt((await env.DB.get(wk)) || "0", 10) || 0) + 1;
                      await env.DB.put(wk, String(cur));
                      await say(env, chatId, `⚠️ ${esc(displayName(message.from))} — варн ${cur}/3 за ${esc(hit)} (${lvl}-й спам)`, null);
                    } else {
                      try { await sendTelegram(env, "banChatMember", { chat_id: chatId, user_id: userId }); } catch {}
                      try { await sendTelegram(env, "unbanChatMember", { chat_id: chatId, user_id: userId }); } catch {}
                      await say(env, chatId, `👢 ${esc(displayName(message.from))} кикнут за спам (4-й раз)`, null);
                      await env.DB.delete(`spamlevel:${chatId}:${userId}`);
                    }
                    return new Response("OK");
                  }
                }
              } catch {}
            }
          }
        } catch {}
      }

      if (!text) return new Response("OK");

      const lower = text.toLowerCase();
      const username = message.from.username || "N/A";

      // Учёт статистики (и в ЛС, и в чатах) — неблокирующе
      safeTrack(ctx, env, chatId, message.from);

      // ЛС: проверка подписки + /start
      if (chatType === "private") {
        // 🔥 огонёк считаем ДО проверки подписки, чтобы работал у всех
        try {
          const s = await updateStreak(env, userId);
          if (s.milestone) {
            try { await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `🔥 <b>Огонёк ${s.count} дней подряд!</b> Так держать!`, parse_mode: "HTML" }); } catch {}
          }
        } catch {}
        if (text.startsWith("/start")) {
          const seen = await env.DB.get(`welcome_seen:${userId}`);
          if (!seen) {
            await sendTelegram(env, "sendMessage", {
              chat_id: chatId,
              text: "❤️ <b>Любовь это... когда вы выбираете Quorvox, а не другую компанию</b>",
              parse_mode: "HTML",
            });
            await sendTelegram(env, "sendMessage", {
              chat_id: chatId,
              text:
                "👋 Привет! Я <b>Bambi</b>, бот Quorvox Team.\n\n" +
                "🤖 <b>Что я умею:</b>\n• 🎮 Игры\n• 🛡️ Модерация\n• 📊 Ранги и статистика\n• 💬 Поддержка\n\n📌 <b>Выбери действие:</b>",
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [{ text: "➕ Добавить в группу/канал", url: "https://t.me/Bambi_QuorvoxBot?startgroup=true" }],
                  [
                    { text: "💬 ЛС Бот", callback_data: "ls_bot" },
                    { text: "📋 Команды", callback_data: "commands" },
                  ],
                  [
                    { text: "👤 Мой профиль", callback_data: "profile" },
                    { text: "🏆 Топ", callback_data: "top" },
                  ],
                ],
              },
            });
            await env.DB.put(`welcome_seen:${userId}`, "1");
          } else {
            await showMainMenu(env, chatId);
          }
          return new Response("OK");
        }

        const sub = await checkSubscription(env, userId);
        if (!sub) {
          await sendTelegram(env, "sendMessage", {
            chat_id: chatId,
            text: `❗️ Подпишись на канал ${CHANNEL_USERNAME}, чтобы пользоваться ботом.`,
            reply_markup: { inline_keyboard: [[{ text: "✅ Подписаться", url: "https://t.me/Quorvox_team" }]] },
          });
          return new Response("OK");
        }
        // Аноним-чат: пересылка собеседнику (текст + медиа через forward)
        try {
          const pair = await env.DB.get(`pair:${userId}`);
          if (pair && !text.startsWith("!") && !text.startsWith("/") && lower !== "!stop" && lower !== "!стоп" && lower !== "!chat") {
            if (text) await sendTelegram(env, "sendMessage", { chat_id: Number(pair), text: `💬 <b>Анон:</b> ${esc(text.slice(0, 1000))}`, parse_mode: "HTML" });
            else {
              try { await sendTelegram(env, "forwardMessage", { chat_id: Number(pair), from_chat_id: chatId, message_id: message.message_id }); } catch {}
            }
            return new Response("OK");
          }
          // медиа без текста в анонимке тоже форвардим
          if (pair && !text && (message.sticker || message.photo || message.video)) {
            try { await sendTelegram(env, "forwardMessage", { chat_id: Number(pair), from_chat_id: chatId, message_id: message.message_id }); } catch {}
            return new Response("OK");
          }
        } catch {}
      }

      // Фича 6: автомодерация (мат/ссылки/флуд) — только группы, админы и ранги 4+ в игноре
      if ((chatType === "group" || chatType === "supergroup") && !lower.startsWith("!") && !lower.startsWith("/")) {
        try {
          const st = await getChatSettings(env, chatId);
          if (st.antimat || st.antilink || st.antiflood) {
            // дешёвый префильтр без IO: если текст чистый и антифлуд выкл — выходим сразу
            const maybeBad = (st.antimat && containsMat(text)) || (st.antilink && containsLink(text)) || st.antiflood;
            if (!maybeBad) { /* чисто */ }
            else {
            const sRank = await getUserRank(env, userId, chatId);
            let immune = isOwner(userId) || sRank.level >= 4;
            if (!immune) {
              const tgStatus = await getChatMemberStatus(env, chatId, userId);
              immune = tgStatus === "creator" || tgStatus === "administrator";
            }
            if (!immune) {
              let reason = null;
              if (st.antimat && containsMat(text)) {
                reason = "мат";
                // смарт-режим: шутку пропускаем, оскорбление — баним
                if (st.smartmat) {
                  const verdict = await smartMatCheck(env, text);
                  if (verdict === "JOKE" || verdict === "CLEAN") reason = null;
                  else if (verdict === "INSULT") reason = "оскорбление";
                }
              }
              if (!reason && st.antilink && containsLink(text)) reason = "ссылки";
              if (!reason && st.antiflood) {
                try {
                  const invF = JSON.parse((await env.DB.get(`shop:${chatId}:${userId}`)) || "{}");
                  if (!(invF.noFloodUntil > Date.now()) && await checkFloodMuted(env, chatId, userId)) reason = "флуд";
                } catch { if (await checkFloodMuted(env, chatId, userId)) reason = "флуд"; }
              }
              if (reason) {
                try { await sendTelegram(env, "deleteMessage", { chat_id: chatId, message_id: message.message_id }); } catch {}
                const vk = `viol:${chatId}:${userId}`;
                const cur = (parseInt((await env.DB.get(vk)) || "0", 10) || 0) + 1;
                await env.DB.put(vk, String(cur), { expirationTtl: 600 });
                if (cur >= 3) {
                  await env.DB.delete(vk);
                  const until = Math.floor(Date.now() / 1000) + 10 * 60;
                  try { await sendTelegram(env, "restrictChatMember", { chat_id: chatId, user_id: userId, permissions: { can_send_messages: false }, until_date: until }); } catch {}
                  await say(env, chatId, `🔇 ${esc(displayName(message.from))} — мут 10 мин за повторный <b>${reason}</b> (3/3)`, null);
                } else {
                  await say(env, chatId, `⚠️ ${esc(displayName(message.from))}, у нас без <b>${reason}</b>! (${cur}/3)\n<i>Фильтры настраиваются: <code>!filters</code></i>`, null);
                }
                return new Response("OK");
              }
            }
            }
          }
        } catch (e) { console.log("automod fail:", e.message); }
      }

      // Тикеты: обоим владельцам
      if (lower.startsWith("жалоба") || lower.startsWith("предложение")) {
        const type = lower.startsWith("жалоба") ? "⚠️ ЖАЛОБА" : "💡 ПРЕДЛОЖЕНИЕ";
        const userTag = message.from.username ? `@${message.from.username}` : `ID: ${userId}`;
        for (const ownerId of OWNERS) {
          await sendTelegram(env, "sendMessage", {
            chat_id: ownerId,
            text: `📩 Новый тикет!\nТип: ${type}\nОт: ${userTag} (${message.from.first_name || ""})\nЧат: ${chatId}\nТекст: ${esc(text)}`,
            parse_mode: "HTML",
          });
        }
        await sendTelegram(env, "sendMessage", {
          chat_id: chatId,
          text: "✅ Обращение отправлено владельцам!\n⚠️ Жалобы — только по серьёзным нарушениям.",
          reply_to_message_id: message.message_id,
        });
        return new Response("OK");
      }

      if (lower.startsWith("техподдержка") || lower.startsWith("support")) {
        await sendTelegram(env, "sendMessage", {
          chat_id: getSupportChat(env),
          text: `Вопрос по #Bambi\nОт: ${esc(displayName(message.from))} (ID ${userId})\nВопрос: ${esc(text)}`,
          parse_mode: "HTML",
        });
        await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "✅ Вопрос улетел в поддержку!" });
        return new Response("OK");
      }

      // Аура
      if (message.reply_to_message && (lower === "спасибо" || text === "+" || text === "-")) {
        const target = message.reply_to_message.from.id;
        if (target === userId) {
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "😏 Себе ауру не накрутишь!", reply_to_message_id: message.message_id });
          return new Response("OK");
        }
        const cur = parseInt((await env.DB.get(`aura:${chatId}:${target}`)) || "0", 10) || 0;
        const next = text === "-" ? cur - 1 : cur + 1;
        await env.DB.put(`aura:${chatId}:${target}`, String(next));
        await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `✨ Аура ${esc(displayName(message.reply_to_message.from))}: ${next}`, reply_to_message_id: message.message_id });
        return new Response("OK");
      }

      // Проверка связи: бот, ботяра, боттт, bot, bambi...
      if (isBotCall(text)) {
        await say(env, chatId, randomBotReply(esc(message.from.first_name || "друг")) + footer(), message.message_id);
        return new Response("OK");
      }

      // Команды-список (новое меню с кнопками)
      if (["команды", "!команды", "!бэклог", "бэклог", "!help", "!помощь", "помощь", "!menu", "!меню"].includes(lower) || lower.includes("перечисли")) {
        await showAllCommands(env, chatId, "main");
        return new Response("OK");
      }

      // ТЕГ-ГРУППЫ
      // !add group AF @u1 @u2 | !add группа AF @u1
      if (/^!add\s+group/i.test(lower) || /^!add\s+групп/i.test(lower) || /^!добавить\s+групп/i.test(lower) || /^!создать\s+групп/i.test(lower)) {
        if (chatType === "private") { await say(env, chatId, errCard("Только для чата", "📣 Группы тегов работают только в группах.\nДобавь меня в чат! 🚀"), message.message_id); return new Response("OK"); }
        if (await isFlood(env, chatId, userId)) return new Response("OK");
        const senderRank = await getUserRank(env, userId, chatId);
        const isAdmin = ["creator", "administrator"].includes(await getChatMemberStatus(env, chatId, userId));
        if (senderRank.level < 4 && !isOwner(userId) && !isAdmin) {
          await say(env, chatId, errCard("Нужен ранг повыше",
            `🔒 Создавать тег-группы могут от <b>⚙️ Мидла (4+)</b>\n\n📌 Твой ранг: <b>${esc(senderRank.name)}</b>\n💡 Попроси админа: <code>!setrank 4</code> <i>(ответом)</i>`), message.message_id);
          return new Response("OK");
        }
        // парсим: !add group ИМЯ @юзеры...
        const withoutCmd = text.replace(/^!add\s+groups?\s*|^!add\s+группа?\s*|^!add\s+группы?\s*|^!добавить\s+группу?\s*|^!создать\s+группу?\s*/i, "").trim();
        const parts = withoutCmd.split(/\s+/);
        const rawName = parts.shift() || "";
        const gname = normGroupName(rawName);
        if (!gname) {
          await say(env, chatId, infoCard("Как создать группу?",
            `📣 <b>Формат:</b>\n<code>!add group AF @user1 @user2</code>\n\n📌 <b>Примеры:</b>\n• <code>!add group AF @anna @bob</code>\n• <code>!add group Дизайн @anna, @bob</code>\n• Ответом на сообщение: <code>!add group AF</code> <i>(добавит автора)</i>`,
            "Имя — одно слово, до 32 символов"), message.message_id);
          return new Response("OK");
        }
        let usernames = parseUsernamesFromText(text);
        // если ответом — добавляем автора того сообщения
        let replyMember = null;
        if (message.reply_to_message && message.reply_to_message.from && !message.reply_to_message.from.is_bot) {
          const rf = message.reply_to_message.from;
          replyMember = { id: String(rf.id), username: (rf.username || "").toLowerCase(), first_name: rf.first_name || "" };
          if (rf.username) usernames.push(rf.username.toLowerCase());
        }
        usernames = [...new Set(usernames)];
        if (!usernames.length && !replyMember) {
          await say(env, chatId, errCard("Кого добавить?",
            `📣 Укажи участников через @:\n<code>!add group ${esc(rawName)} @user1 @user2</code>\n\n💡 Или <b>ответь</b> на сообщение человека:\n<code>!add group ${esc(rawName)}</code>`), message.message_id);
          return new Response("OK");
        }
        const existing = (await getTagGroup(env, chatId, gname)) || { members: [], createdBy: userId, createdAt: Date.now() };
        const have = new Set(existing.members.map((m) => (m.username || "").toLowerCase()).filter(Boolean));
        let added = 0;
        for (const u of usernames) {
          if (!have.has(u)) { existing.members.push({ username: u, id: "", first_name: "" }); have.add(u); added++; }
        }
        if (replyMember && !replyMember.username) {
          // без username — храним по id для tg://user?id=
          if (!existing.members.some((m) => String(m.id) === String(replyMember.id))) { existing.members.push(replyMember); added++; }
        }
        existing.updatedAt = Date.now();
        existing.updatedBy = userId;
        await saveTagGroup(env, chatId, gname, existing);
        const listStr = existing.members.slice(0, 20).map((m) => m.username ? `@${esc(m.username)}` : `<a href="tg://user?id=${esc(m.id)}">${esc(m.first_name || "друг")}</a>`).join(" ");
        await say(env, chatId, okCard("Группа сохранена!",
          `📣 Группа <b>${esc(rawName)}</b> ${added ? `• <b>+${added}</b> новых` : "• <i>уже все внутри</i>"}\n👥 Всего: <b>${existing.members.length}</b>\n${DIV2}\n${listStr || "<i>пусто</i>"}\n${DIV2}\n📢 Тегнуть: <code>!teg ${esc(rawName)}</code>`,
          "!teg " + rawName + " — проверить как тегает"), message.message_id);
        return new Response("OK");
      }
      // !del group AF | !delete group AF
      if (/^!del\s+group/i.test(lower) || /^!delete\s+group/i.test(lower) || /^!удалить\s+групп/i.test(lower) || /^!del\s+групп/i.test(lower)) {
        const senderRank = await getUserRank(env, userId, chatId);
        const isAdmin = ["creator", "administrator"].includes(await getChatMemberStatus(env, chatId, userId));
        if (senderRank.level < 4 && !isOwner(userId) && !isAdmin) { await say(env, chatId, errCard("Нет прав", "🔒 Удалять группы могут от ⚙️ Мидла (4+)"), message.message_id); return new Response("OK"); }
        const gname = normGroupName(text.split(/\s+/).slice(2).join(" ") || text.split(/\s+/)[2] || "");
        if (!gname) { await say(env, chatId, infoCard("Как удалить?", `🗑 <code>!del group AF</code>`), message.message_id); return new Response("OK"); }
        const ex = await getTagGroup(env, chatId, gname);
        if (!ex) { await say(env, chatId, errCard("Не найдена", `📭 Группа <b>${esc(gname)}</b> не найдена.\nСписок: <code>!groups</code>`), message.message_id); return new Response("OK"); }
        await deleteTagGroup(env, chatId, gname);
        await say(env, chatId, okCard("Удалено", `🗑 Группа <b>${esc(gname)}</b> удалена.`), message.message_id);
        return new Response("OK");
      }
      // !groups | !taglist | !группы
      if (["!groups", "!group list", "!taglist", "!tags", "!группы", "!теги", "!grouplist"].includes(lower) || lower === "!group" || lower.startsWith("!groups ")) {
        const names = await listTagGroups(env, chatId);
        if (!names.length) {
          await say(env, chatId, infoCard("Групп пока нет",
            `📭 Создай первую:\n<code>!add group AF @user1 @user2</code>\n\n📌 Пример из ТЗ:\n<code>!add group AF @vasya @petya</code>`,
            "!add group + имя + @участники"), message.message_id);
          return new Response("OK");
        }
        let body = "";
        for (const n of names.slice(0, 30)) {
          const g = await getTagGroup(env, chatId, n);
          body += `📣 <b>${esc(n)}</b> — 👥 ${g ? g.members.length : 0} <i>(<code>!teg ${esc(n)}</code>)</i>\n`;
        }
        await say(env, chatId, card("📂", `Группы чата (${names.length})`, body, "!teg all — тегнуть всех • !group info ИМЯ — состав"), message.message_id);
        return new Response("OK");
      }
      // !group info AF
      if (lower.startsWith("!group info") || lower.startsWith("!tag info") || lower.startsWith("!teg info")) {
        const gname = normGroupName(text.split(/\s+/).slice(2).join(" "));
        const g = gname ? await getTagGroup(env, chatId, gname) : null;
        if (!g) { await say(env, chatId, errCard("Не найдена", `Использование: <code>!group info AF</code>\nСписок: <code>!groups</code>`), message.message_id); return new Response("OK"); }
        const listStr = g.members.map((m) => m.username ? `@${esc(m.username)}` : `<a href="tg://user?id=${esc(m.id)}">${esc(m.first_name || m.id || "?")}</a>`).join(" ");
        await say(env, chatId, card("📣", `Группа ${gname} (${g.members.length})`, `${listStr || "<i>пусто</i>"}\n${DIV2}\n📢 Тегнуть: <code>!teg ${esc(gname)}</code>`), message.message_id);
        return new Response("OK");
      }
      // !teg AF | !tag AF | !тег AF | !teg all | !all
      if (/^!(teg|tag)(\s|$)/i.test(lower) || /^!тег(\s|$)/i.test(lower) || lower === "!all" || lower === "!все" || lower === "!алл" || lower.startsWith("!all ") || lower.startsWith("!тег ")) {
        if (chatType === "private") { await say(env, chatId, errCard("Только для чата", "📣 Теги работают только в группах."), message.message_id); return new Response("OK"); }
        // извлекаем имя после команды
        let arg = text.replace(/^!(teg|tag)(\s|$)\s*/i, "").replace(/^!тег(\s|$)\s*/i, "").replace(/^!all(\s|$)\s*/i, "").replace(/^!все(\s|$)\s*/i, "").trim();
        if (!arg && (lower === "!all" || lower === "!все")) arg = "all";
        arg = normGroupName(arg.split(/\s+/)[0] || "");
        // ALL
        if (!arg || arg === "all" || arg === "все" || arg === "everyone" || arg === "всем" || arg === "всі") {
          const users = await getAllChatUsers(env, chatId, 80);
          // + добираем из всех групп (юзернеймы которых нет в userinfo)
          const gnames = await listTagGroups(env, chatId);
          const seen = new Set(users.map((u) => (u.username || "").toLowerCase()).filter(Boolean));
          for (const gn of gnames.slice(0, 20)) {
            const g = await getTagGroup(env, chatId, gn);
            if (!g) continue;
            for (const m of g.members) {
              const un = (m.username || "").toLowerCase();
              if (un && !seen.has(un)) { seen.add(un); users.push({ id: m.id || "", username: m.username, first_name: m.first_name || "" }); }
            }
          }
          if (!users.length) { await say(env, chatId, infoCard("Некого тегать", "😴 Я пока никого не запомнил.\nПусть участники что-нибудь напишут — и попробуй снова!"), message.message_id); return new Response("OK"); }
          const chunks = buildTagChunks(users.slice(0, 100), 25);
          const reason = text.replace(/^!(teg|tag|all)(\s|$)\s*/i, "").replace(/^!тег(\s|$)\s*/i, "").replace(/^(all|все|всем)(\s|$)\s*/i, "").trim();
          const headText = `📢 <b>ВНИМАНИЕ ВСЕМ!</b> ${esc(displayName(message.from))} зовёт!\n${reason ? `💬 <i>${esc(reason.slice(0, 200))}</i>\n` : ""}${DIV}\n`;
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: headText + chunks[0], parse_mode: "HTML", reply_to_message_id: message.message_id });
          for (let i = 1; i < chunks.length; i++) await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `👥 <i>продолжение ${i + 1}/${chunks.length}:</i>\n${chunks[i]}`, parse_mode: "HTML" });
          return new Response("OK");
        }
        // Фича 4: тег по рангу (!teg admins / mods / seniors / leads)
        const rq = rankTagQuery(arg);
        if (rq) {
          // собираем из KV-рангов + реальных админов TG
          const [byRank, tgAdmins] = await Promise.all([
            getUsersByMinRank(env, chatId, rq.minLevel, 30),
            rq.needTgAdmins ? getTelegramAdmins(env, chatId) : Promise.resolve([]),
          ]);
          const merged = new Map();
          for (const u of byRank) merged.set(String(u.id), u);
          for (const a of tgAdmins) if (!merged.has(String(a.id))) merged.set(String(a.id), { id: a.id, username: a.username, first_name: a.first_name, lvl: 8 });
          const members = [...merged.values()];
          if (!members.length) {
            await say(env, chatId, infoCard("Никого нет",
              `😴 В категории <b>${esc(rq.label)}</b> пока пусто.\nРанги выдаются: <code>!setrank 4</code> <i>(ответом, Тимлид 8+)</i>`), message.message_id);
            return new Response("OK");
          }
          const reason4 = text.replace(/^!(teg|tag)(\s|$)\s*\S+\s*/i, "").replace(/^!тег(\s|$)\s*\S+\s*/i, "").trim();
          const chunks4 = buildTagChunks(members, 20);
          const head4 = `📣 <b>${esc(rq.label.toUpperCase())}</b> — вас зовёт ${esc(displayName(message.from))}!\n${reason4 ? `💬 <i>${esc(reason4.slice(0, 200))}</i>\n` : ""}${DIV}\n`;
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: head4 + chunks4[0], parse_mode: "HTML", reply_to_message_id: message.message_id });
          for (let i = 1; i < chunks4.length; i++) await sendTelegram(env, "sendMessage", { chat_id: chatId, text: chunks4[i], parse_mode: "HTML" });
          return new Response("OK");
        }
        // конкретная группа
        const g = await getTagGroup(env, chatId, arg);
        if (!g || !g.members.length) {
          await say(env, chatId, errCard("Группа не найдена",
            `📭 <b>${esc(arg)}</b> — пусто или нет такой.\n\n📌 Создай: <code>!add group ${esc(arg)} @user1 @user2</code>\n📂 Список: <code>!groups</code>\n📢 Всех: <code>!teg all</code>`), message.message_id);
          return new Response("OK");
        }
        const reason = text.replace(/^!(teg|tag)(\s|$)\s*\S+\s*/i, "").replace(/^!тег(\s|$)\s*\S+\s*/i, "").trim();
        const tags = g.members.map((m) => m.username ? `@${m.username}` : (m.id ? `<a href="tg://user?id=${m.id}">${esc(m.first_name || "друг")}</a>` : null)).filter(Boolean);
        const chunks = buildTagChunks(g.members, 25);
        const head = `📣 <b>${esc(arg)}</b> — вас зовёт ${esc(displayName(message.from))}!\n${reason ? `💬 <i>${esc(reason.slice(0, 200))}</i>\n` : ""}${DIV}\n`;
        // короткие теги шлём одним сообщением красиво
        if (tags.join(" ").length < 3000 && tags.length <= 25) {
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: head + tags.join(" "), parse_mode: "HTML", reply_to_message_id: message.message_id });
        } else {
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: head + chunks[0], parse_mode: "HTML", reply_to_message_id: message.message_id });
          for (let i = 1; i < chunks.length; i++) await sendTelegram(env, "sendMessage", { chat_id: chatId, text: chunks[i], parse_mode: "HTML" });
        }
        return new Response("OK");
      }

      // Фича 6: фильтры on/off + !filters
      if (lower.startsWith("!antimat") || lower.startsWith("!антимат") || lower.startsWith("!antilink") || lower.startsWith("!антиссыл") || lower.startsWith("!antisyl") || lower.startsWith("!antiflood") || lower.startsWith("!антифлуд") || lower === "!filters" || lower === "!фильтры") {
        const senderRank = await getUserRank(env, userId, chatId);
        const isAdmin = ["creator", "administrator"].includes(await getChatMemberStatus(env, chatId, userId));
        const st0 = await getChatSettings(env, chatId);
        if (lower === "!filters" || lower === "!фильтры") {
          await say(env, chatId, card("🛡️", "Фильтры чата",
            `🤬 Антимат: <b>${st0.antimat ? "ВКЛ ✅" : "ВЫКЛ ❌"}</b> <i>(<code>!antimat on/off</code>)</i>\n` +
            `🔗 Антиссылки: <b>${st0.antilink ? "ВКЛ ✅" : "ВЫКЛ ❌"}</b> <i>(<code>!antilink on/off</code>)</i>\n` +
            `🌊 Антифлуд: <b>${st0.antiflood ? "ВКЛ ✅" : "ВЫКЛ ❌"}</b> <i>(<code>!antiflood on/off</code>)</i>\n` +
            `${DIV2}\n🤖 ИИ-ответы: <b>${st0.ai_reply ? "ВКЛ ✅" : "ВЫКЛ ❌"}</b> <i>(<code>!ai on/off</code>)</i>\n` +
            `⚠️ <i>3 нарушения за 10 мин = мут 10 мин. Ранги 4+ и админы не трогаются.</i>`), message.message_id);
          return new Response("OK");
        }
        if (senderRank.level < 6 && !isOwner(userId) && !isAdmin) { await say(env, chatId, errCard("Нет прав", "🔒 Фильтры — от 🔥 Сеньора (6+) или админа."), message.message_id); return new Response("OK"); }
        const on = /(^|\s)(on|вкл|да|yes|true)(\s|$)/i.test(text);
        const off = /(^|\s)(off|выкл|нет|no|false)(\s|$)/i.test(text);
        if (!on && !off) { await say(env, chatId, infoCard("Как?", `Пример: <code>!antimat on</code> / <code>!antilink off</code>`), message.message_id); return new Response("OK"); }
        const val = on && !off;
        if (lower.includes("mat") || lower.includes("мат")) { await setChatSettings(env, chatId, { antimat: val }); await say(env, chatId, okCard("Готово!", `🤬 Антимат: <b>${val ? "ВКЛ ✅" : "ВЫКЛ ❌"}</b>`), message.message_id); }
        else if (lower.includes("link") || lower.includes("ссыл") || lower.includes("syl")) { await setChatSettings(env, chatId, { antilink: val }); await say(env, chatId, okCard("Готово!", `🔗 Антиссылки: <b>${val ? "ВКЛ ✅" : "ВЫКЛ ❌"}</b>`), message.message_id); }
        else { await setChatSettings(env, chatId, { antiflood: val }); await say(env, chatId, okCard("Готово!", `🌊 Антифлуд (>5 сооб. за 10с): <b>${val ? "ВКЛ ✅" : "ВЫКЛ ❌"}</b>`), message.message_id); }
        return new Response("OK");
      }

      // НАСТРОЙКИ КАНАЛА/ГРУППЫ
      if (lower.startsWith("!autolike") || lower.startsWith("!autocomment") || lower.startsWith("!автолайк") || lower.startsWith("!автокоммент")) {
        const senderRank = await getUserRank(env, userId, chatId);
        const isAdmin = ["creator", "administrator"].includes(await getChatMemberStatus(env, chatId, userId));
        if (senderRank.level < 6 && !isOwner(userId) && !isAdmin) { await say(env, chatId, errCard("Нет прав", "🔒 Настройки канала — от 🔥 Сеньора (6+) или админа."), message.message_id); return new Response("OK"); }
        const on = /on|вкл|да|yes|true|1/i.test(text);
        const off = /off|выкл|нет|no|false|0/i.test(text);
        if (!on && !off) { await say(env, chatId, infoCard("Настройки канала", `❤️ <code>!autolike on/off</code> — реакции\n💬 <code>!autocomment on/off</code> — комменты`), message.message_id); return new Response("OK"); }
        const val = on && !off;
        if (lower.includes("like") || lower.includes("лайк")) await setChatSettings(env, chatId, { autolike: val });
        else await setChatSettings(env, chatId, { autocomment: val });
        await say(env, chatId, okCard("Готово!", `${lower.includes("like") || lower.includes("лайк") ? "❤️ Автолайки" : "💬 Автокомменты"}: <b>${val ? "ВКЛ ✅" : "ВЫКЛ ❌"}</b>`), message.message_id);
        return new Response("OK");
      }

      // RP-ДЕЙСТВИЯ (ответом)
      {
        // поддерживаем: !обнять, обнять, !hug, !дать пять (многословные)
        const noBang = lower.replace(/^!/, "").trim();
        const rp = RP_ACTIONS.find((a) => a.keys.some((k) => noBang === k || noBang.startsWith(k + " ")));
        if (rp) {
          if (!message.reply_to_message) { await say(env, chatId, infoCard(`${rp.emoji} Как использовать?`, `Ответь на сообщение человека и напиши <code>!${esc(rp.keys[0])}</code>\n\n📌 Пример: тык на сообщение → <code>!${esc(rp.keys[0])}</code>`), message.message_id); return new Response("OK"); }
          const target = message.reply_to_message.from;
          if (target && target.id === userId) { await say(env, chatId, errCard("Хм...", "😅 Самого себя? Найди друга — так веселее! 💜"), message.message_id); return new Response("OK"); }
          if (target && target.is_bot) { await say(env, chatId, errCard("Я смущён...", "🤖 Меня-то за что? Выбери живого человека! 😅"), message.message_id); return new Response("OK"); }
          const actor = esc(displayName(message.from));
          const victim = esc(displayName(target));
          const flavor = rp.templates[Math.floor(Math.random() * rp.templates.length)];
          const faces = ["💜", "✨", "🥰", "😄", "🔥"];
          const face = faces[Math.floor(Math.random() * faces.length)];
          await say(env, chatId, `${rp.emoji} <b>${actor}</b> ${esc(rp.verb)} <b>${victim}</b>!\n<i>${esc(flavor)}</i> ${face}`, message.reply_to_message.message_id);
          return new Response("OK");
        }
      }

      // Бесплатный ИИ 24/7 (!ai / !gpt / ответ реплаем на бота)
      if (/^!(ai|gpt|гпт|ии|спроси|ask)\b/i.test(lower) || /^!(ai|gpt)(\s|$)/i.test(lower)) {
        const st = await getChatSettings(env, chatId);
        if (!st.ai_reply && chatType !== "private") { await say(env, chatId, errCard("ИИ выключен", "Админ выключил ИИ. Включить: <code>!ai on</code> (Сеньор 6+)"), message.message_id); return new Response("OK"); }
        let q = text.replace(/^!(ai|gpt|гпт|ии|спроси|ask)\b\s*/i, "").trim();
        if (!q && message.reply_to_message && message.reply_to_message.text) q = message.reply_to_message.text;
        if (!q) { await say(env, chatId, infoCard("Спроси меня!", `🤖 <b>Бесплатно, 24/7, без ключа:</b> Workers AI → Pollinations\n\n📌 <code>!ai сколько времени варить пельмени?</code>\n📌 Ответом на сообщение: <code>!ai</code>\n📌 В ЛС — просто напиши вопрос`), message.message_id); return new Response("OK"); }
        if (await aiRateLimited(env, chatId, userId)) { await say(env, chatId, errCard("Притормози", "⏳ ИИ отвечает раз в 10 сек. Подожди чуть-чуть!"), message.message_id); return new Response("OK"); }
        await sendTelegram(env, "sendChatAction", { chat_id: chatId, action: "typing" });
        const ans = await askFreeAI(env, q);
        if (!ans) { await say(env, chatId, errCard("ИИ устал", "😢 Не получилось ответить. Попробуй через минуту.\n<i>Админу: проверь бинд <code>AI</code> в wrangler.jsonc</i>"), message.message_id); }
        else await say(env, chatId, `🤖 <b>Bambi AI:</b>\n${DIV}\n${esc(ans)}\n${DIV2}\n💡 <i>бесплатно • Workers AI / Pollinations • !ai дальше</i>`, message.message_id);
        return new Response("OK");
      }
      if (/^!ai\s+(on|off|вкл|выкл)\s*$/i.test(lower)) {
        const senderRank = await getUserRank(env, userId, chatId);
        const isAdmin = ["creator", "administrator"].includes(await getChatMemberStatus(env, chatId, userId));
        if (senderRank.level < 6 && !isOwner(userId) && !isAdmin) { await say(env, chatId, errCard("Нет прав", "🔒 ИИ-переключатель — от Сеньора 6+."), message.message_id); return new Response("OK"); }
        const val = /on|вкл/i.test(lower);
        await setChatSettings(env, chatId, { ai_reply: val });
        await say(env, chatId, okCard("Готово!", `🤖 ИИ-ответы: <b>${val ? "ВКЛ ✅" : "ВЫКЛ ❌"}</b>`), message.message_id);
        return new Response("OK");
      }
      // авто-ответ: реплай на сообщение бота = вопрос к ИИ (если включено, не команды)
      if (message.reply_to_message && message.reply_to_message.from && message.reply_to_message.from.is_bot && text.length > 3 && !text.startsWith("!") && !text.startsWith("/") && chatType !== "private") {
        try {
          const botName = (message.reply_to_message.from.username || "").toLowerCase();
          const isOurBot = !botName || botName.includes("bambi") || botName.includes("quorvox");
          const mentioned = /bambi|бамби|бэми|бот/i.test(text);
          if (isOurBot && (mentioned || text.endsWith("?"))) {
            const st = await getChatSettings(env, chatId);
            if (st.ai_reply && !(await aiRateLimited(env, chatId, userId))) {
              await sendTelegram(env, "sendChatAction", { chat_id: chatId, action: "typing" });
              const ans = await askFreeAI(env, text);
              if (ans) { await say(env, chatId, `🤖 ${esc(ans)}`, message.message_id); return new Response("OK"); }
            }
          }
        } catch {}
      }

      // PART2 команды: ДР, опрос, напомни, предсказание, шоп, перевод, QR, URL, расписание, YT, аноним-чат
      // Групповые команды в ЛС запрещены (кроме белого списка)
      const GROUP_ONLY = ["!add group", "!del group", "!teg", "!tag", "!тег", "!all", "!mut", "!ban", "!kick", "!warn", "!unmut", "!unban", "!setrank", "повысить", "!groups", "!group info"];
      if (chatType === "private" && GROUP_ONLY.some((c) => lower.startsWith(c))) {
        await say(env, chatId, errCard("Это для групп", "🙅 Эта команда работает только в группах.\n💡 В ЛС доступны: <code>/text</code>, <code>!ai</code>, <code>!qr</code>, <code>!tr</code>, <code>!predict</code>, <code>!напомни</code>, <code>!др</code>, <code>!chat</code>"), message.message_id);
        return new Response("OK");
      }
      // FAQ-автоответы (группы, можно выключить !faq off — через настройки)
      if (chatType !== "private") {
        try {
          const stF = await getChatSettings(env, chatId);
          if (stF.faq !== false) {
            const fr = faqMatch(lower);
            if (fr) { await say(env, chatId, fr, message.message_id); return new Response("OK"); }
          }
        } catch {}
      } else {
        const frP = faqMatch(lower);
        if (frP) { await say(env, chatId, frP, message.message_id); return new Response("OK"); }
      }
      // ДР
      if (/^!др(\s|$)/i.test(lower) || lower.startsWith("!день рожд") || lower === "!др") {
        const arg = text.replace(/^!др\s*/i, "").replace(/^!день рождения\s*/i, "").trim();
        if (!arg) {
          // Список: кто + когда + через сколько дней (сортировка по ближайшему ДР)
          let list = [];
          try {
            const pg = await env.DB.list({ prefix: `birth:${chatId}:`, limit: 100 });
            for (const k of pg.keys) {
              const v = await env.DB.get(k.name);
              if (v) { const b = JSON.parse(v); list.push({ uid: k.name.split(":").pop(), ...b }); }
            }
          } catch {}
          if (!list.length) {
            await say(env, chatId, card("🎂", "Дни рождения", "<i>пока пусто. Добавь: <code>!др 12.05</code> или с годом <code>!др 12.05.2005</code></i>", "!др 12.05 — добавить свой"), message.message_id);
            return new Response("OK");
          }
          const curY = new Date().getFullYear();
          for (const b of list) {
            b.left = daysUntilBirth(b.d, b.m);
            b.age = (b.y && b.y > 1900) ? (curY - b.y + (b.left === 0 ? 0 : 0)) : 0; // сколько исполнится в ближ. ДР
            if (b.left === 0 && b.age) b.age = curY - b.y;
            else if (b.age) {
              const nextY = new Date().getMonth() + 1 > b.m || (new Date().getMonth() + 1 === b.m && new Date().getDate() > b.d) ? curY + 1 : curY;
              b.age = nextY - b.y;
            }
          }
          list.sort((a, b) => a.left - b.left);
          const soon = list.filter((b) => b.left <= 7);
          let t = list.slice(0, 30).map((b) => {
            const when = b.left === 0 ? "🎉 <b>СЕГОДНЯ!</b>" : b.left === 1 ? "⏳ <b>завтра!</b>" : `⏳ через <b>${b.left}</b> дн.`;
            const age = b.age ? ` (исполнится <b>${b.age}</b>)` : "";
            return `🎂 ${esc(b.name || b.uid)} — <b>${b.d}.${b.m}${b.y ? "." + b.y : ""}</b> — ${when}${age}`;
          }).join("\n");
          if (soon.length) t = `🔥 <b>Ближайшие 7 дней:</b> ${soon.map((b) => esc(b.name || b.uid)).join(", ")}\n${DIV2}\n` + t;
          await say(env, chatId, card("🎂", `Дни рождения (${list.length})`, t, "!др 12.05.2005 — добавить свой с годом"), message.message_id);
          return new Response("OK");
        }
        // Удалить свой ДР: !др del
        if (/^(del|delete|удалить|убрать)\s*$/i.test(arg)) {
          await env.DB.delete(`birth:${chatId}:${userId}`);
          await say(env, chatId, okCard("Убрал", "Твой день рождения удалён из списка чата."), message.message_id);
          return new Response("OK");
        }
        const b = parseBirth(arg);
        if (!b) { await say(env, chatId, errCard("Формат", "Напиши так: <code>!др 12.05</code> или с годом <code>!др 12.05.2005</code>\nУдалить: <code>!др del</code>"), message.message_id); return new Response("OK"); }
        await env.DB.put(`birth:${chatId}:${userId}`, JSON.stringify({ d: b.d, m: b.m, y: b.y || 0, name: displayName(message.from) }));
        await env.DB.put(`active_chat:${chatId}`, String(Date.now()), { expirationTtl: 30 * 86400 });
        const leftB = daysUntilBirth(b.d, b.m);
        const whenB = leftB === 0 ? "🎉 Кстати, у тебя СЕГОДНЯ?! С праздником!!" : leftB === 1 ? "⏳ Уже завтра! 🎉" : `⏳ До праздника: <b>${leftB}</b> дн.`;
        await say(env, chatId, okCard("Запомнил! 🎂", `${esc(displayName(message.from))} — <b>${b.d}.${b.m}${b.y ? "." + b.y : ""}</b>\n${whenB}\nПоздравлю в 09:00! 🎉`), message.message_id);
        return new Response("OK");
      }
      // Опрос да/нет
      if (/^!опрос(\s|$)/i.test(lower) || /^!poll(\s|$)/i.test(lower) || lower === "!вопрос") {
        const q = text.replace(/^!(опрос|poll|вопрос)\s*/i, "").trim().slice(0, 200) || "Да или нет?";
        const pid = `p${Date.now().toString(36)}${Math.floor(Math.random() * 99)}`;
        await env.DB.put(`poll:${chatId}:${pid}`, JSON.stringify({ q, yes: 0, no: 0, voters: {} }), { expirationTtl: 86400 });
        await sendTelegram(env, "sendMessage", {
          chat_id: chatId, parse_mode: "HTML",
          text: `📊 <b>Опрос:</b> ${esc(q)}\n${DIV}\n✅ Да: 0 | ❌ Нет: 0`,
          reply_markup: { inline_keyboard: [[{ text: "✅ Да", callback_data: `vote:${pid}:yes` }, { text: "❌ Нет", callback_data: `vote:${pid}:no` }]] },
        });
        return new Response("OK");
      }
      // Напомни: !напомни 10м текст (тегает автора в том же чате)
      if (/^!напомни(\s|$)/i.test(lower) || /^!remind(\s|$)/i.test(lower)) {
        const rest = text.replace(/^!(напомни|remind)\s*/i, "").trim();
        const dm = rest.match(/^(\S+)\s+([\s\S]+)/);
        if (!dm) { await say(env, chatId, infoCard("Напоминалка", "Формат: <code>!напомни 10м позвонить маме</code>\nЕдиницы: с/сек, м/мин, ч/час, д/день\n⏰ Сработает в этом чате и теганёт тебя."), message.message_id); return new Response("OK"); }
        const ms = parseDuration(dm[1]);
        if (!ms || ms < 30000 || ms > 7 * 864e5) { await say(env, chatId, errCard("Время", "От 30 сек до 7 дней. Пример: <code>!напомни 10м текст</code>"), message.message_id); return new Response("OK"); }
        const rid = `r${Date.now().toString(36)}`;
        await env.DB.put(`remind:${rid}`, JSON.stringify({ chatId, userId, name: displayName(message.from), text: dm[2].slice(0, 300), due: Date.now() + ms }), { expirationTtl: 8 * 86400 });
        await say(env, chatId, okCard("Запомнил ⏰", `Напомню через <b>${esc(dm[1])}</b>:\n<i>${esc(dm[2].slice(0, 200))}</i>\n(тегну тебя здесь)`), message.message_id);
        return new Response("OK");
      }
      // Предсказания
      if (/^!predict(\s|$)/i.test(lower) || /^!предсказани/i.test(lower) || lower === "!шар-предсказание") {
        const p = PREDICTS[Math.floor(Math.random() * PREDICTS.length)];
        await say(env, chatId, `🔮 ${esc(displayName(message.from))}, ${p}`, message.message_id);
        return new Response("OK");
      }
      // Шоп с пользой (реально влияет на бота)
      if (/^!shop(\s|$)/i.test(lower) || /^!магазин(\s|$)/i.test(lower)) {
        const arg = text.replace(/^!(shop|магазин)\s*/i, "").trim().toLowerCase();
        const bal = await getBalance(env, chatId, userId);
        const inv = JSON.parse((await env.DB.get(`shop:${chatId}:${userId}`)) || "{}");
        if (!arg || arg === "list") {
          await say(env, chatId, card("🛒", `Магазин (баланс: ${bal} 🪙)`,
            `1️⃣ <code>!shop shield</code> — 🛡️ щит от ограбления 24ч — <b>500</b>\n` +
            `2️⃣ <code>!shop bonus</code> — 🎁 +300 монет сразу (раз в день) — <b>100</b>\n` +
            `3️⃣ <code>!shop title Текст</code> — ✏️ титул в <code>!профиль</code> — <b>800</b>\n` +
            `4️⃣ <code>!shop antiflood</code> — 😇 иммунитет к антифлуду 24ч — <b>700</b>\n` +
            `${DIV2}\nТвоё: ${inv.shieldUntil > Date.now() ? "🛡️щит✅ " : ""}${inv.noFloodUntil > Date.now() ? "😇антифлуд✅ " : ""}${inv.title ? `✏️«${esc(inv.title)}»` : "<i>титула нет</i>"}`), message.message_id);
          return new Response("OK");
        }
        if (arg === "shield") {
          if (bal < 500) { await say(env, chatId, errCard("Не хватает", `Нужно 500, у тебя ${bal}. Заработай: <code>!работать</code>`), message.message_id); return new Response("OK"); }
          await addBalance(env, chatId, userId, -500);
          inv.shieldUntil = Date.now() + 864e5;
          await env.DB.put(`shop:${chatId}:${userId}`, JSON.stringify(inv));
          await say(env, chatId, okCard("Куплено 🛡️", "Щит от <code>!ограбить</code> на 24ч!"), message.message_id);
          return new Response("OK");
        }
        if (arg === "bonus") {
          if (bal < 100) { await say(env, chatId, errCard("Не хватает", `Нужно 100, у тебя ${bal}`), message.message_id); return new Response("OK"); }
          const lk = `shopbonus:${chatId}:${userId}:${todayStr()}`;
          if (await env.DB.get(lk)) { await say(env, chatId, errCard("Уже брал", "Бонус шопа — раз в день 😴"), message.message_id); return new Response("OK"); }
          await addBalance(env, chatId, userId, -100);
          const nb = await addBalance(env, chatId, userId, 300);
          await env.DB.put(lk, "1", { expirationTtl: 86400 });
          await say(env, chatId, okCard("Обмен! 🎁", `-100 → +300. Баланс: <b>${nb}</b>`), message.message_id);
          return new Response("OK");
        }
        if (arg.startsWith("title")) {
          const title = text.replace(/^!(shop|магазин)\s+title\s*/i, "").trim().slice(0, 24);
          if (!title) { await say(env, chatId, infoCard("Титул", "Пример: <code>!shop title Король чата</code> — 800 монет"), message.message_id); return new Response("OK"); }
          if (bal < 800) { await say(env, chatId, errCard("Не хватает", `Нужно 800, у тебя ${bal}`), message.message_id); return new Response("OK"); }
          await addBalance(env, chatId, userId, -800);
          inv.title = title;
          await env.DB.put(`shop:${chatId}:${userId}`, JSON.stringify(inv));
          await say(env, chatId, okCard("Красиво! ✏️", `Титул <b>${esc(title)}</b> теперь в <code>!профиль</code>`), message.message_id);
          return new Response("OK");
        }
        if (arg === "antiflood") {
          if (bal < 700) { await say(env, chatId, errCard("Не хватает", `Нужно 700, у тебя ${bal}`), message.message_id); return new Response("OK"); }
          await addBalance(env, chatId, userId, -700);
          inv.noFloodUntil = Date.now() + 864e5;
          await env.DB.put(`shop:${chatId}:${userId}`, JSON.stringify(inv));
          await say(env, chatId, okCard("Куплено 😇", "Иммунитет к антифлуду на 24ч!"), message.message_id);
          return new Response("OK");
        }
        await say(env, chatId, infoCard("Магазин", "Напиши <code>!shop</code> — покажу товары."), message.message_id);
        return new Response("OK");
      }
      // Переводчик (free, без ключа)
      if (/^!tr(\s|$)/i.test(lower) || /^!перевод/i.test(lower) || /^!translate(\s|$)/i.test(lower)) {
        let rest = text.replace(/^!(tr|перевод|translate)\s*/i, "").trim();
        let target = "ru";
        const m = rest.match(/^([a-z]{2})\s+([\s\S]+)/i);
        if (m && /^[a-z]{2}$/i.test(m[1])) { target = m[1].toLowerCase(); rest = m[2]; }
        if (!rest && message.reply_to_message && message.reply_to_message.text) rest = message.reply_to_message.text;
        if (!rest) { await say(env, chatId, infoCard("Перевод", "Формат: <code>!tr en Привет как дела</code>\nИли ответом на сообщение: <code>!tr en</code>\nЯзыки: ru en uk kk es de fr"), message.message_id); return new Response("OK"); }
        await typing(env, chatId);
        const t = await freeTranslate(rest, target);
        if (!t) { await say(env, chatId, errCard("Не перевёлся", "Попробуй короче (до 800 символов) и позже."), message.message_id); return new Response("OK"); }
        await say(env, chatId, `🌍 <b>${esc(target.toUpperCase())}:</b>\n${esc(t)}`, message.message_id);
        return new Response("OK");
      }
      // QR (free, без ключа; два сервиса с фолбэком)
      if (/^!qr(\s|$)/i.test(lower) || /^!кьюар/i.test(lower)) {
        const rest = text.replace(/^!(qr|кьюар)\s*/i, "").trim().slice(0, 500) || (message.reply_to_message && message.reply_to_message.text) || "";
        if (!rest) { await say(env, chatId, infoCard("QR", "Формат: <code>!qr https://example.com</code>\nИли ответом на сообщение: <code>!qr</code>"), message.message_id); return new Response("OK"); }
        const qrA = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(rest)}`;
        const qrB = `https://quickchart.io/qr?text=${encodeURIComponent(rest)}&size=400`;
        const cap = `🔳 QR: ${rest.slice(0, 200)}`;
        const ph1 = await sendTelegram(env, "sendPhoto", { chat_id: chatId, photo: qrA, caption: cap, reply_to_message_id: message.message_id });
        if (!ph1 || ph1.ok === false) {
          console.log("qr qrserver fail, trying quickchart");
          const ph2 = await sendTelegram(env, "sendPhoto", { chat_id: chatId, photo: qrB, caption: cap, reply_to_message_id: message.message_id });
          if (!ph2 || ph2.ok === false) {
            await say(env, chatId, errCard("QR не сгенерился", "😢 Оба QR-сервиса недоступны. Попробуй позже или текст покороче."), message.message_id);
          }
        }
        return new Response("OK");
      }
      // URL-чек
      if (/^!url(\s|$)/i.test(lower) || /^!проверь/i.test(lower)) {
        const rest = text.replace(/^!(url|проверь)\s*/i, "").trim().split(/\s+/)[0] || "";
        const urlm = rest.match(/https?:\/\/\S+|www\.\S+|t\.me\/\S+/i);
        if (!urlm) { await say(env, chatId, infoCard("Проверка ссылок", "Формат: <code>!url https://site.com</code>\nБез ключа VT — эвристика + кнопка проверки."), message.message_id); return new Response("OK"); }
        let url = urlm[0];
        if (!/^https?:\/\//i.test(url)) url = "https://" + url;
        const chk = await checkUrlSafe(env, url);
        let verdict = "❓ <b>Неизвестно</b> — будь осторожен.";
        if (chk.verdict === "malicious") verdict = "🚨 <b>ОПАСНО!</b> VirusTotal нашёл детекты. Не открывай!";
        else if (chk.verdict === "clean") verdict = "✅ <b>Чисто</b> по VirusTotal.";
        else if (chk.verdict === "suspicious") verdict = `⚠️ <b>Подозрительно:</b> ${esc(chk.heur.join(", "))}`;
        else if (chk.verdict === "queued") verdict = "⏳ Отправил на анализ в VirusTotal, проверь через пару минут.";
        await sendTelegram(env, "sendMessage", {
          chat_id: chatId, parse_mode: "HTML", reply_to_message_id: message.message_id,
          text: `🔗 <b>Проверка URL</b>\n${esc(url)}\n${DIV}\n${verdict}${chk.needKey ? `\n${DIV2}\n💡 <i>Для точной проверки админу: добавить VT_API_KEY (virustotal.com → API key → wrangler secret put VT_API_KEY)</i>` : ""}`,
          reply_markup: { inline_keyboard: [[{ text: "🔍 Открыть в VirusTotal", url: `https://www.virustotal.com/gui/url/${encodeURIComponent(url)}` }]] },
        });
        return new Response("OK");
      }
      // Расписание пар: !sched add Пн 09:00 Математика | !sched list | !sched del 1
      if (/^!sched/i.test(lower) || /^!расписани/i.test(lower)) {
        const sub = text.replace(/^!(sched|расписание)\s*/i, "").trim();
        const key = `sched:${chatId}:${userId}`;
        let arr = [];
        try { arr = JSON.parse((await env.DB.get(key)) || "[]"); } catch {}
        if (/^list/i.test(sub) || !sub) {
          const t = arr.length ? arr.map((s, i) => `${i + 1}. <b>${esc(s.day)}</b> ${esc(s.time)} — ${esc(s.text)}`).join("\n") : "<i>пусто. Добавь: <code>!sched add Пн 09:00 Математика</code></i>";
          await say(env, chatId, card("📅", "Моё расписание", t, "Напомню за 30 мин (cron каждые 10 мин)"), message.message_id);
          return new Response("OK");
        }
        if (/^del/i.test(sub)) {
          const n = parseInt(sub.replace(/^del\s*/i, ""), 10);
          if (!n || !arr[n - 1]) { await say(env, chatId, errCard("Нет такого", "Пример: <code>!sched del 1</code>"), message.message_id); return new Response("OK"); }
          arr.splice(n - 1, 1);
          await env.DB.put(key, JSON.stringify(arr));
          await say(env, chatId, okCard("Удалил", "Готово!"), message.message_id);
          return new Response("OK");
        }
        if (/^add/i.test(sub)) {
          const m = sub.replace(/^add\s*/i, "").match(/(\S+)\s+(\d{1,2}:\d{2})\s+([\s\S]+)/);
          if (!m) { await say(env, chatId, infoCard("Формат", "<code>!sched add Пн 09:00 Математика</code>\nДни: Пн Вт Ср Чт Пт Сб Вс"), message.message_id); return new Response("OK"); }
          if (arr.length >= 30) { await say(env, chatId, errCard("Много", "Лимит 30 пар. Удали старые: <code>!sched del 1</code>"), message.message_id); return new Response("OK"); }
          arr.push({ day: m[1].slice(0, 6), time: m[2], text: m[3].slice(0, 100) });
          await env.DB.put(key, JSON.stringify(arr));
          await env.DB.put(`scheduser:${chatId}:${userId}`, "1", { expirationTtl: 30 * 86400 });
          await say(env, chatId, okCard("Добавил 📅", `<b>${esc(m[1])}</b> ${esc(m[2])} — ${esc(m[3])}`), message.message_id);
          return new Response("OK");
        }
        await say(env, chatId, infoCard("Расписание", "<code>!sched add Пн 09:00 Математика</code>\n<code>!sched list</code> / <code>!sched del 1</code>"), message.message_id);
        return new Response("OK");
      }
      // YouTube: подписка на канал (free через RSS, без API-ключа)
      if (/^!yt/i.test(lower) || /^!youtube/i.test(lower) || /^!ютуб/i.test(lower)) {
        const arg = text.replace(/^!(yt|youtube|ютуб)\s*/i, "").trim();
        if (/^add/i.test(arg)) {
          const id = arg.replace(/^add\s*/i, "").trim().match(/([A-Za-z0-9_-]{10,40})/);
          // принимаем channel_id (UC...) или просто слово для поиска не делаем — нужен ID
          const cid = id ? id[1] : "";
          if (!cid.startsWith("UC")) { await say(env, chatId, infoCard("YouTube", "Нужен <b>channel_id</b> вида <code>UCxxxx</code>.\nГде взять: открой канал → Поделиться → ID в URL.\nПример: <code>!yt add UCxxxx</code>\nПроверка новых видео — каждый час по RSS, бесплатно."), message.message_id); return new Response("OK"); }
          let subs = [];
          try { subs = JSON.parse((await env.DB.get(`yt:${chatId}`)) || "[]"); } catch {}
          if (subs.some((s) => s.id === cid)) { await say(env, chatId, errCard("Уже есть", "Этот канал уже отслеживается."), message.message_id); return new Response("OK"); }
          if (subs.length >= 5) { await say(env, chatId, errCard("Лимит", "Максимум 5 каналов на чат (free-лимит)."), message.message_id); return new Response("OK"); }
          // запоминаем последнее видео чтобы не спамить старым
          let last = "";
          try {
            const rss = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${cid}`);
            const xml = await rss.text();
            const m = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
            if (m) last = m[1];
          } catch {}
          subs.push({ id: cid, last });
          await env.DB.put(`yt:${chatId}`, JSON.stringify(subs));
          await env.DB.put(`active_chat:${chatId}`, String(Date.now()), { expirationTtl: 30 * 86400 });
          await say(env, chatId, okCard("Подписался 📺", `Канал <code>${esc(cid)}</code> — буду постить новые видео сюда!`), message.message_id);
          return new Response("OK");
        }
        if (/^list/i.test(arg) || !arg) {
          let subs = [];
          try { subs = JSON.parse((await env.DB.get(`yt:${chatId}`)) || "[]"); } catch {}
          const t = subs.length ? subs.map((s, i) => `${i + 1}. <code>${esc(s.id)}</code>`).join("\n") : "<i>пусто. <code>!yt add UCxxxx</code></i>";
          await say(env, chatId, card("📺", "YouTube-подписки", t, "!yt del UCxxxx — отписаться"), message.message_id);
          return new Response("OK");
        }
        if (/^del/i.test(arg)) {
          const cid = arg.replace(/^del\s*/i, "").trim();
          let subs = [];
          try { subs = JSON.parse((await env.DB.get(`yt:${chatId}`)) || "[]"); } catch {}
          subs = subs.filter((s) => s.id !== cid);
          await env.DB.put(`yt:${chatId}`, JSON.stringify(subs));
          await say(env, chatId, okCard("Отписался", "Готово!"), message.message_id);
          return new Response("OK");
        }
        await say(env, chatId, infoCard("YouTube", "<code>!yt add UCxxxx</code> / <code>!yt list</code> / <code>!yt del UCxxxx</code>"), message.message_id);
        return new Response("OK");
      }
      // Аноним-чат в ЛС: !chat / !stop + огонёк 🔥
      if (lower === "!chat" || lower === "ищу собеседника" || lower === "!anon") {
        if (chatType !== "private") { await say(env, chatId, errCard("Только ЛС", "Аноним-чат работает в личке со мной: @твой_бот → <code>!chat</code>"), message.message_id); return new Response("OK"); }
        const pair = await env.DB.get(`pair:${userId}`);
        if (pair) { await say(env, chatId, infoCard("Уже в чате", "Пиши просто текст — перешлю собеседнику.\n<code>!stop</code> — выйти."), message.message_id); return new Response("OK"); }
        const waiting = await env.DB.get("anon_queue");
        if (waiting && waiting !== String(userId)) {
          await env.DB.delete("anon_queue");
          await env.DB.put(`pair:${userId}`, waiting, { expirationTtl: 3600 });
          await env.DB.put(`pair:${waiting}`, String(userId), { expirationTtl: 3600 });
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "🎉 <b>Собеседник найден!</b>\nПиши всё сюда, я перешлю. <code>!stop</code> — выйти.", parse_mode: "HTML" });
          await sendTelegram(env, "sendMessage", { chat_id: Number(waiting), text: "🎉 <b>Собеседник найден!</b>\nПиши всё сюда, я перешлю. <code>!stop</code> — выйти.", parse_mode: "HTML" });
        } else {
          await env.DB.put("anon_queue", String(userId), { expirationTtl: 300 });
          await say(env, chatId, infoCard("Ищу...", "🔎 Ищу собеседника (5 мин)...\nНапиши <code>!stop</code> чтобы отменить."), message.message_id);
        }
        return new Response("OK");
      }
      if (lower === "!stop" || lower === "!стоп") {
        if (chatType !== "private") return new Response("OK");
        const pair = await env.DB.get(`pair:${userId}`);
        try { await env.DB.delete(`pair:${userId}`); } catch {}
        if (pair) {
          try { await env.DB.delete(`pair:${pair}`); } catch {}
          await say(env, chatId, infoCard("Вышел", "Чат завершён. <code>!chat</code> — искать снова."), message.message_id);
          try { await sendTelegram(env, "sendMessage", { chat_id: Number(pair), text: "👋 Собеседник вышел. <code>!chat</code> — искать снова.", parse_mode: "HTML" }); } catch {}
        } else {
          await env.DB.delete("anon_queue");
          await say(env, chatId, infoCard("Ок", "Поиск отменён."), message.message_id);
        }
        return new Response("OK");
      }
      // FAQ вкл/выкл, смарт-антимат вкл/выкл, антимедиа вкл/выкл
      if (/^!faq\s+(on|off)/i.test(lower) || /^!smartmat\s+(on|off)/i.test(lower) || /^!антимедиа\s+(on|off)/i.test(lower) || /^!antimedia\s+(on|off)/i.test(lower)) {
        const senderRank = await getUserRank(env, userId, chatId);
        const isAdmin = ["creator", "administrator"].includes(await getChatMemberStatus(env, chatId, userId));
        if (senderRank.level < 6 && !isOwner(userId) && !isAdmin) { await say(env, chatId, errCard("Нет прав", "Нужно 6+ или админ."), message.message_id); return new Response("OK"); }
        const val = /(on|вкл)/i.test(lower) && !/off/i.test(lower);
        if (lower.startsWith("!faq")) await setChatSettings(env, chatId, { faq: val });
        else if (lower.includes("smartmat")) await setChatSettings(env, chatId, { smartmat: val });
        else await setChatSettings(env, chatId, { antispam_media: val });
        await say(env, chatId, okCard("Готово", `Значение: <b>${val ? "ВКЛ" : "ВЫКЛ"}</b>`), message.message_id);
        return new Response("OK");
      }

      // 🔥 Огонёк: показать свой стрик (ЛС и группы)
      if (["!streak", "!огонёк", "!огонек", "!fire", "!стрик"].includes(lower)) {
        try {
          const raw = await env.DB.get(`streak:${userId}`);
          const st = raw ? JSON.parse(raw) : { count: 0, last: "" };
          const fire = st.count > 0 ? "🔥".repeat(Math.min(st.count, 10)) : "💨";
          await say(env, chatId, card("🔥", "Твой огонёк", `${fire}\n<b>${st.count || 0} дн. подряд!</b>\n${st.count > 0 ? "Пиши каждый день — огонёк растёт! 💜" : "Напиши мне завтра — начнём стрик! ✊"}`, "!chat — аноним-чат • /text — ГС в текст"), message.message_id);
        } catch {
          await say(env, chatId, "🔥 Пока 0. Пиши каждый день!", message.message_id);
        }
        return new Response("OK");
      }
      // 🔧 Диагностика для владельца: !debug
      if (lower === "!debug" && isOwner(userId)) {
        let voiceInfo = "нет";
        try {
          const v = await env.DB.get(`voice_last:${chatId}:${userId}`);
          voiceInfo = v ? esc(v.slice(0, 120)) : "пусто (кинь ГС сначала)";
        } catch (e) { voiceInfo = "KV ошибка: " + esc(e.message); }
        await say(env, chatId,
          `🔧 <b>DEBUG</b>\n${DIV}\n🧠 AI: <b>${env.AI ? "ЕСТЬ ✅" : "НЕТ ❌"}</b>\n🎤 STT: <b>${env.VOSK_MODEL ? "VOSK ✅" : "ВЫКЛ ❌"}</b>\n🗄 DB: <b>${env.DB ? "ЕСТЬ ✅" : "НЕТ ❌"}</b>\n🎤 voice_last: ${voiceInfo}\n💬 chatType: <code>${chatType}</code>\n🆔 chat: <code>${chatId}</code> user: <code>${userId}</code>`,
          message.message_id);
        return new Response("OK");
      }

      // Мой ранг
      if (["мой ранг", "!мой ранг", "!myrank", "!ранг", "!грейд", "мой грейд"].includes(lower)) {
        if (chatType === "private") {
          await say(env, chatId, "📊 В ЛС рангов нет — добавь меня в группу! 🚀");
        } else {
          await typing(env, chatId);
          const r = await getUserRank(env, userId, chatId);
          await sendTelegram(env, "sendMessage", {
            chat_id: chatId,
            text: header("📊 Твой грейд") + `✨ <b>${esc(r.name)}</b> <i>[${r.level}/10]</i>${r.level === 10 ? " 👑" : ""}\n${"▰".repeat(r.level)}${"▱".repeat(10 - r.level)}` + footer(),
            parse_mode: "HTML",
            reply_to_message_id: message.message_id,
          });
        }
        return new Response("OK");
      }

      // Топ / Статистика / Профиль ( + недельный топ с автосбросом)
      if (["топ", "!top", "!топ"].includes(lower)) {
        await showTopUsers(env, chatId);
        return new Response("OK");
      }
      if (["!топ недели", "!top week", "!топнедели", "топ недели", "!weekly", "!неделя"].includes(lower) || lower.startsWith("!топ недел") || lower.startsWith("!top week")) {
        await showWeeklyTop(env, chatId);
        return new Response("OK");
      }
      if (["!stats", "статистика", "!статистика"].includes(lower)) {
        await showStats(env, chatId);
        return new Response("OK");
      }
      if (["!профиль", "профиль", "!profile"].includes(lower)) {
        await showProfile(env, chatId, userId, message.from);
        return new Response("OK");
      }

      // !setrank / повысить
      if (lower.startsWith("!setrank") || lower.startsWith("повысить") || lower.startsWith("!ранг")) {
        const senderRank = await getUserRank(env, userId, chatId);
        if (senderRank.level < 8 && !isOwner(userId)) {
          await say(env, chatId, "❌ Выдавать ранги могут только 🛡️ Тимлид (8+) и 👑 Лид / 🌟 CEO!", message.message_id);
          return new Response("OK");
        }
        if (!message.reply_to_message) {
          await say(env, chatId, "❌ Ответь на сообщение пользователя! 👆", message.message_id);
          return new Response("OK");
        }
        const targetId = message.reply_to_message.from.id;
        if (isOwner(targetId)) {
          await say(env, chatId, "👑 Владельца трогать нельзя!", message.message_id);
          return new Response("OK");
        }
        // CEO-иммунитет: создателя чата нельзя понизить никому, кроме владельцев
        const targetRank = await getUserRank(env, targetId, chatId);
        if (targetRank.level === 10 && !isOwner(userId)) {
          await say(env, chatId, "👑 Это 🌟 СЕО-Директор — ранг меняет только владелец!", message.message_id);
          return new Response("OK");
        }

        const arg = text.replace(/!setrank|повысить|!ранг/i, "").trim().toLowerCase();
        const newLevel = parseRankArg(arg);

        if (!newLevel) {
          await say(env, chatId, "❌ Укажи ранг 1-9:\n<code>!setrank 3</code> или <code>!setrank мидл+</code>\n\n1 🌱Стажёр • 2 Джун • 3 Джун+ • 4 Мидл • 5 Мидл+ • 6 Сеньор • 7 Сеньор+ • 8 Тимлид • 9 Лид", message.message_id);
          return new Response("OK");
        }
        if (newLevel >= senderRank.level && !isOwner(userId)) {
          await say(env, chatId, "❌ Нельзя выдать ранг равный или выше своего! ⛔", message.message_id);
          return new Response("OK");
        }
        await env.DB.put(`user_rank:${chatId}:${targetId}`, String(newLevel));
        await env.DB.put(`creator_cache:${chatId}:${targetId}`, "manual", { expirationTtl: 3600 });
        await say(env, chatId, header("📊 Новое звание!") + `🎉 ${esc(displayName(message.reply_to_message.from))} → <b>${esc(RANKS[newLevel].name)}</b>\n👮 Выдал: ${esc(displayName(message.from))}` + footer());
        return new Response("OK");
      }

      // ИГРЫ
      // !кубик — настоящий дайс
      if (lower === "!кубик" || lower === "!dice" || lower === "!кость") {
        await sendTelegram(env, "sendDice", { chat_id: chatId, emoji: "🎲", reply_to_message_id: message.message_id });
        return new Response("OK");
      }

      // !угадай — stateful игра 1-10
      if (lower.startsWith("!угадай")) {
        const parts = text.split(/\s+/);
        const guessKey = `guess:${chatId}:${userId}`;
        if (parts.length === 1) {
          const num = Math.floor(Math.random() * 10) + 1;
          const attempts = 3;
          await env.DB.put(guessKey, JSON.stringify({ num, attempts }), { expirationTtl: 300 });
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `🔮 Загадал число 1–10! У тебя ${attempts} попытки. Пиши: <code>!угадай 5</code>`, parse_mode: "HTML", reply_to_message_id: message.message_id });
        } else {
          const g = parseInt(parts[1], 10);
          if (!g || g < 1 || g > 10) {
            await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "❌ Пиши число 1–10: <code>!угадай 7</code>", parse_mode: "HTML" });
            return new Response("OK");
          }
          const raw = await env.DB.get(guessKey);
          if (!raw) {
            await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "ℹ️ Сначала начни игру: <code>!угадай</code>", parse_mode: "HTML" });
            return new Response("OK");
          }
          const st = JSON.parse(raw);
          if (g === st.num) {
            await env.DB.delete(guessKey);
            const prize = await addBalance(env, chatId, userId, 100);
            await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `🎉 Угадал! Это ${st.num}! +100 монет. Баланс: ${prize}`, reply_to_message_id: message.message_id });
          } else {
            st.attempts -= 1;
            if (st.attempts <= 0) {
              await env.DB.delete(guessKey);
              await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `😢 Попытки кончились! Было: ${st.num}. Начни заново: <code>!угадай</code>`, parse_mode: "HTML" });
            } else {
              await env.DB.put(guessKey, JSON.stringify(st), { expirationTtl: 300 });
              const hint = g < st.num ? "бери больше ⬆️" : "бери меньше ⬇️";
              await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `❌ Мимо! ${hint}. Осталось попыток: ${st.attempts}`, reply_to_message_id: message.message_id });
            }
          }
        }
        return new Response("OK");
      }

      // !мем
      if (lower === "!мем" || lower === "!мемы" || lower === "!meme") {
        const m = MEMES_TEXT[Math.floor(Math.random() * MEMES_TEXT.length)];
        await sendTelegram(env, "sendMessage", { chat_id: chatId, text: m, reply_to_message_id: message.message_id });
        return new Response("OK");
      }

      // !факт
      if (lower === "!факт" || lower === "!факты" || lower === "!fact") {
        const f = FACTS[Math.floor(Math.random() * FACTS.length)];
        await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `💡 ${esc(f)}`, reply_to_message_id: message.message_id });
        return new Response("OK");
      }

      // !баланс / !дай (ежедневный бонус)
      if (lower === "!баланс" || lower === "!balance" || lower === "!б") {
        const b = await getBalance(env, chatId, userId);
        await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `💰 Твой баланс: <b>${b}</b> монет`, parse_mode: "HTML" });
        return new Response("OK");
      }
      if (lower === "!дай" || lower === "!bonus" || lower === "!бонус") {
        const lastKey = `bonus_last:${chatId}:${userId}`;
        const last = await env.DB.get(lastKey);
        const now = Date.now();
        if (last && now - parseInt(last, 10) < 24 * 3600 * 1000) {
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "⏳ Бонус уже взят! Возвращайся через 24ч." });
        } else {
          await env.DB.put(lastKey, String(now));
          const b = await addBalance(env, chatId, userId, 500);
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `🎁 +500 монет! Баланс: ${b}` });
        }
        return new Response("OK");
      }

      // !слот
      if (lower === "!слот" || lower === "!slot") {
        let bal = await getBalance(env, chatId, userId);
        if (bal < 50) {
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "❌ Нужно 50 монет. Напиши <code>!дай</code>", parse_mode: "HTML" });
          return new Response("OK");
        }
        await addBalance(env, chatId, userId, -50);
        const em = ["🍒", "🍋", "⭐", "💎", "7️⃣"];
        const s = [em[Math.floor(Math.random() * em.length)], em[Math.floor(Math.random() * em.length)], em[Math.floor(Math.random() * em.length)]];
        if (s[0] === s[1] && s[1] === s[2]) {
          const win = s[0] === "💎" || s[0] === "7️⃣" ? 500 : 200;
          bal = await addBalance(env, chatId, userId, win);
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `🎰 ${s.join(" ")} — ДЖЕКПОТ! +${win}. Баланс: ${bal}`, reply_to_message_id: message.message_id });
        } else if (s[0] === s[1] || s[1] === s[2] || s[0] === s[2]) {
          bal = await addBalance(env, chatId, userId, 80);
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `🎰 ${s.join(" ")} — пара! +80. Баланс: ${bal}`, reply_to_message_id: message.message_id });
        } else {
          bal = await getBalance(env, chatId, userId);
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `🎰 ${s.join(" ")} — мимо. Баланс: ${bal}`, reply_to_message_id: message.message_id });
        }
        return new Response("OK");
      }

      // !кнб
      if (lower.startsWith("!кнб") || lower.startsWith("!rps")) {
        const arg = text.split(/\s+/)[1] || "";
        const norm = arg.toLowerCase();
        let user = null;
        if (["камень", "🪨", "rock"].includes(norm)) user = "камень 🪨";
        else if (["ножницы", "✂️", "scissors"].includes(norm)) user = "ножницы ✂️";
        else if (["бумага", "📄", "paper"].includes(norm)) user = "бумага 📄";
        if (!user) {
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "❌ Пиши: <code>!кнб камень</code> / ножницы / бумага", parse_mode: "HTML" });
          return new Response("OK");
        }
        const vars = ["камень 🪨", "ножницы ✂️", "бумага 📄"];
        const bot = vars[Math.floor(Math.random() * 3)];
        let res = "🤝 Ничья!";
        if ((user.startsWith("камень") && bot.startsWith("ножницы")) || (user.startsWith("ножницы") && bot.startsWith("бумага")) || (user.startsWith("бумага") && bot.startsWith("камень"))) {
          res = "🎉 Ты победил! +50 монет";
          await addBalance(env, chatId, userId, 50);
        } else if (user !== bot) {
          res = "😢 Бот победил!";
        }
        await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `Ты: ${user}\nБот: ${bot}\n${res}`, reply_to_message_id: message.message_id });
        return new Response("OK");
      }

      // !r рулетка: !r красное 100 | !r черное 50
      if (lower === "!r" || lower.startsWith("!r ")) {
        const parts = text.split(/\s+/);
        if (parts.length < 2) {
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "🎰 Пиши: <code>!r красное 100</code> или <code>!r черное 50</code>. Баланс: <code>!баланс</code>", parse_mode: "HTML" });
          return new Response("OK");
        }
        const colorArg = (parts[1] || "").toLowerCase();
        const bet = parts[2] ? parseInt(parts[2], 10) : 50;
        const isRed = ["красное", "красный", "red", "к"].includes(colorArg);
        const isBlack = ["черное", "чёрное", "черный", "чёрный", "black", "ч"].includes(colorArg);
        if ((!isRed && !isBlack) || !bet || bet <= 0) {
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "❌ Пример: <code>!r красное 100</code>", parse_mode: "HTML" });
          return new Response("OK");
        }
        let bal = await getBalance(env, chatId, userId);
        if (bal < bet) {
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `❌ Не хватает монет (у тебя ${bal}). Напиши <code>!дай</code>`, parse_mode: "HTML" });
          return new Response("OK");
        }
        const win = Math.random() < 0.48; // лёгкое преимущество казино
        const rolled = Math.random() > 0.5 ? "🔴 КРАСНОЕ" : "⚫ ЧЁРНОЕ";
        const pickedRed = isRed;
        const rolledRed = rolled.includes("🔴");
        if ((pickedRed === rolledRed) && win) {
          bal = await addBalance(env, chatId, userId, bet);
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `🎰 Выпало: ${rolled}\n🎉 Победа! +${bet}. Баланс: ${bal}`, reply_to_message_id: message.message_id });
        } else {
          bal = await addBalance(env, chatId, userId, -bet);
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `🎰 Выпало: ${rolled}\n😢 Мимо. −${bet}. Баланс: ${bal}`, reply_to_message_id: message.message_id });
        }
        return new Response("OK");
      }

      // !stats-заглушка удалена — выше уже живой !stats. Старый текст для совместимости:
      if (lower === "!stats_old") {
        await showStats(env, chatId);
        return new Response("OK");
      }

      // IRIS-УРОВЕНЬ: экономика / социалка / фан
      // !работать (кулдаун 4ч)
      if (lower === "!работать" || lower === "!work" || lower === "!работа") {
        const k = `work_last:${chatId}:${userId}`;
        const last = parseInt((await env.DB.get(k)) || "0", 10) || 0;
        if (Date.now() - last < 4 * 3600 * 1000) {
          const left = Math.ceil((4 * 3600 * 1000 - (Date.now() - last)) / 60000);
          await say(env, chatId, `😮‍💨 Ты уже работал! Отдохни ~${left} мин. ☕`, message.message_id);
          return new Response("OK");
        }
        const jobs = ["👨‍💻 фиксил баги", "🧹 мыл продакшн", "☕ варил кофе тимлиду", "🚀 деплоил в пятницу", "🤖 обучал нейронку", "📦 разносил пакеты npm"];
        const earn = 200 + Math.floor(Math.random() * 301);
        await env.DB.put(k, String(Date.now()));
        const bal = await addBalance(env, chatId, userId, earn);
        await say(env, chatId, header("💼 Работа") + `${jobs[Math.floor(Math.random() * jobs.length)]} → <b>+${earn}</b> монет!\n💰 Баланс: <b>${bal}</b>` + footer(), message.message_id);
        return new Response("OK");
      }
      // !передать (ответом) — !перевод оставлен переводчику
      if (lower.startsWith("!передать") || lower.startsWith("!pay")) {
        if (!message.reply_to_message) { await say(env, chatId, "❌ Ответь на сообщение получателя! 👆", message.message_id); return new Response("OK"); }
        const amt = parseInt(text.split(/\s+/)[1], 10);
        if (!amt || amt <= 0) { await say(env, chatId, "❌ Пример: <code>!передать 100</code> (ответом)", message.message_id); return new Response("OK"); }
        const targetId = message.reply_to_message.from.id;
        if (targetId === userId) { await say(env, chatId, "😏 Себе переводить нельзя!", message.message_id); return new Response("OK"); }
        const bal = await getBalance(env, chatId, userId);
        if (bal < amt) { await say(env, chatId, `❌ Не хватает (у тебя ${bal}) 💸`, message.message_id); return new Response("OK"); }
        await addBalance(env, chatId, userId, -amt);
        const nb = await addBalance(env, chatId, targetId, amt);
        await say(env, chatId, `🤝 ${esc(displayName(message.from))} передал(а) <b>${amt}</b> → ${esc(displayName(message.reply_to_message.from))}\n💰 У получателя теперь: <b>${nb}</b>`);
        return new Response("OK");
      }
      // !ограбить (ответом, риск)
      if (lower.startsWith("!ограбить") || lower.startsWith("!ограб")) {
        if (!message.reply_to_message) { await say(env, chatId, "❌ Ответь на сообщение жертвы! 🦹", message.message_id); return new Response("OK"); }
        const k = `rob_last:${chatId}:${userId}`;
        const last = parseInt((await env.DB.get(k)) || "0", 10) || 0;
        if (Date.now() - last < 3600 * 1000) { await say(env, chatId, "🚔 Полиция рядом! Подожди часик...", message.message_id); return new Response("OK"); }
        const targetId = message.reply_to_message.from.id;
        try {
          const invV = JSON.parse((await env.DB.get(`shop:${chatId}:${targetId}`)) || "{}");
          if (invV.shieldUntil > Date.now()) { await say(env, chatId, "🛡️ У жертвы щит из <code>!shop</code>! Ограбление отбито.", message.message_id); return new Response("OK"); }
        } catch {}
        const victimBal = await getBalance(env, chatId, targetId);
        if (victimBal < 100) { await say(env, chatId, "💸 У жертвы пустые карманы...", message.message_id); return new Response("OK"); }
        await env.DB.put(k, String(Date.now()));
        if (Math.random() < 0.4) {
          const steal = Math.min(victimBal, 100 + Math.floor(Math.random() * 200));
          await addBalance(env, chatId, targetId, -steal);
          const nb = await addBalance(env, chatId, userId, steal);
          await say(env, chatId, `🦹 Успешно! Ты стырил <b>${steal}</b> у ${esc(displayName(message.reply_to_message.from))}!\n💰 Баланс: <b>${nb}</b>`, message.message_id);
        } else {
          const fine = Math.min(await getBalance(env, chatId, userId), 100);
          await addBalance(env, chatId, userId, -fine);
          await say(env, chatId, `🚔 Поймали! Штраф <b>${fine}</b> монет. Не воруй! 😅`, message.message_id);
        }
        return new Response("OK");
      }
      // !казино
      if (lower.startsWith("!казино") || lower.startsWith("!casino")) {
        const bet = parseInt(text.split(/\s+/)[1], 10) || 100;
        if (bet <= 0) { await say(env, chatId, "❌ Ставка больше 0!", message.message_id); return new Response("OK"); }
        let bal = await getBalance(env, chatId, userId);
        if (bal < bet) { await say(env, chatId, `❌ Нужно ${bet}, у тебя ${bal}. Напиши <code>!дай</code>`, message.message_id); return new Response("OK"); }
        const roll = Math.floor(Math.random() * 100) + 1;
        if (roll >= 55) { bal = await addBalance(env, chatId, userId, bet); await say(env, chatId, `🎲 Выпало <b>${roll}</b> — победа! +${bet}\n💰 ${bal}`, message.message_id); }
        else { bal = await addBalance(env, chatId, userId, -bet); await say(env, chatId, `🎲 Выпало <b>${roll}</b> — мимо. −${bet}\n💰 ${bal}`, message.message_id); }
        return new Response("OK");
      }
      // !топб — топ богачей
      if (lower === "!топб" || lower === "!topb" || lower === "!топ богачей") {
        await typing(env, chatId);
        try {
          const list = await env.DB.list({ prefix: `balance:${chatId}:` });
          const arr = [];
          for (const k of list.keys.slice(0, 30)) {
            const uid = k.name.split(":")[2];
            const b = parseInt((await env.DB.get(k.name)) || "0", 10) || 0;
            let nm = uid;
            try { const r = await env.DB.get(`userinfo:${chatId}:${uid}`); if (r) { const j = JSON.parse(r); nm = j.username ? "@" + j.username : j.first_name || uid; } } catch {}
            arr.push({ uid, nm, b });
          }
          arr.sort((a, b) => b.b - a.b);
          const top5 = arr.slice(0, 10);
          let t = header("💰 Топ богачей");
          if (!top5.length) t += "<i>пока все бедные 😅 напиши !дай</i>";
          else top5.forEach((u, i) => { t += `${["🥇", "🥈", "🥉"][i] || `${i + 1}.`} ${esc(u.nm)} — <b>${u.b}</b> 🪙\n`; });
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: t + footer(), parse_mode: "HTML" });
        } catch { await say(env, chatId, "❌ Топ пока пуст"); }
        return new Response("OK");
      }
      // !топаура
      if (lower === "!топаура" || lower === "!topaura") {
        await typing(env, chatId);
        try {
          const list = await env.DB.list({ prefix: `aura:${chatId}:` });
          const arr = [];
          for (const k of list.keys.slice(0, 30)) {
            const uid = k.name.split(":")[2];
            const a = parseInt((await env.DB.get(k.name)) || "0", 10) || 0;
            let nm = uid;
            try { const r = await env.DB.get(`userinfo:${chatId}:${uid}`); if (r) { const j = JSON.parse(r); nm = j.username ? "@" + j.username : j.first_name || uid; } } catch {}
            arr.push({ nm, a });
          }
          arr.sort((a, b) => b.a - a.a);
          let t = header("✨ Топ по ауре");
          if (!arr.length) t += "<i>ауры пока нет — ответь кому-то + 💜</i>";
          else arr.slice(0, 10).forEach((u, i) => { t += `${i + 1}. ${esc(u.nm)} — <b>${u.a}</b> ✨\n`; });
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: t + footer(), parse_mode: "HTML" });
        } catch { await say(env, chatId, "❌ Топ пуст"); }
        return new Response("OK");
      }
      // 💍 Браки: !жениться / !согласен / !отказ / !развод / !пара
      if (lower.startsWith("!жениться") || lower.startsWith("!женится") || lower === "!брак") {
        if (!message.reply_to_message) { await say(env, chatId, "💍 Ответь на сообщение любимого человека! 💜", message.message_id); return new Response("OK"); }
        const targetId = message.reply_to_message.from.id;
        if (targetId === userId) { await say(env, chatId, "😅 На себе жениться нельзя!", message.message_id); return new Response("OK"); }
        const already = await env.DB.get(`marry:${chatId}:${userId}`);
        const already2 = await env.DB.get(`marry:${chatId}:${targetId}`);
        if (already || already2) { await say(env, chatId, "💔 Кто-то из вас уже в браке!", message.message_id); return new Response("OK"); }
        await env.DB.put(`marry_pending:${chatId}:${targetId}`, JSON.stringify({ from: userId, fromName: displayName(message.from) }), { expirationTtl: 300 });
        await say(env, chatId, `💍 ${esc(displayName(message.from))} предлагает руку и сердце ${esc(displayName(message.reply_to_message.from))}!\n\n💜 Ответь <code>!согласен</code> или <code>!отказ</code> в течение 5 минут!`);
        return new Response("OK");
      }
      if (lower === "!согласен" || lower === "!согласна") {
        const raw = await env.DB.get(`marry_pending:${chatId}:${userId}`);
        if (!raw) { await say(env, chatId, "💔 Тебе никто не предлагал... пока 😅", message.message_id); return new Response("OK"); }
        const p = JSON.parse(raw);
        const partnerName = displayName(message.from);
        await env.DB.put(`marry:${chatId}:${userId}`, JSON.stringify({ uid: p.from, name: p.fromName }));
        await env.DB.put(`marry:${chatId}:${p.from}`, JSON.stringify({ uid: userId, name: partnerName }));
        await env.DB.delete(`marry_pending:${chatId}:${userId}`);
        await say(env, chatId, header("💒 Свадьба!") + `🎉 ${esc(p.fromName)} + ${esc(partnerName)} — теперь пара! 💜\nГорько! 🥂` + footer());
        return new Response("OK");
      }
      if (lower === "!отказ") {
        const raw = await env.DB.get(`marry_pending:${chatId}:${userId}`);
        if (!raw) { await say(env, chatId, "Нечего отклонять 😅", message.message_id); return new Response("OK"); }
        await env.DB.delete(`marry_pending:${chatId}:${userId}`);
        await say(env, chatId, "💔 Предложение отклонено... Всё будет хорошо! 🤗", message.message_id);
        return new Response("OK");
      }
      if (lower === "!развод" || lower === "!развестись") {
        const raw = await env.DB.get(`marry:${chatId}:${userId}`);
        if (!raw) { await say(env, chatId, "Ты не в браке 💔", message.message_id); return new Response("OK"); }
        const m = JSON.parse(raw);
        await env.DB.delete(`marry:${chatId}:${userId}`);
        await env.DB.delete(`marry:${chatId}:${m.uid}`);
        await say(env, chatId, `💔 ${esc(displayName(message.from))} развёлся(лась)... Бывает 🤗`);
        return new Response("OK");
      }
      if (lower === "!пара" || lower === "!брак инфо" || lower === "!семья") {
        const raw = await env.DB.get(`marry:${chatId}:${userId}`);
        if (!raw) await say(env, chatId, "💔 Ты свободен(а). Найди любовь: <code>!жениться</code> (ответом) 💜", message.message_id);
        else { const m = JSON.parse(raw); await say(env, chatId, `💑 Твоя пара: <b>${esc(m.name)}</b> 💜 Берегите друг друга!`, message.message_id); }
        return new Response("OK");
      }
      // 🪙 Монетка
      if (lower === "!монетка" || lower === "!монета" || lower === "!coin") {
        await sendTelegram(env, "sendDice", { chat_id: chatId, emoji: "🪙", reply_to_message_id: message.message_id });
        return new Response("OK");
      }
      // 🎱 Шар судьбы
      if (lower.startsWith("!шар") || lower.startsWith("!ball") || lower.startsWith("!8")) {
        const answers = ["✅ Да, точно!", "❌ Точно нет", "🤔 Возможно...", "🔥 Однозначно да!", "💤 Лучше не надо", "🌟 Звёзды говорят да", "🌀 Спроси позже", "💜 Сердце говорит да", "⛔ Даже не думай", "🚀 Рискни!"];
        await say(env, chatId, `🎱 ${answers[Math.floor(Math.random() * answers.length)]}`, message.message_id);
        return new Response("OK");
      }
      // 🎯 Рандом
      if (lower.startsWith("!рандом") || lower.startsWith("!random") || lower.startsWith("!р ")) {
        const m = text.match(/(\d+)\s*[-—]\s*(\d+)/);
        let a = 1, b = 100;
        if (m) { a = parseInt(m[1], 10); b = parseInt(m[2], 10); if (a > b) [a, b] = [b, a]; b = Math.min(b, 1000000); }
        else { const n = parseInt(text.split(/\s+/)[1], 10); if (n > 1) { a = 1; b = Math.min(n, 1000000); } }
        await say(env, chatId, `🎯 Выпало: <b>${a + Math.floor(Math.random() * (b - a + 1))}</b> <i>(${a}-${b})</i>`, message.message_id);
        return new Response("OK");
      }
      // ⚔️ Дуэль (ответом, приз 50)
      if (lower.startsWith("!дуэль") || lower.startsWith("!duel")) {
        if (!message.reply_to_message) { await say(env, chatId, "⚔️ Ответь на сообщение соперника!", message.message_id); return new Response("OK"); }
        const targetId = message.reply_to_message.from.id;
        if (targetId === userId) { await say(env, chatId, "😅 С собой драться нельзя!", message.message_id); return new Response("OK"); }
        const k = `duel_last:${chatId}:${userId}`;
        const last = parseInt((await env.DB.get(k)) || "0", 10) || 0;
        if (Date.now() - last < 60000) { await say(env, chatId, "⏳ Дуэль раз в минуту!", message.message_id); return new Response("OK"); }
        await env.DB.put(k, String(Date.now()), { expirationTtl: 60 });
        const win = Math.random() > 0.5;
        if (win) {
          await addBalance(env, chatId, targetId, -25);
          const nb = await addBalance(env, chatId, userId, 50);
          await say(env, chatId, `⚔️ ${esc(displayName(message.from))} побеждает ${esc(displayName(message.reply_to_message.from))}! 🏆\n+50 монет → <b>${nb}</b>`, message.message_id);
        } else {
          await addBalance(env, chatId, userId, -25);
          const nb = await addBalance(env, chatId, targetId, 50);
          await say(env, chatId, `⚔️ ${esc(displayName(message.reply_to_message.from))} побеждает! 🏆\nТы потерял 25, соперник +50 → <b>${nb}</b> 😅`, message.message_id);
        }
        return new Response("OK");
      }
      // 🧠 Викторина
      if (lower === "!викторина" || lower === "!quiz" || lower === "!вопрос") {
        const QUIZ = [
          { q: "Сколько байт в килобайте?", a: ["1024"] },
          { q: "Кто создал Python?", a: ["гвидо", "ван россум", "guido"] },
          { q: "Что выведет 2+2*2 в программировании?", a: ["6"] },
          { q: "Столица Японии?", a: ["токио", "tokyo"] },
          { q: "Сколько планет в Солнечной системе?", a: ["8"] },
          { q: "Какой тег делает текст жирным в HTML?", a: ["b", "strong", "<b>"] },
          { q: "Год запуска Telegram?", a: ["2013"] },
        ];
        const item = QUIZ[Math.floor(Math.random() * QUIZ.length)];
        await env.DB.put(`quiz:${chatId}:${userId}`, JSON.stringify(item), { expirationTtl: 300 });
        await say(env, chatId, header("🧠 Викторина (+150 монет)") + `❓ <b>${esc(item.q)}</b>\n\nОтветь: <code>!ответ ...</code>` + footer(), message.message_id);
        return new Response("OK");
      }
      if (lower.startsWith("!ответ")) {
        const raw = await env.DB.get(`quiz:${chatId}:${userId}`);
        if (!raw) { await say(env, chatId, "ℹ️ Сначала возьми вопрос: <code>!викторина</code>", message.message_id); return new Response("OK"); }
        const item = JSON.parse(raw);
        const ans = text.replace(/!ответ/i, "").trim().toLowerCase();
        if (item.a.some((v) => ans.includes(v))) {
          await env.DB.delete(`quiz:${chatId}:${userId}`);
          const nb = await addBalance(env, chatId, userId, 150);
          await say(env, chatId, `🎉 Правильно! +150 монет → <b>${nb}</b> 🧠`, message.message_id);
        } else {
          await say(env, chatId, "❌ Неверно, попробуй ещё! 💪", message.message_id);
        }
        return new Response("OK");
      }

      // МОДЕРАЦИЯ (Фича 9: реплай ИЛИ @username / ID)
      // Примеры: !mut 10 (реплай) | !mut @user 10 | !mut 123456 30 | !kick @user | !warn @user
      const modCommands = ["!mut", "!unmut", "!ban", "!unban", "!kick", "!warn", "!мут", "!бан", "!кик", "!tmute", "!тмут"];
      const matched = modCommands.find((c) => lower.startsWith(c));
      if (matched) {
        const senderRank = await getUserRank(env, userId, chatId);
        const need = lower.startsWith("!ban") || lower.startsWith("!unban") || lower.startsWith("!бан") ? 6 : 4;
        if (senderRank.level < need) {
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: need === 6 ? "❌ Банить могут только 🔥 Сеньор (6+)" : "❌ Модерация от ⚙️ Мидла (4+)", reply_to_message_id: message.message_id });
          return new Response("OK");
        }
        // цель: 1) реплай 2) @username / ID в тексте
        let targetId = message.reply_to_message ? message.reply_to_message.from.id : null;
        let targetLabel = targetId ? esc(displayName(message.reply_to_message.from)) : "";
        const args = text.split(/\s+/).slice(1); // без команды
        if (!targetId && args.length) {
          const cand = args[0].replace(/^@/, "");
          const resolved = await resolveUserIdByUsername(env, chatId, cand);
          if (resolved) { targetId = resolved; targetLabel = await getUserDisplayById(env, chatId, resolved); }
          else if (/^\d{5,}$/.test(cand)) { targetId = cand; targetLabel = await getUserDisplayById(env, chatId, cand); }
        }
        if (!targetId) {
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "❌ Ответь на сообщение нарушителя <b>или</b> укажи @username/ID:\n<code>!mut @user 10</code> • <code>!kick @user</code> • <code>!warn @user</code>", parse_mode: "HTML", reply_to_message_id: message.message_id });
          return new Response("OK");
        }
        if (isOwner(targetId)) {
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "👑 Владельца наказать нельзя!", reply_to_message_id: message.message_id });
          return new Response("OK");
        }
        const targetRank = await getUserRank(env, targetId, chatId);
        if (targetRank.level >= senderRank.level && !isOwner(userId)) {
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: "❌ Нельзя трогать равных/старших!", reply_to_message_id: message.message_id });
          return new Response("OK");
        }

        if (lower.startsWith("!mut") || lower.startsWith("!мут") || lower.startsWith("!tmute") || lower.startsWith("!тмут")) {
          // ищем число минут среди всех аргументов (поддержка !mut @user 10 и !mut 10)
          const nums = text.split(/\s+/).map((x) => parseInt(x, 10)).filter((n) => n > 0 && n < 10080);
          const minutes = nums.length ? nums[0] : 10;
          const until = Math.floor(Date.now() / 1000) + minutes * 60;
          await sendTelegram(env, "restrictChatMember", { chat_id: chatId, user_id: targetId, permissions: { can_send_messages: false }, until_date: until });
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `🔇 ${targetLabel || "Мут"} на ${minutes} мин. Выдал: <b>${esc(senderRank.name)}</b>`, parse_mode: "HTML" });
        } else if (lower.startsWith("!unmut")) {
          await sendTelegram(env, "restrictChatMember", { chat_id: chatId, user_id: targetId, permissions: { can_send_messages: true, can_send_media_messages: true, can_send_other_messages: true, can_add_web_page_previews: true } });
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `🔊 ${targetLabel || "Размучен"} (<b>${esc(senderRank.name)}</b>)`, parse_mode: "HTML" });
        } else if (lower.startsWith("!kick") || lower.startsWith("!кик")) {
          await sendTelegram(env, "banChatMember", { chat_id: chatId, user_id: targetId });
          await sendTelegram(env, "unbanChatMember", { chat_id: chatId, user_id: targetId });
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `👢 Кикнут ${targetLabel || ""} (<b>${esc(senderRank.name)}</b>)`, parse_mode: "HTML" });
        } else if (lower.startsWith("!ban") || lower.startsWith("!бан")) {
          if (lower.startsWith("!unban")) {
            await sendTelegram(env, "unbanChatMember", { chat_id: chatId, user_id: targetId });
            await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `✅ Разбанен ${targetLabel || ""} (<b>${esc(senderRank.name)}</b>)`, parse_mode: "HTML" });
          } else {
            await sendTelegram(env, "banChatMember", { chat_id: chatId, user_id: targetId });
            await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `🛑 Забанен ${targetLabel || ""} (<b>${esc(senderRank.name)}</b>)`, parse_mode: "HTML" });
          }
        } else if (lower.startsWith("!unban")) {
          await sendTelegram(env, "unbanChatMember", { chat_id: chatId, user_id: targetId });
          await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `✅ Разбанен ${targetLabel || ""} (<b>${esc(senderRank.name)}</b>)`, parse_mode: "HTML" });
        } else if (lower.startsWith("!warn")) {
          const wk = `warns:${chatId}:${targetId}`;
          const cur = (parseInt((await env.DB.get(wk)) || "0", 10) || 0) + 1;
          if (cur >= 3) {
            await env.DB.delete(wk);
            await sendTelegram(env, "banChatMember", { chat_id: chatId, user_id: targetId });
            await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `⚠️ ${targetLabel || ""} 3/3 — бан за варны!` });
          } else {
            await env.DB.put(wk, String(cur));
            await sendTelegram(env, "sendMessage", { chat_id: chatId, text: `⚠️ Варн ${targetLabel || ""} от <b>${esc(senderRank.name)}</b> [${cur}/3]`, parse_mode: "HTML" });
          }
        }
        return new Response("OK");
      }
    } catch (err) {
      console.log("Worker error:", err.message, err.stack);
    }
    return new Response("OK");
  },

  // Cron (free-tier): напоминалки каждую минуту, YT каждый час, ДР/праздники/пары днём, топ по пн
  async scheduled(event, env, ctx) {
    try {
      const cron = (event && event.cron) || "";
      // 1) Напоминалки — каждый запуск проверяем (ставь крон * * * * *)
      try {
        const pg = await env.DB.list({ prefix: "remind:", limit: 50 });
        const now = Date.now();
        for (const k of pg.keys) {
          try {
            const raw = await env.DB.get(k.name);
            if (!raw) continue;
            const r = JSON.parse(raw);
            if (r.due <= now) {
              await env.DB.delete(k.name);
              if (r.bizConn) {
                await sendTelegram(env, "sendMessage", {
                  chat_id: r.chatId, business_connection_id: r.bizConn, parse_mode: "HTML",
                  text: `⏰ <b>Напоминаю!</b>\n💬 ${esc(r.text)}`,
                });
              } else {
                await sendTelegram(env, "sendMessage", {
                  chat_id: r.chatId, parse_mode: "HTML",
                  text: `⏰ <b>Напоминаю!</b> <a href="tg://user?id=${r.userId}">${esc(r.name || "друг")}</a>\n💬 ${esc(r.text)}`,
                });
              }
            }
          } catch {}
        }
      } catch (e) { console.log("remind cron fail:", e.message); }
      // дальше — только по нужным кронам, чтобы не спамить
      const isHourly = cron.includes("0 *") || cron === "* * * * *";
      const hour = new Date().getUTCHours() + 5; // ~ Ташкент UTC+5 грубо
      // 2) YT новые видео — раз в час
      if (cron.includes("* * * * *") || cron.startsWith("0 *")) {
        try {
          const pg = await env.DB.list({ prefix: "active_chat:", limit: 30 });
          for (const c of pg.keys.slice(0, 20)) {
            const chatId = c.name.replace("active_chat:", "");
            let subs = [];
            try { subs = JSON.parse((await env.DB.get(`yt:${chatId}`)) || "[]"); } catch {}
            if (!subs.length) continue;
            for (const s of subs) {
              try {
                const rss = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${s.id}`);
                if (!rss.ok) continue;
                const xml = await rss.text();
                const ids = [...xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)].map((m) => m[1]);
                const titles = [...xml.matchAll(/<title>([^<]+)<\/title>/g)].map((m) => m[1]);
                if (!ids.length) continue;
                if (s.last && ids[0] !== s.last) {
                  const title = titles[1] || "Новое видео!";
                  await sendTelegram(env, "sendMessage", {
                    chat_id: chatId, parse_mode: "HTML", disable_web_page_preview: false,
                    text: `📺 <b>Новое видео!</b>\n🎬 ${esc(title)}\n👉 https://youtu.be/${ids[0]}`,
                  });
                }
                s.last = ids[0];
              } catch {}
            }
            await env.DB.put(`yt:${chatId}`, JSON.stringify(subs));
          }
        } catch (e) { console.log("yt cron fail:", e.message); }
      }
      // 3) Утреннее (09:00): ДР + пары на сегодня
      if (cron.includes("9 *") || cron.includes("4 4") || cron === "* * * * *") {
        // чтобы не дублировать при ежеминутном кроне — шлём только если час ~04:00 UTC (=09:00 Ташкент)
        const h = new Date().getUTCHours();
        if (cron === "* * * * *" && h !== 4) { /* skip daily */ }
        else {
          try {
            const pg = await env.DB.list({ prefix: "active_chat:", limit: 50 });
            const now = new Date();
            for (const c of pg.keys.slice(0, 30)) {
              const chatId = c.name.replace("active_chat:", "");
              // ДР
              try {
                const bp = await env.DB.list({ prefix: `birth:${chatId}:`, limit: 50 });
                for (const k of bp.keys) {
                  try {
                    const b = JSON.parse(await env.DB.get(k.name));
                    if (b.d === now.getDate() && b.m === now.getMonth() + 1) {
                      const uid = k.name.split(":").pop();
                      const bal = parseInt((await env.DB.get(`balance:${chatId}:${uid}`)) || "0", 10) || 0;
                      await env.DB.put(`balance:${chatId}:${uid}`, String(bal + 500));
                      const ageLine = (b.y && b.y > 1900) ? `\n🎈 Исполняется <b>${now.getFullYear() - b.y}</b>!` : "";
                      await sendTelegram(env, "sendMessage", { chat_id: chatId, parse_mode: "HTML", text: `🎂 <b>С ДНЁМ РОЖДЕНИЯ!</b> ${esc(b.name || uid)}! 🎉${ageLine}\nПусть всё получается! Подарок +500 монет! 🎁` });
                    }
                  } catch {}
                }
              } catch {}
            }
          } catch (e) { console.log("birth cron fail:", e.message); }
        }
      }
      // 4) Праздники в 00:00 (проверяем раз в день)
      try {
        const h0 = new Date();
        const holiday = holidayToday();
        if (holiday && (cron.includes("0 0") || cron.includes("19 19") || cron === "* * * * *")) {
          // антидубль: один пост в сутки на чат
          const pg = await env.DB.list({ prefix: "active_chat:", limit: 30 });
          for (const c of pg.keys.slice(0, 30)) {
            const chatId = c.name.replace("active_chat:", "");
            const dk = `holiday:${chatId}:${holiday.key}:${h0.toISOString().slice(0, 10)}`;
            if (await env.DB.get(dk)) continue;
            await env.DB.put(dk, "1", { expirationTtl: 86400 });
            await sendTelegram(env, "sendMessage", { chat_id: chatId, parse_mode: "HTML", text: `${holiday.text}\n${holiday.img}` });
          }
        }
      } catch {}
      // 5) Пары за 30 мин (крон каждые 10 мин)
      if (cron.includes("*/10") || cron === "* * * * *") {
        try {
          const pg = await env.DB.list({ prefix: "scheduser:", limit: 50 });
          const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
          const now = new Date(Date.now() + 5 * 3600e3); // Ташкент
          const today = days[now.getDay()];
          const curMin = now.getHours() * 60 + now.getMinutes();
          for (const c of pg.keys.slice(0, 30)) {
            try {
              const [, chatId, userId] = c.name.split(":");
              const arr = JSON.parse((await env.DB.get(`sched:${chatId}:${userId}`)) || "[]");
              for (const s of arr) {
                if (!s.day.toLowerCase().startsWith(today.toLowerCase())) continue;
                const [hh, mm] = s.time.split(":").map(Number);
                const diff = (hh * 60 + mm) - curMin;
                if (diff >= 25 && diff <= 35) {
                  const ak = `schedsent:${chatId}:${userId}:${today}:${s.time}:${now.toISOString().slice(0, 10)}`;
                  if (await env.DB.get(ak)) continue;
                  await env.DB.put(ak, "1", { expirationTtl: 86400 });
                  await sendTelegram(env, "sendMessage", { chat_id: chatId, parse_mode: "HTML", text: `📅 Через 30 мин пара! <a href="tg://user?id=${userId}">студент</a>\n<b>${esc(s.time)}</b> — ${esc(s.text)}` });
                }
              }
            } catch {}
          }
        } catch {}
      }
      // 6) Итоги недели по пн 18:00
      if (cron.includes("18 * * 1") || cron.includes("13 13")) {
        let cursor = undefined;
        const chats = [];
        do {
          const page = await env.DB.list({ prefix: "active_chat:", limit: 50, cursor });
          for (const k of page.keys) chats.push(k.name.replace("active_chat:", ""));
          cursor = page.list_complete ? undefined : page.cursor;
          if (chats.length >= 100) break;
        } while (cursor);
        for (const chatId of chats.slice(0, 50)) {
          try {
            const { weekKey, top } = await getWeeklyTop(env, chatId, 3);
            if (!top.length) continue;
            const medals = ["🥇", "🥈", "🥉"];
            let t = `🏆 <b>ИТОГИ НЕДЕЛИ ${esc(weekKey)}</b>\n${DIV}\n`;
            top.forEach((u, i) => { t += `${medals[i]} ${esc(u.name)} — <b>${u.count}</b> 💬\n`; });
            try {
              const winnerId = top[0].uid;
              const cur = parseInt((await env.DB.get(`balance:${chatId}:${winnerId}`)) || "0", 10) || 0;
              await env.DB.put(`balance:${chatId}:${winnerId}`, String(cur + 500));
              t += `\n🎁 Победитель ${esc(top[0].name)} получает <b>+500</b> монет!\n<i>Новый топ уже начался — пишите! 🔥</i>`;
            } catch {}
            t += footer();
            await sendTelegram(env, "sendMessage", { chat_id: chatId, text: t, parse_mode: "HTML" });
          } catch (e) { console.log("cron chat fail:", chatId, e.message); }
        }
      }
    } catch (e) { console.log("scheduled fail:", e.message); }
  },
};
