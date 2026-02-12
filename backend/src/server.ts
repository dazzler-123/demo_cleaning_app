import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import app from './app.js';

async function bootstrap() {
  await connectDatabase();

  const port = process.env.PORT || config.port || 3000;

  app.listen(port, () => {
    console.log(`[Server] Running on port ${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
