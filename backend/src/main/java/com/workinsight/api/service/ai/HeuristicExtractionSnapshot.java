package com.workinsight.api.service.ai;

import java.util.List;

public record HeuristicExtractionSnapshot(
    String title,
    String company,
    String location,
    String email,
    List<String> skills,
    String sourceType,
    String url
) {
}

