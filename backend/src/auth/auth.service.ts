import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
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

    async validateGoogleUser(profile: {
        googleId: string;
        email: string;
        name: string;
    }) {
        let user = await this.usersService.findByGoogleId(profile.googleId);

        if (!user) {
            user = await this.usersService.findByEmail(profile.email);
            if (user) {
                // Link Google account to existing user
                user = await this.usersService.update(user.id, {
                    googleId: profile.googleId,
                });
            } else {
                // Create new user
                user = await this.usersService.create({
                    email: profile.email,
                    name: profile.name,
                    googleId: profile.googleId,
                });
            }
        }

        return user;
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
