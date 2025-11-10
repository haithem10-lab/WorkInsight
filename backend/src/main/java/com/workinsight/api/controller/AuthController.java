package com.workinsight.api.controller;

import com.workinsight.api.dto.AuthResponse;
import com.workinsight.api.dto.ForgotPasswordRequest;
import com.workinsight.api.dto.ResendVerificationRequest;
import com.workinsight.api.dto.ResetPasswordRequest;
import com.workinsight.api.dto.SignInRequest;
import com.workinsight.api.dto.SignUpRequest;
import com.workinsight.api.dto.UserAccountResponse;
import com.workinsight.api.dto.VerifyEmailRequest;
import com.workinsight.api.model.UserAccount;
import com.workinsight.api.service.AuthService;
import com.workinsight.api.service.JwtService;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

  private final AuthService authService;
  private final JwtService jwtService;

  public AuthController(AuthService authService, JwtService jwtService) {
    this.authService = authService;
    this.jwtService = jwtService;
  }

  @PostMapping("/signup")
  public ResponseEntity<UserAccountResponse> signUp(@Valid @RequestBody SignUpRequest request) {
    try {
      UserAccount created = authService.register(request.fullName(), request.email(), request.password());
      return ResponseEntity.ok(toResponse(created));
    } catch (IllegalStateException ex) {
      if ("EMAIL_ALREADY_EXISTS".equals(ex.getMessage())) {
        return ResponseEntity.status(409).build();
      }
      return ResponseEntity.badRequest().build();
    }
  }

  @PostMapping("/signin")
  public ResponseEntity<AuthResponse> signIn(@Valid @RequestBody SignInRequest request) {
    return authService.authenticate(request.email(), request.password())
        .map(account -> buildAuthResponse(account))
        .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).<AuthResponse>build());
  }

  private ResponseEntity<AuthResponse> buildAuthResponse(UserAccount account) {
    try {
      authService.ensureVerified(account);
    } catch (IllegalStateException ex) {
      return ResponseEntity.status(HttpStatus.FORBIDDEN).<AuthResponse>build();
    }
    if (account.isBlocked()) {
      return ResponseEntity.status(HttpStatus.LOCKED).<AuthResponse>build();
    }
    String token = jwtService.generateToken(account);
    return ResponseEntity.ok(new AuthResponse(toResponse(account), token));
  }

  @PostMapping("/verify")
  public ResponseEntity<Void> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
    boolean verified = authService.verifyEmail(request.token());
    return verified ? ResponseEntity.ok().build() : ResponseEntity.badRequest().build();
  }

  @PostMapping("/verify/resend")
  public ResponseEntity<Void> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
    authService.resendVerification(request.email());
    return ResponseEntity.ok().build();
  }

  @PostMapping("/password/forgot")
  public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
    authService.initiatePasswordReset(request.email());
    return ResponseEntity.ok().build();
  }

  @PostMapping("/password/reset")
  public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
    boolean success = authService.resetPassword(request.token(), request.newPassword());
    return success ? ResponseEntity.ok().build() : ResponseEntity.badRequest().build();
  }

  private UserAccountResponse toResponse(UserAccount account) {
    List<String> roles = new ArrayList<>(account.getRoles());
    Collections.sort(roles);
    return new UserAccountResponse(
        account.getId(),
        account.getEmail(),
        account.getFullName(),
        account.isEmailVerified(),
        account.getAccountStatus().name(),
        List.copyOf(roles)
    );
  }
}
