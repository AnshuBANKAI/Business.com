import mongoose from 'mongoose';
import { config, startupChecks } from './config.js';
import { createApp } from './app.js';
import { startScheduler } from './jobs/scheduler.js';

const { errors, warnings } = startupChecks(config);
for (const w of warnings) console.warn(`[startup warning] ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`[startup error] ${e}`);
  process.exit(1);
}

process.on('unhandledRejection', (reason) => console.error('Unhandled promise rejection:', reason));
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception, exiting so the host can restart the server:', err);
  process.exit(1);
});

try {
  await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  console.log('MongoDB connected');
} catch (err) {
  console.error('Could not connect to MongoDB:', err.message);
  process.exit(1);
}

const server = createApp().listen(config.PORT, () => console.log(`API listening on http://localhost:${config.PORT}`));

if (config.NODE_ENV !== 'test' && config.ENABLE_SCHEDULER) startScheduler();

const shutdown = () => server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
