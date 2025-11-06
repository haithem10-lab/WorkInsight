package com.workinsight.api.dto;

import java.util.List;

public record JobRecommendationResponse(
    String jobId,
    String title,
    String company,
    String location,
    String sourceType,
    Double confidenceScore,
    double matchScore,
    List<String> matchedSkills,
    String summary
) {
}

