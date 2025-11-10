package com.workinsight.api.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ResumeProfileResponse(
    String headline,
    String summary,
    List<String> skills,
    List<String> preferredLocations,
    LocalDateTime updatedAt,
    String photoData
) {
}
