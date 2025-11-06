package com.workinsight.api.service;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import javax.imageio.ImageIO;
import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class OcrService {

  private static final Logger LOGGER = LoggerFactory.getLogger(OcrService.class);
  private static final int DEFAULT_MAX_PAGES = 3;
  private static final int RENDER_DPI = 280;

  private final ITesseract tesseract;
  private final boolean configured;
  private volatile boolean available;
  private final int maxPages;
  private final String language;

  public OcrService(
      @Value("${ocr.tesseract.data-path:}") String configuredDataPath,
      @Value("${ocr.tesseract.language:eng}") String configuredLanguage,
      @Value("${ocr.enabled:true}") boolean enabled,
      @Value("${ocr.max-pages:" + DEFAULT_MAX_PAGES + "}") int configuredMaxPages
  ) {
    this.language = isNotBlank(configuredLanguage) ? configuredLanguage : "eng";
    this.maxPages = configuredMaxPages > 0 ? configuredMaxPages : DEFAULT_MAX_PAGES;

    if (!enabled) {
      LOGGER.info("OCR service disabled via configuration.");
      this.tesseract = null;
      this.configured = false;
      this.available = false;
      return;
    }

    ITesseract instance = new Tesseract();
    String tessdataPath = resolveTessdataPath(configuredDataPath, this.language);
    if (!isNotBlank(tessdataPath)) {
      LOGGER.warn("""
          OCR inactive: Tesseract training data for '{}' not found. Install Tesseract and \
          set either `ocr.tesseract.data-path` or the TESSDATA_PREFIX environment variable.
          """.stripIndent(), this.language);
      this.tesseract = null;
      this.configured = false;
      this.available = false;
      return;
    }

    instance.setDatapath(tessdataPath);
    instance.setLanguage(this.language);

    this.tesseract = instance;
    this.configured = true;
    this.available = true;
    LOGGER.info("OCR enabled using tessdata path '{}' and language '{}'.", tessdataPath, this.language);
  }

  public String extractTextFromImage(MultipartFile file) {
    if (!isReady() || file == null || file.isEmpty()) {
      return "";
    }
    try (InputStream inputStream = file.getInputStream()) {
      BufferedImage image = ImageIO.read(inputStream);
      if (image == null) {
        LOGGER.debug("Unsupported image format for OCR: {}", file.getOriginalFilename());
        return "";
      }
      return runOcr(image);
    } catch (IOException ex) {
      LOGGER.warn("Failed to read image for OCR: {}", ex.getMessage());
      return "";
    }
  }

  public String extractTextFromPdf(MultipartFile file) {
    if (!isReady() || file == null || file.isEmpty()) {
      return "";
    }
    try (InputStream inputStream = file.getInputStream();
         PDDocument document = PDDocument.load(inputStream)) {
      PDFRenderer renderer = new PDFRenderer(document);
      StringBuilder builder = new StringBuilder();
      int pageCount = Math.min(document.getNumberOfPages(), maxPages);
      for (int page = 0; page < pageCount; page++) {
        BufferedImage image = renderer.renderImageWithDPI(page, RENDER_DPI, ImageType.RGB);
        String text = runOcr(image);
        if (isNotBlank(text)) {
          builder.append(' ').append(text);
        }
        if (!available) {
          break;
        }
      }
      return builder.toString();
    } catch (IOException ex) {
      LOGGER.warn("Unable to read PDF for OCR: {}", ex.getMessage());
      return "";
    }
  }

  private String runOcr(BufferedImage image) {
    if (!isReady() || image == null) {
      return "";
    }
    try {
      String raw = tesseract.doOCR(image);
      return normalize(raw);
    } catch (TesseractException | UnsatisfiedLinkError | RuntimeException ex) {
      disableOcr(ex);
      return "";
    } catch (Error err) {
      disableOcr(err);
      return "";
    }
  }

  private void disableOcr(Throwable cause) {
    if (available) {
      available = false;
      LOGGER.error("OCR disabled after runtime failure: {}", cause.getMessage());
    } else {
      LOGGER.debug("OCR attempt skipped: {}", cause.getMessage());
    }
  }

  private boolean isReady() {
    return configured && available && tesseract != null;
  }

  private String normalize(String raw) {
    if (!isNotBlank(raw)) {
      return "";
    }
    return raw.replaceAll("[\\r\\f]+", "\n").trim();
  }

  private String resolveTessdataPath(String configuredPath, String lang) {
    List<Path> candidates = new ArrayList<>();
    if (isNotBlank(configuredPath)) {
      candidates.add(Path.of(configuredPath));
    }
    String envPath = System.getenv("TESSDATA_PREFIX");
    if (isNotBlank(envPath)) {
      candidates.add(Path.of(envPath));
    }
    for (Path candidate : candidates) {
      Path tessdataDir = normalizeTessdataDirectory(candidate);
      if (tessdataDir == null) {
        continue;
      }
      if (Files.exists(tessdataDir.resolve(lang + ".traineddata"))) {
        return tessdataDir.toString();
      }
    }
    return "";
  }

  private Path normalizeTessdataDirectory(Path candidate) {
    if (candidate == null || !Files.isDirectory(candidate)) {
      return null;
    }
    String name = candidate.getFileName() != null ? candidate.getFileName().toString().toLowerCase() : "";
    if ("tessdata".equals(name)) {
      return candidate;
    }
    Path tessdataChild = candidate.resolve("tessdata");
    if (Files.isDirectory(tessdataChild)) {
      return tessdataChild;
    }
    return candidate;
  }

  private boolean isNotBlank(String value) {
    return value != null && !value.trim().isEmpty();
  }
}
