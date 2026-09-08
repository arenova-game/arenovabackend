import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private supabase: SupabaseService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }

    try {
      // 1. Vérifier le token avec Supabase
      const { data, error } = await this.supabase.getClient().auth.getUser(token);
      if (error || !data.user) {
        throw new UnauthorizedException('Session invalide');
      }

      // 2. Vérifier si la route exige un rôle Admin
      const requiredRole = this.reflector.get<string>('role', context.getHandler());
      
      if (requiredRole === 'admin') {
        const { data: profile } = await this.supabase.getClient()
          .from('profiles')
          .select('is_admin')
          .eq('id', data.user.id)
          .single();

        if (!profile?.is_admin) {
          throw new ForbiddenException('Accès réservé aux administrateurs');
        }
      }

      request['user'] = data.user;
    } catch (e) {
      throw e instanceof ForbiddenException ? e : new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
