import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PublicCartController } from './controllers/public-cart.controller.js';
import { PublicOrderIntentsController } from './controllers/public-order-intents.controller.js';
import { RestaurantOrderIntentsController } from './controllers/restaurant-order-intents.controller.js';
import { CartValidationService } from './services/cart-validation.service.js';
import { OrderIntentsService } from './services/order-intents.service.js';
import { WhatsappMessageService } from './services/whatsapp-message.service.js';
import { OrderIntentRateLimiterService } from './services/rate-limiter.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [
    PublicCartController,
    PublicOrderIntentsController,
    RestaurantOrderIntentsController,
  ],
  providers: [
    CartValidationService,
    OrderIntentsService,
    WhatsappMessageService,
    OrderIntentRateLimiterService,
  ],
  exports: [
    CartValidationService,
    OrderIntentsService,
    WhatsappMessageService,
  ],
})
export class OrderIntentsModule {}
