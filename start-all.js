const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'Auth Service', dir: 'services/auth-service', port: 3001 },
  { name: 'Campaign Service', dir: 'services/campaign-service', port: 3003 },
  { name: 'TikTok Adapter', dir: 'services/tiktok-adapter', port: 3011 },
  { name: 'API Gateway', dir: 'services/api-gateway', port: 3000 },
  { name: 'Facebook Adapter', dir: 'services/facebook-adapter', port: 3010 },
  { name: 'Frontend', dir: 'services/frontend', command: 'npm', args: ['run', 'dev'], port: 5173 }
];

function startService(service) {
  console.log(`🚀 Starting ${service.name}...`);
  
  const cmd = service.command || 'node';
  const args = service.args || ['src/index.js'];
  const cwd = path.join(process.cwd(), service.dir);

  const proc = spawn(cmd, args, { 
    cwd, 
    shell: true,
    env: { ...process.env, PORT: service.port }
  });

  proc.stdout.on('data', (data) => {
    console.log(`[${service.name}] ${data.toString().trim()}`);
  });

  proc.stderr.on('data', (data) => {
    console.error(`[${service.name}] ERROR: ${data.toString().trim()}`);
  });

  proc.on('close', (code) => {
    console.log(`[${service.name}] process exited with code ${code}`);
  });

  return proc;
}

console.log('--- AutoAds Multi-Service Launcher ---');
const processes = services.map(startService);

process.on('SIGINT', () => {
  console.log('\nStopping all services...');
  processes.forEach(p => p.kill());
  process.exit();
});
