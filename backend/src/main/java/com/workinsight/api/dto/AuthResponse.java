package com.workinsight.api.dto;

public record AuthResponse(
    UserAccountResponse user,
    String accessToken
) {
}
