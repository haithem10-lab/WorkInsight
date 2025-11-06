package com.workinsight.api.service;

import com.workinsight.api.model.JobOffer;
import com.workinsight.api.model.JobOfferRepository;
import com.workinsight.api.model.ResumeProfile;
import com.workinsight.api.model.ResumeProfileRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class RecommendationService {

  private final ResumeProfileRepository resumeProfileRepository;
  private final JobOfferRepository jobOfferRepository;

  public RecommendationService(
      ResumeProfileRepository resumeProfileRepository,
      JobOfferRepository jobOfferRepository) {
    this.resumeProfileRepository = resumeProfileRepository;
    this.jobOfferRepository = jobOfferRepository;
  }

  public List<Recommendation> recommendJobs(String userId, int limit) {
    if (userId == null || userId.isBlank()) {
      return List.of();
    }
    Optional<ResumeProfile> resumeOpt = resumeProfileRepository.findByUserId(userId.trim().toLowerCase(Locale.ROOT));
    if (resumeOpt.isEmpty()) {
      return List.of();
    }
    ResumeProfile resume = resumeOpt.get();
    Set<String> resumeSkills = resume.getSkills() == null
        ? Set.of()
        : resume.getSkills().stream()
            .filter(skill -> skill != null && !skill.isBlank())
            .map(skill -> skill.toLowerCase(Locale.ROOT))
            .collect(Collectors.toCollection(LinkedHashSet::new));
    String headline = Optional.ofNullable(resume.getHeadline()).orElse("").toLowerCase(Locale.ROOT);
    String summary = Optional.ofNullable(resume.getSummary()).orElse("").toLowerCase(Locale.ROOT);

    List<JobOffer> offers = jobOfferRepository.findByUserIdOrderByCreatedAtDesc(userId.trim().toLowerCase(Locale.ROOT));
    List<Recommendation> scored = new ArrayList<>();
    for (JobOffer offer : offers) {
      if (offer.getSkills() == null || offer.getSkills().isEmpty()) {
        continue;
      }
      List<String> matchedSkills = new ArrayList<>();
      for (String skill : offer.getSkills()) {
        if (skill == null) {
          continue;
        }
        String normalized = skill.toLowerCase(Locale.ROOT);
        if (resumeSkills.contains(normalized)) {
          matchedSkills.add(skill);
        }
      }
      if (matchedSkills.isEmpty()) {
        continue;
      }
      double skillScore = Math.min(1.0, (double) matchedSkills.size() / (resumeSkills.isEmpty() ? matchedSkills.size() : resumeSkills.size()));
      double titleScore = computeTitleScore(offer.getTitle(), headline, summary);
      double totalScore = (skillScore * 0.8) + (titleScore * 0.2);
      scored.add(new Recommendation(offer, totalScore, matchedSkills));
    }
    return scored.stream()
        .sorted(Comparator.comparingDouble(Recommendation::matchScore).reversed())
        .limit(Math.max(1, limit))
        .toList();
  }

  private double computeTitleScore(String jobTitle, String resumeHeadline, String resumeSummary) {
    if (jobTitle == null || jobTitle.isBlank()) {
      return 0.0;
    }
    String normalized = jobTitle.toLowerCase(Locale.ROOT);
    if (resumeHeadline.contains(normalized)) {
      return 1.0;
    }
    if (resumeSummary.contains(normalized)) {
      return 0.7;
    }
    String[] titleTokens = normalized.split("[\\s\\-/]");
    int matched = 0;
    for (String token : titleTokens) {
      if (token.length() < 3) {
        continue;
      }
      if (resumeHeadline.contains(token) || resumeSummary.contains(token)) {
        matched++;
      }
    }
    if (titleTokens.length == 0) {
      return 0.0;
    }
    return Math.min(1.0, matched / (double) titleTokens.length);
  }

  public record Recommendation(JobOffer job, double matchScore, List<String> matchedSkills) {
  }
}

