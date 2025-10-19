package com.workinsight.api.service;

import com.workinsight.api.dto.JobDashboardStatsResponse;
import com.workinsight.api.model.JobOffer;
import com.workinsight.api.model.JobOfferRepository;
import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
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

  private static final Map<String, String> TLD_TO_COUNTRY = Map.ofEntries(
      Map.entry("fr", "France"),
      Map.entry("de", "Germany"),
      Map.entry("es", "Spain"),
      Map.entry("it", "Italy"),
      Map.entry("be", "Belgium"),
      Map.entry("ca", "Canada"),
      Map.entry("uk", "United Kingdom"),
      Map.entry("co", "Colombia"),
      Map.entry("ma", "Morocco")
  );

  private static final Map<String, String> SKILL_KEYWORDS = Map.ofEntries(
      Map.entry("java", "Java"),
      Map.entry("spring", "Spring"),
      Map.entry("javascript", "JavaScript"),
      Map.entry("typescript", "TypeScript"),
      Map.entry("angular", "Angular"),
      Map.entry("react", "React"),
      Map.entry("node.js", "Node.js"),
      Map.entry("nodejs", "Node.js"),
      Map.entry("python", "Python"),
      Map.entry("mongodb", "MongoDB"),
      Map.entry("sql", "SQL"),
      Map.entry("docker", "Docker"),
      Map.entry("kubernetes", "Kubernetes"),
      Map.entry("aws", "AWS"),
      Map.entry("azure", "Azure"),
      Map.entry("gcp", "GCP"),
      Map.entry("git", "Git"),
      Map.entry("rest", "REST"),
      Map.entry("microservices", "Microservices")
  );

  private static final DateTimeFormatter TITLE_FORMAT =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  private final JobOfferRepository repository;

  public ExtractionService(JobOfferRepository repository) {
    this.repository = repository;
  }

  public JobOffer processSubmission(
      MultipartFile pdf,
      MultipartFile image,
      String url,
      String userId
  ) throws IOException {
    String normalizedUserId = normalizeUserId(userId);
    if (!isNotBlank(normalizedUserId)) {
      throw new IllegalArgumentException("userId is required to process an extraction");
    }
    boolean hasPdf = pdf != null && !pdf.isEmpty();
    boolean hasImage = image != null && !image.isEmpty();
    String trimmedUrl = url != null ? url.trim() : "";

    LOGGER.info("Received extraction request: pdf={}, image={}, url={}",
        hasPdf ? pdf.getOriginalFilename() : "-",
        hasImage ? image.getOriginalFilename() : "-",
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
      corpus.append(' ').append(image.getOriginalFilename());
    }

    String combinedText = condenseText(corpus.toString());

    emailCandidate = firstNonBlank(emailCandidate, extractEmail(combinedText));
    companyCandidate = firstNonBlank(
        companyCandidate,
        extractCompany(combinedText),
        deriveCompanyFromUrl(trimmedUrl)
    );
    locationCandidate = firstNonBlank(
        locationCandidate,
        extractLocation(combinedText),
        deriveLocationFromUrl(trimmedUrl)
    );

    List<String> skills = new ArrayList<>(detectSkills(combinedText));
    if (hasImage) {
      skills.add("Image provided");
    }
    if (skills.isEmpty()) {
      skills.add("No keywords detected yet");
    }
    List<String> finalSkills = skills.stream().distinct().limit(12).toList();

    titleCandidate = firstNonBlank(
        titleCandidate,
        buildFallbackTitle(hasPdf, hasImage, !trimmedUrl.isBlank())
    );
    companyCandidate = firstNonBlank(companyCandidate, "Entreprise inconnue");
    locationCandidate = firstNonBlank(locationCandidate, "Non renseigne");
    emailCandidate = firstNonBlank(emailCandidate, "contact@example.com");

    String sourceType = resolveSourceType(hasPdf, hasImage, !trimmedUrl.isBlank());
    double confidence = computeConfidenceScore(titleCandidate, companyCandidate, locationCandidate, emailCandidate, finalSkills);
    long processingTime = Math.max(1, System.currentTimeMillis() - startTime);
    LocalDateTime createdAt = LocalDateTime.now();

    JobOffer offer = new JobOffer(
        titleCandidate,
        companyCandidate,
        locationCandidate,
        emailCandidate,
        finalSkills,
        sourceType,
        trimmedUrl.isBlank() ? null : trimmedUrl,
        "COMPLETED",
        confidence,
        processingTime,
        createdAt,
        normalizedUserId
    );

    JobOffer saved = repository.save(offer);
    LOGGER.info("Stored job offer {} with title '{}'", saved.getId(), saved.getTitle());
    return saved;
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
    String lower = text.toLowerCase(Locale.ROOT);
    List<String> matches = new ArrayList<>();
    for (Map.Entry<String, String> entry : SKILL_KEYWORDS.entrySet()) {
      if (lower.contains(entry.getKey())) {
        matches.add(entry.getValue());
      }
    }
    return matches.stream().distinct().limit(12).toList();
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
      String host = uri.getHost();
      if (host == null) {
        return "";
      }
      int lastDot = host.lastIndexOf('.');
      if (lastDot >= 0 && lastDot + 1 < host.length()) {
        String tld = host.substring(lastDot + 1).toLowerCase(Locale.ROOT);
        String country = TLD_TO_COUNTRY.get(tld);
        if (country != null) {
          return country;
        }
      }
      return host;
    } catch (IllegalArgumentException ex) {
      LOGGER.debug("Unable to derive location from url {}: {}", url, ex.getMessage());
      return "";
    }
  }

  private String buildFallbackTitle(boolean hasPdf, boolean hasImage, boolean hasUrl) {
    if (hasPdf) {
      return "Offre importee depuis PDF";
    }
    if (hasImage) {
      return "Offre importee depuis image";
    }
    if (hasUrl) {
      return "Offre importee depuis URL";
    }
    return "Offre importee " + TITLE_FORMAT.format(LocalDateTime.now());
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

  private String resolveSourceType(boolean hasPdf, boolean hasImage, boolean hasUrl) {
    List<String> sources = new ArrayList<>();
    if (hasPdf) {
      sources.add("PDF");
    }
    if (hasImage) {
      sources.add("IMAGE");
    }
    if (hasUrl) {
      sources.add("URL");
    }
    if (sources.isEmpty()) {
      return "UNKNOWN";
    }
    return String.join("+", sources);
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

