package com.workinsight.api.dto;

import java.util.List;

public record UserAccountResponse(
    String id,
    String email,
    String fullName,
    boolean emailVerified,
    String accountStatus,
    List<String> roles
) {
}
