package com.workinsight.api.model;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserAccountRepository extends MongoRepository<UserAccount, String> {
  Optional<UserAccount> findByEmailIgnoreCase(String email);
  Optional<UserAccount> findByVerificationToken(String token);
  Optional<UserAccount> findByPasswordResetToken(String token);
}
