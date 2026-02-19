import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async register(registerDto: RegisterDto) {
        const existingUser = await this.usersService.findByEmail(registerDto.email);
        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        const user = await this.usersService.create({
            email: registerDto.email,
            passwordHash: hashedPassword,
            name: registerDto.name,
        });

        return this.generateTokenResponse(user);
    }

    async login(loginDto: LoginDto) {
        const user = await this.usersService.findByEmail(loginDto.email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.passwordHash) {
            throw new UnauthorizedException('Please use Google login');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return this.generateTokenResponse(user);
    }

    async validateSupabaseUser(accessToken: string) {
        try {
            const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
            const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

            // Verify the access token by calling Supabase Auth REST API
            const { data: supabaseUser } = await axios.get(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    apikey: supabaseAnonKey,
                },
            });

            const { id: supabaseId, email, user_metadata } = supabaseUser;
            const name = user_metadata?.full_name || user_metadata?.name;

            if (!email) {
                throw new UnauthorizedException('Email not found in Supabase token');
            }

            // Find user by Supabase UID (stored in googleId field)
            let user = await this.usersService.findByGoogleId(supabaseId);

            if (!user) {
                // Check if user exists by email
                user = await this.usersService.findByEmail(email);
                if (user) {
                    // Link Supabase account to existing user
                    user = await this.usersService.update(user.id, {
                        googleId: supabaseId,
                    });
                } else {
                    // Create new user
                    user = await this.usersService.create({
                        email,
                        name: name || email.split('@')[0],
                        googleId: supabaseId,
                    });
                }
            }

            return user;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Invalid Supabase token');
        }
    }

    generateTokenResponse(user: { id: string; email: string; name: string | null }) {
        const payload = { sub: user.id, email: user.email };
        return {
            accessToken: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        };
    }
}
