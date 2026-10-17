import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAdminAuthController } from './platform-admin-auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard.js';

describe('PlatformAdminAuthController', () => {
  let controller: PlatformAdminAuthController;

  const mockAuthService = {
    issuePasswordSetupLink: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformAdminAuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      .overrideGuard(PlatformAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PlatformAdminAuthController>(PlatformAdminAuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('issues password setup link via authService', async () => {
    const mockResponse = {
      userId: 'user-123',
      userName: 'Test Owner',
      userPhone: '923001234567',
      expiresAt: new Date(),
      setupUrl: 'http://localhost:3000/setup-password?token=mocktoken',
      replacedPreviousLink: false,
    };
    mockAuthService.issuePasswordSetupLink.mockResolvedValue(mockResponse);

    const result = await controller.issuePasswordSetupLink('user-123');
    expect(result).toEqual(mockResponse);
    expect(mockAuthService.issuePasswordSetupLink).toHaveBeenCalledWith('user-123');
  });
});
