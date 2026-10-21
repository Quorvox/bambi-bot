#!/bin/bash
# Установка Bambi Bot на Ubuntu 22.04 (запускать как root на сервере)
# RAM лимит 530M, диск ~200-300МБ (влезет в 30ГБ с запасом)
set -e
APP=/opt/bimi-bot
echo "Bambi VPS install"
apt-get update -y
apt-get install -y curl build-essential python3 sqlite3 logrotate
# нужен Node 22+ (там встроенный node:sqlite), на 20 бот не стартанёт
NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/' || echo 0)
if [ "${NODE_MAJOR:-0}" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v
mkdir -p $APP/data
# бот живёт под своим юзером, не под root
id bimi >/dev/null 2>&1 || useradd --system --home $APP --shell /usr/sbin/nologin bimi
chown -R bimi:bimi $APP/data
# logrotate на всякий (если появятся файлы в data/*.log)
cat > /etc/logrotate.d/bimi-bot <<'EOF'
/opt/bimi-bot/data/*.log {
  weekly
  rotate 4
  compress
  missingok
  notifempty
  maxsize 20M
}
EOF
# systemd limits check
echo "RAM totals:"; free -m | head -2; echo "DISK:"; df -h / | tail -1
echo "Готово. Дальше: залить код в $APP, npm ci, заполнить .env (chmod 640, chown root:bimi), systemctl enable --now bimi-bot"
