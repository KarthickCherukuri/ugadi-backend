import { EmailManager } from "./EmailManager";

// EmailManager.retryFailedEmails();

EmailManager.sendQrForEmail("Karthick", "21ec01012@iitbbs.ac.in", "ugadi qr", {
  id: "this is a test email",
  slot: 1,
});
