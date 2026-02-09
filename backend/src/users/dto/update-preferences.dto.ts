import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePreferencesDto {
    @ApiProperty({
        example: {
            experienceLevel: ['fresher', '1-3'],
            degree: ['btech', 'any'],
            jobType: ['full-time'],
            locations: ['Bangalore', 'Remote'],
        },
    })
    @IsObject()
    preferences: Record<string, any>;
}
