const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst({ where: { email: 'admin@demo.com' } });
  if (existing) {
    console.log('Already seeded! Login: admin@demo.com / Admin@123');
    return;
  }

  const tenantId = randomUUID();
  const branchId = randomUUID();
  const roleId = randomUUID();
  const userId = randomUUID();

  await prisma.tenant.create({
    data: {
      id: tenantId,
      name: 'Demo Pharmacy',
      subdomain: 'demo',
      planId: 'pro',
      status: 'active',
      enabledModules: ['pos','inventory','purchasing','prescriptions','drug-interactions','accounts','payroll','notifications','loyalty','delivery','fbr','reports','admin'],
      settings: {
        email: 'demo@pharmacy.com',
        phone: '+92-300-1234567',
        address: '123 Main Street',
        city: 'Karachi',
        ntn: '1234567-8',
        strn: 'SRN-123456',
        currency: 'PKR',
        timezone: 'Asia/Karachi',
        dateFormat: 'DD/MM/YYYY'
      }
    }
  });

  await prisma.branch.create({
    data: { id: branchId, tenantId, name: 'Main Branch', address: '123 Main Street, Karachi', isActive: true }
  });

  await prisma.role.create({
    data: {
      id: roleId,
      tenantId,
      name: 'admin',
      isSystem: true,
      permissions: [{ action: '*', resource: '*' }]
    }
  });

  const hash = await bcrypt.hash('Admin@123', 12);
  await prisma.user.create({
    data: {
      id: userId,
      tenantId,
      branchId,
      email: 'admin@demo.com',
      passwordHash: hash,
      name: 'Admin User',
      roleId,
      isActive: true
    }
  });

  console.log('✅ Seed complete!');
  console.log('Email: admin@demo.com');
  console.log('Password: Admin@123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
