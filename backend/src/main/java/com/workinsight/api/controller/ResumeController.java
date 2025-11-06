package com.workinsight.api.controller;

import com.workinsight.api.dto.ResumeProfileResponse;
import com.workinsight.api.model.ResumeProfile;
import com.workinsight.api.service.ResumeService;
import java.util.Optional;
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
@RequestMapping("/api/resume")
@Validated
public class ResumeController {

  private final ResumeService resumeService;

  public ResumeController(ResumeService resumeService) {
    this.resumeService = resumeService;
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<ResumeProfileResponse> uploadResume(
      @RequestParam("resume") MultipartFile resume,
      @RequestParam("userId") String userId
  ) {
    if (userId == null || userId.isBlank()) {
      return ResponseEntity.badRequest().build();
    }
    ResumeProfile profile = resumeService.processResume(resume, userId);
    return ResponseEntity.ok(toResponse(profile));
  }

  @GetMapping
  public ResponseEntity<ResumeProfileResponse> getResume(@RequestParam("userId") String userId) {
    if (userId == null || userId.isBlank()) {
      return ResponseEntity.badRequest().build();
    }
    Optional<ResumeProfile> profile = resumeService.getProfile(userId);
    return profile.map(this::toResponse)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.noContent().build());
  }

  private ResumeProfileResponse toResponse(ResumeProfile profile) {
    return new ResumeProfileResponse(
        profile.getHeadline(),
        profile.getSummary(),
        profile.getSkills() == null ? java.util.List.of() : profile.getSkills(),
        profile.getLocations() == null ? java.util.List.of() : profile.getLocations(),
        profile.getUpdatedAt()
    );
  }
}

