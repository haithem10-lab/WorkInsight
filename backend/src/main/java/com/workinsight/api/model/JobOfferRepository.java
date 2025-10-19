package com.workinsight.api.model;

import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface JobOfferRepository extends MongoRepository<JobOffer, String> {
  List<JobOffer> findByUserIdOrderByCreatedAtDesc(String userId);

  Optional<JobOffer> findByIdAndUserId(String id, String userId);
}

