import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class JobFiltersDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    search?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    @MaxLength(100, { each: true })
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
    experienceLevel?: string[];

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    @MaxLength(100, { each: true })
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
    degree?: string[];

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    @MaxLength(100, { each: true })
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
    jobType?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    location?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    company?: string;

    @ApiPropertyOptional({ type: [String], description: 'Filter by source platform, for example greenhouse or lever' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    @MaxLength(100, { each: true })
    @Transform(({ value }) => Array.isArray(value) ? value : [value])
    source?: string[];

    @ApiPropertyOptional({ enum: ['24h', '7d', '30d'], description: 'Filter using the posting date supplied by the source; unknown dates are excluded' })
    @IsOptional()
    @IsIn(['24h', '7d', '30d'])
    postedWithin?: '24h' | '7d' | '30d';

    @ApiPropertyOptional({ type: Boolean, description: 'When true, only show listings whose location contains remote' })
    @IsOptional()
    @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
    @IsBoolean()
    remote?: boolean;

    @ApiPropertyOptional({ minimum: 1, maximum: 100000, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100000)
    page?: number = 1;

    @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}
