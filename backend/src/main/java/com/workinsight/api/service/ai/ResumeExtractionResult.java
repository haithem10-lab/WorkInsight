package com.workinsight.api.service.ai;

import java.util.List;

public record ResumeExtractionResult(
    String headline,
    String summary,
    List<String> skills,
    List<String> locations
) {

  public ResumeExtractionResult {
    skills = skills == null ? List.of() : List.copyOf(skills);
    locations = locations == null ? List.of() : List.copyOf(locations);
  }
}

