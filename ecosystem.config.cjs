/**
 * PM2: same as `npm run start -- -p 3005` from this directory.
 * Public URL: https://studiogreyspaces.com (DNS A → 203.57.85.33; nginx → 127.0.0.1:3005)
 *
 * Start:  pm2 start ecosystem.config.cjs
 * Logs:   pm2 logs moodboard
 * Stop:   pm2 stop moodboard
 * Remove: pm2 delete moodboard
 * Save:   pm2 save && pm2 startup   (survive reboot)
 */
module.exports = {
  apps: [
    {
      name: "moodboard",
      cwd: __dirname,
      script: "npm",
      args: "run start -- -p 3005",
      interpreter: "none",
      instances: 1,
      autorestart: true,
      max_restarts: 20,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
