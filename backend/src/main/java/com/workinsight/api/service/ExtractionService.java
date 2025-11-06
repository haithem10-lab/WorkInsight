package com.workinsight.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.workinsight.api.dto.JobDashboardStatsResponse;
import com.workinsight.api.dto.JobOfferResponse;
import com.workinsight.api.dto.JobOfferSuggestionResponse;
import com.workinsight.api.dto.UpdateJobOfferRequest;
import com.workinsight.api.model.JobOffer;
import com.workinsight.api.model.JobOfferRepository;
import com.workinsight.api.service.ai.HeuristicExtractionSnapshot;
import com.workinsight.api.service.ai.StructuredExtractionResult;
import com.workinsight.api.service.ai.StructuredExtractionService;
import com.workinsight.api.service.ai.VisionOcrService;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.EncryptedDocumentException;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ExtractionService {

  private static final Logger LOGGER = LoggerFactory.getLogger(ExtractionService.class);
  private static final int URL_TIMEOUT_MILLIS = (int) Duration.ofSeconds(6).toMillis();
  private static final int MAX_CAPTURED_TEXT = 8_000;

  private static final Pattern EMAIL_PATTERN = Pattern.compile(
      "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}",
      Pattern.CASE_INSENSITIVE
  );

  private static final Pattern COMPANY_PATTERN = Pattern.compile(
      "(?i)(?:company|entreprise)[:\\s]+([\\p{L}0-9&'\\-\\., ]{2,80})"
  );

  private static final Pattern LOCATION_PATTERN = Pattern.compile(
      "(?i)(?:location|lieu|based in|ville)[:\\s]+([\\p{L}0-9\\-,' ]{2,80})"
  );
  private static final Pattern HOST_PATTERN = Pattern.compile("^[a-z0-9.-]+\\.[a-z]{2,}$");
  private static final Pattern SKILL_SECTION_PATTERN = Pattern.compile(
      "(?i)(?:skills?|competences?|requirements?|technologies?|stack)\\s*[:\\-]\\s*([^\\n]+)"
  );
  private static final Pattern INLINE_SKILL_PATTERN = Pattern.compile(
      "(?i)(?:experience|knowledge|proficiency|maitrise)\\s+(?:with|of)\\s+([\\p{L}0-9+#/., ]{2,80})"
  );
  private static final Pattern BULLET_SKILL_PATTERN = Pattern.compile(
      "(?m)^[\\s*-]+([\\p{L}0-9+#/., ]{2,60})$"
  );
  private static final Pattern ACRONYM_SKILL_PATTERN = Pattern.compile("\\b[A-Z]{2,}(?:\\+\\+|#)?\\b");

  private static final Set<String> TITLE_HINTS = Set.of(
      "title", "job_title", "poste", "role", "position", "intitule", "intitul\u00e9", "jobtitle"
  );

  private static final Set<String> EDITABLE_STATUSES = Set.of(
      "COMPLETED",
      "PENDING",
      "FAILED",
      "IN_REVIEW"
  );

  private static final int MAX_NOTES_LENGTH = 1_200;
  private static final int MAX_TAGS = 12;
  private static final int MAX_TAG_LENGTH = 40;

  private static final DateTimeFormatter TITLE_FORMAT =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
  private static final DateTimeFormatter EXPORT_DATE_FORMAT =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
  private static final String[] EXPORT_HEADERS = new String[]{
      "Role",
      "Company",
      "Location",
      "Email",
      "Skills",
      "Source",
      "Status",
      "Confidence",
      "Created At",
      "Processing (ms)",
      "Source URL"
  };

  private final JobOfferRepository repository;
  private final OcrService ocrService;
  private final VisionOcrService visionOcrService;
  private final StructuredExtractionService structuredExtractionService;
  private final GeoCodingService geoCodingService;
  private final ObjectMapper objectMapper = new ObjectMapper();

  public ExtractionService(
      JobOfferRepository repository,
      OcrService ocrService,
      VisionOcrService visionOcrService,
      StructuredExtractionService structuredExtractionService,
      GeoCodingService geoCodingService) {
    this.repository = repository;
    this.ocrService = ocrService;
    this.visionOcrService = visionOcrService;
    this.structuredExtractionService = structuredExtractionService;
    this.geoCodingService = geoCodingService;
  }

  public JobOffer processSubmission(
      MultipartFile pdf,
      MultipartFile image,
      MultipartFile document,
      MultipartFile spreadsheet,
      MultipartFile csvFile,
      MultipartFile jsonFile,
      String url,
      String userId
  ) throws IOException {
    String normalizedUserId = normalizeUserId(userId);
    if (!isNotBlank(normalizedUserId)) {
      throw new IllegalArgumentException("userId is required to process an extraction");
    }
    boolean hasPdf = pdf != null && !pdf.isEmpty();
    boolean hasImage = image != null && !image.isEmpty();
    boolean hasDocument = document != null && !document.isEmpty();
    boolean hasSpreadsheet = spreadsheet != null && !spreadsheet.isEmpty();
    boolean hasCsv = csvFile != null && !csvFile.isEmpty();
    boolean hasJson = jsonFile != null && !jsonFile.isEmpty();
    String trimmedUrl = url != null ? url.trim() : "";

    LOGGER.info("Received extraction request: pdf={}, image={}, document={}, spreadsheet={}, csv={}, json={}, url={}",
        hasPdf ? pdf.getOriginalFilename() : "-",
        hasImage ? image.getOriginalFilename() : "-",
        hasDocument ? document.getOriginalFilename() : "-",
        hasSpreadsheet ? spreadsheet.getOriginalFilename() : "-",
        hasCsv ? csvFile.getOriginalFilename() : "-",
        hasJson ? jsonFile.getOriginalFilename() : "-",
        trimmedUrl.isBlank() ? "-" : trimmedUrl);

    long startTime = System.currentTimeMillis();
    StringBuilder corpus = new StringBuilder();
    String titleCandidate = "";
    String companyCandidate = "";
    String locationCandidate = "";
    String emailCandidate = "";

    if (hasPdf) {
      try {
        PdfExtraction pdfExtraction = extractFromPdf(pdf);
        titleCandidate = firstNonBlank(titleCandidate, pdfExtraction.title());
        if (isNotBlank(pdfExtraction.text())) {
          corpus.append(' ').append(pdfExtraction.text());
        } else {
          String ocrText = ocrService.extractTextFromPdf(pdf);
          if (isNotBlank(ocrText)) {
            corpus.append(' ').append(ocrText);
          }
        }
      } catch (IOException ex) {
        LOGGER.warn("Failed to read PDF {}: {}", pdf.getOriginalFilename(), ex.getMessage());
      }
    }

    if (!trimmedUrl.isBlank()) {
      UrlExtraction urlExtraction = fetchFromUrl(trimmedUrl);
      titleCandidate = firstNonBlank(titleCandidate, urlExtraction.title());
      companyCandidate = firstNonBlank(companyCandidate, urlExtraction.companyHint());
      locationCandidate = firstNonBlank(locationCandidate, urlExtraction.locationHint());
      if (isNotBlank(urlExtraction.text())) {
        corpus.append(' ').append(urlExtraction.text());
      }
    }

    if (hasImage) {
      boolean highFidelityCaptured = false;
      if (visionOcrService != null) {
        Optional<String> visionText = visionOcrService.extractText(image);
        if (visionText.isPresent()) {
          corpus.append(' ').append(visionText.get());
          highFidelityCaptured = true;
        }
      }
      if (!highFidelityCaptured) {
        String ocrText = ocrService.extractTextFromImage(image);
        if (isNotBlank(ocrText)) {
          corpus.append(' ').append(ocrText);
        }
      }
    }

    if (hasDocument) {
      String documentText = extractDocumentText(document);
      if (isNotBlank(documentText)) {
        corpus.append(' ').append(documentText);
        titleCandidate = firstNonBlank(titleCandidate, extractLeadingLine(documentText));
      }
    }

    if (hasSpreadsheet) {
      String sheetText = extractSpreadsheetText(spreadsheet);
      if (isNotBlank(sheetText)) {
        corpus.append(' ').append(sheetText);
      }
    }

    if (hasCsv) {
      MultipartFile ensuredCsvFile = Objects.requireNonNull(csvFile);
      String csvText = extractCsvText(ensuredCsvFile);
      if (isNotBlank(csvText)) {
        corpus.append(' ').append(csvText);
      }
    }

    if (hasJson) {
      String jsonText = extractJsonText(jsonFile);
      if (isNotBlank(jsonText)) {
        corpus.append(' ').append(jsonText);
        titleCandidate = firstNonBlank(titleCandidate, extractTitleFromStructuredContent(jsonText));
      }
    }

    String combinedText = condenseText(corpus.toString());

    emailCandidate = sanitizeEmail(firstNonBlank(emailCandidate, extractEmail(combinedText)));
    companyCandidate = formatCompany(firstNonBlank(
        companyCandidate,
        extractCompany(combinedText),
        deriveCompanyFromUrl(trimmedUrl)
    ));
    locationCandidate = firstNonBlank(
        locationCandidate,
        extractLocation(combinedText)
    );

    List<String> detectedSkills = new ArrayList<>(detectSkills(combinedText));
    if (hasImage) {
      detectedSkills.add("Image provided");
    }

    locationCandidate = sanitizeLocationCandidate(locationCandidate, trimmedUrl);
    List<String> finalSkills = new ArrayList<>(cleanSkillList(detectedSkills, emailCandidate));

    String sourceTypePreview = resolveSourceType(hasPdf, hasImage, !trimmedUrl.isBlank(), hasDocument, hasSpreadsheet, hasCsv, hasJson);
    HeuristicExtractionSnapshot snapshot = new HeuristicExtractionSnapshot(
        titleCandidate,
        companyCandidate,
        locationCandidate,
        emailCandidate,
        finalSkills,
        sourceTypePreview,
        trimmedUrl.isBlank() ? null : trimmedUrl
    );

    StructuredExtractionResult refined = structuredExtractionService.refine(
        combinedText,
        snapshot)
        .orElse(null);

    if (refined == null && hasImage) {
      refined = structuredExtractionService.refineFromImage(image, snapshot).orElse(null);
    }

    if (refined != null) {
      titleCandidate = firstNonBlank(refined.title(), titleCandidate);
      companyCandidate = firstNonBlank(refined.company(), companyCandidate);
      locationCandidate = firstNonBlank(refined.location(), locationCandidate);
      emailCandidate = sanitizeEmail(firstNonBlank(refined.email(), emailCandidate));
      if (refined.skills() != null && !refined.skills().isEmpty()) {
        finalSkills = new ArrayList<>(cleanSkillList(refined.skills(), emailCandidate));
      }
    }

    titleCandidate = firstNonBlank(
        titleCandidate,
        buildFallbackTitle(hasPdf, hasImage, !trimmedUrl.isBlank(), hasDocument, hasSpreadsheet, hasCsv, hasJson)
    );

    String persistedCompany = toNullIfBlank(companyCandidate);
    String persistedLocation = toNullIfBlank(locationCandidate);
    String persistedEmail = toNullIfBlank(emailCandidate);
    List<String> skillsToPersist = finalSkills.isEmpty()
        ? List.of()
        : List.copyOf(finalSkills);

    String sourceType = sourceTypePreview;
    String rawSnapshot = combinedText;
    List<String> initialTags = List.of();
    double confidence = computeConfidenceScore(
        titleCandidate,
        persistedCompany,
        persistedLocation,
        persistedEmail,
        skillsToPersist
    );
    long processingTime = Math.max(1, System.currentTimeMillis() - startTime);
    LocalDateTime createdAt = LocalDateTime.now();

    Double latitude = null;
    Double longitude = null;
    if (isNotBlank(persistedLocation)) {
      Optional<GeoCodingService.GeoPoint> geoPoint = geoCodingService.lookup(persistedLocation);
      if (geoPoint.isPresent()) {
        latitude = geoPoint.get().latitude();
        longitude = geoPoint.get().longitude();
      }
    }

    JobOffer offer = new JobOffer(
        titleCandidate,
        persistedCompany,
        persistedLocation,
        persistedEmail,
        skillsToPersist,
        sourceType,
        trimmedUrl.isBlank() ? null : trimmedUrl,
        "COMPLETED",
        confidence,
        processingTime,
        createdAt,
        createdAt,
        initialTags,
        null,
        rawSnapshot,
        normalizedUserId,
        latitude,
        longitude
    );

    JobOffer saved = repository.save(offer);
    LOGGER.info("Stored job offer {} with title '{}'", saved.getId(), saved.getTitle());
    return saved;
  }

  public JobOfferResponse toJobOfferResponse(JobOffer job) {
    if (job == null) {
      return null;
    }
    String sanitizedEmail = toNullIfBlank(sanitizeEmail(job.getContactEmail()));
    List<String> sanitizedSkills = cleanSkillList(job.getSkills(), sanitizedEmail);
    String sanitizedCompany = toNullIfBlank(formatCompany(job.getCompany()));
    String sanitizedLocation = toNullIfBlank(sanitizeLocationCandidate(job.getLocation(), job.getSourceUrl()));
    List<String> sanitizedTags = sanitizeTags(job.getTags());
    String sanitizedNotes = sanitizeNotes(job.getNotes());
    String rawSnapshot = job.getRawTextSnapshot();
    Double latitude = job.getLatitude();
    Double longitude = job.getLongitude();
    if ((latitude == null || longitude == null) && isNotBlank(sanitizedLocation)) {
      Optional<GeoCodingService.GeoPoint> geoPoint = geoCodingService.lookup(sanitizedLocation);
      if (geoPoint.isPresent()) {
        latitude = geoPoint.get().latitude();
        longitude = geoPoint.get().longitude();
        if (job.getId() != null && (!Objects.equals(job.getLatitude(), latitude)
            || !Objects.equals(job.getLongitude(), longitude))) {
          job.setLatitude(latitude);
          job.setLongitude(longitude);
          repository.save(job);
        }
      }
    }
    return new JobOfferResponse(
        job.getId(),
        job.getTitle(),
        sanitizedCompany,
        sanitizedLocation,
        sanitizedEmail,
        sanitizedSkills.isEmpty() ? List.of() : List.copyOf(sanitizedSkills),
        job.getSourceType(),
        job.getSourceUrl(),
        job.getConfidenceScore(),
        job.getStatus(),
        job.getCreatedAt(),
        job.getUpdatedAt(),
        job.getProcessingTimeMs(),
        sanitizedTags,
        sanitizedNotes,
        rawSnapshot,
        job.getUserId(),
        approximateCoordinate(latitude),
        approximateCoordinate(longitude)
    );
  }

  public JobOffer updateOffer(String id, String userId, UpdateJobOfferRequest request) {
    if (!isNotBlank(id) || request == null) {
      throw new IllegalArgumentException("Offer id and update payload are required");
    }
    String normalizedUserId = normalizeUserId(userId);
    if (!isNotBlank(normalizedUserId)) {
      throw new IllegalArgumentException("User id is required");
    }
    return repository.findByIdAndUserId(id, normalizedUserId)
        .map(offer -> applyOfferUpdates(offer, request))
        .map(repository::save)
        .orElseThrow(() -> new IllegalArgumentException("Offer not found"));
  }

  public JobOfferSuggestionResponse suggestOfferAdjustments(String id, String userId) {
    if (!isNotBlank(id)) {
      throw new IllegalArgumentException("Offer id is required");
    }
    String normalizedUserId = normalizeUserId(userId);
    if (!isNotBlank(normalizedUserId)) {
      throw new IllegalArgumentException("User id is required");
    }
    JobOffer offer = repository.findByIdAndUserId(id, normalizedUserId)
        .orElseThrow(() -> new IllegalArgumentException("Offer not found"));
    if (!isNotBlank(offer.getRawTextSnapshot())) {
      return null;
    }

    HeuristicExtractionSnapshot snapshot = new HeuristicExtractionSnapshot(
        offer.getTitle(),
        offer.getCompany(),
        offer.getLocation(),
        offer.getContactEmail(),
        offer.getSkills(),
        offer.getSourceType(),
        offer.getSourceUrl()
    );

    StructuredExtractionResult refined = structuredExtractionService.refine(
        offer.getRawTextSnapshot(),
        snapshot
    ).orElse(null);

    if (refined == null) {
      return null;
    }

    String baseEmail = sanitizeEmail(offer.getContactEmail());
    List<String> baseSkills = cleanSkillList(offer.getSkills(), baseEmail);
    String titleCandidate = condenseText(refined.title());
    if (!isNotBlank(titleCandidate)) {
      titleCandidate = null;
    }
    String companyCandidate = toNullIfBlank(formatCompany(refined.company()));
    String locationCandidate = normalizeLocationValue(refined.location());
    String emailCandidate = sanitizeEmail(refined.email());
    List<String> skillCandidate = cleanSkillList(refined.skills(), isNotBlank(emailCandidate) ? emailCandidate : baseEmail);

    String finalTitle = titleCandidate != null ? titleCandidate : offer.getTitle();
    String finalCompany = companyCandidate != null ? companyCandidate : offer.getCompany();
    String finalLocation = isNotBlank(locationCandidate) ? locationCandidate : offer.getLocation();
    String finalEmail = isNotBlank(emailCandidate) ? emailCandidate : baseEmail;
    List<String> finalSkills = !skillCandidate.isEmpty() ? skillCandidate : baseSkills;

    List<String> updatedFields = new ArrayList<>();
    if (titleCandidate != null && !equalsNormalized(titleCandidate, offer.getTitle())) {
      updatedFields.add("title");
    }
    if (companyCandidate != null && !equalsNormalized(companyCandidate, offer.getCompany())) {
      updatedFields.add("company");
    }
    if (isNotBlank(locationCandidate) && !equalsNormalized(locationCandidate, offer.getLocation())) {
      updatedFields.add("location");
    }
    if (isNotBlank(emailCandidate) && !equalsNormalized(emailCandidate, baseEmail)) {
      updatedFields.add("contactEmail");
    }
    if (!skillCandidate.isEmpty() && !listEqualsIgnoreCase(skillCandidate, baseSkills)) {
      updatedFields.add("skills");
    }

    Double suggestedConfidence = computeConfidenceScore(
        finalTitle,
        toNullIfBlank(finalCompany),
        toNullIfBlank(finalLocation),
        toNullIfBlank(finalEmail),
        finalSkills
    );

    return new JobOfferSuggestionResponse(
        finalTitle,
        finalCompany,
        finalLocation,
        toNullIfBlank(finalEmail),
        finalSkills,
        updatedFields,
        suggestedConfidence
    );
  }

  private JobOffer applyOfferUpdates(JobOffer offer, UpdateJobOfferRequest request) {
    boolean changed = false;
    boolean locationChanged = false;

    if (request.title() != null) {
      String sanitizedTitle = toNullIfBlank(condenseText(request.title()));
      if (!Objects.equals(sanitizedTitle, offer.getTitle())) {
        offer.setTitle(sanitizedTitle);
        changed = true;
      }
    }

    if (request.company() != null) {
      String sanitizedCompany = toNullIfBlank(formatCompany(request.company()));
      if (!Objects.equals(sanitizedCompany, offer.getCompany())) {
        offer.setCompany(sanitizedCompany);
        changed = true;
      }
    }

    if (request.location() != null) {
      String sanitizedLocation = toNullIfBlank(normalizeLocationValue(request.location()));
      if (!Objects.equals(sanitizedLocation, offer.getLocation())) {
        offer.setLocation(sanitizedLocation);
        locationChanged = true;
        changed = true;
      }
    }

    String sanitizedEmail = null;
    if (request.contactEmail() != null) {
      sanitizedEmail = toNullIfBlank(sanitizeEmail(request.contactEmail()));
      if (!Objects.equals(sanitizedEmail, offer.getContactEmail())) {
        offer.setContactEmail(sanitizedEmail);
        changed = true;
      }
    } else {
      sanitizedEmail = toNullIfBlank(sanitizeEmail(offer.getContactEmail()));
    }

    if (request.skills() != null) {
      List<String> sanitizedSkills = cleanSkillList(
          request.skills(),
          sanitizedEmail
      );
      List<String> currentSkills = offer.getSkills() == null ? List.of() : offer.getSkills();
      if (!listEqualsIgnoreCase(sanitizedSkills, currentSkills)) {
        offer.setSkills(sanitizedSkills.isEmpty() ? List.of() : List.copyOf(sanitizedSkills));
        changed = true;
      }
    }

    if (request.tags() != null) {
      List<String> sanitizedTags = sanitizeTags(request.tags());
      List<String> currentTags = offer.getTags() == null ? List.of() : offer.getTags();
      if (!Objects.equals(sanitizedTags, currentTags)) {
        offer.setTags(sanitizedTags);
        changed = true;
      }
    } else if (offer.getTags() == null) {
      offer.setTags(List.of());
    }

    if (request.notes() != null) {
      String sanitizedNotes = sanitizeNotes(request.notes());
      if (!Objects.equals(sanitizedNotes, offer.getNotes())) {
        offer.setNotes(sanitizedNotes);
        changed = true;
      }
    }

    if (request.status() != null) {
      String trimmed = request.status().trim();
      String sanitizedStatus = trimmed.isEmpty() ? null : sanitizeStatus(trimmed);
      if (trimmed.isEmpty()) {
        sanitizedStatus = null;
      } else if (sanitizedStatus == null) {
        sanitizedStatus = offer.getStatus();
      }
      if (!Objects.equals(sanitizedStatus, offer.getStatus())) {
        offer.setStatus(sanitizedStatus);
        changed = true;
      }
    }

    if (locationChanged) {
      refreshCoordinates(offer);
    } else if (!isNotBlank(offer.getLocation())) {
      offer.setLatitude(null);
      offer.setLongitude(null);
    }

    if (changed) {
      List<String> normalizedSkills = offer.getSkills() == null ? List.of() : offer.getSkills();
      String normalizedCompany = toNullIfBlank(offer.getCompany());
      String normalizedLocation = toNullIfBlank(offer.getLocation());
      String normalizedEmail = toNullIfBlank(offer.getContactEmail());
      double refreshedConfidence = computeConfidenceScore(
          offer.getTitle(),
          normalizedCompany,
          normalizedLocation,
          normalizedEmail,
          normalizedSkills
      );
      offer.setConfidenceScore(refreshedConfidence);
      offer.setUpdatedAt(LocalDateTime.now());
    } else if (offer.getUpdatedAt() == null) {
      offer.setUpdatedAt(offer.getCreatedAt());
    }

    if (offer.getTags() == null) {
      offer.setTags(List.of());
    }

    return offer;
  }

  public List<JobOffer> listOffers(String userId) {
    String normalizedUserId = normalizeUserId(userId);
    if (!isNotBlank(normalizedUserId)) {
      return List.of();
    }
    return repository.findByUserIdOrderByCreatedAtDesc(normalizedUserId);
  }

  public List<JobOffer> recentOffers(String userId, int limit) {
    String normalizedUserId = normalizeUserId(userId);
    if (!isNotBlank(normalizedUserId)) {
      return List.of();
    }
    List<JobOffer> offers = repository.findTop5ByUserIdOrderByCreatedAtDesc(normalizedUserId);
    if (offers.size() <= limit) {
      return offers;
    }
    return offers.subList(0, Math.max(limit, 0));
  }

  public byte[] exportOffers(String userId) {
    String normalizedUserId = normalizeUserId(userId);
    if (!isNotBlank(normalizedUserId)) {
      return new byte[0];
    }
    List<JobOffer> offers = repository.findByUserIdOrderByCreatedAtDesc(normalizedUserId);
    try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
      Sheet sheet = workbook.createSheet("Offers");
      Font headerFont = workbook.createFont();
      headerFont.setBold(true);
      CellStyle headerStyle = workbook.createCellStyle();
      headerStyle.setFont(headerFont);

      Row headerRow = sheet.createRow(0);
      for (int i = 0; i < EXPORT_HEADERS.length; i++) {
        var cell = headerRow.createCell(i);
        cell.setCellValue(EXPORT_HEADERS[i]);
        cell.setCellStyle(headerStyle);
      }

      int rowIndex = 1;
      for (JobOffer offer : offers) {
        Row row = sheet.createRow(rowIndex++);
        row.createCell(0).setCellValue(defaultString(offer.getTitle()));
        row.createCell(1).setCellValue(defaultString(offer.getCompany()));
        row.createCell(2).setCellValue(defaultString(offer.getLocation()));
        row.createCell(3).setCellValue(defaultString(offer.getContactEmail()));
        row.createCell(4).setCellValue(formatSkills(offer.getSkills()));
        row.createCell(5).setCellValue(defaultString(offer.getSourceType()));
        row.createCell(6).setCellValue(defaultString(offer.getStatus()));
        row.createCell(7).setCellValue(formatConfidence(offer.getConfidenceScore()));
        row.createCell(8).setCellValue(formatCreatedAt(offer.getCreatedAt()));
        if (offer.getProcessingTimeMs() != null) {
          row.createCell(9).setCellValue(offer.getProcessingTimeMs());
        } else {
          row.createCell(9).setCellValue("");
        }
        row.createCell(10).setCellValue(defaultString(offer.getSourceUrl()));
      }

      for (int i = 0; i < EXPORT_HEADERS.length; i++) {
        sheet.autoSizeColumn(i);
      }

      workbook.write(output);
      return output.toByteArray();
    } catch (IOException ex) {
      throw new IllegalStateException("Unable to generate offers export", ex);
    }
  }

  public boolean deleteOffer(String id, String userId) {
    String normalizedUserId = normalizeUserId(userId);
    if (id == null || id.isBlank() || !isNotBlank(normalizedUserId)) {
      return false;
    }
    return repository.findByIdAndUserId(id, normalizedUserId)
        .map(job -> {
          repository.deleteById(job.getId());
          return true;
        })
        .orElse(false);
  }

  public JobDashboardStatsResponse buildDashboardStats(String userId) {
    String normalizedUserId = normalizeUserId(userId);
    if (!isNotBlank(normalizedUserId)) {
      return JobDashboardStatsResponse.empty(LocalDateTime.now());
    }
    List<JobOffer> offers = repository.findByUserIdOrderByCreatedAtDesc(normalizedUserId);
    long totalOffers = offers.size();
    LocalDate today = LocalDate.now();
    LocalDate weekStart = today.minusDays(6);

    long offersToday = offers.stream()
        .map(JobOffer::getCreatedAt)
        .filter(Objects::nonNull)
        .map(LocalDateTime::toLocalDate)
        .filter(today::equals)
        .count();

    long offersThisWeek = offers.stream()
        .map(JobOffer::getCreatedAt)
        .filter(Objects::nonNull)
        .map(LocalDateTime::toLocalDate)
        .filter(date -> !date.isBefore(weekStart))
        .count();

    double averageConfidence = offers.stream()
        .map(JobOffer::getConfidenceScore)
        .filter(Objects::nonNull)
        .mapToDouble(Double::doubleValue)
        .average()
        .orElse(0.0);

    Map<String, Long> rawSourceBreakdown = offers.stream()
        .collect(Collectors.groupingBy(
            offer -> Optional.ofNullable(offer.getSourceType()).filter(ExtractionService::isNotBlank).orElse("UNKNOWN"),
            Collectors.counting()
        ));

    LinkedHashMap<String, Long> sourceBreakdown = rawSourceBreakdown.entrySet().stream()
        .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
        .collect(Collectors.toMap(
            Map.Entry::getKey,
            Map.Entry::getValue,
            (a, b) -> a,
            LinkedHashMap::new
        ));

    Map<LocalDate, Long> countsByDate = offers.stream()
        .map(JobOffer::getCreatedAt)
        .filter(Objects::nonNull)
        .map(LocalDateTime::toLocalDate)
        .collect(Collectors.groupingBy(date -> date, Collectors.counting()));

    List<JobDashboardStatsResponse.DailyCount> dailyCounts = new ArrayList<>();
    for (int i = 6; i >= 0; i--) {
      LocalDate date = today.minusDays(i);
      long count = countsByDate.getOrDefault(date, 0L);
      dailyCounts.add(new JobDashboardStatsResponse.DailyCount(date, count));
    }

    Map<String, Long> companyCounts = offers.stream()
        .map(JobOffer::getCompany)
        .filter(ExtractionService::isNotBlank)
        .collect(Collectors.groupingBy(company -> company, Collectors.counting()));

    List<JobDashboardStatsResponse.TopItem> topCompanies = companyCounts.entrySet().stream()
        .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
        .limit(5)
        .map(entry -> new JobDashboardStatsResponse.TopItem(entry.getKey(), entry.getValue()))
        .toList();

    Map<String, Long> skillCounts = offers.stream()
        .map(JobOffer::getSkills)
        .filter(Objects::nonNull)
        .flatMap(List::stream)
        .filter(ExtractionService::isNotBlank)
        .map(skill -> skill.trim())
        .collect(Collectors.groupingBy(skill -> skill, Collectors.counting()));

    List<JobDashboardStatsResponse.TopItem> topSkills = skillCounts.entrySet().stream()
        .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
        .limit(8)
        .map(entry -> new JobDashboardStatsResponse.TopItem(entry.getKey(), entry.getValue()))
        .toList();

    return new JobDashboardStatsResponse(
        totalOffers,
        offersToday,
        offersThisWeek,
        Math.round(averageConfidence * 100.0) / 100.0,
        sourceBreakdown,
        dailyCounts,
        topCompanies,
        topSkills,
        LocalDateTime.now()
    );
  }

  private PdfExtraction extractFromPdf(MultipartFile pdf) throws IOException {
    byte[] bytes = pdf.getBytes();
    try (PDDocument document = PDDocument.load(bytes)) {
      String title = Optional.ofNullable(document.getDocumentInformation())
          .map(info -> info.getTitle())
          .orElse("");
      PDFTextStripper stripper = new PDFTextStripper();
      stripper.setSortByPosition(true);
      String text = stripper.getText(document);
      return new PdfExtraction(
          condenseText(title),
          condenseText(text)
      );
    }
  }

  private UrlExtraction fetchFromUrl(String url) {
    try {
      Document document = Jsoup.connect(url)
          .userAgent("WorkInsightBot/0.1")
          .timeout(URL_TIMEOUT_MILLIS)
          .get();

      String title = condenseText(document.title());
      if (title.isBlank()) {
        Element heading = document.selectFirst("h1");
        if (heading != null) {
          title = condenseText(heading.text());
        }
      }

      String description = Optional.ofNullable(document.selectFirst("meta[name=description]"))
          .map(tag -> tag.attr("content"))
          .orElse("");
      String bodyText = Optional.ofNullable(document.body())
          .map(Element::text)
          .orElse("");

      String combined = Stream.of(description, bodyText)
          .filter(ExtractionService::isNotBlank)
          .map(this::condenseText)
          .collect(Collectors.joining(" "));

      String companyHint = firstNonBlank(
          extractCompany(combined),
          deriveCompanyFromUrl(url)
      );

      String locationHint = firstNonBlank(
          extractLocation(combined),
          deriveLocationFromUrl(url)
      );

      return new UrlExtraction(title, combined, companyHint, locationHint);
    } catch (Exception ex) {
      LOGGER.warn("Failed to fetch URL {}: {}", url, ex.getMessage());
      return new UrlExtraction("", "", deriveCompanyFromUrl(url), deriveLocationFromUrl(url));
    }
  }

  private List<String> detectSkills(String text) {
    if (!isNotBlank(text)) {
      return List.of();
    }
    LinkedHashMap<String, String> matches = new LinkedHashMap<>();
    Matcher sectionMatcher = SKILL_SECTION_PATTERN.matcher(text);
    while (sectionMatcher.find()) {
      collectSkillsFromSegment(sectionMatcher.group(1), matches);
    }
    Matcher inlineMatcher = INLINE_SKILL_PATTERN.matcher(text);
    while (inlineMatcher.find()) {
      collectSkillsFromSegment(inlineMatcher.group(1), matches);
    }
    Matcher bulletMatcher = BULLET_SKILL_PATTERN.matcher(text);
    while (bulletMatcher.find()) {
      collectSkillsFromSegment(bulletMatcher.group(1), matches);
    }
    Matcher acronymMatcher = ACRONYM_SKILL_PATTERN.matcher(text);
    while (acronymMatcher.find()) {
      String token = acronymMatcher.group();
      addSkillCandidate(matches, token);
    }
    for (String fragment : text.split("[,;/\\n]")) {
      String trimmed = fragment.trim();
      if (trimmed.length() < 2 || trimmed.length() > 40) {
        continue;
      }
      if (trimmed.contains("@") || trimmed.startsWith("http")) {
        continue;
      }
      if (trimmed.matches("(?i).*(skills?|competences?|requirements?).*")) {
        continue;
      }
      addSkillCandidate(matches, trimmed);
    }
    return new ArrayList<>(matches.values());
  }

  private String extractEmail(String text) {
    if (!isNotBlank(text)) {
      return "";
    }
    Matcher matcher = EMAIL_PATTERN.matcher(text);
    if (matcher.find()) {
      return matcher.group();
    }
    return "";
  }

  private String extractCompany(String text) {
    if (!isNotBlank(text)) {
      return "";
    }
    Matcher matcher = COMPANY_PATTERN.matcher(text);
    if (matcher.find()) {
      return condenseText(matcher.group(1));
    }
    return "";
  }

  private String extractLocation(String text) {
    if (!isNotBlank(text)) {
      return "";
    }
    Matcher matcher = LOCATION_PATTERN.matcher(text);
    if (matcher.find()) {
      return condenseText(matcher.group(1));
    }
    return "";
  }

  private String deriveCompanyFromUrl(String url) {
    if (!isNotBlank(url)) {
      return "";
    }
    try {
      URI uri = URI.create(url);
      String host = uri.getHost();
      if (host == null) {
        return "";
      }
      String cleaned = host.toLowerCase(Locale.ROOT).replace("www.", "");
      String[] parts = cleaned.split("\\.");
      if (parts.length == 0) {
        return "";
      }
      String candidate = parts[0];
      if (parts.length > 1 && ("jobs".equals(candidate) || "careers".equals(candidate))) {
        candidate = parts[1];
      }
      return formatProperNouns(candidate);
    } catch (IllegalArgumentException ex) {
      LOGGER.debug("Unable to derive company from url {}: {}", url, ex.getMessage());
      return "";
    }
  }

  private String deriveLocationFromUrl(String url) {
    if (!isNotBlank(url)) {
      return "";
    }
    try {
      URI uri = URI.create(url);
      String queryLocation = extractLocationFromQuery(uri);
      if (isNotBlank(queryLocation)) {
        return formatProperNouns(queryLocation);
      }
      String pathLocation = extractLocationFromPath(uri);
      if (isNotBlank(pathLocation)) {
        return pathLocation;
      }
      String host = uri.getHost();
      if (host == null) {
        return "";
      }
      String country = resolveCountryFromHost(host);
      if (isNotBlank(country)) {
        return country;
      }
      return "";
    } catch (IllegalArgumentException ex) {
      LOGGER.debug("Unable to derive location from url {}: {}", url, ex.getMessage());
      return "";
    }
  }

  private String buildFallbackTitle(
      boolean hasPdf,
      boolean hasImage,
      boolean hasUrl,
      boolean hasDocument,
      boolean hasSpreadsheet,
      boolean hasCsv,
      boolean hasJson) {
    if (hasPdf) {
      return "Offre importee depuis PDF";
    }
    if (hasImage) {
      return "Offre importee depuis image";
    }
    if (hasDocument) {
      return "Offre importee depuis document";
    }
    if (hasSpreadsheet) {
      return "Offre importee depuis feuille de calcul";
    }
    if (hasCsv) {
      return "Offre importee depuis CSV";
    }
    if (hasJson) {
      return "Offre importee depuis JSON";
    }
    if (hasUrl) {
      return "Offre importee depuis URL";
    }
    return "Offre importee " + TITLE_FORMAT.format(LocalDateTime.now());
  }

  private String extractDocumentText(MultipartFile document) {
    if (document == null || document.isEmpty()) {
      return "";
    }
    String filename = Optional.ofNullable(document.getOriginalFilename())
        .orElse("")
        .toLowerCase(Locale.ROOT);
    try {
      if (filename.endsWith(".docx")) {
        return extractDocxText(document);
      }
      if (filename.endsWith(".doc")) {
        return extractDocText(document);
      }
      try (InputStream inputStream = document.getInputStream()) {
        return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
      }
    } catch (IOException ex) {
      LOGGER.warn("Unable to read document {}: {}", document.getOriginalFilename(), ex.getMessage());
      return "";
    }
  }

  private String extractDocxText(MultipartFile document) throws IOException {
    try (InputStream inputStream = document.getInputStream();
         XWPFDocument xwpfDocument = new XWPFDocument(inputStream)) {
      StringBuilder builder = new StringBuilder();
      xwpfDocument.getParagraphs().forEach(paragraph -> appendLine(builder, paragraph.getText()));
      xwpfDocument.getTables().forEach(table ->
          table.getRows().forEach(row -> {
            List<String> cells = row.getTableCells().stream()
                .map(cell -> cell.getText())
                .filter(ExtractionService::isNotBlank)
                .map(String::trim)
                .collect(Collectors.toList());
            if (!cells.isEmpty()) {
              builder.append(String.join(" | ", cells)).append('\n');
            }
          })
      );
      return builder.toString();
    }
  }

  private String extractDocText(MultipartFile document) throws IOException {
    try (InputStream inputStream = document.getInputStream();
         WordExtractor extractor = new WordExtractor(inputStream)) {
      return extractor.getText();
    }
  }

  private String extractSpreadsheetText(MultipartFile spreadsheet) {
    if (spreadsheet == null || spreadsheet.isEmpty()) {
      return "";
    }
    try (InputStream inputStream = spreadsheet.getInputStream();
         Workbook workbook = WorkbookFactory.create(inputStream)) {
      DataFormatter formatter = new DataFormatter();
      StringBuilder builder = new StringBuilder();
      int sheetCount = workbook.getNumberOfSheets();
      for (int sheetIndex = 0; sheetIndex < sheetCount; sheetIndex++) {
        Sheet sheet = workbook.getSheetAt(sheetIndex);
        builder.append("Sheet: ").append(sheet.getSheetName()).append('\n');
        int rowCount = 0;
        for (Row row : sheet) {
          if (rowCount >= 200) {
            builder.append("...").append('\n');
            break;
          }
          int lastCellNum = Math.max(row.getLastCellNum(), 0);
          List<String> cells = new ArrayList<>();
          for (int cellIndex = 0; cellIndex < lastCellNum; cellIndex++) {
            cells.add(formatCellValue(row.getCell(cellIndex), formatter));
          }
          if (!cells.isEmpty()) {
            builder.append(String.join("\t", cells)).append('\n');
          }
          rowCount++;
        }
      }
      return builder.toString();
    } catch (IOException | EncryptedDocumentException ex) {
      LOGGER.warn("Unable to read spreadsheet {}: {}", spreadsheet.getOriginalFilename(), ex.getMessage());
      return "";
    }
  }

  private String formatCellValue(Cell cell, DataFormatter formatter) {
    if (cell == null) {
      return "";
    }
    if (cell.getCellType() == CellType.FORMULA) {
      switch (cell.getCachedFormulaResultType()) {
        case STRING:
        case NUMERIC:
        case BOOLEAN:
          return formatter.formatCellValue(cell).trim();
        default:
          return "";
      }
    }
    return formatter.formatCellValue(cell).trim();
  }

  private String extractCsvText(MultipartFile csvFile) {
    if (csvFile == null || csvFile.isEmpty()) {
      return "";
    }
    CSVFormat format = CSVFormat.DEFAULT
        .withFirstRecordAsHeader()
        .withIgnoreEmptyLines()
        .withTrim();
    try (Reader reader = new InputStreamReader(csvFile.getInputStream(), StandardCharsets.UTF_8);
         CSVParser parser = format.parse(reader)) {
      StringBuilder builder = new StringBuilder();
      List<String> headers = parser.getHeaderNames();
      if (headers != null && !headers.isEmpty()) {
        builder.append(String.join("\t", headers)).append('\n');
      }
      int rowCount = 0;
      for (CSVRecord record : parser) {
        if (rowCount >= 250) {
          builder.append("...").append('\n');
          break;
        }
        List<String> values = new ArrayList<>();
        if (headers != null && !headers.isEmpty()) {
          for (String header : headers) {
            values.add(record.isMapped(header) ? record.get(header) : "");
          }
        } else {
          record.forEach(values::add);
        }
        if (!values.isEmpty()) {
          builder.append(String.join("\t", values)).append('\n');
        }
        rowCount++;
      }
      return builder.toString();
    } catch (IOException ex) {
      LOGGER.warn("Unable to read CSV {}: {}", csvFile.getOriginalFilename(), ex.getMessage());
      return "";
    }
  }

  private String extractJsonText(MultipartFile jsonFile) {
    if (jsonFile == null || jsonFile.isEmpty()) {
      return "";
    }
    try (InputStream inputStream = jsonFile.getInputStream()) {
      JsonNode root = objectMapper.readTree(inputStream);
      if (root == null) {
        return "";
      }
      List<String> lines = new ArrayList<>();
      flattenJson(root, "", lines);
      return String.join("\n", lines);
    } catch (IOException ex) {
      LOGGER.warn("Unable to read JSON {}: {}", jsonFile.getOriginalFilename(), ex.getMessage());
      return "";
    }
  }

  private void flattenJson(JsonNode node, String path, List<String> lines) {
    if (node == null) {
      return;
    }
    if (node.isObject()) {
      node.fields().forEachRemaining(entry -> {
        String childPath = isNotBlank(path) ? path + "." + entry.getKey() : entry.getKey();
        flattenJson(entry.getValue(), childPath, lines);
      });
    } else if (node.isArray()) {
      int index = 0;
      for (JsonNode child : node) {
        String childPath = path + "[" + index++ + "]";
        flattenJson(child, childPath, lines);
      }
    } else {
      String value = node.asText("");
      if (isNotBlank(path) && isNotBlank(value)) {
        lines.add(path + ": " + value);
      } else if (isNotBlank(value)) {
        lines.add(value);
      }
    }
  }

  private void appendLine(StringBuilder builder, String line) {
    if (isNotBlank(line)) {
      builder.append(line.trim()).append('\n');
    }
  }

  private String extractLeadingLine(String text) {
    if (!isNotBlank(text)) {
      return "";
    }
    for (String line : text.split("\\R")) {
      String trimmed = line.trim();
      if (isNotBlank(trimmed)) {
        return trimmed.length() > 160 ? trimmed.substring(0, 160) : trimmed;
      }
    }
    return "";
  }

  private String extractTitleFromStructuredContent(String text) {
    if (!isNotBlank(text)) {
      return "";
    }
    for (String line : text.split("\\R")) {
      String trimmed = line.trim();
      if (!isNotBlank(trimmed)) {
        continue;
      }
      int colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        String key = trimmed.substring(0, colonIndex).trim().toLowerCase(Locale.ROOT);
        String value = trimmed.substring(colonIndex + 1).trim();
        if (TITLE_HINTS.contains(key) && isNotBlank(value)) {
          return value;
        }
      }
    }
    return "";
  }

  private String sanitizeEmail(String email) {
    if (!isNotBlank(email)) {
      return "";
    }
    String trimmed = email.trim();
    return EMAIL_PATTERN.matcher(trimmed).matches() ? trimmed.toLowerCase(Locale.ROOT) : "";
  }

  private String formatCompany(String value) {
    if (!isNotBlank(value)) {
      return "";
    }
    String trimmed = value.trim();
    if (trimmed.length() > 120) {
      trimmed = trimmed.substring(0, 120);
    }
    return formatProperNouns(trimmed);
  }

  private String sanitizeLocationCandidate(String location, String url) {
    String normalized = normalizeLocationValue(location);
    if (isNotBlank(normalized)) {
      return normalized;
    }
    String derived = deriveLocationFromUrl(url);
    if (isNotBlank(derived)) {
      return derived;
    }
    return "";
  }

  private String normalizeLocationValue(String location) {
    if (!isNotBlank(location)) {
      return "";
    }
    String trimmed = location.trim();
    String lower = trimmed.toLowerCase(Locale.ROOT);
    if (lower.matches("^(?:non renseigne|unknown|not available|n/?a|pdf|url|image)$")) {
      return "";
    }
    if (trimmed.contains("@") || lower.startsWith("http")) {
      return "";
    }
    if (HOST_PATTERN.matcher(lower).matches()) {
      String country = resolveCountryFromHost(trimmed);
      return isNotBlank(country) ? country : "";
    }
    if (trimmed.length() > 80) {
      trimmed = trimmed.substring(0, 80);
    }
    return formatProperNouns(trimmed);
  }

  private void refreshCoordinates(JobOffer offer) {
    if (offer == null) {
      return;
    }
    String location = offer.getLocation();
    if (!isNotBlank(location)) {
      offer.setLatitude(null);
      offer.setLongitude(null);
      return;
    }
    geoCodingService.lookup(location)
        .ifPresentOrElse(
            point -> {
              offer.setLatitude(point.latitude());
              offer.setLongitude(point.longitude());
            },
            () -> {
              offer.setLatitude(null);
              offer.setLongitude(null);
            });
  }

  private List<String> cleanSkillList(List<String> rawSkills, String emailToExclude) {
    if (rawSkills == null || rawSkills.isEmpty()) {
      return List.of();
    }
    LinkedHashMap<String, String> sanitized = new LinkedHashMap<>();
    String emailLower = emailToExclude != null ? emailToExclude.toLowerCase(Locale.ROOT) : null;
    for (String raw : rawSkills) {
      String normalized = normalizeSkillToken(raw);
      if (!isNotBlank(normalized)) {
        continue;
      }
      String lower = normalized.toLowerCase(Locale.ROOT);
      if (normalized.contains("@")) {
        continue;
      }
      if (emailLower != null && lower.equals(emailLower)) {
        continue;
      }
      if (EMAIL_PATTERN.matcher(normalized).find()) {
        continue;
      }
      if (lower.startsWith("http")) {
        continue;
      }
      if (lower.matches("^(?:skills?|competences?|requirements?|stack|technologies?)$")) {
        continue;
      }
      if (normalized.length() > 40) {
        continue;
      }
      sanitized.putIfAbsent(lower, normalized);
    }
    return sanitized.values().stream().limit(12).toList();
  }

  private List<String> sanitizeTags(List<String> rawTags) {
    if (rawTags == null || rawTags.isEmpty()) {
      return List.of();
    }
    LinkedHashSet<String> sanitized = new LinkedHashSet<>();
    for (String tag : rawTags) {
      if (!isNotBlank(tag)) {
        continue;
      }
      String normalized = tag.trim().replaceAll("\\s+", " ");
      if (!isNotBlank(normalized)) {
        continue;
      }
      if (normalized.length() > MAX_TAG_LENGTH) {
        normalized = normalized.substring(0, MAX_TAG_LENGTH).trim();
      }
      sanitized.add(normalized);
      if (sanitized.size() >= MAX_TAGS) {
        break;
      }
    }
    return sanitized.isEmpty() ? List.of() : List.copyOf(sanitized);
  }

  private String sanitizeNotes(String notes) {
    if (!isNotBlank(notes)) {
      return null;
    }
    String normalized = notes
        .replace("\r\n", "\n")
        .replace('\r', '\n')
        .trim();
    normalized = normalized.replaceAll("\\n{3,}", "\n\n");
    if (normalized.length() > MAX_NOTES_LENGTH) {
      normalized = normalized.substring(0, MAX_NOTES_LENGTH).trim();
    }
    return isNotBlank(normalized) ? normalized : null;
  }

  private void collectSkillsFromSegment(String segment, Map<String, String> accumulator) {
    if (!isNotBlank(segment)) {
      return;
    }
    String normalizedSegment = segment.replace('|', ',');
    for (String token : normalizedSegment.split("[,;/]")) {
      addSkillCandidate(accumulator, token);
    }
  }

  private void addSkillCandidate(Map<String, String> accumulator, String raw) {
    String normalized = normalizeSkillToken(raw);
    if (!isNotBlank(normalized)) {
      return;
    }
    accumulator.putIfAbsent(normalized.toLowerCase(Locale.ROOT), normalized);
  }

  private String normalizeSkillToken(String token) {
    if (!isNotBlank(token)) {
      return "";
    }
    String cleaned = token.trim()
        .replaceAll("^[\\-\\*]+", "")
        .replaceAll("[\\.;,]+$", "");
    if (!isNotBlank(cleaned)) {
      return "";
    }
    if (cleaned.length() > 40) {
      return "";
    }
    String compact = cleaned.replaceAll("\\s+", " ").trim();
    if (!isNotBlank(compact)) {
      return "";
    }
    if (compact.matches("(?i)^image provided$")) {
      return "Image provided";
    }
    if (compact.matches("^[A-Z0-9+#]{2,}$")) {
      return compact.toUpperCase(Locale.ROOT);
    }
    String[] segments = compact.split("[\\s/]+");
    return Arrays.stream(segments)
        .filter(piece -> !piece.isBlank())
        .map(this::capitalizeWord)
        .collect(Collectors.joining(" "));
  }

  private String capitalizeWord(String value) {
    if (!isNotBlank(value)) {
      return "";
    }
    String trimmed = value.trim();
    if (trimmed.length() == 1) {
      return trimmed.toUpperCase(Locale.ROOT);
    }
    return trimmed.substring(0, 1).toUpperCase(Locale.ROOT)
        + trimmed.substring(1).toLowerCase(Locale.ROOT);
  }

  private String toNullIfBlank(String value) {
    return isNotBlank(value) ? value : null;
  }

  private String resolveCountryFromHost(String host) {
    if (!isNotBlank(host)) {
      return "";
    }
    String normalized = host.toLowerCase(Locale.ROOT);
    int lastDot = normalized.lastIndexOf('.');
    if (lastDot >= 0 && lastDot + 1 < normalized.length()) {
      String tld = normalized.substring(lastDot + 1);
      String country = countryNameFromCode(tld);
      if (country != null) {
        return country;
      }
    }
    for (String part : normalized.split("\\.")) {
      String country = countryNameFromCode(part);
      if (country != null) {
        return country;
      }
    }
    return "";
  }

  private String countryNameFromCode(String code) {
    if (!isNotBlank(code) || code.length() < 2 || code.length() > 3) {
      return null;
    }
    String upper = code.toUpperCase(Locale.ROOT);
    Locale locale = new Locale("", upper);
    String display = locale.getDisplayCountry(Locale.ENGLISH);
    if (!isNotBlank(display) || display.equalsIgnoreCase(upper)) {
      return null;
    }
    return display;
  }

  private String extractLocationFromQuery(URI uri) {
    String query = uri.getRawQuery();
    if (!isNotBlank(query)) {
      return "";
    }
    for (String pair : query.split("&")) {
      int idx = pair.indexOf('=');
      if (idx <= 0) {
        continue;
      }
      String key = pair.substring(0, idx);
      if (!"l".equalsIgnoreCase(key) && !"location".equalsIgnoreCase(key)) {
        continue;
      }
      String value = pair.substring(idx + 1);
      String decoded = URLDecoder.decode(value, StandardCharsets.UTF_8);
      if (isNotBlank(decoded)) {
        return decoded.replace('+', ' ').trim();
      }
    }
    return "";
  }

  private String extractLocationFromPath(URI uri) {
    String path = uri.getPath();
    if (!isNotBlank(path)) {
      return "";
    }
    String[] segments = path.split("/");
    for (int i = segments.length - 1; i >= 0; i--) {
      String segment = segments[i];
      if (!isNotBlank(segment)) {
        continue;
      }
      String cleaned = segment.replace('-', ' ').replace('_', ' ').trim();
      if (!isNotBlank(cleaned)) {
        continue;
      }
      String lower = cleaned.toLowerCase(Locale.ROOT);
      if (lower.matches("^(?:jobs?|offres|emploi|emplois|career|careers|search|listing|jobsearch)$")) {
        continue;
      }
      if (cleaned.length() > 40 || cleaned.matches(".*\\d.*")) {
        continue;
      }
      if (HOST_PATTERN.matcher(lower).matches()) {
        continue;
      }
      return formatProperNouns(cleaned);
    }
    return "";
  }

  private String defaultString(String value) {
    return value == null ? "" : value;
  }

  private String formatSkills(List<String> skills) {
    if (skills == null || skills.isEmpty()) {
      return "";
    }
    return skills.stream()
        .filter(ExtractionService::isNotBlank)
        .collect(Collectors.joining(", "));
  }

  private String formatConfidence(Double confidenceScore) {
    if (confidenceScore == null) {
      return "";
    }
    return String.format(Locale.ROOT, "%.2f", confidenceScore);
  }

  private String formatCreatedAt(LocalDateTime createdAt) {
    if (createdAt == null) {
      return "";
    }
    return EXPORT_DATE_FORMAT.format(createdAt);
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

  private String normalizeUserId(String userId) {
    if (userId == null) {
      return "";
    }
    return userId.trim().toLowerCase(Locale.ROOT);
  }

  private static boolean isNotBlank(String value) {
    return value != null && !value.isBlank();
  }

  private String firstNonBlank(String current, String... candidates) {
    if (isNotBlank(current)) {
      return current.trim();
    }
    for (String candidate : candidates) {
      if (isNotBlank(candidate)) {
        return candidate.trim();
      }
    }
    return "";
  }

  private String formatProperNouns(String raw) {
    if (!isNotBlank(raw)) {
      return "";
    }
    return Arrays.stream(raw.split("[\\s\\-_.]+"))
        .filter(segment -> !segment.isBlank())
        .map(segment -> segment.substring(0, 1).toUpperCase(Locale.ROOT) + segment.substring(1))
        .collect(Collectors.joining(" "));
  }

  private String resolveSourceType(
      boolean hasPdf,
      boolean hasImage,
      boolean hasUrl,
      boolean hasDocument,
      boolean hasSpreadsheet,
      boolean hasCsv,
      boolean hasJson) {
    List<String> sources = new ArrayList<>();
    if (hasPdf) {
      sources.add("PDF");
    }
    if (hasImage) {
      sources.add("IMAGE");
    }
    if (hasDocument) {
      sources.add("DOC");
    }
    if (hasSpreadsheet) {
      sources.add("SHEET");
    }
    if (hasCsv) {
      sources.add("CSV");
    }
    if (hasJson) {
      sources.add("JSON");
    }
    if (hasUrl) {
      sources.add("URL");
    }
    if (sources.isEmpty()) {
      return "UNKNOWN";
    }
    return String.join("+", sources);
  }

  private String sanitizeStatus(String status) {
    if (!isNotBlank(status)) {
      return null;
    }
    String upper = status.trim().toUpperCase(Locale.ROOT);
    return EDITABLE_STATUSES.contains(upper) ? upper : null;
  }

  private boolean equalsNormalized(String first, String second) {
    if (!isNotBlank(first) && !isNotBlank(second)) {
      return true;
    }
    if (!isNotBlank(first) || !isNotBlank(second)) {
      return false;
    }
    return first.trim().equalsIgnoreCase(second.trim());
  }

  private boolean listEqualsIgnoreCase(List<String> first, List<String> second) {
    if (first == null || first.isEmpty()) {
      return second == null || second.isEmpty();
    }
    if (second == null || second.isEmpty()) {
      return false;
    }
    if (first.size() != second.size()) {
      return false;
    }
    for (int i = 0; i < first.size(); i++) {
      if (!equalsNormalized(first.get(i), second.get(i))) {
        return false;
      }
    }
    return true;
  }

  private Double approximateCoordinate(Double value) {
    if (value == null) {
      return null;
    }
    BigDecimal rounded = BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    return rounded.doubleValue();
  }

  private double computeConfidenceScore(
      String title,
      String company,
      String location,
      String email,
      List<String> skills
  ) {
    long filled = Stream.of(title, company, location, email)
        .filter(ExtractionService::isNotBlank)
        .count();
    double completeness = filled / 4.0;
    double skillsScore = (skills == null || skills.isEmpty()) ? 0.0 : Math.min(1.0, skills.size() / 5.0);
    double confidence = (completeness * 0.7) + (skillsScore * 0.3);
    return Math.round(confidence * 100.0) / 100.0;
  }

  private record PdfExtraction(String title, String text) {
  }

  private record UrlExtraction(String title, String text, String companyHint, String locationHint) {
  }
}















