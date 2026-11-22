import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AuthApi,
  FileUrl,
  ForgotPassword,
  GoogleLoginRequest,
  Login,
  PasswordRecovery,
  PasswordReset,
  ResendConfirmationRequest,
  UserCreate,
  UserDetails,
  UserInfosWithtoken,
  UserLogin,
  UserUpdate,
} from '../../core/api/generated';
import { toVoid, unwrap } from './api-operators';

@Service()
export class AuthService {
  private readonly api = inject(AuthApi);

  register(body: UserCreate): Observable<UserDetails> {
    return this.api.authRegisterPost({ body }).pipe(unwrap());
  }

  login(body: UserLogin): Observable<Login> {
    return this.api.authLoginPost({ body }).pipe(unwrap());
  }

  loginWithGoogle(body: GoogleLoginRequest): Observable<Login> {
    return this.api.authGooglePost({ body }).pipe(unwrap());
  }

  confirmEmail(userId: string, confirmationToken: string): Observable<void> {
    return this.api.authEmailConfirmationGet({ userId, confirmationToken });
  }

  resendConfirmation(body: ResendConfirmationRequest): Observable<string> {
    return this.api.authResendConfirmationPost({ body }).pipe(unwrap());
  }

  resendMyConfirmation(): Observable<string> {
    return this.api.authMeResendConfirmationPost().pipe(unwrap());
  }

  acceptTerms(): Observable<void> {
    return this.api.authMeAcceptTermsPost().pipe(toVoid());
  }

  updateMe(body: UserUpdate): Observable<UserDetails> {
    return this.api.authMePut({ body }).pipe(unwrap());
  }

  me(): Observable<UserInfosWithtoken> {
    return this.api.authMyInformationsGet().pipe(unwrap());
  }

  forgotPassword(body: ForgotPassword): Observable<PasswordReset> {
    return this.api.authForgotPasswordPost({ body }).pipe(unwrap());
  }

  resetPassword(body: PasswordRecovery): Observable<string> {
    return this.api.authResetPasswordPost({ body }).pipe(unwrap());
  }

  refreshToken(): Observable<Login> {
    return this.api.authRefreshTokenGet().pipe(unwrap());
  }

  logout(): Observable<void> {
    return this.api.authLogoutGet().pipe(toVoid());
  }

  uploadAvatar(file: Blob): Observable<FileUrl> {
    return this.api.authUploadAvatarPost({ body: { file } }).pipe(unwrap());
  }
}
