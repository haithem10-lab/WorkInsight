package com.workinsight.api.service.ai;

import java.io.IOException;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class VisionOcrService {

  private static final Logger LOGGER = LoggerFactory.getLogger(VisionOcrService.class);

  private final OpenAiClient openAiClient;

  public VisionOcrService(OpenAiClient openAiClient) {
    this.openAiClient = openAiClient;
  }

  public Optional<String> extractText(MultipartFile image) {
    if (image == null || image.isEmpty() || !openAiClient.isEnabled()) {
      return Optional.empty();
    }
    try {
      byte[] bytes = image.getBytes();
      String contentType = image.getContentType();
      OpenAiClient.ChatMessage systemMessage = OpenAiClient.system(
          "You are an OCR assistant. Extract every readable word exactly as it appears in the image. "
              + "Return plain text with line breaks preserved. Do not summarize.");
      OpenAiClient.ChatMessage userMessage = OpenAiClient.userWithImage(
          "Read the text from this job-related image and output the raw text.",
          bytes,
          contentType != null && !contentType.isBlank() ? contentType : "image/png");
      return openAiClient.chat(
          java.util.List.of(systemMessage, userMessage),
          openAiClient.getVisionModel(),
          false
      ).map(String::trim).filter(text -> !text.isBlank());
    } catch (IOException ex) {
      LOGGER.warn("Unable to read image bytes for vision OCR: {}", ex.getMessage());
      return Optional.empty();
    }
  }
}


