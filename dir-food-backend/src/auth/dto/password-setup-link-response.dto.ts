export class PasswordSetupLinkResponseDto {
  userId!: string;
  userName!: string;
  userPhone!: string;
  expiresAt!: Date;
  setupUrl!: string;
  replacedPreviousLink!: boolean;
}

