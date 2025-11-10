package com.workinsight.api.service;

import com.workinsight.api.model.UserAccount;
import jakarta.annotation.Nullable;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

  private static final Logger LOGGER = LoggerFactory.getLogger(EmailService.class);

  private final JavaMailSender mailSender;
  private final String fromAddress;

  public EmailService(
      @Nullable JavaMailSender mailSender,
      @Value("${spring.mail.username:}") String fromAddress) {
    this.mailSender = mailSender;
    this.fromAddress = fromAddress;
  }

  public void sendVerificationEmail(UserAccount account, String verificationLink) {
    String subject = "Verify your WorkInsight account";
    String body = buildVerificationBody(account, verificationLink);
    logBackup(
        "verification",
        account.getEmail(),
        subject,
        verificationLink,
        buildVerificationPreview(account));
    dispatchEmail(account.getEmail(), subject, body);
  }

  public void sendPasswordResetEmail(UserAccount account, String resetLink) {
    String subject = "Reset your WorkInsight password";
    String body = buildResetBody(account, resetLink);
    logBackup(
        "password_reset",
        account.getEmail(),
        subject,
        resetLink,
        buildResetPreview(account));
    dispatchEmail(account.getEmail(), subject, body);
  }

  private void dispatchEmail(String to, String subject, String body) {
    if (mailSender == null || fromAddress == null || fromAddress.isBlank()) {
      LOGGER.info("[EMAIL_SIMULATION] To: {} | Subject: {} | Body: {}", to, subject, body);
      return;
    }
    try {
      var message = mailSender.createMimeMessage();
      var helper = new MimeMessageHelper(
          message,
          MimeMessageHelper.MULTIPART_MODE_NO,
          StandardCharsets.UTF_8.name());
      helper.setFrom(fromAddress);
      helper.setTo(to);
      helper.setSubject(subject);
      helper.setText(body, true);
      mailSender.send(message);
    } catch (MailException ex) {
      LOGGER.warn("Failed to send email to {}: {}", to, ex.getMessage());
    } catch (Exception ex) {
      LOGGER.error("Unexpected error while sending email", ex);
    }
  }

  private void logBackup(String type, String to, String subject, String link, String message) {
    LOGGER.info("[EMAIL_BACKUP:{}] To: {} | Subject: {} | Link: {} | Message: {}", type, to, subject, link, message);
  }

  private String buildVerificationPreview(UserAccount account) {
    return "Hi %s, thanks for joining WorkInsight. Use the link to verify your account."
        .formatted(displayName(account));
  }

  private String buildResetPreview(UserAccount account) {
    return "Hi %s, use the link to reset your password. Ignore this if you didn't request it."
        .formatted(displayName(account));
  }

  private String buildVerificationBody(UserAccount account, String link) {
    String name = displayName(account);
    return """
        <table width='100%%' cellpadding='0' cellspacing='0' style="font-family:'Inter',Arial,sans-serif;background:#03081f;padding:32px;color:#f8fafc;">
          <tr>
            <td align='center'>
              <table width='600' cellpadding='0' cellspacing='0' style="background:#0c1338;border-radius:28px;padding:40px;box-shadow:0 30px 60px rgba(3,8,31,.6);">
                <tr>
                  <td align='center' style="padding-bottom:16px;">
                    <span style="display:inline-block;padding:12px 18px;border-radius:20px;background:rgba(99,102,241,0.18);color:#c7d2fe;font-weight:700;letter-spacing:1px;">WI</span>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:26px;font-weight:700;padding-bottom:12px;">Confirm your email</td>
                </tr>
                <tr>
                  <td style="line-height:1.6;color:#cbd5f5;padding-bottom:28px;">
                    Hi %s,<br/>
                    Thanks for joining WorkInsight. Click the button below to activate your account and unlock AI-powered extraction.
                  </td>
                </tr>
                <tr>
                  <td align='center' style="padding-bottom:28px;">
                    <a href='%s' style="display:inline-block;padding:15px 36px;border-radius:999px;background:linear-gradient(135deg,#5c7bff,#4ecbff);color:#fff;text-decoration:none;font-weight:600;">Verify email</a>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#8e9ac9;">
                    If you didn't request this, simply ignore this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        """.formatted(name, link);
  }

  private String buildResetBody(UserAccount account, String link) {
    String name = displayName(account);
    return """
        <table width='100%%' cellpadding='0' cellspacing='0' style="font-family:'Inter',Arial,sans-serif;background:#03081f;padding:32px;color:#f8fafc;">
          <tr>
            <td align='center'>
              <table width='600' cellpadding='0' cellspacing='0' style="background:#0c1338;border-radius:28px;padding:40px;box-shadow:0 30px 60px rgba(3,8,31,.6);">
                <tr>
                  <td align='center' style="padding-bottom:16px;">
                    <span style="display:inline-block;padding:12px 18px;border-radius:20px;background:rgba(255,255,255,0.12);color:#f1f5f9;font-weight:700;letter-spacing:1px;">WI</span>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:26px;font-weight:700;padding-bottom:12px;">Reset your password</td>
                </tr>
                <tr>
                  <td style="line-height:1.6;color:#cbd5f5;padding-bottom:28px;">
                    Hi %s,<br/>
                    We received a request to reset your password. Tap the button below to choose a new one. If you didn't request this, you can ignore this message.
                  </td>
                </tr>
                <tr>
                  <td align='center' style="padding-bottom:28px;">
                    <a href='%s' style="display:inline-block;padding:15px 36px;border-radius:999px;background:linear-gradient(135deg,#ff7aa5,#ffb457);color:#fff;text-decoration:none;font-weight:600;">Reset password</a>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#8e9ac9;">
                    This link will expire shortly for security reasons.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        """.formatted(name, link);
  }

  private String displayName(UserAccount account) {
    String name = account.getFullName();
    if (name == null || name.isBlank()) {
      return account.getEmail();
    }
    return name.trim();
  }
}

