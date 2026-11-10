import { AuthTokenType } from '../../common/guards/auth-token.js';

export interface AuthTokenClaims {
  sub: string;
  userId: string;
  typ: AuthTokenType;
  restaurantId?: string | null;
  role?: string;
}

