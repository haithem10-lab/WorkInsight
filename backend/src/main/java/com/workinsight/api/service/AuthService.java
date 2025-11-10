package com.workinsight.api.service;

import com.workinsight.api.model.AccountStatus;
import com.workinsight.api.model.UserAccount;
import com.workinsight.api.model.UserAccountRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

  private static final Duration RESET_TOKEN_EXPIRY = Duration.ofHours(2);

  private final UserAccountRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final EmailService emailService;
  private final String frontendBaseUrl;

  public AuthService(
      UserAccountRepository userRepository,
      PasswordEncoder passwordEncoder,
      EmailService emailService,
      @Value("${app.frontend-base-url}") String frontendBaseUrl) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.emailService = emailService;
    this.frontendBaseUrl = frontendBaseUrl.endsWith("/") ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1) : frontendBaseUrl;
  }

  public UserAccount register(String fullName, String email, String password) {
    String normalizedEmail = normalizeEmail(email);
    userRepository.findByEmailIgnoreCase(normalizedEmail).ifPresent(existing -> {
      throw new IllegalStateException("EMAIL_ALREADY_EXISTS");
    });
    String cleanedName = fullName == null ? "" : fullName.trim();
    String hash = passwordEncoder.encode(password);
    LocalDateTime now = LocalDateTime.now();
    UserAccount account = new UserAccount(normalizedEmail, hash, cleanedName, now);
    account.setVerificationToken(UUID.randomUUID().toString());
    account.setVerificationSentAt(now);
    account.ensureRole("ROLE_USER");
    account.setAccountStatus(AccountStatus.ACTIVE);
    account.setStatusUpdatedAt(now);
    account.setStatusReason(null);
    userRepository.save(account);
    dispatchVerificationEmail(account);
    return account;
  }

  public Optional<UserAccount> authenticate(String email, String password) {
    String normalizedEmail = normalizeEmail(email);
    return userRepository.findByEmailIgnoreCase(normalizedEmail)
        .filter(account -> passwordEncoder.matches(password, account.getPasswordHash()));
  }

  public void ensureVerified(UserAccount account) {
    if (!account.isEmailVerified()) {
      throw new IllegalStateException("EMAIL_NOT_VERIFIED");
    }
  }

  public boolean verifyEmail(String token) {
    if (token == null || token.isBlank()) {
      return false;
    }
    return userRepository.findByVerificationToken(token)
        .map(account -> {
          account.setEmailVerified(true);
          account.setVerificationToken(null);
          account.setVerificationSentAt(null);
          userRepository.save(account);
          return true;
        })
        .orElse(false);
  }

  public void resendVerification(String email) {
    String normalizedEmail = normalizeEmail(email);
    userRepository.findByEmailIgnoreCase(normalizedEmail)
        .filter(account -> !account.isEmailVerified())
        .ifPresent(account -> {
          account.setVerificationToken(UUID.randomUUID().toString());
          account.setVerificationSentAt(LocalDateTime.now());
          userRepository.save(account);
          dispatchVerificationEmail(account);
        });
  }

  public void initiatePasswordReset(String email) {
    String normalizedEmail = normalizeEmail(email);
    userRepository.findByEmailIgnoreCase(normalizedEmail)
        .ifPresent(account -> {
          account.setPasswordResetToken(UUID.randomUUID().toString());
          account.setPasswordResetExpiresAt(LocalDateTime.now().plus(RESET_TOKEN_EXPIRY));
          userRepository.save(account);
          dispatchPasswordResetEmail(account);
        });
  }

  public boolean resetPassword(String token, String newPassword) {
    if (token == null || token.isBlank()) {
      return false;
    }
    return userRepository.findByPasswordResetToken(token)
        .filter(account -> account.getPasswordResetExpiresAt() != null
            && account.getPasswordResetExpiresAt().isAfter(LocalDateTime.now()))
        .map(account -> {
          account.setPasswordHash(passwordEncoder.encode(newPassword));
          account.setPasswordResetToken(null);
          account.setPasswordResetExpiresAt(null);
          userRepository.save(account);
          return true;
        })
        .orElse(false);
  }

  private void dispatchVerificationEmail(UserAccount account) {
    if (account.getVerificationToken() == null) {
      return;
    }
    String link = frontendBaseUrl + "/verify-email?token=" + account.getVerificationToken();
    emailService.sendVerificationEmail(account, link);
  }

  private void dispatchPasswordResetEmail(UserAccount account) {
    if (account.getPasswordResetToken() == null) {
      return;
    }
    String link = frontendBaseUrl + "/reset-password?token=" + account.getPasswordResetToken();
    emailService.sendPasswordResetEmail(account, link);
  }

  private String normalizeEmail(String email) {
    if (email == null) {
      return "";
    }
    return email.trim().toLowerCase(Locale.ROOT);
  }
}
