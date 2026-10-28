import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class TimeRangeDto {
  @ApiProperty({ example: '10:00', description: 'Opening time in HH:mm (24-hour)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'openTime must be a valid 24-hour time in HH:mm format',
  })
  openTime!: string;

  @ApiProperty({ example: '23:00', description: 'Closing time in HH:mm (earlier than openTime = overnight)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'closeTime must be a valid 24-hour time in HH:mm format',
  })
  closeTime!: string;
}

export class DayHoursDto {
  @ApiProperty({ example: 1, description: 'Day of week: 0 (Sunday) to 6 (Saturday)' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ type: [TimeRangeDto], description: 'List of operating time ranges for this day' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  ranges!: TimeRangeDto[];
}

export class UpdateRestaurantHoursDto {
  @ApiProperty({ type: [DayHoursDto], description: 'Weekly hours schedule' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayHoursDto)
  days!: DayHoursDto[];
}
