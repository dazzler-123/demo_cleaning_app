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
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { User, Agent } from '../shared/models/index.js';

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
  let user = await User.findOne({ email: seed.email }).select('+password');
  if (user) {
    if (user.role !== 'agent') {
      console.warn('Skip (user exists, not agent):', seed.email, '| role:', user.role);
      return;
    }
    if (shouldUpdate) {
      const hashed = await bcrypt.hash(seed.password, 12);
      await User.findByIdAndUpdate(user._id, { $set: { password: hashed } });
      console.log('Updated agent password:', seed.email);
    } else {
      console.log('Agent user already exists:', seed.email);
    }
  } else {
    const hashed = await bcrypt.hash(seed.password, 12);
    user = await User.create({
      name: seed.name,
      email: seed.email,
      password: hashed,
      role: 'agent',
      status: 'active',
    });
    console.log('Seeded user (agent):', seed.email, '| password:', seed.password);
  }

  const agentProfile = await Agent.findOne({ userId: user!._id });
  if (agentProfile) {
    console.log('Agent profile already exists for:', seed.email);
  } else {
    await Agent.create({
      userId: user!._id,
      phone: seed.phone,
      skills: seed.skills,
      availability: 'available',
      dailyCapacity: seed.dailyCapacity,
      experience: seed.experience,
      status: 'active',
    });
    console.log('Seeded agent profile:', seed.email);
  }
}

async function seedAgents() {
  await mongoose.connect(config.mongoUri);

  const seeds = getAgentSeeds();
  console.log('Seeding', seeds.length, 'agent(s)...');
  for (const seed of seeds) {
    await ensureAgent(seed);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seedAgents().catch((err) => {
  console.error(err);
  process.exit(1);
});
