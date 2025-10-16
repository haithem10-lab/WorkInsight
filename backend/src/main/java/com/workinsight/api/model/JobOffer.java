package com.workinsight.api.model;

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

  public JobOffer() {
  }

  public JobOffer(String title, String company, String location, String contactEmail, List<String> skills) {
    this.title = title;
    this.company = company;
    this.location = location;
    this.contactEmail = contactEmail;
    this.skills = skills;
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
}
