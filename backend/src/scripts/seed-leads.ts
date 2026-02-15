/**
 * Seeds multiple leads with a fixed createdBy user id.
 * Run: npm run seed:leads (from backend)
 *
 * Uses MySQL/Prisma - requires users to be seeded first (npm run seed)
 * Uses createdBy: super admin user (or first admin user found)
 */
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase, prisma } from '../config/database.js';
import { leadsService } from '../modules/leads/leads.service.js';
import { UserRole } from '@prisma/client';

dotenv.config();


// Random company name generator
const companyPrefixes = [
  'Tech', 'Digital', 'Smart', 'Global', 'Prime', 'Elite', 'Pro', 'Apex', 'Nexus', 'Vertex',
  'Innovate', 'Synergy', 'Quantum', 'Matrix', 'Pinnacle', 'Summit', 'Zenith', 'Stellar', 'Nova', 'Aurora',
  'Business', 'Corporate', 'Enterprise', 'Professional', 'Advanced', 'Modern', 'Future', 'Next', 'Ultra', 'Mega'
];

const companySuffixes = [
  'Solutions', 'Systems', 'Services', 'Group', 'Corp', 'Ltd', 'Inc', 'Enterprises', 'Industries', 'Holdings',
  'Technologies', 'Consulting', 'Partners', 'Associates', 'Ventures', 'Capital', 'Works', 'Hub', 'Park', 'Tower',
  'Plaza', 'Center', 'Complex', 'Campus', 'Valley', 'Heights', 'Tower', 'Square', 'Point', 'Base'
];

const businessTypes = [
  'Office', 'Business', 'Corporate', 'Commercial', 'Professional', 'Executive', 'Corporate'
];

function getRandomCompanyName(): string {
  const prefix = companyPrefixes[Math.floor(Math.random() * companyPrefixes.length)];
  const suffix = companySuffixes[Math.floor(Math.random() * companySuffixes.length)];
  const businessType = businessTypes[Math.floor(Math.random() * businessTypes.length)];
  
  // Randomly choose between different formats
  const format = Math.floor(Math.random() * 3);
  switch (format) {
    case 0:
      return `${prefix} ${suffix}`;
    case 1:
      return `${prefix} ${businessType}`;
    case 2:
      return `${businessType} ${suffix}`;
    default:
      return `${prefix} ${suffix}`;
  }
}

