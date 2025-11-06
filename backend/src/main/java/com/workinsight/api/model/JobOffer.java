package com.workinsight.api.model;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "jobs")
public class JobOffer {

  @Id
  private String id;
  private String title;
  private String company;
  private String location;
  private String contactEmail;
  private List<String> skills;
  private String sourceType;
  private String sourceUrl;
  private String status;
  private Double confidenceScore;
  private Long processingTimeMs;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private String userId;
  private List<String> tags;
  private String notes;
  private String rawTextSnapshot;
  private Double latitude;
  private Double longitude;

  public JobOffer() {
  }

  public JobOffer(
      String title,
      String company,
      String location,
      String contactEmail,
      List<String> skills,
      String sourceType,
      String sourceUrl,
      String status,
      Double confidenceScore,
      Long processingTimeMs,
      LocalDateTime createdAt,
      LocalDateTime updatedAt,
      List<String> tags,
      String notes,
      String rawTextSnapshot,
      String userId,
      Double latitude,
      Double longitude
  ) {
    this.title = title;
    this.company = company;
    this.location = location;
    this.contactEmail = contactEmail;
    this.skills = skills;
    this.sourceType = sourceType;
    this.sourceUrl = sourceUrl;
    this.status = status;
    this.confidenceScore = confidenceScore;
    this.processingTimeMs = processingTimeMs;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.tags = tags;
    this.notes = notes;
    this.rawTextSnapshot = rawTextSnapshot;
    this.userId = userId;
    this.latitude = latitude;
    this.longitude = longitude;
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getCompany() {
    return company;
  }

  public void setCompany(String company) {
    this.company = company;
  }

  public String getLocation() {
    return location;
  }

  public void setLocation(String location) {
    this.location = location;
  }

  public String getContactEmail() {
    return contactEmail;
  }

  public void setContactEmail(String contactEmail) {
    this.contactEmail = contactEmail;
  }

  public List<String> getSkills() {
    return skills;
  }

  public void setSkills(List<String> skills) {
    this.skills = skills;
  }

  public String getSourceType() {
    return sourceType;
  }

  public void setSourceType(String sourceType) {
    this.sourceType = sourceType;
  }

  public String getSourceUrl() {
    return sourceUrl;
  }

  public void setSourceUrl(String sourceUrl) {
    this.sourceUrl = sourceUrl;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public Double getConfidenceScore() {
    return confidenceScore;
  }

  public void setConfidenceScore(Double confidenceScore) {
    this.confidenceScore = confidenceScore;
  }

  public Long getProcessingTimeMs() {
    return processingTimeMs;
  }

  public void setProcessingTimeMs(Long processingTimeMs) {
    this.processingTimeMs = processingTimeMs;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }

  public String getUserId() {
    return userId;
  }

  public void setUserId(String userId) {
    this.userId = userId;
  }

  public List<String> getTags() {
    return tags;
  }

  public void setTags(List<String> tags) {
    this.tags = tags;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public String getRawTextSnapshot() {
    return rawTextSnapshot;
  }

  public void setRawTextSnapshot(String rawTextSnapshot) {
    this.rawTextSnapshot = rawTextSnapshot;
  }

  public Double getLatitude() {
    return latitude;
  }

  public void setLatitude(Double latitude) {
    this.latitude = latitude;
  }

  public Double getLongitude() {
    return longitude;
  }

  public void setLongitude(Double longitude) {
    this.longitude = longitude;
  }
}
