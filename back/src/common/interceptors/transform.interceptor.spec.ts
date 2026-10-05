import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  it('wraps the handler result with the response status code', async () => {
    const context = {
      switchToHttp: () => ({ getResponse: () => ({ statusCode: 201 }) }),
    } as unknown as ExecutionContext;
    const next: CallHandler = { handle: () => of({ id: 1 }) };

    const result = await lastValueFrom(new TransformInterceptor().intercept(context, next));

    expect(result).toEqual({ statusCode: 201, data: { id: 1 } });
  });
});
