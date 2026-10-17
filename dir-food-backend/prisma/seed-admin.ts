import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { UserRole, UserStatus } from '../src/generated/prisma/enums.js';
import { normalizePhone, isValidPakistaniMobile } from '../src/common/utils/phone.js';

async function bootstrapAdmin() {
  const prisma = new PrismaClient();

  const phone = process.env.BOOTSTRAP_ADMIN_PHONE || '923000000000';
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'AdminPass123!';
  const name = process.env.BOOTSTRAP_ADMIN_NAME || 'Platform Admin';

  const normalizedPhone = normalizePhone(phone);
  if (!isValidPakistaniMobile(normalizedPhone)) {
    console.error(`Invalid mobile phone number: ${phone}`);
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({
    where: { phone: normalizedPhone },
  });

  if (existing) {
    console.log(`Admin user with phone ${normalizedPhone} already exists. Skipping.`);
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      name,
      phone: normalizedPhone,
      passwordHash,
      role: UserRole.PLATFORM_ADMIN,
      status: UserStatus.ACTIVE,
      restaurantId: null,
    },
  });

  console.log(`Successfully created platform admin:`);
  console.log(`ID:    ${admin.id}`);
  console.log(`Name:  ${admin.name}`);
  console.log(`Phone: ${admin.phone}`);
  console.log(`Role:  ${admin.role}`);
  console.log(`Note: Change the password immediately upon first login.`);

  await prisma.$disconnect();
}

bootstrapAdmin().catch((err) => {
  console.error('Failed to bootstrap admin:', err);
  process.exit(1);
});
