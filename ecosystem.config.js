module.exports = {
  apps: [
    {
      name: 'easytrack-backend',
      cwd: './apps/backend',
      script: 'npm',
      args: 'start',
      env: {
        PORT: 3000,
        NODE_ENV: 'development'
      },
      env_production: {
        PORT: 3000,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'easytrack-frontend',
      cwd: './apps/frontend',
      script: 'npm',
      args: 'run dev',
      env: {
        VITE_PORT: 5173,
        NODE_ENV: 'development'
      }
    },
    {
      name: 'ngrok-tunnel',
      script: 'ngrok',
      args: 'http 5173 --url mayday-oversweet-defense.ngrok-free.dev',
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};
