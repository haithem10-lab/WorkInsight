package com.workinsight.api.service;

import com.workinsight.api.model.JobOffer;
import com.workinsight.api.model.JobOfferRepository;
import java.io.IOException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ExtractionService {

  private static final Logger LOGGER = LoggerFactory.getLogger(ExtractionService.class);
  private final JobOfferRepository repository;

  public ExtractionService(JobOfferRepository repository) {
    this.repository = repository;
  }

  public JobOffer processSubmission(MultipartFile pdf, MultipartFile image, String url) throws IOException {
    LOGGER.info("Received extraction request: pdf={}, image={}, url={} ",
        pdf != null ? pdf.getOriginalFilename() : "-",
        image != null ? image.getOriginalFilename() : "-",
        url);

    // Placeholder extraction logic. Replace with OCR/NLP integration.
    JobOffer offer = new JobOffer(
        "Poste à déterminer",
        "Entreprise inconnue",
        "",
        "contact@example.com",
        List.of("Compétence 1", "Compétence 2")
    );

    return repository.save(offer);
  }

  public List<JobOffer> listOffers() {
    return repository.findAll();
  }
}
