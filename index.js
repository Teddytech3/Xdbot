'use strict';
/**
 * 🔥 TEDDY-XMD — v5.7 (MongoDB + Autojoin + Autofollow + Pairing UI)
 * MongoDB auth · Antidelete · Autojoin group · Autofollow newsletter · main.html UI
 * Owner: Teddy (+254799963583)
 */

console.log('=== BOOTING TEDDY-XMD ===');
require('dotenv').config();

// Catch crashes so Heroku logs show the real error
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.stack || err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
  process.exit(1);
});

const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
process.env.FFMPEG_PATH = ffmpegInstaller.path;

const ffmpeg = require('fluent-ffmpeg');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const fs = require('fs-extra');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const pino = require('pino');
const axios = require('axios');
const FormData = require('form-data');
const os = require('os');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const Jimp = require('jimp');
const crypto = require('crypto');
const FileType = require('file-type');
const yts = require('yt-search');
const TelegramBot = require('node-telegram-bot-api');

// BAILEYS + MONGODB AUTH
const {
  default: makeWASocket,
  DisconnectReason,
  jidNormalizedUser,
  isJidBroadcast,
  getContentType,
  proto,
  generateWAMessageContent,
  generateWAMessage,
  AnyMessageContent,
  prepareWAMessageMedia,
  areJidsSameUser,
  downloadContentFromMessage,
  MessageRetryMap,
  generateForwardMessageContent,
  generateWAMessageFromContent,
  generateMessageID,
  makeInMemoryStore,
  jidDecode,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const { useMongoDBAuthState } = require('@whiskeysockets/baileys-mongo');
const { MongoClient } = require('mongodb');

const l = console.log;
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
const { AntiDelDB, initializeAntiDeleteSettings, setAnti, getAnti, getAllAntiDeleteSettings, saveContact, loadMessage, getName, getChatSummary, saveGroupMetadata, getGroupMetadata, saveMessageCount, getInactiveGroupMembers, getGroupMembersMessageCount, saveMessage } = require('./data');
const P = require('pino');
const config = require('./config');
const qrcode = require('qrcode-terminal');
const StickersTypes = require('wa-sticker-formatter');
const util = require('util');
const { sms, downloadMediaMessage, AntiDelete } = require('./lib');
const { fromBuffer } = require('file-type');
const bodyparser = require('body-parser');
const Crypto = require('crypto');
const express = require("express");

//================= ENV / CONFIG =================================//

const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URL || '';
const WA_GROUP_JID = process.env.WA_GROUP_JID || '';
const GROUP_INVITE_CODE = process.env.GROUP_INVITE_CODE || 'CLClgqJIC59GrcI4sRzLu8';
const AUTO_FOLLOW_NEWSLETTER = process.env.AUTO_FOLLOW_NEWSLETTER !== 'false';

const defaultConfig = {
  AUTO_VIEW_STATUS: 'true',
  AUTO_LIKE_STATUS: 'true',
  AUTO_RECORDING: 'false',
  AUTO_LIKE_EMOJI: ['🖤', '🍬', '💫', '🎈', '💚', '🎶', '❤️', '🧫', '⚽'],
  PREFIX: config.PREFIX || '.',
  BOT_FOOTER: '> © MADE BY TEDDY TECH',
  MAX_RETRIES: 3,
  GROUP_INVITE_LINK: 'https://chat.whatsapp.com/CLClgqJIC59GrcI4sRzLu8',
  ADMIN_LIST_PATH: './admin.json',
  IMAGE_PATH: 'https://files.catbox.moe/13nyhx.jpg',
  NEWSLETTER_JID: process.env.NEWSLETTER_JID || '120363421104812135@newsletter',
  NEWSLETTER_MESSAGE_ID: '428',
  OTP_EXPIRY: 300000,
  OWNER_NUMBER: '254799963583',
  DEV_MODE: 'false',
  CHANNEL_LINK: 'https://whatsapp.com/channel/0029Vb6NveDBPzjPa4vIRt3n',
  WORK_TYPE: "public",
  ANTI_CAL: "off",
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '7214172448:AAHGqSgaw-zGVPZWvl8msDOVDhln-9kExas',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '7825445776',
  AUTO_REACT: config.AUTO_REACT || 'true',
  AUTO_STATUS_SEEN: config.AUTO_STATUS_SEEN || "true",
  AUTO_STATUS_REACT: config.AUTO_STATUS_REACT || "true",
  AUTO_STATUS_REPLY: config.AUTO_STATUS_REPLY || "false",
  AUTO_STATUS_MSG: config.AUTO_STATUS_MSG || "",
  READ_MESSAGE: config.READ_MESSAGE || 'true',
  CUSTOM_REACT: config.CUSTOM_REACT || 'false',
  CUSTOM_REACT_EMOJIS: config.CUSTOM_REACT_EMOJIS || '🏐,🧳,❤️,😍,💗',
  MODE: config.MODE || "public"
};

const telegramBot = new TelegramBot(defaultConfig.TELEGRAM_BOT_TOKEN, { polling: false });

// MongoDB connection for mongoose models
if (!MONGO_URL) {
  console.error('❌ MONGO_URL or MONGODB_URL env var not set. Bot will crash on connect.');
}
mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB via Mongoose');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// MongoDB Schemas
const sessionSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  creds: { type: Object, required: true },
  config: { type: Object, default: defaultConfig },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const numberSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const otpSchema = new mongoose.Schema({
  number: { type: String, required: true },
  otp: { type: String, required: true },
  newConfig: { type: Object },
  expiry: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Session = mongoose.model('Session', sessionSchema);
const BotNumber = mongoose.model('BotNumber', numberSchema);
const OTP = mongoose.model('OTP', otpSchema);

const activeSockets = new Map();
const socketCreationTime = new Map();
const SESSION_BASE_PATH = './sessions_multi';

if (!fs.existsSync(SESSION_BASE_PATH)) {
  fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });
}

//================= MONGODB FUNCTIONS ===============================//

async function getUserConfigFromMongoDB(number) {
  try {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const session = await Session.findOne({ number: sanitizedNumber });
    return session? session.config : {...defaultConfig };
  } catch (error) {
    console.error('❌ Failed to get user config from MongoDB:', error);
    return {...defaultConfig };
  }
}

//================= BAILEYS WITH MONGODB =======================

async function initConnection(number) {
  if (!MONGO_URL) throw new Error('MONGO_URL or MONGODB_URL env var not set');

  const mongoClient = new MongoClient(MONGO_URL);
  await mongoClient.connect();
  const collection = mongoClient.db().collection('auth_' + number);
  const { state, saveCreds } = await useMongoDBAuthState(collection);
  const { version } = await fetchLatestBaileysVersion();

  const conn = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.macOS('Safari'),
    connectTimeoutMs: 30000,
    keepAliveIntervalMs: 10000,
    defaultQueryTimeoutMs: 30000,
    retryRequestDelayMs: 250,
    maxRetries: 5,
    markOnlineOnConnect: true,
    syncFullHistory: false,
  });

  activeSockets.set(number, { conn, saveCreds, connected: false, mongoClient });
  setupHandlers(conn, number, saveCreds);
  return conn;
}

function setupHandlers(conn, number, saveCreds) {
  const entry = activeSockets.get(number);

  conn.ev.on('creds.update', async () => { try { await saveCreds(); } catch (e) { console.error('creds.update error:', e); } });

  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    console.log(`[${number}] ${connection}`);

    if (connection === 'open') {
      entry.connected = true;
      console.log(`✅ [${number}] CONNECTED`);

      // 1. AUTOFOLLOW NEWSLETTER
      if (AUTO_FOLLOW_NEWSLETTER && defaultConfig.NEWSLETTER_JID) {
        try {
          await conn.newsletterFollow(defaultConfig.NEWSLETTER_JID);
          console.log(`[${number}] Auto-followed newsletter`);
        } catch (e) {
          console.log(`[${number}] Newsletter follow failed: ${e.message}`);
        }
      }

      // 2. AUTOJOIN GROUP
      if (WA_GROUP_JID) {
        try {
          await conn.groupMetadata(WA_GROUP_JID);
          console.log(`[${number}] Already in group`);
        } catch (e) {
          if (GROUP_INVITE_CODE) {
            try {
              await conn.groupAcceptInvite(GROUP_INVITE_CODE);
              console.log(`[${number}] Joined group via invite code`);
            } catch (err) {
              console.log(`[${number}] Failed to join group: ${err.message}`);
            }
          } else {
            console.log(`[${number}] GROUP_INVITE_CODE not set, skipping autojoin`);
          }
        }
      }
    }

    if (connection === 'close') {
      entry.connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(`❌ [${number}] closed code=${code}`);

      if (code === DisconnectReason.loggedOut || code === 401 || code === 405) {
        try {
          await entry.mongoClient.db().collection('auth_' + number).deleteMany({});
        } catch {}
        activeSockets.delete(number);
        return;
      }

      setTimeout(async () => {
        try { conn.ev.removeAllListeners(); try{conn.ws?.terminate();}catch{}; await initConnection(number); }
        catch(e){ console.error(`Reconnect ${number}: ${e.message}`); }
      }, 5000);
    }
  });

  conn.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

    const userConfig = await getUserConfigFromMongoDB(number);
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const prefix = userConfig.PREFIX || '.';

    if (!body.startsWith(prefix)) return;
    const cmd = body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase();

    if (cmd === 'ping') {
      await conn.sendMessage(msg.key.remoteJid, { text: 'Pong! 🏓' }, { quoted: msg });
    }
  });
}

// ── EXPRESS API + STATIC PAIRING UI ──────────────────────────────────
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Redirect root to main.html
app.get('/', (req, res) => {
  res.redirect('/main.html');
});

app.get('/pair/:phone', async (req, res) => {
  try {
    const phone = req.params.phone.replace(/[^0-9]/g, '');
    if (!phone) return res.status(400).send('Invalid phone number');

    let entry = activeSockets.get(phone);
    if (!entry) {
      await initConnection(phone);
      entry = activeSockets.get(phone);
    }

    if (entry.connected) return res.send('Already connected');

    const code = await entry.conn.requestPairingCode(phone);
    res.send(`Pairing code for ${phone}: ${code}`);
  } catch (e) {
    console.error('/pair error:', e);
    res.status(500).send('Error: ' + e.toString());
  }
});

server.listen(PORT, () => {
  console.log(`🚀 TEDDY-XMD listening on port ${PORT}`);
  if (!MONGO_URL) console.warn('⚠️ MONGO_URL/MONGODB_URL not set. Will crash on /pair');
});

// Auto-start if number provided
if (process.env.AUTO_START_NUMBER) {
  initConnection(process.env.AUTO_START_NUMBER).catch(e => console.error('Auto start failed:', e));
}
