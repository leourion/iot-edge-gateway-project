import { SetMetadata } from '@nestjs/common';
import { REQUIRED_ROLES_KEY } from './auth.constants';
import { AuthRole } from './auth.service';

export const Roles = (...roles: AuthRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);
