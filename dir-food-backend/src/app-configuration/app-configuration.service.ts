import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Joi from 'joi';

@Injectable()
export class AppConfigurationService {
  constructor(private readonly configService: ConfigService) {}

  static validate(config: Record<string, unknown>): Record<string, unknown> {
    const schema = Joi.object<Record<string, unknown>>({
      NODE_ENV: Joi.string()
        .valid('development', 'staging', 'production', 'test')
        .default('development'),
      PORT: Joi.number().integer().min(1).max(65535).default(4000),
      DATABASE_URL: Joi.string()
        .uri({ scheme: ['postgresql', 'postgres'] })
        .required(),
      JWT_SECRET: Joi.string().min(16).required(),
      CORS_ORIGINS: Joi.string().required(),
      APP_BASE_URL: Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .default('http://localhost:3000'),
      R2_ACCOUNT_ID: Joi.string().when('R2_STORAGE_ENABLED', {
        is: 'true',
        then: Joi.required(),
        otherwise: Joi.allow('').optional(),
      }),
      R2_ACCESS_KEY_ID: Joi.string().when('R2_STORAGE_ENABLED', {
        is: 'true',
        then: Joi.required(),
        otherwise: Joi.allow('').optional(),
      }),
      R2_SECRET_ACCESS_KEY: Joi.string().when('R2_STORAGE_ENABLED', {
        is: 'true',
        then: Joi.required(),
        otherwise: Joi.allow('').optional(),
      }),
      R2_BUCKET: Joi.string().when('R2_STORAGE_ENABLED', {
        is: 'true',
        then: Joi.required(),
        otherwise: Joi.allow('').optional(),
      }),
      R2_PUBLIC_URL_BASE: Joi.string()
        .uri({ scheme: ['https'] })
        .when('R2_STORAGE_ENABLED', {
          is: 'true',
          then: Joi.required(),
          otherwise: Joi.allow('').optional(),
        }),
      R2_STORAGE_ENABLED: Joi.string().valid('true', 'false').default('false'),
    });

    const result = schema.validate(config, {
      allowUnknown: true,
      abortEarly: false,
    });

    if (result.error) {
      throw new Error(`Configuration validation error: ${result.error.message}`);
    }

    const value = result.value;
    const origins = String(value.CORS_ORIGINS ?? '')
      .replace(/"/g, '')
      .split(',')
      .map((origin) => origin.trim());
    if (value.NODE_ENV === 'production' && origins.includes('*')) {
      throw new Error(
        'Configuration validation error: CORS_ORIGINS must not contain "*" in production',
      );
    }

    return value;
  }

  get port(): number {
    const value = this.configService.get<string>('PORT') ?? '4000';
    return parseInt(value, 10);
  }

  get databaseUrl(): string {
    return this.configService.get<string>('DATABASE_URL') ?? '';
  }

  get corsOrigins(): string[] {
    let value = this.configService.get<string>('CORS_ORIGINS');
    if (!value) {
      throw new Error('CORS_ORIGINS environment variable is missing');
    }
    value = value.replace(/"/g, '');
    if (value === '*') {
      return ['*'];
    }
    return value.split(',').map((origin) => origin.trim());
  }

  get appBaseUrl(): string {
    const value = this.configService.get<string>('APP_BASE_URL') ?? 'http://localhost:3000';
    return value.replace(/\/+$/, '');
  }

  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') ?? '';
  }

  get r2StorageEnabled(): boolean {
    return this.configService.get<string>('R2_STORAGE_ENABLED') === 'true';
  }

  get r2(): {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    publicUrlBase: string;
  } {
    if (!this.r2StorageEnabled) {
      return {
        accountId: '',
        accessKeyId: '',
        secretAccessKey: '',
        bucket: '',
        publicUrlBase: '',
      };
    }
    return {
      accountId: this.configService.get<string>('R2_ACCOUNT_ID') ?? '',
      accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID') ?? '',
      secretAccessKey: this.configService.get<string>('R2_SECRET_ACCESS_KEY') ?? '',
      bucket: this.configService.get<string>('R2_BUCKET') ?? '',
      publicUrlBase: (this.configService.get<string>('R2_PUBLIC_URL_BASE') ?? '').replace(/\/+$/, ''),
    };
  }
}
