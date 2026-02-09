import { IsOptional, IsString, IsArray, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class JobFiltersDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
    experienceLevel?: string[];

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
    degree?: string[];

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
    jobType?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    company?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    page?: number = 1;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    limit?: number = 20;
}
