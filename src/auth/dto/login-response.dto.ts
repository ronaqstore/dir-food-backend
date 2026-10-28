import { UserRole } from '../../generated/prisma/enums.js';

export class OwnerLoginResponseDto {
  accessToken!: string;
  tokenType!: string;
  expiresIn!: string | number;
  user!: {
    id: string;
    name: string;
    phone: string;
    role: UserRole;
  };
  restaurantId!: string;
  restaurant!: {
    id: string;
    name: string;
    slug: string;
    status: string;
    subscriptionStatus: string;
  };
}

export class PlatformAdminLoginResponseDto {
  accessToken!: string;
  tokenType!: string;
  expiresIn!: string | number;
  admin!: {
    id: string;
    name: string;
    phone: string;
    role: UserRole;
  };
}

