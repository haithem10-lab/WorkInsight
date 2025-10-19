package com.workinsight.api.service;

import com.workinsight.api.model.UserAccount;
import com.workinsight.api.model.UserAccountRepository;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

  private final UserAccountRepository userRepository;
  private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

  public AuthService(UserAccountRepository userRepository) {
    this.userRepository = userRepository;
  }

  public UserAccount register(String fullName, String email, String password) {
    String normalizedEmail = normalizeEmail(email);
    userRepository.findByEmailIgnoreCase(normalizedEmail).ifPresent(existing -> {
      throw new IllegalStateException("EMAIL_ALREADY_EXISTS");
    });
    String cleanedName = fullName == null ? "" : fullName.trim();
    String hash = passwordEncoder.encode(password);
    UserAccount account = new UserAccount(normalizedEmail, hash, cleanedName, LocalDateTime.now());
    return userRepository.save(account);
  }

  public Optional<UserAccount> authenticate(String email, String password) {
    String normalizedEmail = normalizeEmail(email);
    return userRepository.findByEmailIgnoreCase(normalizedEmail)
        .filter(account -> passwordEncoder.matches(password, account.getPasswordHash()));
  }

  private String normalizeEmail(String email) {
    if (email == null) {
      return "";
    }
    return email.trim().toLowerCase(Locale.ROOT);
  }
}
