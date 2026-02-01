const mongoose = require('mongoose');
const { MONGODB_URI } = require('./src/config');
const { startWebServer } = require('./src/web');
const { startBot } = require('./src/bot');

async function main() {
  // 1) Start website first so Render health checks pass even if bot fails
  startWebServer();

  // 2) Connect Mongo (used for rate limiting + history)
  if (!MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI missing. Download limits/history will not work.');
  } else {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ MongoDB connected');
    } catch (e) {
      console.error('⚠️ MongoDB connection failed (site still runs):', e.message);
    }
  }

  // 3) Start bot (never crash the process)
  (async () => {
    try {
      await startBot();
    } catch (e) {
      console.error('⚠️ Discord bot failed to start (website will still run):', e.code || e.message);
    }
  })();
}

main().catch((e) => {
  console.error('Fatal startup error:', e);
});
