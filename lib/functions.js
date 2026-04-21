const axios = require('axios');

const getBuffer = async (url, options) => {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer',...options });
    return Buffer.from(res.data, 'binary');
  } catch (e) {
    return null;
  }
};

const getGroupAdmins = (participants) => {
  let admins = [];
  for (let i of participants) {
    if (i.admin === 'superadmin' || i.admin === 'admin') admins.push(i.id);
  }
  return admins;
};

const getRandom = (ext) => {
  return `${Math.floor(Math.random() * 10000)}${ext}`;
};

const h2k = (eco) => {
  let lyrik = ['', 'K', 'M', 'B', 'T'];
  let i = 0;
  while (eco >= 1000 && i < lyrik.length - 1) {
    eco /= 1000;
    i++;
  }
  return eco.toFixed(1) + lyrik[i];
};

const isUrl = (url) => {
  return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'));
};

const Json = (string) => {
  return JSON.stringify(string, null, 2);
};

const runtime = (seconds) => {
  seconds = Number(seconds);
  let d = Math.floor(seconds / (3600 * 24));
  let h = Math.floor(seconds % (3600 * 24) / 3600);
  let m = Math.floor(seconds % 3600 / 60);
  let s = Math.floor(seconds % 60);
  let dDisplay = d > 0? d + (d == 1? " day, " : " days, ") : "";
  let hDisplay = h > 0? h + (h == 1? " hour, " : " hours, ") : "";
  let mDisplay = m > 0? m + (m == 1? " minute, " : " minutes, ") : "";
  let sDisplay = s > 0? s + (s == 1? " second" : " seconds") : "";
  return dDisplay + hDisplay + mDisplay + sDisplay;
};

const sleep = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const fetchJson = async (url, options) => {
  try {
    const res = await axios.get(url, options);
    return res.data;
  } catch (e) {
    return null;
  }
};

module.exports = { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson };
