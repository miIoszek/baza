import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from '@baza/api-core';
import { MulterError } from 'multer';

describe('AllExceptionsFilter Multer mapping', () => {
  it('maps LIMIT_FILE_SIZE on cv to Polish 400', () => {
    const filter = new AllExceptionsFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new MulterError('LIMIT_FILE_SIZE', 'cv'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Plik CV jest zbyt duży (max 5 MB)',
      })
    );
  });
});
