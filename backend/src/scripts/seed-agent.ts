/**
 * Seeds multiple users with role "agent" and their linked Agent profiles.
 * Run: npm run seed:agent (from backend)
 *
 * Env overrides (single-agent mode when only AGENT_EMAIL is set):
 *   AGENT_EMAIL    - agent email (default: agent@cleaning.com)
 *   AGENT_PASSWORD - agent password (default: Agent@123)
 *   AGENT_NAME     - agent display name (default: Test Agent)
 *   SEED_UPDATE=1  - if set, update existing agent user password
 *
 * Otherwise seeds the default multi-agent list below.
 */
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { prisma } from '../config/database.js';

dotenv.config();

const shouldUpdate = process.env.SEED_UPDATE === '1' || process.env.SEED_UPDATE === 'true';

type AgentSeed = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  skills: string[];
  dailyCapacity: number;
  experience?: string;
};

const DEFAULT_AGENTS: AgentSeed[] = [
  { name: 'Test Agent 4', email: 'agent4@cleaning.com', password: 'Agent@123', skills: ['Office', 'Commercial'], dailyCapacity: 5 },
  { name: 'Agent Two', email: 'agent2@cleaning.com', password: 'Agent@123', skills: ['Residential', 'Deep Clean'], dailyCapacity: 4 },
  { name: 'Agent Three', email: 'agent3@cleaning.com', password: 'Agent@123', skills: ['Office', 'Industrial'], dailyCapacity: 6 },
];

function getAgentSeeds(): AgentSeed[] {
  const singleEmail = process.env.AGENT_EMAIL;
  const singlePassword = process.env.AGENT_PASSWORD ?? 'Agent@123';
  const singleName = process.env.AGENT_NAME ?? 'Test Agent';
  if (singleEmail) {
    return [
      {
        name: singleName,
        email: singleEmail,
        password: singlePassword,
        phone: process.env.AGENT_PHONE,
        skills: (process.env.AGENT_SKILLS ?? 'Office,Commercial').split(',').map((s) => s.trim()),
        dailyCapacity: Number(process.env.AGENT_DAILY_CAPACITY ?? '5') || 5,
        experience: process.env.AGENT_EXPERIENCE,
      },
    ];
  }
  return DEFAULT_AGENTS;
}

async function ensureAgent(seed: AgentSeed): Promise<void> {
  let user = await prisma.user.findUnique({ where: { email: seed.email } });
  if (user) {
    if (user.role !== 'agent') {
      console.warn('Skip (user exists, not agent):', seed.email, '| role:', user.role);
      return;
    }
    if (shouldUpdate) {
      const hashed = await bcrypt.hash(seed.password, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
      });
      console.log('Updated agent password:', seed.email);
    } else {
      console.log('Agent user already exists:', seed.email);
    }
  } else {
    const hashed = await bcrypt.hash(seed.password, 12);
    user = await prisma.user.create({
      data: {
        name: seed.name,
        email: seed.email,
        password: hashed,
        role: 'agent',
        status: 'active',
      },
    });
    console.log('Seeded user (agent):', seed.email, '| password:', seed.password);
  }

  const agentProfile = await prisma.agent.findUnique({ where: { userId: user!.id } });
  if (agentProfile) {
    console.log('Agent profile already exists for:', seed.email);
  } else {
    await prisma.agent.create({
      data: {
        userId: user!.id,
        phone: seed.phone,
        skills: JSON.stringify(seed.skills),
        availability: 'available',
        dailyCapacity: seed.dailyCapacity,
        experience: seed.experience,
        status: 'active',
      },
    });
    console.log('Seeded agent profile:', seed.email);
  }
}

async function seedAgents() {
  await connectDatabase();

  const seeds = getAgentSeeds();
  console.log('Seeding', seeds.length, 'agent(s)...');
  for (const seed of seeds) {
    await ensureAgent(seed);
  }

  await disconnectDatabase();
  process.exit(0);
}

seedAgents().catch((err) => {
  console.error(err);
  process.exit(1);
});
