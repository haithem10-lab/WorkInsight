package com.workinsight.api.service;

import com.workinsight.api.model.ResumeProfile;
import com.workinsight.api.model.ResumeProfileRepository;
import com.workinsight.api.service.ai.ResumeExtractionResult;
import com.workinsight.api.service.ai.StructuredExtractionService;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ResumeService {

  private static final Logger LOGGER = LoggerFactory.getLogger(ResumeService.class);
  private static final Pattern SKILL_WORD_PATTERN = Pattern.compile("\\b[\\p{L}+#]{2,}\\b");
  private static final Pattern ACRONYM_PATTERN = Pattern.compile("\\b[A-Z]{2,}(?:\\+\\+|#)?\\b");
  private static final Pattern LOCATION_PATTERN = Pattern.compile(
      "(?i)\\b(?:based in|located in|location|residing in|living in)\\s+([\\p{L}\\-', ]{2,80})");
  private static final int MAX_CAPTURED_TEXT = 20_000;

  private final ResumeProfileRepository repository;
  private final StructuredExtractionService structuredExtractionService;

  public ResumeService(
      ResumeProfileRepository repository,
      StructuredExtractionService structuredExtractionService) {
    this.repository = repository;
    this.structuredExtractionService = structuredExtractionService;
  }

  public Optional<ResumeProfile> getProfile(String userId) {
    if (userId == null || userId.isBlank()) {
      return Optional.empty();
    }
    return repository.findByUserId(userId.trim().toLowerCase(Locale.ROOT));
  }

  public ResumeProfile processResume(MultipartFile resumeFile, String userId) {
    if (resumeFile == null || resumeFile.isEmpty()) {
      throw new IllegalArgumentException("Resume file is required");
    }
    if (userId == null || userId.isBlank()) {
      throw new IllegalArgumentException("userId is required");
    }
    String normalizedUserId = userId.trim().toLowerCase(Locale.ROOT);
    String rawText = condenseText(readResumeText(resumeFile));
    if (!isNotBlank(rawText)) {
      throw new IllegalArgumentException("Unable to read resume contents");
    }

    Optional<ResumeExtractionResult> aiResult = structuredExtractionService.extractResumeProfile(rawText);
    String headline = aiResult.map(ResumeExtractionResult::headline)
        .filter(this::isNotBlank)
        .orElseGet(() -> deriveHeadline(rawText));
    String summary = aiResult.map(ResumeExtractionResult::summary)
        .filter(this::isNotBlank)
        .orElseGet(() -> deriveSummary(rawText));
    List<String> skills = aiResult.map(ResumeExtractionResult::skills)
        .filter(list -> !list.isEmpty())
        .orElseGet(() -> deriveSkills(rawText));
    List<String> locations = aiResult.map(ResumeExtractionResult::locations)
        .filter(list -> !list.isEmpty())
        .orElseGet(() -> deriveLocations(rawText));

    LocalDateTime now = LocalDateTime.now();
    ResumeProfile profile = repository.findByUserId(normalizedUserId)
        .map(existing -> {
          existing.setHeadline(headline);
          existing.setSummary(summary);
          existing.setSkills(skills);
          existing.setLocations(locations);
          existing.setRawText(rawText);
          existing.setUpdatedAt(now);
          return existing;
        })
        .orElseGet(() -> new ResumeProfile(
            normalizedUserId,
            headline,
            summary,
            skills,
            locations,
            rawText,
            now,
            now
        ));
    return repository.save(profile);
  }

  private String deriveHeadline(String text) {
    if (!isNotBlank(text)) {
      return "";
    }
    String[] lines = text.split("\\R");
    for (String line : lines) {
      String trimmed = line.trim();
      if (trimmed.length() >= 12 && trimmed.length() <= 80) {
        return trimmed;
      }
    }
    return "";
  }

  private String deriveSummary(String text) {
    if (!isNotBlank(text)) {
      return "";
    }
    String[] parts = text.split("\\n\\s*\\n");
    if (parts.length > 0) {
      String first = parts[0].trim();
      if (first.length() > 320) {
        return first.substring(0, 320);
      }
      return first;
    }
    return "";
  }

  private List<String> deriveSkills(String text) {
    if (!isNotBlank(text)) {
      return List.of();
    }
    Set<String> sanitized = new LinkedHashSet<>();
    Matcher acronymMatcher = ACRONYM_PATTERN.matcher(text);
    while (acronymMatcher.find()) {
      String token = acronymMatcher.group();
      if (token.length() >= 2) {
        sanitized.add(token.toUpperCase(Locale.ROOT));
      }
    }
    Matcher wordMatcher = SKILL_WORD_PATTERN.matcher(text);
    while (wordMatcher.find()) {
      String token = wordMatcher.group().trim();
      if (token.length() > 1 && token.length() <= 40) {
        String normalized = token.substring(0, 1).toUpperCase(Locale.ROOT)
            + token.substring(1).toLowerCase(Locale.ROOT);
        sanitized.add(normalized);
      }
    }
    return sanitized.stream().limit(30).toList();
  }

  private List<String> deriveLocations(String text) {
    if (!isNotBlank(text)) {
      return List.of();
    }
    Set<String> matches = new LinkedHashSet<>();
    Matcher matcher = LOCATION_PATTERN.matcher(text);
    while (matcher.find()) {
      String candidate = matcher.group(1).trim();
      if (candidate.length() >= 2 && candidate.length() <= 80) {
        matches.add(candidate);
      }
    }
    return matches.stream().limit(5).toList();
  }

  private String readResumeText(MultipartFile resumeFile) {
    String filename = Optional.ofNullable(resumeFile.getOriginalFilename())
        .orElse("")
        .toLowerCase(Locale.ROOT);
    try {
      if (filename.endsWith(".pdf")) {
        return readPdf(resumeFile);
      }
      if (filename.endsWith(".docx")) {
        return readDocx(resumeFile);
      }
      if (filename.endsWith(".doc")) {
        return readDoc(resumeFile);
      }
      try (InputStream inputStream = resumeFile.getInputStream()) {
        return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
      }
    } catch (IOException ex) {
      throw new IllegalArgumentException("Unable to read resume: " + ex.getMessage(), ex);
    }
  }

  private String readPdf(MultipartFile file) throws IOException {
    try (InputStream inputStream = file.getInputStream();
         PDDocument document = PDDocument.load(inputStream)) {
      PDFTextStripper stripper = new PDFTextStripper();
      stripper.setSortByPosition(true);
      return stripper.getText(document);
    }
  }

  private String readDocx(MultipartFile file) throws IOException {
    try (InputStream inputStream = file.getInputStream();
         XWPFDocument document = new XWPFDocument(inputStream)) {
      StringBuilder builder = new StringBuilder();
      document.getParagraphs().forEach(paragraph -> {
        if (isNotBlank(paragraph.getText())) {
          builder.append(paragraph.getText()).append('\n');
        }
      });
      document.getTables().forEach(table ->
          table.getRows().forEach(row -> row.getTableCells().forEach(cell -> {
            String text = cell.getText();
            if (isNotBlank(text)) {
              builder.append(text).append('\n');
            }
          }))
      );
      return builder.toString();
    }
  }

  private String readDoc(MultipartFile file) throws IOException {
    try (InputStream inputStream = file.getInputStream();
         WordExtractor extractor = new WordExtractor(inputStream)) {
      return extractor.getText();
    }
  }

  private String condenseText(String text) {
    if (text == null) {
      return "";
    }
    String normalized = text.replaceAll("\\s+", " ").trim();
    if (normalized.length() > MAX_CAPTURED_TEXT) {
      return normalized.substring(0, MAX_CAPTURED_TEXT);
    }
    return normalized;
  }

  private boolean isNotBlank(String value) {
    return value != null && !value.isBlank();
  }
}

