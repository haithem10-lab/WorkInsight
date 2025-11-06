package com.workinsight.api.model;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ResumeProfileRepository extends MongoRepository<ResumeProfile, String> {

  Optional<ResumeProfile> findByUserId(String userId);
}

