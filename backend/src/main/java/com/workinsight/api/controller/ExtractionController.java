package com.workinsight.api.controller;

import com.workinsight.api.dto.JobOfferResponse;
import com.workinsight.api.model.JobOffer;
import com.workinsight.api.service.ExtractionService;
import java.io.IOException;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
      @RequestParam(value = "url", required = false) String url) throws IOException {

    if ((pdf == null || pdf.isEmpty()) && (image == null || image.isEmpty())
        && (url == null || url.isBlank())) {
      return ResponseEntity.badRequest().build();
    }

    JobOffer saved = extractionService.processSubmission(pdf, image, url);
    JobOfferResponse response = new JobOfferResponse(
        saved.getId(),
        saved.getTitle(),
        saved.getCompany(),
        saved.getLocation(),
        saved.getContactEmail(),
        saved.getSkills()
    );

    return ResponseEntity.ok(response);
  }

  @GetMapping("/jobs")
  public List<JobOfferResponse> listJobs() {
    return extractionService.listOffers().stream()
        .map(job -> new JobOfferResponse(
            job.getId(),
            job.getTitle(),
            job.getCompany(),
            job.getLocation(),
            job.getContactEmail(),
            job.getSkills()
        ))
        .toList();
  }
}
