package com.workinsight.api.dto;

import java.util.List;

public record JobOfferSuggestionResponse(
    String title,
    String company,
    String location,
    String contactEmail,
    List<String> skills,
    List<String> updatedFields,
    Double confidenceScore
) {
}

