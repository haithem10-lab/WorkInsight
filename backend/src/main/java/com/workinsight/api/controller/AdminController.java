package com.workinsight.api.controller;

import com.workinsight.api.dto.AdminBlockRequest;
import com.workinsight.api.dto.AdminUserResponse;
import com.workinsight.api.service.AdminService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@Validated
public class AdminController {

  private final AdminService adminService;

  public AdminController(AdminService adminService) {
    this.adminService = adminService;
  }

  @GetMapping("/users")
  public List<AdminUserResponse> listUsers() {
    return adminService.getUsers();
  }

  @PostMapping("/users/{userId}/block")
  public AdminUserResponse blockUser(
      @PathVariable("userId") String userId,
      @Valid @RequestBody(required = false) AdminBlockRequest request) {
    String reason = request == null ? null : request.reason();
    return adminService.blockUser(userId, reason);
  }

  @PostMapping("/users/{userId}/unblock")
  public AdminUserResponse unblockUser(@PathVariable("userId") String userId) {
    return adminService.unblockUser(userId);
  }

  @PostMapping("/users/{userId}/resend-verification")
  public ResponseEntity<Void> resendVerification(@PathVariable("userId") String userId) {
    adminService.resendVerification(userId);
    return ResponseEntity.ok().build();
  }
}

