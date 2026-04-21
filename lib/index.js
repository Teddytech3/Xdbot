const sms = (conn, m) => {
  if (m.key) {
    m.id = m.key.id;
    m.isGroup = m.key.remoteJid.endsWith('@g.us');
    m.chat = m.key.remoteJid;
    m.fromMe = m.key.fromMe;
    m.sender = m.fromMe? conn.user.id.split(':')[0] + '@s.whatsapp.net' : m.key.participant || m.key.remoteJid;
  }
  if (m.message) {
    m.mtype = Object.keys(m.message)[0];
    m.msg = m.message[m.mtype];
    m.body = m.msg?.text || m.msg?.caption || m.message.conversation || '';
  }
  return m;
};

const downloadMediaMessage = async () => null;
const AntiDelete = () => {};

module.exports = { sms, downloadMediaMessage, AntiDelete };
