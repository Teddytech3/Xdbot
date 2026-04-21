cat > index.js << 'EOF'
'use strict';
console.log('=== BOOTING TEDDY-XMD ===');
require('dotenv').config();

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.stack || err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
  process.exit(1);
});

const fs = require('fs-extra');
const http = require('http');
const pino = require('pino');
const mongoose = require('mongoose');
const express = require('express');
const bodyparser = require('body-parser');
const { MongoClient } = require('mongodb');
const { default: makeWASocket, DisconnectReason, Browsers, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const P = require('pino');

const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URL || '';
const GROUP_INVITE_CODE = process.env.GROUP_INVITE_CODE || 'CLClgqJIC59GrcI4sRzLu8';
const NEWSLETTER_JID = process.env.NEWSLETTER_JID || '120363421104812135@newsletter';

mongoose.connect(MONGO_URL).then(() => {
  console.log('✅ Connected to MongoDB via Mongoose');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

const activeSockets = new Map();

async function useMongoDBAuthState(collectionName) {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db();
  const coll = db.collection(collectionName);

  const writeData = async (data, id) => {
    await coll.updateOne({ _id: id }, { $set: {...data } }, { upsert: true });
  };

  const readData = async (id) => {
    const doc = await coll.findOne({ _id: id });
    return doc || null;
  };

  const removeData = async (id) => {
    await coll.deleteOne({ _id: id });
  };

  const creds = (await readData('creds')) || {
    noiseKey: {},
    signedIdentityKey: {},
    signedPreKey: {},
    registrationId: 0,
    advSecretKey: '',
    nextPreKeyId: 1,
    firstUnuploadedPreKeyId: 1,
    account: {},
    me: {},
    signalIdentities: [],
    lastAccountSyncTimestamp: 0,
    myAppStateKeyId: null
  };

  return {
    state: {
      creds,
      keys: makeCacheableSignalKeyStore({
        async get(type, ids) {
          const data = {};
          for (const id of ids) {
            const val = await readData(type + '-' + id);
            if (val) data[id] = val.value;
          }
          return data;
        },
        async set(data) {
          const ops = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const _id = category + '-' + id;
              if (value) ops.push(writeData({ value }, _id));
              else ops.push(removeData(_id));
            }
          }
          await Promise.all(ops);
        }
      }, P({ level: 'silent' }))
    },
    saveCreds: async () => {
      await writeData(creds, 'creds');
    },
    clearState: async () => {
      await coll.deleteMany({});
    },
    client
  };
}

async function initConnection(number) {
  if (!MONGO_URL) throw new Error('MONGO_URL or MONGODB_URL env var not set');

  const { state, saveCreds, client } = await useMongoDBAuthState('auth_' + number);
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
    syncFullHistory: false
  });

  activeSockets.set(number, { conn, saveCreds, connected: false, mongoClient: client });

  conn.ev.on('creds.update', async () => {
    try {
      await saveCreds();
    } catch (e) {
      console.error('creds.update error:', e);
    }
  });

  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    console.log('[' + number + '] ' + connection);

    if (connection === 'open') {
      activeSockets.get(number).connected = true;
      console.log('✅ [' + number + '] CONNECTED');
    }

    if (connection === 'close') {
      activeSockets.get(number).connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log('❌ [' + number + '] closed code=' + code);

      if (code === DisconnectReason.loggedOut || code === 401 || code === 405) {
        try {
          await activeSockets.get(number).mongoClient.close();
        } catch {}
        activeSockets.delete(number);
        return;
      }

      setTimeout(async () => {
        try {
          conn.ev.removeAllListeners();
          try { conn.ws?.terminate(); } catch {}
          await initConnection(number);
        } catch (e) {
          console.error('Reconnect ' + number + ': ' + e.message);
        }
      }, 5000);
    }
  });
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ status: 'TEDDY-XMD API running', version: '5.7.0' });
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
    res.send('Pairing code for ' + phone + ': ' + code);
  } catch (e) {
    console.error('/pair error:', e);
    res.status(500).send('Error: ' + e.toString());
  }
});

server.listen(PORT, () => {
  console.log('🚀 TEDDY-XMD listening on port ' + PORT);
});
EOF