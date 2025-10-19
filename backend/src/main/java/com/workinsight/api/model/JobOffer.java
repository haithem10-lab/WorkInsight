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
  private String userId;

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
      String userId
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
    this.userId = userId;
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

  public String getUserId() {
    return userId;
  }

  public void setUserId(String userId) {
    this.userId = userId;
  }
}
