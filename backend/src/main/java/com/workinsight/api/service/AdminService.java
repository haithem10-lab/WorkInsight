package com.workinsight.api.service;

import com.workinsight.api.dto.AdminUserResponse;
import com.workinsight.api.model.AccountStatus;
import com.workinsight.api.model.JobOffer;
import com.workinsight.api.model.JobOfferRepository;
import com.workinsight.api.model.UserAccount;
import com.workinsight.api.model.UserAccountRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminService {

  private final UserAccountRepository userRepository;
  private final JobOfferRepository jobOfferRepository;
  private final AuthService authService;

  public AdminService(
      UserAccountRepository userRepository,
      JobOfferRepository jobOfferRepository,
      AuthService authService) {
    this.userRepository = userRepository;
    this.jobOfferRepository = jobOfferRepository;
    this.authService = authService;
  }

  public List<AdminUserResponse> getUsers() {
    List<UserAccount> accounts = userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    return accounts.stream().map(this::toResponse).toList();
  }

  public AdminUserResponse blockUser(String userId, String reason) {
    UserAccount account = requireUser(userId);
    if (account.hasRole("ROLE_ADMIN")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CANNOT_BLOCK_ADMIN");
    }
    account.setAccountStatus(AccountStatus.BLOCKED);
    account.setStatusUpdatedAt(LocalDateTime.now());
    account.setStatusReason(reason);
    userRepository.save(account);
    return toResponse(account);
  }

  public AdminUserResponse unblockUser(String userId) {
    UserAccount account = requireUser(userId);
    account.setAccountStatus(AccountStatus.ACTIVE);
    account.setStatusUpdatedAt(LocalDateTime.now());
    account.setStatusReason(null);
    userRepository.save(account);
    return toResponse(account);
  }

  public void resendVerification(String userId) {
    UserAccount account = requireUser(userId);
    authService.resendVerification(account.getEmail());
  }

  private UserAccount requireUser(String userId) {
    return userRepository.findById(userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));
  }

  private AdminUserResponse toResponse(UserAccount account) {
    long totalOffers = 0;
    LocalDateTime lastExtractionAt = null;
    if (account.getId() != null) {
      totalOffers = jobOfferRepository.countByUserId(account.getId());
      lastExtractionAt = jobOfferRepository
          .findFirstByUserIdOrderByCreatedAtDesc(account.getId())
          .map(JobOffer::getCreatedAt)
          .orElse(null);
    }

    List<String> roles = new ArrayList<>(account.getRoles());
    Collections.sort(roles);

    return new AdminUserResponse(
        account.getId(),
        account.getEmail(),
        account.getFullName(),
        account.isEmailVerified(),
        account.getAccountStatus(),
        List.copyOf(roles),
        account.getCreatedAt(),
        lastExtractionAt,
        totalOffers,
        account.getStatusUpdatedAt(),
        account.getStatusReason()
    );
  }
}

