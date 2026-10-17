import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UpdateRestaurantHoursDto } from '../dto/update-hours.dto.js';
import {
  dateTimeToTimeString,
  timeStringToDate,
  validateWeeklyHours,
} from '../utils/opening-hours.util.js';

@Injectable()
export class RestaurantHoursService {
  constructor(private readonly prisma: PrismaService) {}

  async getHours(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const hours = await this.prisma.restaurantHours.findMany({
      where: { restaurantId },
      orderBy: [{ dayOfWeek: 'asc' }, { openTime: 'asc' }],
    });

    const daysMap = new Map<number, Array<{ openTime: string; closeTime: string }>>();
    for (let day = 0; day <= 6; day++) {
      daysMap.set(day, []);
    }

    for (const h of hours) {
      const ranges = daysMap.get(h.dayOfWeek) ?? [];
      ranges.push({
        openTime: dateTimeToTimeString(h.openTime),
        closeTime: dateTimeToTimeString(h.closeTime),
      });
      daysMap.set(h.dayOfWeek, ranges);
    }

    const result = Array.from(daysMap.entries()).map(([dayOfWeek, ranges]) => ({
      dayOfWeek,
      ranges,
    }));

    return result;
  }

  async updateHours(restaurantId: string, dto: UpdateRestaurantHoursDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const parsedRanges = validateWeeklyHours(dto.days);

    const rowsToInsert = parsedRanges.map((r) => ({
      restaurantId,
      dayOfWeek: r.dayOfWeek,
      openTime: timeStringToDate(r.openStr),
      closeTime: timeStringToDate(r.closeStr),
    }));

    await this.prisma.$transaction(async (tx) => {
      await tx.restaurantHours.deleteMany({
        where: { restaurantId },
      });

      if (rowsToInsert.length > 0) {
        await tx.restaurantHours.createMany({
          data: rowsToInsert,
        });
      }
    });

    return this.getHours(restaurantId);
  }
}
