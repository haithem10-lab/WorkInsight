package com.workinsight.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig {

  private final String allowedOrigins;

  public WebConfig(@Value("${security.cors.allowed-origins:http://localhost:4200}") String allowedOrigins) {
    this.allowedOrigins = allowedOrigins;
  }

  @Bean
  public WebMvcConfigurer corsConfigurer() {
    return new WebMvcConfigurer() {
      @Override
      public void addCorsMappings(CorsRegistry registry) {
        String[] origins = StringUtils.tokenizeToStringArray(allowedOrigins, ",");
        registry.addMapping("/api/**")
            .allowedOriginPatterns(origins != null && origins.length > 0 ? origins : new String[]{"http://localhost:4200"})
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
      }
    };
  }
}
