import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';

import { initDb } from './db.js';
import { authRouter } from './routes/auth.js';
import { devicesRouter } from './routes/devices.js';
import { pingsRouter } from './routes/pings.js';
import { sharesRouter } from './routes/shares.js';
import { geofencesRouter } from './routes/geofences.js';
import { alertsRouter } from './routes/alerts.js';
import { sweepDevices } from './jobs/checkAlerts.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', authRouter);
app.use('/devices', devicesRouter);
app.use('/', pingsRouter); // exposes /pings and /devices/:id/pings
app.use('/', sharesRouter); // exposes /devices/:id/shares and /invite/:token/accept
app.use('/', geofencesRouter); // exposes /devices/:id/geofences
app.use('/', alertsRouter); // exposes /alerts and /devices/:id/alerts

// Sweep every 5 minutes for devices that have gone quiet or are low on battery.
cron.schedule('*/5 * * * *', () => {
  sweepDevices().catch((err) => console.error('sweepDevices failed:', err));
});

const port = process.env.PORT || 4000;

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Device tracker API listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
