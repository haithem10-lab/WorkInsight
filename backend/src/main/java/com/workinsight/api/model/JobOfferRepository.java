package com.workinsight.api.model;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface JobOfferRepository extends MongoRepository<JobOffer, String> {
}
