import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import app from './app.js';

async function bootstrap() {
  await connectDatabase();
  app.listen(config.port, () => {
    console.log(`[Server] Running on http://localhost:${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
