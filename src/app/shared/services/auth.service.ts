import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AuthApi,
  FileUrl,
  ForgotPassword,
  GoogleLoginRequest,
  Login,
  PasswordRecovery,
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

  /** L'API ne renvoie qu'un message, sans donnée. */
  resendConfirmation(body: ResendConfirmationRequest): Observable<void> {
    return this.api.authResendConfirmationPost({ body }).pipe(toVoid());
  }

  /** L'API ne renvoie qu'un message, sans donnée. */
  resendMyConfirmation(): Observable<void> {
    return this.api.authMeResendConfirmationPost().pipe(toVoid());
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

  /** Même réponse que l'adresse existe ou non : l'API ne renvoie aucune donnée. */
  forgotPassword(body: ForgotPassword): Observable<void> {
    return this.api.authForgotPasswordPost({ body }).pipe(toVoid());
  }

  /** L'API renvoie une chaîne brute, sans enveloppe. */
  resetPassword(body: PasswordRecovery): Observable<void> {
    return this.api.authResetPasswordPost({ body }).pipe(toVoid());
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
