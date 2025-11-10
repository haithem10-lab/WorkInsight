package com.workinsight.api.dto;

import com.workinsight.api.model.AccountStatus;
import java.time.LocalDateTime;
import java.util.List;

public record AdminUserResponse(
    String id,
    String email,
    String fullName,
    boolean emailVerified,
    AccountStatus accountStatus,
    List<String> roles,
    LocalDateTime createdAt,
    LocalDateTime lastExtractionAt,
    long extractionCount,
    LocalDateTime statusUpdatedAt,
    String statusReason
) {
}

