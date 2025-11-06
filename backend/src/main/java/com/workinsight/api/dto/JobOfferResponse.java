package com.workinsight.api.dto;

import java.time.LocalDateTime;
import java.util.List;

public record JobOfferResponse(
    String id,
    String title,
    String company,
    String location,
    String contactEmail,
    List<String> skills,
    String sourceType,
    String sourceUrl,
    Double confidenceScore,
    String status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    Long processingTimeMs,
    List<String> tags,
    String notes,
    String rawTextSnapshot,
    String userId,
    Double latitude,
    Double longitude
) {
}
