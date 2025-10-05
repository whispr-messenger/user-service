import * as http from 'http';

interface RequestOptions {
  hostname: string;
  port: number;
  path: string;
  method: string;
  timeout: number;
}

const options: RequestOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/health',
  method: 'GET',
  timeout: 2000,
};

const req = http.request(options, (res: http.IncomingMessage) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();