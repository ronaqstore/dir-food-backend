import { UserRole, UserStatus, RestaurantStatus, ManualStatus } from '../../generated/prisma/enums.js';

export class MeResponseDto {
  id!: string;
  name!: string;
  phone!: string;
  role!: UserRole;
  status!: UserStatus;
  restaurant!: {
    id: string;
    name: string;
    slug: string;
    status: RestaurantStatus;
    trialStartedAt: Date | null;
    subscriptionEndsAt: Date | null;
    whatsappNumber: string | null;
    contactPhone: string | null;
    manualStatus: ManualStatus;
  } | null;
}

