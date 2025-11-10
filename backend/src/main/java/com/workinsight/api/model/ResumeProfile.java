package com.workinsight.api.model;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "resume_profiles")
public class ResumeProfile {

  @Id
  private String id;
  private String userId;
  private String headline;
  private String summary;
  private List<String> skills;
  private List<String> locations;
  private String rawText;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private String photoData;
  private String photoContentType;
  private LocalDateTime photoUpdatedAt;

  public ResumeProfile() {
  }

  public ResumeProfile(
      String userId,
      String headline,
      String summary,
      List<String> skills,
      List<String> locations,
      String rawText,
      LocalDateTime createdAt,
      LocalDateTime updatedAt) {
    this.userId = userId;
    this.headline = headline;
    this.summary = summary;
    this.skills = skills;
    this.locations = locations;
    this.rawText = rawText;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getUserId() {
    return userId;
  }

  public void setUserId(String userId) {
    this.userId = userId;
  }

  public String getHeadline() {
    return headline;
  }

  public void setHeadline(String headline) {
    this.headline = headline;
  }

  public String getSummary() {
    return summary;
  }

  public void setSummary(String summary) {
    this.summary = summary;
  }

  public List<String> getSkills() {
    return skills;
  }

  public void setSkills(List<String> skills) {
    this.skills = skills;
  }

  public List<String> getLocations() {
    return locations;
  }

  public void setLocations(List<String> locations) {
    this.locations = locations;
  }

  public String getRawText() {
    return rawText;
  }

  public void setRawText(String rawText) {
    this.rawText = rawText;
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

  public String getPhotoData() {
    return photoData;
  }

  public void setPhotoData(String photoData) {
    this.photoData = photoData;
  }

  public String getPhotoContentType() {
    return photoContentType;
  }

  public void setPhotoContentType(String photoContentType) {
    this.photoContentType = photoContentType;
  }

  public LocalDateTime getPhotoUpdatedAt() {
    return photoUpdatedAt;
  }

  public void setPhotoUpdatedAt(LocalDateTime photoUpdatedAt) {
    this.photoUpdatedAt = photoUpdatedAt;
  }
}
