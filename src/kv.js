'use strict';
// SQLite KV на встроенном node:sqlite (Node 22+) — ноль нативных зависимостей
// API как Cloudflare KV: get / put({expirationTtl}) / delete / list({prefix,limit,cursor})
// RAM ~5МБ, диск — один .db файл
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

class KV {
  constructor(dbPath) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.db = new DatabaseSync(dbPath);
    try {
      this.db.exec(`PRAGMA journal_mode = WAL`);
      this.db.exec(`PRAGMA synchronous = NORMAL`);
      this.db.exec(`PRAGMA cache_size = -8000`);
      this.db.exec(`PRAGMA temp_store = MEMORY`);
    } catch {}
    this.db.exec(`CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT, exp INTEGER)`);
    try { this.db.exec(`CREATE INDEX IF NOT EXISTS idx_kv_exp ON kv(exp)`); } catch {}
    this.stGet = this.db.prepare('SELECT value, exp FROM kv WHERE key = ?');
    this.stPut = this.db.prepare('INSERT INTO kv(key,value,exp) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, exp=excluded.exp');
    this.stDel = this.db.prepare('DELETE FROM kv WHERE key = ?');
    this._cleanTimer = setInterval(() => { try { this.db.prepare('DELETE FROM kv WHERE exp > 0 AND exp < ?').run(Math.floor(Date.now()/1000)); } catch {} }, 10*60*1000);
    if (this._cleanTimer.unref) this._cleanTimer.unref();
  }
  _expired(exp) { return exp && exp > 0 && exp < Math.floor(Date.now()/1000); }
  async get(key) {
    try {
      const r = this.stGet.get(String(key));
      if (!r) return null;
      if (this._expired(r.exp)) { try { this.stDel.run(String(key)); } catch {} return null; }
      return r.value;
    } catch { return null; }
  }
  async put(key, value, opts) {
    try {
      let exp = 0;
      if (opts && opts.expirationTtl) exp = Math.floor(Date.now()/1000) + Number(opts.expirationTtl);
      if (opts && opts.expiration) exp = Number(opts.expiration);
      this.stPut.run(String(key), String(value), exp);
    } catch (e) { console.log('kv put fail:', e.message); }
  }
  async delete(key) { try { this.stDel.run(String(key)); } catch {} }
  _like(s) { return String(s).replace(/[\\%_]/g, c => '\\'+c); }
  async list({ prefix = '', limit = 100, cursor } = {}) {
    try {
      limit = Math.min(Math.max(Number(limit)||100, 1), 1000);
      const now = Math.floor(Date.now()/1000);
      let rows;
      if (cursor) {
        rows = this.db.prepare(`SELECT key FROM kv WHERE key LIKE ? ESCAPE '\\' AND key > ? AND (exp = 0 OR exp >= ?) ORDER BY key LIMIT ?`).all(this._like(prefix)+'%', String(cursor), now, limit+1);
      } else {
        rows = this.db.prepare(`SELECT key FROM kv WHERE key LIKE ? ESCAPE '\\' AND (exp = 0 OR exp >= ?) ORDER BY key LIMIT ?`).all(this._like(prefix)+'%', now, limit+1);
      }
      const complete = rows.length <= limit;
      const keys = rows.slice(0, limit).map(r => ({ name: r.key }));
      return { keys, list_complete: complete, cursor: complete ? undefined : keys[keys.length-1].name };
    } catch { return { keys: [], list_complete: true }; }
  }
  async deleteByPrefix(prefix) {
    try {
      const r = this.db.prepare(`DELETE FROM kv WHERE key LIKE ? ESCAPE '\\'`).run(this._like(prefix)+'%');
      return (r && r.changes) || 0;
    } catch { return 0; }
  }
  async countByPrefix(prefix) {
    try {
      const r = this.db.prepare(`SELECT COUNT(*) c FROM kv WHERE key LIKE ? ESCAPE '\\'`).get(this._like(prefix)+'%');
      return r ? r.c : 0;
    } catch { return 0; }
  }
  exec(sql) { try { this.db.exec(sql); } catch {} }
  close() { try { clearInterval(this._cleanTimer); this.db.close(); } catch {} }
}

module.exports = { KV };
