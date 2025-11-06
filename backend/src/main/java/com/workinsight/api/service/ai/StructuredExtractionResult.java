package com.workinsight.api.service.ai;

import java.util.Collections;
import java.util.List;
import java.util.Objects;

public record StructuredExtractionResult(
    String title,
    String company,
    String location,
    String email,
    List<String> skills
) {

  public StructuredExtractionResult {
    skills = skills == null ? List.of() : List.copyOf(skills);
  }

  public boolean isEmpty() {
    return (title == null || title.isBlank())
        && (company == null || company.isBlank())
        && (location == null || location.isBlank())
        && (email == null || email.isBlank())
        && (skills == null || skills.isEmpty());
  }
}

