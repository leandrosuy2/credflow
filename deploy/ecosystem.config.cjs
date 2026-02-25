/** PM2 - CredFlow (API + Web). Uso: pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "credflow-api",
      cwd: "./apps/api",
      script: "node",
      args: "dist/main.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: { NODE_ENV: "production", PORT: 3010 },
    },
    {
      name: "credflow-web",
      cwd: "./apps/web",
      script: "pnpm",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: { NODE_ENV: "production", PORT: 3020 },
    },
  ],
};
