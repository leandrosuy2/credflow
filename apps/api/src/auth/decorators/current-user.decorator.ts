import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Usuario } from '@credflow/database';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Usuario => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
