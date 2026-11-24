import bcrypt from 'bcrypt';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { UserRole, UserStatus } from '../../src/generated/prisma/enums.js';
import { normalizePhone, isValidPakistaniMobile } from '../../src/common/utils/phone.js';

export interface AdminAccountInfo {
  name: string;
  phone: string;
  rawPhone: string;
}

export interface SeedAdminsResult {
  admins: AdminAccountInfo[];
  defaultPassword: string;
}

export async function seedAdmins(prisma: PrismaClient): Promise<SeedAdminsResult> {
  const sharedPassword = process.env.SEED_ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'admin@123');
  if (!sharedPassword) {
    throw new Error('SEED_ADMIN_PASSWORD must be explicitly provided in production environments');
  }
  const passwordHash = await bcrypt.hash(sharedPassword, 12);

  const adminAccounts: AdminAccountInfo[] = [
    {
      phone: normalizePhone(process.env.ADMIN_PRIVATE_PHONE_1 || '03115514151'),
      rawPhone: '03115514151',
      name: 'Super Admin 1',
    },
    {
      phone: normalizePhone(process.env.ADMIN_PRIVATE_PHONE_2 || '03059596704'),
      rawPhone: '03059596704',
      name: 'Super Admin 2',
    },
  ];

  for (const adm of adminAccounts) {
    if (!isValidPakistaniMobile(adm.phone)) {
      throw new Error(`Invalid admin mobile phone number: ${adm.phone}`);
    }
  }

  // Disable legacy test admin phone if present
  const legacyAdminPhones = [normalizePhone('03000000000')];
  for (const legacyPhone of legacyAdminPhones) {
    await prisma.user.updateMany({
      where: { phone: legacyPhone, role: UserRole.PLATFORM_ADMIN },
      data: {
        status: UserStatus.DISABLED,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  }

  for (const adm of adminAccounts) {
    await prisma.user.upsert({
      where: { phone: adm.phone },
      update: {
        name: adm.name,
        role: UserRole.PLATFORM_ADMIN,
        status: UserStatus.ACTIVE,
        restaurantId: null,
        failedLoginCount: 0,
        lockedUntil: null,
      },
      create: {
        name: adm.name,
        phone: adm.phone,
        passwordHash,
        role: UserRole.PLATFORM_ADMIN,
        status: UserStatus.ACTIVE,
        restaurantId: null,
      },
    });
  }

  return {
    admins: adminAccounts,
    defaultPassword: sharedPassword,
  };
}
