import { Module } from '@nestjs/common';
import { R2StorageService } from './services/r2-storage.service.js';
import { ImageProcessorService } from './services/image-processor.service.js';
import { AppConfigurationModule } from '../app-configuration/app-configuration.module.js';

@Module({
  imports: [AppConfigurationModule],
  providers: [R2StorageService, ImageProcessorService],
  exports: [R2StorageService, ImageProcessorService],
})
export class UploadsModule {}
