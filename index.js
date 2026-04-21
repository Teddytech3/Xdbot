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
const WA_GROUP_JID = process.env.WA_GROUP_JID || '';
const GROUP_INVITE_CODE = process.env.GROUP_INVITE_CODE || 'CLClgqJIC59GrcI4sRzLu8';
const AUTO_FOLLOW_NEWSLETTER = process.env.AUTO_FOLLOW_NEWSLETTER!== 'false';
const NEWSLETTER_JID = process.env.NEWSLETTER_JID || '120363421104812135@newsletter';

if (!MONGO_URL) {
  console.error('❌ MONGO_URL or MONGODB_URL env var not set.');
}

mongoose.connect(MONGO_URL).then(() => {
  console.log('✅ Connected to MongoDB via Mongoose');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

const defaultConfig = {
  PREFIX: '.',
  MODE: 'public'
};

const sessionSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  creds: { type: Object, required: true },
  config: { type: Object, default: defaultConfig },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Session = mongoose.model('Session', sessionSchema);

const activeSockets = new Map();
const SESSION_BASE_PATH = './sessions_multi';
if (!fs.existsSync(SESSION_BASE_PATH)) {
  fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });
}

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
