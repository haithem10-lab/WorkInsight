import { HttpInterceptorFn } from '@angular/common/http';

export const extractionApiInterceptor: HttpInterceptorFn = (req, next) => {
  const apiReq = req.clone({
    setHeaders: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
  return next(apiReq);
};
