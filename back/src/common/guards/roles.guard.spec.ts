import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY, Roles } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  const contextWith = (user?: { role: string }) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  const guardRequiring = (roles?: string[]) => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(roles) } as unknown as Reflector;
    return new RolesGuard(reflector);
  };

  it('allows any request when the route has no role requirement', () => {
    expect(guardRequiring(undefined).canActivate(contextWith())).toBe(true);
  });

  it('allows a user whose role is in the required list', () => {
    expect(guardRequiring(['ADMIN', 'CLIENT']).canActivate(contextWith({ role: 'CLIENT' }))).toBe(true);
  });

  it('denies a user whose role is not in the list', () => {
    expect(guardRequiring(['ADMIN']).canActivate(contextWith({ role: 'CLIENT' }))).toBe(false);
  });

  it('denies requests without a user', () => {
    expect(guardRequiring(['ADMIN']).canActivate(contextWith(undefined))).toBeFalsy();
  });

  it('Roles decorator stores the roles under ROLES_KEY', () => {
    class Sample {
      @Roles('ADMIN', 'CLIENT')
      handler() {}
    }
    expect(Reflect.getMetadata(ROLES_KEY, Sample.prototype.handler)).toEqual(['ADMIN', 'CLIENT']);
  });
});
