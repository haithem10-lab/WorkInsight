package com.workinsight.api.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OpenAiClient {

  private static final Logger LOGGER = LoggerFactory.getLogger(OpenAiClient.class);

  private final ObjectMapper mapper;
  private final HttpClient httpClient;
  private final boolean enabled;
  private final String apiKey;
  private final String baseUrl;
  private final String textModel;
  private final String visionModel;

  public OpenAiClient(
      ObjectMapper mapper,
      @Value("${ai.openai.api-key:}") String apiKey,
      @Value("${ai.openai.base-url:https://api.openai.com/v1}") String baseUrl,
      @Value("${ai.openai.text-model:gpt-4o-mini}") String textModel,
      @Value("${ai.openai.vision-model:gpt-4o-mini}") String visionModel
  ) {
    this.mapper = mapper;
    this.httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();
    this.apiKey = apiKey != null ? apiKey.trim() : "";
    this.enabled = !this.apiKey.isBlank();
    this.baseUrl = baseUrl != null && !baseUrl.isBlank() ? baseUrl : "https://api.openai.com/v1";
    this.textModel = textModel != null && !textModel.isBlank() ? textModel : "gpt-4o-mini";
    this.visionModel = visionModel != null && !visionModel.isBlank() ? visionModel : this.textModel;
    if (this.enabled) {
      LOGGER.info(
          "OpenAI client enabled (text model: {}, vision model: {}, base URL: {}).",
          this.textModel,
          this.visionModel,
          this.baseUrl
      );
    } else {
      LOGGER.info("OpenAI client disabled: no api key configured (`ai.openai.api-key`).");
    }
  }

  public boolean isEnabled() {
    return enabled;
  }

  public String getTextModel() {
    return textModel;
  }

  public String getVisionModel() {
    return visionModel;
  }

  public Optional<String> chat(List<ChatMessage> messages, String model, boolean expectJsonObject) {
    if (!enabled) {
      return Optional.empty();
    }
    if (messages == null || messages.isEmpty()) {
      return Optional.empty();
    }
    try {
      ObjectNode request = mapper.createObjectNode();
      request.put("model", model != null && !model.isBlank() ? model : textModel);
      ArrayNode msgArray = request.putArray("messages");
      for (ChatMessage chatMessage : messages) {
        ObjectNode node = msgArray.addObject();
        node.put("role", chatMessage.role());
        ArrayNode contentArray = node.putArray("content");
        if (chatMessage.text() != null && !chatMessage.text().isBlank()) {
          ObjectNode textNode = contentArray.addObject();
          textNode.put("type", "text");
          textNode.put("text", chatMessage.text());
        }
        for (ImagePart image : chatMessage.images()) {
          ObjectNode imageNode = contentArray.addObject();
          imageNode.put("type", "image_url");
          ObjectNode urlNode = imageNode.putObject("image_url");
          String mediaType = image.mediaType() != null && !image.mediaType().isBlank()
              ? image.mediaType()
              : "image/png";
          urlNode.put("url", "data:" + mediaType + ";base64," + image.base64());
        }
      }
      request.put("temperature", 0.2);
      if (expectJsonObject) {
        ObjectNode formatNode = request.putObject("response_format");
        formatNode.put("type", "json_object");
      }

      HttpRequest httpRequest = HttpRequest.newBuilder()
          .uri(URI.create(baseUrl.endsWith("/") ? baseUrl + "chat/completions" : baseUrl + "/chat/completions"))
          .timeout(Duration.ofSeconds(60))
          .header("Authorization", "Bearer " + apiKey)
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(request.toString(), StandardCharsets.UTF_8))
          .build();

      HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        JsonNode root = mapper.readTree(response.body());
        JsonNode choices = root.path("choices");
        if (choices.isArray() && !choices.isEmpty()) {
          JsonNode messageNode = choices.get(0).path("message");
          JsonNode contentNode = messageNode.path("content");
          if (contentNode.isTextual()) {
            return Optional.of(contentNode.asText());
          }
          if (contentNode.isArray()) {
            StringBuilder builder = new StringBuilder();
            for (JsonNode fragment : contentNode) {
              String type = fragment.path("type").asText("");
              if ("text".equals(type)) {
                builder.append(fragment.path("text").asText(""));
              } else if ("output_text".equals(type)) {
                builder.append(fragment.path("text").asText(""));
              }
            }
            String aggregated = builder.toString().trim();
            if (!aggregated.isEmpty()) {
              return Optional.of(aggregated);
            }
          }
        }
        LOGGER.warn("OpenAI response did not contain usable content: {}", response.body());
      } else {
        LOGGER.warn("OpenAI request failed with status {}: {}", response.statusCode(), response.body());
      }
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      LOGGER.warn("OpenAI request interrupted: {}", ex.getMessage());
    } catch (IOException ex) {
      LOGGER.warn("OpenAI request failed: {}", ex.getMessage());
    }
    return Optional.empty();
  }

  public static ChatMessage system(String text) {
    return new ChatMessage("system", text, Collections.emptyList());
  }

  public static ChatMessage user(String text) {
    return new ChatMessage("user", text, Collections.emptyList());
  }

  public static ChatMessage userWithImage(String text, byte[] imageBytes, String mediaType) {
    String base64 = Base64.getEncoder().encodeToString(imageBytes);
    ImagePart part = new ImagePart(base64, mediaType);
    return new ChatMessage("user", text, List.of(part));
  }

  public record ChatMessage(String role, String text, List<ImagePart> images) {
  }

  public record ImagePart(String base64, String mediaType) {
  }
}
