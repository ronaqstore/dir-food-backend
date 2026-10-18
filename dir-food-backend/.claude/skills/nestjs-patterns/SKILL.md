---
name: nestjs-patterns
description: >
  Copy-ready NestJS 12 patterns used in dir-food-backend: owner/admin/public controllers,
  services with Prisma, DTOs with class-validator + Swagger, module wiring, guards.
  Use when creating or modifying controllers, services, DTOs, modules, or guards.
---

# NestJS Patterns — Dir Food Backend

All examples mirror real code in `src/delivery-areas/`, `src/platform-admin/`, `src/public-catalog/`.

## 1. Owner controller (tenant from JWT)
```ts
import { Body, Controller, Get, HttpCode, HttpStatus, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { RestaurantAuthGuard } from '../../common/guards/restaurant-auth.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { DeliveryAreasService } from '../services/delivery-areas.service.js';
import { UpdateDeliveryAreasDto } from '../dto/update-delivery-areas.dto.js';

@ApiTags('Restaurant Owner - Delivery Areas')
@ApiBearerAuth('bearer')
@Controller('me/restaurant/delivery-areas')
@Roles(UserRole.RESTAURANT_OWNER)
@UseGuards(RolesGuard, RestaurantAuthGuard)
export class DeliveryAreasController {
  constructor(private readonly areasService: DeliveryAreasService) {}

  @Get()
  @ApiOperation({ summary: 'Get all platform areas with restaurant served and fee status' })
  async getDeliveryAreas(@CurrentUser() user: AuthenticatedUser) {
    return this.areasService.getDeliveryAreas(user.restaurantId!);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configure served delivery areas and delivery fees' })
  async updateDeliveryAreas(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateDeliveryAreasDto) {
    return this.areasService.updateDeliveryAreas(user.restaurantId!, dto);
  }
}
```
`RestaurantAuthGuard` re-checks the DB each request: SUSPENDED → GET only, DEACTIVATED → 403, DISABLED user → 403.

## 2. Admin controller
```ts
@ApiTags('Platform Admin Restaurants')
@ApiBearerAuth('bearer')
@Controller('admin')
@Roles(UserRole.PLATFORM_ADMIN)
@UseGuards(RolesGuard)              // add PlatformAdminGuard for a DB re-check of admin status
export class PlatformAdminController {
  constructor(private readonly adminService: PlatformAdminService) {}

  @Get('restaurants')
  async listRestaurants(@Query() query: QueryRestaurantsDto) {
    return this.adminService.listRestaurants(query);
  }

  @Patch('restaurants/:id/status')
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Body() dto: UpdateRestaurantStatusDto,
  ) {
    return this.adminService.updateStatus(user.userId, id, dto);   // actor id for audit
  }
}
```

## 3. Public controller
```ts
@ApiTags('Public Catalog')
@Public()
@Controller('public/restaurants')
export class PublicRestaurantsController {
  constructor(private readonly catalog: PublicCatalogService) {}

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.catalog.getRestaurantBySlug(slug);   // slugs, never internal UUIDs
  }
}
```

## 4. Service
```ts
@Injectable()
export class MenuItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async update(restaurantId: string, id: string, dto: UpdateMenuItemDto) {
    const existing = await this.prisma.menuItem.findFirst({
      where: { id, restaurantId },               // tenant scope
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Menu item not found');

    return this.prisma.menuItem.update({
      where: { id },
      data: {
        name: dto.name,
        basePrice: dto.basePrice !== undefined ? BigInt(dto.basePrice) : undefined,   // paisa
      },
    });
  }
}
```
Multi-write → `await this.prisma.$transaction(async (tx) => { ... })` and use `tx` inside.

## 5. DTO
```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';

export class DeliveryAreaItemDto {
  @ApiProperty({ example: '0192a000-0000-7000-8000-000000000001' })
  @IsUUID('7', { message: 'areaId must be a valid UUID v7' })
  @IsNotEmpty()
  areaId!: string;

  @ApiPropertyOptional({ example: 10000, description: 'Delivery fee in paisa (Rs 100 = 10000)', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryFee?: number | null;
}

export class UpdateDeliveryAreasDto {
  @ApiProperty({ type: [DeliveryAreaItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryAreaItemDto)
  areas!: DeliveryAreaItemDto[];
}
```
The global `ValidationPipe` uses `whitelist + forbidNonWhitelisted + transform`: **every** accepted field needs a decorator.
Query DTOs: use `@Type(() => Number)` for numeric query params (`page`, `limit`).

## 6. Module
```ts
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [MenuItemsController],
  providers: [MenuItemsService],
  exports: [MenuItemsService],
})
export class MenuItemsModule {}
```
Register new modules in `src/app.module.ts`. `JwtAuthGuard`, `HttpExceptionFilter`, and `ResponseEnvelopeInterceptor` are global there — don't re-add them per controller.

