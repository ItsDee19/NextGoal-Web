import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        configService: ConfigService,
        private authService: AuthService,
    ) {
        super({
            clientID: configService.get('GOOGLE_CLIENT_ID') || 'placeholder',
            clientSecret: configService.get('GOOGLE_CLIENT_SECRET') || 'placeholder',
            callbackURL: configService.get('GOOGLE_CALLBACK_URL') || 'http://localhost:3001/auth/google/callback',
            scope: ['email', 'profile'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<any> {
        const { id, emails, displayName } = profile;
        const user = await this.authService.validateGoogleUser({
            googleId: id,
            email: emails[0].value,
            name: displayName,
        });
        done(null, user);
    }
}
