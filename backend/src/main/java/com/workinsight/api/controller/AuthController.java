package com.workinsight.api.controller;

import com.workinsight.api.dto.SignInRequest;
import com.workinsight.api.dto.SignUpRequest;
import com.workinsight.api.dto.UserAccountResponse;
import com.workinsight.api.model.UserAccount;
import com.workinsight.api.service.AuthService;
import jakarta.validation.Valid;
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

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/signup")
  public ResponseEntity<UserAccountResponse> signUp(@Valid @RequestBody SignUpRequest request) {
    try {
      UserAccount created = authService.register(request.fullName(), request.email(), request.password());
      return ResponseEntity.ok(new UserAccountResponse(created.getId(), created.getEmail(), created.getFullName()));
    } catch (IllegalStateException ex) {
      if ("EMAIL_ALREADY_EXISTS".equals(ex.getMessage())) {
        return ResponseEntity.status(409).build();
      }
      return ResponseEntity.badRequest().build();
    }
  }

  @PostMapping("/signin")
  public ResponseEntity<UserAccountResponse> signIn(@Valid @RequestBody SignInRequest request) {
    return authService.authenticate(request.email(), request.password())
        .map(account -> ResponseEntity.ok(
            new UserAccountResponse(account.getId(), account.getEmail(), account.getFullName())))
        .orElseGet(() -> ResponseEntity.status(401).build());
  }
}
