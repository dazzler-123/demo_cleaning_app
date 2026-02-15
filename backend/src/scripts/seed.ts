/**
 * Seeds the super admin (and optional admin/agent) users for the Cleaning Agent app.
 * Run: npm run seed (from backend)
 *
 * Env overrides:
 *   SUPER_ADMIN_EMAIL    - super admin email (default: admin@cleaning.com)
 *   SUPER_ADMIN_PASSWORD - super admin password (default: Admin@123)
 *   SEED_UPDATE=1       - if set, update existing super admin password to SUPER_ADMIN_PASSWORD
 */
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { prisma } from '../config/database.js';

dotenv.config();

const shouldUpdate = process.env.SEED_UPDATE === '1' || process.env.SEED_UPDATE === 'true';

const SUPER_ADMIN_SEED = {
  name: 'Super Admin',
  email: process.env.SUPER_ADMIN_EMAIL ?? 'admin@cleaning.com',
  password: process.env.SUPER_ADMIN_PASSWORD ?? 'Admin@123',
  role: 'super_admin' as const,
  status: 'active' as const,
};

const ADMIN_SEED = {
  name: 'Admin',
  email: process.env.ADMIN_EMAIL ?? 'admin2@cleaning.com',
  password: process.env.ADMIN_PASSWORD ?? 'Admin@123',
  role: 'admin' as const,
  status: 'active' as const,
};

const AGENT_SEED = {
  name: 'Test Agent',
  email: process.env.AGENT_EMAIL ?? 'agent@cleaning.com',
  password: process.env.AGENT_PASSWORD ?? 'Agent@123',
  role: 'agent' as const,
  status: 'active' as const,
};

async function ensureUser(seed: { name: string; email: string; password: string; role: 'super_admin' | 'admin' | 'agent'; status: 'active' }) {
  const existing = await prisma.user.findUnique({ where: { email: seed.email } });
  if (existing) {
    if (shouldUpdate && seed.role === 'super_admin') {
      const hashed = await bcrypt.hash(seed.password, 12);
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: hashed },
      });
      console.log('Updated super admin password:', seed.email);
      return;
    }
    console.log('User already exists:', seed.email);
    return;
  }
  const hashed = await bcrypt.hash(seed.password, 12);
  await prisma.user.create({
    data: {
      name: seed.name,
      email: seed.email,
      password: hashed,
      role: seed.role,
      status: seed.status,
    },
  });
  console.log('Seeded:', seed.role, seed.email, '| password:', seed.password);
}

async function seed() {
  await connectDatabase();

  await ensureUser(SUPER_ADMIN_SEED);
  await ensureUser(ADMIN_SEED);
  await ensureUser(AGENT_SEED);

  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
