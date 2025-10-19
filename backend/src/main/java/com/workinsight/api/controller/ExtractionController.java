package com.workinsight.api.controller;

import com.workinsight.api.dto.JobDashboardStatsResponse;
import com.workinsight.api.dto.JobOfferResponse;
import com.workinsight.api.model.JobOffer;
import com.workinsight.api.service.ExtractionService;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
@Validated
public class ExtractionController {

  private final ExtractionService extractionService;

  public ExtractionController(ExtractionService extractionService) {
    this.extractionService = extractionService;
  }

  @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<JobOfferResponse> handleUpload(
      @RequestParam(value = "pdf", required = false) MultipartFile pdf,
      @RequestParam(value = "image", required = false) MultipartFile image,
      @RequestParam(value = "url", required = false) String url,
      @RequestParam("userId") String userId) throws IOException {

    if ((pdf == null || pdf.isEmpty()) && (image == null || image.isEmpty())
        && (url == null || url.isBlank())) {
      return ResponseEntity.badRequest().build();
    }
    if (userId == null || userId.isBlank()) {
      return ResponseEntity.badRequest().build();
    }

    JobOffer saved = extractionService.processSubmission(pdf, image, url, userId);
    JobOfferResponse response = new JobOfferResponse(
        saved.getId(),
        saved.getTitle(),
        saved.getCompany(),
        saved.getLocation(),
        saved.getContactEmail(),
        saved.getSkills(),
        saved.getSourceType(),
        saved.getSourceUrl(),
        saved.getConfidenceScore(),
        saved.getStatus(),
        saved.getCreatedAt(),
        saved.getProcessingTimeMs(),
        saved.getUserId()
    );

    return ResponseEntity.ok(response);
  }

  @GetMapping("/jobs")
  public List<JobOfferResponse> listJobs(@RequestParam("userId") String userId) {
    if (userId == null || userId.isBlank()) {
      return List.of();
    }
    return extractionService.listOffers(userId).stream()
        .map(job -> new JobOfferResponse(
            job.getId(),
            job.getTitle(),
            job.getCompany(),
            job.getLocation(),
            job.getContactEmail(),
            job.getSkills(),
            job.getSourceType(),
            job.getSourceUrl(),
            job.getConfidenceScore(),
            job.getStatus(),
            job.getCreatedAt(),
            job.getProcessingTimeMs(),
            job.getUserId()
        ))
        .toList();
  }

  @GetMapping("/jobs/stats")
  public JobDashboardStatsResponse jobStats(@RequestParam("userId") String userId) {
    if (userId == null || userId.isBlank()) {
      return JobDashboardStatsResponse.empty(LocalDateTime.now());
    }
    return extractionService.buildDashboardStats(userId);
  }

  @GetMapping("/jobs/recent")
  public List<JobOfferResponse> recentJobs(
      @RequestParam("userId") String userId,
      @RequestParam(value = "limit", defaultValue = "5") int limit
  ) {
    if (userId == null || userId.isBlank()) {
      return List.of();
    }
    int safeLimit = Math.max(1, Math.min(limit, 20));
    return extractionService.recentOffers(userId, safeLimit).stream()
        .map(job -> new JobOfferResponse(
            job.getId(),
            job.getTitle(),
            job.getCompany(),
            job.getLocation(),
            job.getContactEmail(),
            job.getSkills(),
            job.getSourceType(),
            job.getSourceUrl(),
            job.getConfidenceScore(),
            job.getStatus(),
            job.getCreatedAt(),
            job.getProcessingTimeMs(),
            job.getUserId()
        ))
        .toList();
  }

  @DeleteMapping("/jobs/{id}")
  public ResponseEntity<Void> deleteJob(@PathVariable String id, @RequestParam("userId") String userId) {
    if (userId == null || userId.isBlank()) {
      return ResponseEntity.badRequest().build();
    }
    boolean removed = extractionService.deleteOffer(id, userId);
    if (!removed) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.noContent().build();
  }
}
