package com.workinsight.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignInRequest(
    @NotBlank @Email String email,
    @NotBlank @Size(min = 6) String password
) {
}
