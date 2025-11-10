import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthSessionService } from './auth-session.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSessionService);
  const token = session.getAccessToken();
  const isAuthRequest = req.url.includes('/api/auth/');

  if (token && !isAuthRequest && !req.headers.has('Authorization')) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  return next(req);
};
