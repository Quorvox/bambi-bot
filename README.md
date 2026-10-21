# Bambi Bot — Telegram-бот для чатов

> Telegram group-management bot: ranks, moderation, economy, mini-games, AI. Node.js + SQLite, runs on a 1 GB VPS.

Бот для групп и сообществ: ранги, модерация, экономика, игры, теги, фильтры, ИИ и голос в текст. Живёт на дешёвом VPS: **~70–150 МБ RAM**, весь стейт в одном файле SQLite.

## Что умеет

- **Ранги 1–10** и права по ним: `!setrank`, `!myrank`, CEO для владельца чата
- **Модерация**: `!mut / !unmut / !kick / !warn / !ban / !unban` — реплаем, по @username или ID
- **Фильтры**: антимат, антиссылки, антифлуд, антимедиа, авто-FAQ
- **Экономика**: баланс, работа, переводы, казино, магазин, топы
- **Игры**: кубик, угадай число, слоты, КНБ, викторина, дуэли
- **Социалка**: браки, аура (`+` / `-` / «спасибо»), профиль, недельный топ
- **Теги**: группы людей и упоминание всех разом (`!add group`, `!teg`)
- **Полезное**: напоминания, опросы, переводчик, QR, проверка ссылок через VirusTotal, YouTube-уведомления
- **ИИ**: `!ai вопрос` бесплатно через Pollinations, с ключом — OpenAI / Groq / OpenRouter
- **Голос → текст**: `/text` ответом на голосовое (локально через Vosk или через Whisper)

## Как устроено

| | |
|---|---|
| Транспорт | long-polling (домен и HTTPS не нужны) |
| Хранилище | встроенный `node:sqlite` (Node 22+), KV-обёртка в стиле Cloudflare KV, TTL ключей |
| Фоновые задачи | `setInterval`: напоминания, сброс статы раз в 30 дней + `VACUUM` |
| Деплой | systemd-юнит под отдельным юзером, лимит памяти 530 МБ, логи в journald |
| Зависимости | только `dotenv` |

Изначально бот жил на Cloudflare Workers (KV + Workers AI). Я перенёс его на VPS: KV → SQLite, webhook → polling, cron → таймеры, вся логика команд осталась прежней.

```
src/
  index.js  — вход: polling, cron, сброс статы
  core.js   — все команды и обработчики
  kv.js     — SQLite с API как у Cloudflare KV
  stt.js / stt.py — распознавание голосовых (Vosk + ffmpeg)
```

## Запуск локально

Нужен Node.js 22+.

```bash
npm install
cp .env.example .env   # вписать BOT_TOKEN от @BotFather и свой id в OWNERS
npm start
```

## На сервер (Ubuntu 22.04+)

```bash
bash install.sh                       # node 22, юзер bimi, logrotate
# залить код в /opt/bimi-bot
cd /opt/bimi-bot && npm ci --omit=dev
cp .env.example .env && nano .env     # chmod 640, chown root:bimi
cp bimi-bot.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now bimi-bot
journalctl -u bimi-bot -f
```

---
Сделано [Quorvox_team](https://github.com/Quorvox)
