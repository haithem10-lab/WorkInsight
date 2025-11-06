package com.workinsight.api.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class StructuredExtractionService {

  private static final Logger LOGGER = LoggerFactory.getLogger(StructuredExtractionService.class);

  private final OpenAiClient openAiClient;
  private final ObjectMapper mapper;

  public StructuredExtractionService(OpenAiClient openAiClient, ObjectMapper mapper) {
    this.openAiClient = openAiClient;
    this.mapper = mapper;
  }

  public Optional<StructuredExtractionResult> refine(String rawText, HeuristicExtractionSnapshot snapshot) {
    if (!openAiClient.isEnabled() || rawText == null || rawText.isBlank()) {
      return Optional.empty();
    }
    String systemPrompt = """
        You are a recruiting assistant. Your job is to extract structured job-offer data from messy text.
        Always respond with valid JSON containing the fields: title, company, location, email, skills.
        Skills must be an array of individual skills (strings). Leave values empty when unsure. Do not invent data.
        """;

    StringBuilder userPrompt = new StringBuilder();
    userPrompt.append("Raw job text:\n```\n").append(rawText.trim()).append("\n```\n\n");
    userPrompt.append(buildSnapshotContext(snapshot));

    List<OpenAiClient.ChatMessage> messages = List.of(
        OpenAiClient.system(systemPrompt),
        OpenAiClient.user(userPrompt.toString())
    );

    Optional<String> response = openAiClient.chat(messages, openAiClient.getTextModel(), true);
    return response.flatMap(payload -> parseResult(payload, "text"));
  }

  public Optional<StructuredExtractionResult> refineFromImage(
      MultipartFile image,
      HeuristicExtractionSnapshot snapshot
  ) {
    if (!openAiClient.isEnabled() || image == null || image.isEmpty()) {
      return Optional.empty();
    }
    String systemPrompt = """
        You are a recruiting assistant. Read the provided job-offer image and extract the structured information.
        Always respond with valid JSON containing the fields: title, company, location, email, skills.
        Skills must be an array of individual skills (strings). Leave values empty when unsure. Do not invent data.
        """;
    StringBuilder prompt = new StringBuilder();
    prompt.append("Analyse the job offer shown in the image and extract every field you can.\n");
    prompt.append("If a value is missing in the image, leave it empty.\n\n");
    prompt.append(buildSnapshotContext(snapshot));

    try {
      List<OpenAiClient.ChatMessage> messages = List.of(
          OpenAiClient.system(systemPrompt),
          OpenAiClient.userWithImage(prompt.toString(), image.getBytes(), image.getContentType())
      );
      Optional<String> response = openAiClient.chat(messages, openAiClient.getVisionModel(), true);
      return response.flatMap(payload -> parseResult(payload, "vision"));
    } catch (IOException ex) {
      LOGGER.warn("Unable to read image bytes for vision refinement: {}", ex.getMessage());
      return Optional.empty();
    }
  }

  public Optional<ResumeExtractionResult> extractResumeProfile(String rawText) {
    if (!openAiClient.isEnabled() || rawText == null || rawText.isBlank()) {
      return Optional.empty();
    }
    String systemPrompt = """
        You are a recruiting assistant. Extract the candidate profile from a resume.
        Respond with valid JSON containing the keys: headline, summary, skills, locations.
        skills must be an array of distinct skill names. locations must be an array of city or country names.
        Keep the summary concise (<= 3 sentences). Leave values empty if unsure.
        """;

    List<OpenAiClient.ChatMessage> messages = List.of(
        OpenAiClient.system(systemPrompt),
        OpenAiClient.user("Resume text:\n```\n" + rawText.trim() + "\n```")
    );

    Optional<String> response = openAiClient.chat(messages, openAiClient.getTextModel(), true);
    return response.flatMap(payload -> parseResume(payload));
  }

  private String textValue(JsonNode node, String field) {
    if (node == null) {
      return "";
    }
    JsonNode child = node.get(field);
    if (child == null) {
      return "";
    }
    if (child.isTextual()) {
      return child.asText("");
    }
    if (child.isNumber()) {
      return child.asText();
    }
    return "";
  }

  private List<String> listValue(JsonNode node, String field) {
    if (node == null) {
      return List.of();
    }
    JsonNode child = node.get(field);
    if (child == null || !child.isArray()) {
      return List.of();
    }
    List<String> values = new ArrayList<>();
    child.forEach(element -> {
      if (element.isTextual()) {
        String text = element.asText("").trim();
        if (!text.isEmpty()) {
          values.add(text);
        }
      }
    });
    return values;
  }

  private String nullSafe(String value) {
    return value == null ? "" : value;
  }

  private Optional<StructuredExtractionResult> parseResult(String payload, String context) {
    if (payload == null || payload.isBlank()) {
      return Optional.empty();
    }
    try {
      JsonNode node = mapper.readTree(payload);
      String title = textValue(node, "title");
      String company = textValue(node, "company");
      String location = textValue(node, "location");
      String email = textValue(node, "email");
      List<String> skills = listValue(node, "skills");
      StructuredExtractionResult result = new StructuredExtractionResult(title, company, location, email, skills);
      return result.isEmpty() ? Optional.empty() : Optional.of(result);
    } catch (IOException ex) {
      LOGGER.warn("Unable to parse {} structured extraction response: {}", context, ex.getMessage());
      return Optional.empty();
    }
  }

  private Optional<ResumeExtractionResult> parseResume(String payload) {
    if (payload == null || payload.isBlank()) {
      return Optional.empty();
    }
    try {
      JsonNode node = mapper.readTree(payload);
      String headline = textValue(node, "headline");
      String summary = textValue(node, "summary");
      List<String> skills = listValue(node, "skills");
      List<String> locations = listValue(node, "locations");
      if ((headline == null || headline.isBlank())
          && (summary == null || summary.isBlank())
          && skills.isEmpty()
          && locations.isEmpty()) {
        return Optional.empty();
      }
      return Optional.of(new ResumeExtractionResult(headline, summary, skills, locations));
    } catch (IOException ex) {
      LOGGER.warn("Unable to parse resume extraction response: {}", ex.getMessage());
      return Optional.empty();
    }
  }

  private String buildSnapshotContext(HeuristicExtractionSnapshot snapshot) {
    if (snapshot == null) {
      return "";
    }
    StringBuilder builder = new StringBuilder();
    builder.append("Current extraction (may be incomplete):\n");
    builder.append("- Title: ").append(nullSafe(snapshot.title())).append("\n");
    builder.append("- Company: ").append(nullSafe(snapshot.company())).append("\n");
    builder.append("- Location: ").append(nullSafe(snapshot.location())).append("\n");
    builder.append("- Email: ").append(nullSafe(snapshot.email())).append("\n");
    builder.append("- Skills: ").append(snapshot.skills() == null ? "[]" : snapshot.skills()).append("\n");
    builder.append("- Source type: ").append(nullSafe(snapshot.sourceType())).append("\n");
    builder.append("- URL: ").append(nullSafe(snapshot.url())).append("\n\n");
    builder.append("Improve these values only when the content clearly indicates better information.");
    return builder.toString();
  }
}
