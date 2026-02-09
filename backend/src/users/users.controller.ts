import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    async getProfile(@CurrentUser() user: { id: string }) {
        const fullUser = await this.usersService.findById(user.id);
        if (!fullUser) {
            throw new NotFoundException('User not found');
        }
        return {
            id: fullUser.id,
            email: fullUser.email,
            name: fullUser.name,
            preferences: fullUser.preferences,
        };
    }

    @Put('me/preferences')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update user preferences' })
    async updatePreferences(
        @CurrentUser() user: { id: string },
        @Body() dto: UpdatePreferencesDto,
    ) {
        return this.usersService.updatePreferences(user.id, dto.preferences);
    }

    @Get('me/saved-jobs')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get saved jobs' })
    async getSavedJobs(@CurrentUser() user: { id: string }) {
        return this.usersService.getSavedJobs(user.id);
    }

    @Post('me/saved-jobs/:jobId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Save a job' })
    async saveJob(
        @CurrentUser() user: { id: string },
        @Param('jobId') jobId: string,
    ) {
        await this.usersService.saveJob(user.id, jobId);
        return { message: 'Job saved successfully' };
    }

    @Delete('me/saved-jobs/:jobId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Unsave a job' })
    async unsaveJob(
        @CurrentUser() user: { id: string },
        @Param('jobId') jobId: string,
    ) {
        await this.usersService.unsaveJob(user.id, jobId);
        return { message: 'Job removed from saved' };
    }
}
