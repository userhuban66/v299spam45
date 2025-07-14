const http = require('http');
const { Client } = require('discord.js-self');
require('dotenv').config();

// --- AYARLAR ---
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
// YENİ: Token'ları dosyadan değil, ortam değişkeninden alıyoruz.
const TOKENS_FROM_ENV = process.env.TOKEN_LIST;
const RECONNECT_DELAY = 10000; // 10 saniye
const STAY_ALIVE_INTERVAL = 240000; // 4 dakika
const STARTUP_DELAY = 5000; // Her botun başlangıcı arasında 5 saniye bekle

// --- BOT BAŞLATMA FONKSİYONU ---
// Bu fonksiyon, tek bir token alıp onun için tüm bot mantığını çalıştırır.
const startBot = (token) => {
  const client = new Client();
  let voiceConnection = null;
  const botLogPrefix = `[...${token.slice(-4)}]`; // Loglarda botu tanımak için

  client.on('ready', async () => {
    console.log(`${botLogPrefix} ✅ ${client.user.username} olarak giriş yapıldı!`);
    await joinChannel();
    if (voiceConnection) {
      setInterval(stayActive, STAY_ALIVE_INTERVAL);
    }
  });

  client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState.id === client.user.id && oldState.channelID && !newState.channelID) {
      console.log(`${botLogPrefix} ⚠️ Ses kanalından bağlantı koptu. Yeniden bağlanılıyor...`);
      voiceConnection = null;
      setTimeout(joinChannel, RECONNECT_DELAY);
    }
  });

  async function joinChannel() {
    try {
      const channel = await client.channels.fetch(VOICE_CHANNEL_ID);
      if (channel && channel.type === 'voice') {
        voiceConnection = await channel.join();
        console.log(`${botLogPrefix} 🎧 "${channel.name}" kanalına başarıyla bağlandı!`);
      } else {
        console.error(`${botLogPrefix} ❌ HATA: Kanal bulunamadı veya ses kanalı değil.`);
      }
    } catch (error) {
      console.error(`${botLogPrefix} ❌ Bağlanma hatası:`, error.message);
    }
  }

  function stayActive() {
    if (!voiceConnection) return;
    try {
      voiceConnection.setSpeaking(true);
      setTimeout(() => voiceConnection.setSpeaking(false), 500);
    } catch (error) {
      console.error(`${botLogPrefix} 📢 'Aktif Kalma' sinyali hatası:`, error.message);
    }
  }

  client.login(token).catch(err => {
    console.error(`${botLogPrefix} ❌ Giriş yapılamadı! Token geçersiz olabilir. Hata:`, err.message);
  });
};


// --- ANA ÇALIŞTIRMA MANTIĞI ---
const run = async () => {
  console.log('Bot yöneticisi başlatılıyor...');

  if (!VOICE_CHANNEL_ID) {
    return console.error('HATA: Lütfen Ortam Değişkenlerine VOICE_CHANNEL_ID ekleyin.');
  }

  // YENİ: Token listesini dosyadan değil, ortam değişkeninden oku ve virgüllerden ayır.
  if (!TOKENS_FROM_ENV) {
    return console.error('HATA: Lütfen Ortam Değişkenlerine TOKEN_LIST ekleyin.');
  }
  const tokens = TOKENS_FROM_ENV.split(',').map(t => t.trim()).filter(t => t);

  if (tokens.length === 0) {
    return console.error(`HATA: TOKEN_LIST içinde hiç token bulunamadı.`);
  }

  console.log(`Toplam ${tokens.length} adet token bulundu. Botlar başlatılıyor...`);

  for (const token of tokens) {
    startBot(token);
    await new Promise(resolve => setTimeout(resolve, STARTUP_DELAY));
  }

  // Uptime için basit bir web sunucusu
  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`${tokens.length} bot aktif olarak çalışıyor.`);
  }).listen(3000, () => {
    console.log('Uptime sunucusu 3000 portunda başlatıldı. Proje artık uykuya dalmayacak.');
  });
};

run();
