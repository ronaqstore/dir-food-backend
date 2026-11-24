import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Ip,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { OrderIntentsService } from '../services/order-intents.service.js';
import { CreateOrderIntentDto } from '../dto/create-order-intent.dto.js';
import { isValidReferenceCode } from '../utils/reference-code.util.js';

@ApiTags('Public - Order Intents')
@Controller('public/order-intents')
@Public()
export class PublicOrderIntentsController {
  constructor(private readonly orderIntentsService: OrderIntentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Validate cart, snapshot order intent, and generate WhatsApp handoff link',
  })
  @ApiResponse({
    status: 201,
    description: 'Order intent created with pre-filled WhatsApp handoff URL',
  })
  @ApiResponse({
    status: 409,
    description:
      'Price changed (PRICE_CHANGED) or restaurant closed (RESTAURANT_CLOSED)',
  })
  @ApiResponse({
    status: 422,
    description: 'Cart validation error or items unavailable',
  })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async createOrderIntent(
    @Body() dto: CreateOrderIntentDto,
    @Ip() ipAddress: string,
  ) {
    const clientIp =
      ipAddress === '::1' ? '127.0.0.1' : ipAddress || '127.0.0.1';
    return this.orderIntentsService.createOrderIntent(dto, clientIp);
  }

  @Post(':ref/whatsapp-opened')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record customer pressing the Open WhatsApp handoff button',
  })
  @ApiResponse({
    status: 200,
    description: 'Handoff button click successfully recorded',
  })
  @ApiResponse({ status: 409, description: 'Order intent expired' })
  async recordWhatsAppOpened(@Param('ref') ref: string) {
    if (!isValidReferenceCode(ref)) {
      throw new BadRequestException('Invalid reference code format');
    }
    return this.orderIntentsService.recordWhatsAppOpened(ref);
  }

  @Get(':ref')
  @ApiOperation({
    summary: 'Re-show WhatsApp order handoff screen and rebuilt message',
  })
  @ApiResponse({
    status: 200,
    description: 'Active order intent details with WhatsApp link',
  })
  @ApiResponse({ status: 404, description: 'Order intent not found' })
  @ApiResponse({ status: 409, description: 'Order intent has expired' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getPublicOrderIntent(
    @Param('ref') ref: string,
    @Ip() ipAddress: string,
  ) {
    if (!isValidReferenceCode(ref)) {
      throw new BadRequestException('Invalid reference code format');
    }
    const clientIp =
      ipAddress === '::1' ? '127.0.0.1' : ipAddress || '127.0.0.1';
    return this.orderIntentsService.getPublicOrderIntent(ref, clientIp);
  }
}
