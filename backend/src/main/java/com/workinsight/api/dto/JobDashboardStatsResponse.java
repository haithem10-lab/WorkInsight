package com.workinsight.api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record JobDashboardStatsResponse(
    long totalOffers,
    long offersToday,
    long offersThisWeek,
    double averageConfidence,
    Map<String, Long> sourceBreakdown,
    List<DailyCount> lastSevenDays,
    List<TopItem> topCompanies,
    List<TopItem> topSkills,
    LocalDateTime generatedAt
) {

  public record DailyCount(LocalDate date, long count) {
  }

  public record TopItem(String label, long count) {
  }

  public static JobDashboardStatsResponse empty(LocalDateTime generatedAt) {
    return new JobDashboardStatsResponse(
        0,
        0,
        0,
        0.0,
        Map.of(),
        List.of(),
        List.of(),
        List.of(),
        generatedAt
    );
  }
}
