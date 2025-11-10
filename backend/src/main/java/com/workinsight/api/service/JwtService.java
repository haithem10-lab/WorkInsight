package com.workinsight.api.service;

import com.workinsight.api.model.UserAccount;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private final String secret;
  private final long expirationSeconds;

  public JwtService(
      @Value("${jwt.secret}") String secret,
      @Value("${jwt.expiration-seconds:3600}") long expirationSeconds) {
    this.secret = secret;
    this.expirationSeconds = expirationSeconds;
  }

  public String generateToken(UserAccount account) {
    Instant now = Instant.now();
    return Jwts.builder()
        .setSubject(account.getId())
        .setIssuedAt(Date.from(now))
        .setExpiration(Date.from(now.plusSeconds(expirationSeconds)))
        .addClaims(Map.of(
            "email", account.getEmail(),
            "name", account.getFullName() == null ? "" : account.getFullName()))
        .signWith(getSigningKey(), SignatureAlgorithm.HS256)
        .compact();
  }

  public boolean isTokenValid(String token, String userId) {
    String subject = extractUserId(token);
    return subject != null && subject.equals(userId) && !isTokenExpired(token);
  }

  public String extractUserId(String token) {
    return extractAllClaims(token).getSubject();
  }

  public boolean isTokenExpired(String token) {
    Date expiration = extractAllClaims(token).getExpiration();
    return expiration.before(new Date());
  }

  private Claims extractAllClaims(String token) {
    return Jwts.parserBuilder()
        .setSigningKey(getSigningKey())
        .build()
        .parseClaimsJws(token)
        .getBody();
  }

  private Key getSigningKey() {
    byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
    return Keys.hmacShaKeyFor(keyBytes);
  }
}
