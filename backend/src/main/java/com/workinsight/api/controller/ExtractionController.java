package com.workinsight.api.controller;

import com.workinsight.api.dto.JobDashboardStatsResponse;
import com.workinsight.api.dto.JobOfferResponse;
import com.workinsight.api.dto.JobOfferSuggestionResponse;
import com.workinsight.api.dto.UpdateJobOfferRequest;
import com.workinsight.api.model.JobOffer;
import com.workinsight.api.service.ExtractionService;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
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
      @RequestParam(value = "document", required = false) MultipartFile document,
      @RequestParam(value = "spreadsheet", required = false) MultipartFile spreadsheet,
      @RequestParam(value = "csv", required = false) MultipartFile csvFile,
      @RequestParam(value = "json", required = false) MultipartFile jsonFile,
      @RequestParam(value = "url", required = false) String url,
      @RequestParam("userId") String userId) throws IOException {

    if ((pdf == null || pdf.isEmpty())
        && (image == null || image.isEmpty())
        && (document == null || document.isEmpty())
        && (spreadsheet == null || spreadsheet.isEmpty())
        && (csvFile == null || csvFile.isEmpty())
        && (jsonFile == null || jsonFile.isEmpty())
        && (url == null || url.isBlank())) {
      return ResponseEntity.badRequest().build();
    }
    if (userId == null || userId.isBlank()) {
      return ResponseEntity.badRequest().build();
    }

    JobOffer saved = extractionService.processSubmission(pdf, image, document, spreadsheet, csvFile, jsonFile, url, userId);
    JobOfferResponse response = extractionService.toJobOfferResponse(saved);

    return ResponseEntity.ok(response);
  }

  @GetMapping("/jobs")
  public List<JobOfferResponse> listJobs(@RequestParam("userId") String userId) {
    if (userId == null || userId.isBlank()) {
      return List.of();
    }
    return extractionService.listOffers(userId).stream()
        .map(extractionService::toJobOfferResponse)
        .filter(Objects::nonNull)
        .toList();
  }

  @GetMapping("/jobs/export")
  public ResponseEntity<byte[]> exportJobs(@RequestParam("userId") String userId) {
    if (userId == null || userId.isBlank()) {
      return ResponseEntity.badRequest().build();
    }
    byte[] payload = extractionService.exportOffers(userId);
    if (payload.length == 0) {
      return ResponseEntity.noContent().build();
    }
    String filename = String.format(
        "workinsight-jobs-%s.xlsx",
        LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"))
    );
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
        .contentType(MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(payload);
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
        .map(extractionService::toJobOfferResponse)
        .filter(Objects::nonNull)
        .toList();
  }

  @PatchMapping("/jobs/{id}")
  public ResponseEntity<JobOfferResponse> updateJob(
      @PathVariable String id,
      @RequestParam("userId") String userId,
      @RequestBody UpdateJobOfferRequest request
  ) {
    if (userId == null || userId.isBlank() || request == null) {
      return ResponseEntity.badRequest().build();
    }
    try {
      JobOffer updated = extractionService.updateOffer(id, userId, request);
      return ResponseEntity.ok(extractionService.toJobOfferResponse(updated));
    } catch (IllegalArgumentException ex) {
      if ("Offer not found".equalsIgnoreCase(ex.getMessage())) {
        return ResponseEntity.notFound().build();
      }
      return ResponseEntity.badRequest().build();
    }
  }

  @PostMapping("/jobs/{id}/suggestions")
  public ResponseEntity<JobOfferSuggestionResponse> suggestJobImprovements(
      @PathVariable String id,
      @RequestParam("userId") String userId
  ) {
    if (userId == null || userId.isBlank()) {
      return ResponseEntity.badRequest().build();
    }
    try {
      JobOfferSuggestionResponse suggestion = extractionService.suggestOfferAdjustments(id, userId);
      if (suggestion == null) {
        return ResponseEntity.noContent().build();
      }
      return ResponseEntity.ok(suggestion);
    } catch (IllegalArgumentException ex) {
      if ("Offer not found".equalsIgnoreCase(ex.getMessage())) {
        return ResponseEntity.notFound().build();
      }
      return ResponseEntity.badRequest().build();
    }
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
