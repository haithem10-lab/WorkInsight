package com.workinsight.api.dto;

public record UserAccountResponse(
    String id,
    String email,
    String fullName
) {
}
