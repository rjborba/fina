import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

function createHost() {
  const json = jest.fn<void, [Record<string, unknown>]>();
  const status = jest.fn(() => ({ json }));
  const setHeader = jest.fn();
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', path: '/test' }),
      getResponse: () => ({ status, setHeader }),
    }),
  } as ArgumentsHost;
  return { host, json, setHeader, status };
}

describe('ApiExceptionFilter', () => {
  const filter = new ApiExceptionFilter();

  it('returns a stable request error shape', () => {
    const response = createHost();
    filter.catch(new BadRequestException('groupId is required'), response.host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INVALID_REQUEST',
        message: 'groupId is required',
      }),
    );
    const body = response.json.mock.calls[0]?.[0];
    expect(body?.requestId).toEqual(expect.any(String));
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Request-Id',
      body?.requestId,
    );
  });

  it('does not expose unexpected exception text', () => {
    const response = createHost();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    filter.catch(
      new Error('select * from transactions where secret = token'),
      response.host,
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      }),
    );
    expect(JSON.stringify(response.json.mock.calls)).not.toContain('secret');
    expect(JSON.stringify(response.json.mock.calls)).not.toContain('token');
    consoleSpy.mockRestore();
  });
});
