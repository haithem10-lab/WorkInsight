package com.workinsight.api.model;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "users")
public class UserAccount {

  @Id
  private String id;

  @Indexed(unique = true)
  private String email;

  private String passwordHash;
  private String fullName;
  private LocalDateTime createdAt;
  private boolean emailVerified;
  private String verificationToken;
  private LocalDateTime verificationSentAt;
  private String passwordResetToken;
  private LocalDateTime passwordResetExpiresAt;
  private Set<String> roles;
  private AccountStatus accountStatus;
  private LocalDateTime statusUpdatedAt;
  private String statusReason;

  public UserAccount() {
    initializeDefaults();
  }

  public UserAccount(String email, String passwordHash, String fullName, LocalDateTime createdAt) {
    this.email = email;
    this.passwordHash = passwordHash;
    this.fullName = fullName;
    this.createdAt = createdAt;
    this.emailVerified = false;
    initializeDefaults();
  }

  private void initializeDefaults() {
    if (this.roles == null) {
      this.roles = new HashSet<>();
    }
    if (this.roles.isEmpty()) {
      this.roles.add("ROLE_USER");
    }
    if (this.accountStatus == null) {
      this.accountStatus = AccountStatus.ACTIVE;
    }
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public String getFullName() {
    return fullName;
  }

  public void setFullName(String fullName) {
    this.fullName = fullName;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public boolean isEmailVerified() {
    return emailVerified;
  }

  public void setEmailVerified(boolean emailVerified) {
    this.emailVerified = emailVerified;
  }

  public String getVerificationToken() {
    return verificationToken;
  }

  public void setVerificationToken(String verificationToken) {
    this.verificationToken = verificationToken;
  }

  public LocalDateTime getVerificationSentAt() {
    return verificationSentAt;
  }

  public void setVerificationSentAt(LocalDateTime verificationSentAt) {
    this.verificationSentAt = verificationSentAt;
  }

  public String getPasswordResetToken() {
    return passwordResetToken;
  }

  public void setPasswordResetToken(String passwordResetToken) {
    this.passwordResetToken = passwordResetToken;
  }

  public LocalDateTime getPasswordResetExpiresAt() {
    return passwordResetExpiresAt;
  }

  public void setPasswordResetExpiresAt(LocalDateTime passwordResetExpiresAt) {
    this.passwordResetExpiresAt = passwordResetExpiresAt;
  }

  public Set<String> getRoles() {
    if (roles == null || roles.isEmpty()) {
      roles = new HashSet<>();
      roles.add("ROLE_USER");
    }
    return roles;
  }

  public void setRoles(Set<String> roles) {
    if (roles == null || roles.isEmpty()) {
      this.roles = new HashSet<>();
      this.roles.add("ROLE_USER");
      return;
    }
    this.roles = new HashSet<>(roles);
  }

  public void ensureRole(String role) {
    if (role == null || role.isBlank()) {
      return;
    }
    getRoles().add(role.startsWith("ROLE_") ? role : "ROLE_" + role);
  }

  public boolean hasRole(String role) {
    if (role == null) {
      return false;
    }
    String normalized = role.startsWith("ROLE_") ? role : "ROLE_" + role;
    return getRoles().contains(normalized);
  }

  public AccountStatus getAccountStatus() {
    if (accountStatus == null) {
      accountStatus = AccountStatus.ACTIVE;
    }
    return accountStatus;
  }

  public void setAccountStatus(AccountStatus accountStatus) {
    this.accountStatus = accountStatus == null ? AccountStatus.ACTIVE : accountStatus;
  }

  public boolean isBlocked() {
    return getAccountStatus() == AccountStatus.BLOCKED;
  }

  public LocalDateTime getStatusUpdatedAt() {
    return statusUpdatedAt;
  }

  public void setStatusUpdatedAt(LocalDateTime statusUpdatedAt) {
    this.statusUpdatedAt = statusUpdatedAt;
  }

  public String getStatusReason() {
    return statusReason;
  }

  public void setStatusReason(String statusReason) {
    this.statusReason = statusReason;
  }
}
