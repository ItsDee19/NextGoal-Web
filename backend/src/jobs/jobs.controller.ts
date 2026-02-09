import { Controller, Get, Param, Query, UseGuards, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JobFiltersDto } from './dto/job-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
    constructor(
        private jobsService: JobsService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'List jobs with filtering and pagination' })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'experienceLevel', required: false, isArray: true })
    @ApiQuery({ name: 'degree', required: false, isArray: true })
    @ApiQuery({ name: 'jobType', required: false, isArray: true })
    @ApiQuery({ name: 'location', required: false })
    @ApiQuery({ name: 'company', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async findAll(@Query() filters: JobFiltersDto) {
        return this.jobsService.findAll(filters);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get job statistics' })
    async getStats() {
        return this.jobsService.getStats();
    }

    @Get('filters')
    @ApiOperation({ summary: 'Get available filter options' })
    async getFilterOptions() {
        return this.jobsService.getFilterOptions();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get job by ID' })
    async findById(@Param('id') id: string) {
        return this.jobsService.findById(id);
    }
}
