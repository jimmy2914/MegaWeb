import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  const run = (exception: unknown) => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/v1/test' }),
      }),
    } as unknown as ArgumentsHost;
    filter.catch(exception, host);
    return { status, body: json.mock.calls[0][0] };
  };

  it('uses the status and response of an HttpException', () => {
    const { status, body } = run(new BadRequestException('datos inválidos'));
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(body).toMatchObject({ statusCode: 400, path: '/api/v1/test' });
    expect(body.message).toMatchObject({ message: 'datos inválidos' });
    expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('answers 500 with a generic message for unknown errors', () => {
    const { status, body } = run(new Error('boom'));
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body).toMatchObject({ statusCode: 500, message: 'Internal server error' });
  });
});
