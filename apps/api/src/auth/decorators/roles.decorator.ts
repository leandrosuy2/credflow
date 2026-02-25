import { SetMetadata } from '@nestjs/common';
import { TipoUsuario } from '@credflow/database';
import { ROLES_KEY } from '../guards/roles.guard';

export const Roles = (...roles: TipoUsuario[]) => SetMetadata(ROLES_KEY, roles);
