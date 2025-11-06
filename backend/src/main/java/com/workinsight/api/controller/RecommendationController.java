package com.workinsight.api.controller;

import com.workinsight.api.dto.JobRecommendationResponse;
import com.workinsight.api.model.JobOffer;
import com.workinsight.api.service.RecommendationService;
import java.util.List;
import java.util.Locale;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recommendations")
@Validated
public class RecommendationController {

  private final RecommendationService recommendationService;

  public RecommendationController(RecommendationService recommendationService) {
    this.recommendationService = recommendationService;
  }

  @GetMapping
  public ResponseEntity<List<JobRecommendationResponse>> recommend(
      @RequestParam("userId") String userId,
      @RequestParam(value = "limit", defaultValue = "5") int limit
  ) {
    if (userId == null || userId.isBlank()) {
      return ResponseEntity.badRequest().build();
    }
    List<RecommendationService.Recommendation> recommendations =
        recommendationService.recommendJobs(userId.trim().toLowerCase(Locale.ROOT), Math.max(1, limit));
    List<JobRecommendationResponse> payload = recommendations.stream()
        .map(entry -> toResponse(entry.job(), entry.matchScore(), entry.matchedSkills()))
        .toList();
    return ResponseEntity.ok(payload);
  }

  private JobRecommendationResponse toResponse(JobOffer offer, double matchScore, List<String> matchedSkills) {
    String summary = offer.getSkills() == null || offer.getSkills().isEmpty()
        ? ""
        : String.join(", ", offer.getSkills());
    return new JobRecommendationResponse(
        offer.getId(),
        offer.getTitle(),
        offer.getCompany(),
        offer.getLocation(),
        offer.getSourceType(),
        offer.getConfidenceScore(),
        Math.round(matchScore * 100.0) / 100.0,
        matchedSkills,
        summary
    );
  }
}

