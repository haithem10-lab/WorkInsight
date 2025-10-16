package com.workinsight.api.dto;

import java.util.List;

public record JobOfferResponse(
    String id,
    String title,
    String company,
    String location,
    String contactEmail,
    List<String> skills
) {
}
