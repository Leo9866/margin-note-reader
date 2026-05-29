module.exports = {
  apps: [
    {
      name: "margin-note-reader",
      cwd: "/opt/margin-note-reader",
      script: "node_modules/vite/bin/vite.js",
      args: "preview --host 127.0.0.1 --port 3001",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "512M",
      time: true,
    },
  ],
};