const LEADS_SEED  = [
  {
    client: {
      companyName: getRandomCompanyName(),
      contactPerson: 'Rajesh Kumar',
      phone: '+91 9876543210',
      email: 'rajesh@techpark.com',
    },
    location: {
      address: 'Block A, Sector 62',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
    },
    cleaningDetails: {
      cleaningType: 'Office',
      category: 'Commercial',
      areaSize: '5200 sq ft',
      rooms: 22,
      washrooms: 8,
      floorType: 'Marble',
      frequency: 'Daily',
    },
    slaPriority: 'high' as const,
    leadType: 'facebook' as const,
    images: [],
  },
  {
    client: {
      companyName: getRandomCompanyName(),
      contactPerson: 'Amit Sharma',
      phone: '+91 9123456789',
      email: 'amit@infosys.com',
    },
    location: {
      address: 'Phase 2, Electronic City',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560100',
    },
    cleaningDetails: {
      cleaningType: 'Office',
      category: 'Commercial',
      areaSize: '12000 sq ft',
      rooms: 40,
      washrooms: 12,
      floorType: 'Granite',
      frequency: 'Daily',
    },
    slaPriority: 'high' as const,
    leadType: 'google' as const,
    images: [],
  },
  {
    client: {
      companyName: getRandomCompanyName(),
      contactPerson: 'Priya Verma',
      phone: '+91 9988776655',
      email: 'priya@startuphub.in',
    },
    location: {
      address: 'Sector 44',
      city: 'Gurgaon',
      state: 'Haryana',
      pincode: '122003',
    },
    cleaningDetails: {
      cleaningType: 'Office',
      category: 'Commercial',
      areaSize: '3000 sq ft',
      rooms: 12,
      washrooms: 4,
      floorType: 'Tile',
      frequency: 'Weekly',
    },
    slaPriority: 'medium' as const,
    leadType: 'instagram' as const,
    images: [],
  },
  {
    client: {
      companyName: getRandomCompanyName(),
      contactPerson: 'Neha Singh',
      phone: '+91 9012345678',
      email: 'neha@corporateplaza.com',
    },
    location: {
      address: 'Baner Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411045',
    },
    cleaningDetails: {
      cleaningType: 'Office',
      category: 'Commercial',
      areaSize: '7500 sq ft',
      rooms: 28,
      washrooms: 10,
      floorType: 'Wooden',
      frequency: 'Daily',
    },
    slaPriority: 'high' as const,
    leadType: 'website' as const,
    images: [],
  },
  {
    client: {
      companyName: getRandomCompanyName(),
      contactPerson: 'Rohit Mehta',
      phone: '+91 9345678123',
      email: 'rohit@itheights.com',
    },
    location: {
      address: 'Hitech City',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
    },
    cleaningDetails: {
      cleaningType: 'Office',
      category: 'Commercial',
      areaSize: '9800 sq ft',
      rooms: 35,
      washrooms: 14,
      floorType: 'Granite',
      frequency: 'Daily',
    },
    slaPriority: 'high' as const,
    leadType: 'referral' as const,
    images: [],
  },

  // ---- 15 more ----

  {
    client: {
      companyName: getRandomCompanyName(),
      contactPerson: 'Ankit Gupta',
      phone: '+91 9567890123',
      email: 'ankit@businessbay.com',
    },
    location: {
      address: 'Sector 18',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
    },
    cleaningDetails: {
      cleaningType: 'Office',
      category: 'Commercial',
      areaSize: '4300 sq ft',
      rooms: 18,
      washrooms: 6,
      floorType: 'Tile',
      frequency: 'Weekly',
    },
    slaPriority: 'medium' as const,
    leadType: 'phone_call' as const,
    images: [],
  },
  {
    client: {
      companyName: getRandomCompanyName(),
      contactPerson: 'Pooja Patel',
      phone: '+91 9786541230',
      email: 'pooja@knowledgepark.in',
    },
    location: {
      address: 'Viman Nagar',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411014',
    },
    cleaningDetails: {
      cleaningType: 'Office',
      category: 'Commercial',
      areaSize: '6100 sq ft',
      rooms: 24,
      washrooms: 9,
      floorType: 'Marble',
      frequency: 'Daily',
    },
    slaPriority: 'high' as const,
    leadType: 'email' as const,
    images: [],
  },

  {
    client: {
      companyName: getRandomCompanyName(),
      contactPerson: 'Suresh Iyer',
      phone: '+91 9654321876',
      email: 'suresh@wipro.com',
    },
    location: {
      address: 'Sarjapur Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560035',
    },
    cleaningDetails: {
      cleaningType: 'Office',
      category: 'Commercial',
      areaSize: '15000 sq ft',
      rooms: 50,
      washrooms: 18,
      floorType: 'Granite',
      frequency: 'Daily',
    },
    slaPriority: 'high' as const,
    leadType: 'walk_in' as const,
    images: [],
  },

  {
    client: {
      companyName: getRandomCompanyName(),
      contactPerson: 'Kunal Jain',
      phone: '+91 9898989898',
      email: 'kunal@techvalley.in',
    },
    location: {
      address: 'Whitefield',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560066',
    },
    cleaningDetails: {
      cleaningType: 'Office',
      category: 'Commercial',
      areaSize: '2800 sq ft',
      rooms: 10,
      washrooms: 3,
      floorType: 'Tile',
      frequency: 'Monthly',
    },
    slaPriority: 'low' as const,
    leadType: 'other' as const,
    images: [],
  },

  {
    client: {
      companyName: getRandomCompanyName(),
      contactPerson: 'Deepak Mishra',
      phone: '+91 9445566778',
      email: 'deepak@smartworks.com',
    },
    location: {
      address: 'DLF Phase 3',
      city: 'Gurgaon',
      state: 'Haryana',
      pincode: '122010',
    },
    cleaningDetails: {
      cleaningType: 'Office',
      category: 'Commercial',
      areaSize: '8900 sq ft',
      rooms: 32,
      washrooms: 11,
      floorType: 'Marble',
      frequency: 'Daily',
    },
    slaPriority: 'high' as const,
    leadType: 'website' as const,
    images: [],
  },

  // total = 20 objects
];



async function seedLeads() {
  await connectDatabase();

  // Find or use super admin user as createdBy
  let createdByUser = await prisma.user.findFirst({
    where: { role: UserRole.SUPER_ADMIN },
  });

  if (!createdByUser) {
    // Fallback to first admin user
    createdByUser = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });
  }

  if (!createdByUser) {
    console.error('Error: No admin or super_admin user found. Please run npm run seed first.');
    await disconnectDatabase();
    process.exit(1);
  }

  const createdBy = createdByUser.id;
  let created = 0;

  for (const data of LEADS_SEED) {
    try {
      await leadsService.create({
        ...data,
      }, createdBy);
      created++;
      console.log('Seeded lead:', data.client.companyName);
    } catch (error) {
      console.error(`Error seeding lead ${data.client.companyName}:`, error);
    }
  }

  console.log(`\nDone. Created ${created} leads (createdBy: ${createdByUser.email}).`);
  await disconnectDatabase();
  process.exit(0);
}

seedLeads().catch((err) => {
  console.error(err);
  process.exit(1);
});
