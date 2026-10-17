import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { CartValidationService } from '../services/cart-validation.service.js';
import { ValidateCartDto } from '../dto/validate-cart.dto.js';

@ApiTags('Public - Cart')
@Controller('public/cart')
@Public()
export class PublicCartController {
  constructor(private readonly cartValidationService: CartValidationService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-check and validate a cart against live prices and availability' })
  @ApiResponse({ status: 200, description: 'Validated cart lines, subtotal, and any detected problems' })
  async validateCart(@Body() dto: ValidateCartDto) {
    return this.cartValidationService.validateCart(
      dto.restaurantSlug,
      dto.items,
      dto.deliveryAreaId,
    );
  }
}

