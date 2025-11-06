package com.workinsight.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class GeoCodingService {

  private static final Logger LOGGER = LoggerFactory.getLogger(GeoCodingService.class);

  private static final Map<String, GeoPoint> STATIC_LOOKUPS = Map.ofEntries(
      Map.entry("berlin, germany", new GeoPoint(52.520008, 13.404954)),
      Map.entry("paris, france", new GeoPoint(48.856613, 2.352222)),
      Map.entry("london, united kingdom", new GeoPoint(51.507351, -0.127758)),
      Map.entry("madrid, spain", new GeoPoint(40.416775, -3.70379)),
      Map.entry("rome, italy", new GeoPoint(41.902782, 12.496366)),
      Map.entry("new york, united states", new GeoPoint(40.712776, -74.005974)),
      Map.entry("san francisco, united states", new GeoPoint(37.774929, -122.419418)),
      Map.entry("toronto, canada", new GeoPoint(43.653225, -79.383186)),
      Map.entry("tokyo, japan", new GeoPoint(35.6762, 139.6503)),
      Map.entry("singapore", new GeoPoint(1.3521, 103.8198)),
      Map.entry("dubai, united arab emirates", new GeoPoint(25.204849, 55.270782))
  );

  private final Map<String, GeoPoint> cache = new ConcurrentHashMap<>();
  private final Set<String> negativeCache = ConcurrentHashMap.newKeySet();
  private final HttpClient httpClient = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(5))
      .build();
  private final ObjectMapper objectMapper;

  @Value("${geocoding.nominatim.enabled:false}")
  private boolean nominatimEnabled;

  @Value("${geocoding.nominatim.userAgent:WorkInsight/1.0 (contact@workinsight.local)}")
  private String userAgent;

  public GeoCodingService(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public Optional<GeoPoint> lookup(String location) {
    if (!hasText(location)) {
      return Optional.empty();
    }
    String key = normalizeKey(location);
    GeoPoint cached = cache.get(key);
    if (cached != null) {
      return Optional.of(cached);
    }
    if (negativeCache.contains(key)) {
      return Optional.empty();
    }
    Optional<GeoPoint> staticPoint = resolveStaticLookup(key);
    if (staticPoint.isPresent()) {
      GeoPoint point = staticPoint.get();
      cache.put(key, point);
      return Optional.of(point);
    }
    if (!nominatimEnabled) {
      negativeCache.add(key);
      return Optional.empty();
    }
    try {
      GeoPoint point = queryNominatim(cleanForQuery(location));
      if (point != null) {
        cache.put(key, point);
        negativeCache.remove(key);
        return Optional.of(point);
      }
      negativeCache.add(key);
      return Optional.empty();
    } catch (IOException | InterruptedException ex) {
      LOGGER.warn("Unable to geocode location '{}': {}", location, ex.getMessage());
      negativeCache.add(key);
      return Optional.empty();
    }
  }

  private GeoPoint queryNominatim(String location) throws IOException, InterruptedException {
    String encoded = URLEncoder.encode(location, StandardCharsets.UTF_8);
    String uri = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encoded;
    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(uri))
        .timeout(Duration.ofSeconds(6))
        .header("User-Agent", userAgent)
        .header("Accept-Language", "en")
        .GET()
        .build();
    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() != 200) {
      LOGGER.warn("Geocoding request for '{}' failed with status {}", location, response.statusCode());
      return null;
    }
    JsonNode root = objectMapper.readTree(response.body());
    if (!root.isArray() || root.isEmpty()) {
      return null;
    }
    JsonNode first = root.get(0);
    double lat = parseCoordinate(first.path("lat").asText());
    double lon = parseCoordinate(first.path("lon").asText());
    if (Double.isNaN(lat) || Double.isNaN(lon)) {
      return null;
    }
    return new GeoPoint(lat, lon);
  }

  private double parseCoordinate(String value) {
    if (!hasText(value)) {
      return Double.NaN;
    }
    try {
      return Double.parseDouble(value);
    } catch (NumberFormatException ex) {
      return Double.NaN;
    }
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  private String normalizeKey(String location) {
    if (location == null) {
      return "";
    }
    String key = location
        .toLowerCase(Locale.ROOT)
        .replaceAll("\\(.*?\\)", " ")
        .replaceAll("\\b(remote|hybrid|on-site|onsite|teletravail|telecommute|home office)\\b", " ")
        .replace('/', ',')
        .replace('|', ',')
        .replaceAll("\\s*-\\s*", ",")
        .replaceAll("\\s+", " ")
        .replaceAll(",\\s*,", ",")
        .trim();
    if (key.endsWith(",")) {
      key = key.substring(0, key.length() - 1).trim();
    }
    return key;
  }

  private Optional<GeoPoint> resolveStaticLookup(String normalizedKey) {
    if (!hasText(normalizedKey)) {
      return Optional.empty();
    }
    String candidate = normalizedKey;
    while (hasText(candidate)) {
      GeoPoint direct = STATIC_LOOKUPS.get(candidate);
      if (direct != null) {
        return Optional.of(direct);
      }
      int commaIndex = candidate.indexOf(',');
      if (commaIndex < 0) {
        break;
      }
      candidate = candidate.substring(commaIndex + 1).trim();
    }
    String[] tokens = normalizedKey.split("\\s+");
    if (tokens.length >= 2) {
      String lastTwo = tokens[tokens.length - 2] + " " + tokens[tokens.length - 1];
      GeoPoint tailPoint = STATIC_LOOKUPS.get(lastTwo);
      if (tailPoint != null) {
        return Optional.of(tailPoint);
      }
    }
    return Optional.empty();
  }

  private String cleanForQuery(String location) {
    if (!hasText(location)) {
      return "";
    }
    return location
        .replaceAll("\\(.*?\\)", " ")
        .replaceAll("\\b(remote|hybrid|on-site|onsite)\\b", " ")
        .replaceAll("\\s+", " ")
        .trim();
  }

  public record GeoPoint(double latitude, double longitude) {
  }
}
