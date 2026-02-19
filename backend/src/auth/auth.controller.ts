import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiBody({ type: RegisterDto })
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiBody({ type: LoginDto })
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('supabase')
    @ApiOperation({ summary: 'Login with Supabase OAuth access token' })
    @ApiBody({ schema: { properties: { accessToken: { type: 'string' } } } })
    async supabaseAuth(@Body('accessToken') accessToken: string) {
        const user = await this.authService.validateSupabaseUser(accessToken);
        return this.authService.generateTokenResponse(user);
    }
}
