package com.workinsight.api.dto;

import java.util.List;

public record UpdateJobOfferRequest(
    String title,
    String company,
    String location,
    String contactEmail,
    List<String> skills,
    String status,
    List<String> tags,
    String notes
) {
}

