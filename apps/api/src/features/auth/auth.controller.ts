import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { SESSION_COOKIE } from './auth.constants';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsString()
  @MinLength(1)
  username: string;

  @IsString()
  @MinLength(1)
  password: string;
}

interface ResponseWithHeaders {
  setHeader(name: string, value: string): void;
}

interface RequestWithIdentity { user: { username: string; role: 'admin' | 'user' } }

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto, @Res({ passthrough: true }) response: ResponseWithHeaders) {
    const identity = this.authService.verifyCredentials(body.username, body.password);
    if (!identity) {
      throw new UnauthorizedException('Username or password is incorrect.');
    }

    const session = this.authService.createSession(identity);
    response.setHeader('Set-Cookie', this.authService.cookie(session.token, session.maxAge));
    return { authenticated: true, ...identity };
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) response: ResponseWithHeaders) {
    response.setHeader('Set-Cookie', this.authService.cookie('', 0));
    return { authenticated: false };
  }

  @Get('session')
  session(@Req() request: RequestWithIdentity) {
    return { authenticated: true, ...request.user };
  }
}
