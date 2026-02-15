import dotenv from 'dotenv';
import { StringValue } from 'ms';


dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: process.env.DATABASE_URL as string,
  jwt: {  
    secret: process.env.JWT_SECRET as string ?? 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN as StringValue ?? '7d',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
    apiKey: process.env.CLOUDINARY_API_KEY as string,
    apiSecret: process.env.CLOUDINARY_API_SECRET as string,
  },
} as const;

console.log(config.cloudinary);
