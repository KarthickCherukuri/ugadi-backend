import nodemailer from "nodemailer";
import qrCode from "qrcode";
import Codec from "./Codec";
import fs from "fs";
import path from "path";

const POOL_SIZE = 3; // Number of transporters in the pool
const MAX_RETRIES = 3; // Maximum number of retries for failed emails
const RETRY_DELAY = 3000; // 3 seconds between retries
const FAILED_EMAILS_LOG = path.join(__dirname, "failed_emails.json");
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "code4fun.kattamuri@gmail.com",
      pass: "pjydpmibhonskphh",
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 30000, // Increased timeout
    socketTimeout: 30000, // Increased timeout
    // Don't use connection pooling for single transporter
    debug: true, // Enable debug logging
  });
};

const logFailedEmail = (emailData: any, error: any) => {
  let failedEmails = [];

  // Load existing failed emails if file exists
  if (fs.existsSync(FAILED_EMAILS_LOG)) {
    try {
      failedEmails = JSON.parse(fs.readFileSync(FAILED_EMAILS_LOG, "utf-8"));
    } catch (err) {
      console.error("Error reading failed emails log:", err);
    }
  }

  // Add this email with failure reason and timestamp
  failedEmails.push({
    ...emailData,
    error: {
      code: error.code || "UNKNOWN",
      message: error.message,
    },
    failedAt: new Date().toISOString(),
    retryCount: (emailData.retryCount || 0) + 1,
  });

  // Write back to file
  try {
    fs.writeFileSync(FAILED_EMAILS_LOG, JSON.stringify(failedEmails, null, 2));
    console.log(`Email to ${emailData.to} logged for retry later`);
  } catch (err) {
    console.error("Error writing to failed emails log:", err);
  }
};
const isRateLimitError = (error: any) => {
  if (!error) return false;

  // Gmail rate limit indicators
  return (
    error.code === "ETIMEOUT" ||
    error.code === "ESOCKET" ||
    error.responseCode === 421 ||
    (error.message &&
      (error.message.includes("rate limit") ||
        error.message.includes("too many") ||
        error.message.includes("try again") ||
        error.message.includes("temporary")))
  );
};
const sendWithRetry = async (
  mailOptions: nodemailer.SendMailOptions,
  retries = 0
): Promise<any> => {
  // Create a fresh transporter for each attempt
  const transporter = createTransporter();

  try {
    return await new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error: any, info) => {
        if (error) {
          if (
            retries < MAX_RETRIES &&
            (error.code === "ETIMEDOUT" ||
              error.code === "ESOCKET" ||
              error.code === "ECONNRESET" ||
              error.code === "EAUTH")
          ) {
            console.log(
              `Retrying email send, attempt ${retries + 1} of ${MAX_RETRIES}`
            );

            // Wait for a bit before retrying (fixed delay instead of exponential)
            setTimeout(() => {
              sendWithRetry(mailOptions, retries + 1)
                .then(resolve)
                .catch(reject);
            }, RETRY_DELAY);
          } else {
            console.error("Error sending email:", error);

            // Log rate-limited emails for later retry
            if (isRateLimitError(error)) {
              console.log("Rate limit detected, logging email for later retry");
              const emailData = {
                ...mailOptions,
                retryCount: retries,
              };
              logFailedEmail(emailData, error);
            }

            reject(error);
          }
        } else {
          console.log("Email sent successfully:", info.response);
          resolve(info);
        }
      });
    });
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(
        `Retrying email send, attempt ${retries + 1} of ${MAX_RETRIES}`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return sendWithRetry(mailOptions, retries + 1);
    }

    // Check if rate limited
    if (isRateLimitError(error)) {
      console.log(
        "Rate limit detected after max retries, logging email for later retry"
      );
      const emailData = {
        ...mailOptions,
        retryCount: retries,
      };
      logFailedEmail(emailData, error);
    }

    throw error;
  } finally {
    // Close the transporter
    transporter.close();
  }
};

const slotToTimeMapper = (slot: number) => {
  switch (slot) {
    case 1:
      return "07:30 PM - 08:10 PM";
    case 2:
      return "8:20 PM - 09:00 PM";
    default:
      return "09:10PM onwards";
  }
};

export class EmailManager {
  static sendQrForEmail = async (
    toName: string,
    to: string,
    subject: string,
    emailPayload: { id: string; slot: number }
  ) => {
    try {
      const { id: payload, slot } = emailPayload;
      // Make sure payload is not empty
      if (!payload || payload.trim() === "") {
        throw new Error("QR code payload cannot be empty");
      }
      const encodedPayload = Codec.encode(payload);
      const qrBuffer = await qrCode.toBuffer(encodedPayload, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: 300,
      });

      // Create unique content ID for the image
      const contentId = `qr-${Date.now()}@ugadi.com`;
      const slotTime = slotToTimeMapper(slot);
      let mailOptions = {
        from: "code4fun.kattamuri@gmail.com",
        to,
        subject,
        html: `
     <html>
      <body style="font-family: Arial, sans-serif; color: #333; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <div style="padding: 20px; text-align: center; background-color: #0078d4;">
                  <h1 style="color: #fff; margin: 0;">UGADI 2025</h1>
              </div>
              <div style="padding: 20px;">
                  <h2 style="color: #333;">Hello ${toName},</h2>
                  <p style="font-size: 1.1em; color: #555;">
                      Thank you for registering for UGADI 2025! Please find your entry QR code below.
                  </p>
                  

                  <!-- Green Dinner Time Slot Box -->
                  <div style="margin: 20px 0; padding: 15px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
                      <p style="margin: 0; font-weight: bold; color: #065f46;">
                          <strong>Your Dinner Time Slot:</strong> ${slotTime}
                      </p>
                      <p style="margin-top: 8px; color: #065f46; font-size: 0.9em;">
                          Please arrive at the dining area during your assigned time slot to avoid crowds.
                      </p>
                  </div>


                  <!-- Warning Box for One-Time QR Code -->
                  <div style="margin: 20px 0; padding: 15px; background-color: #fff2f0; border-left: 4px solid #d9363e; border-radius: 4px;">
                      <p style="margin: 0; font-weight: bold; color: #d9363e;">
                          ⚠️ Warning: This QR code is for ONE-TIME use only
                      </p>
                      <p style="margin-top: 8px; color: #666; font-size: 0.9em;">
                          Please do not share this QR code with anyone. It can only be scanned once at the entrance and will become invalid after use.
                      </p>
                  </div>
                  
                  <div style="text-align: center; padding: 20px; background-color: #f9f9f9; border-radius: 4px; margin: 20px 0;">
                      <img src="cid:${contentId}" alt="Entry QR Code" style="width: 250px; height: 250px;">
                      <p style="margin-top: 15px; font-weight: bold; color: #333;">Scan this QR code at the entrance</p>
                  </div>
                  
                  
                  <div style="margin-top: 20px; padding: 15px; background-color: #f0f7ff; border-left: 4px solid #0078d4; border-radius: 4px;">
                      <p style="margin: 0; color: #444;">
                          <strong>Important:</strong> Please keep this email and show your QR code at the event entrance.
                      </p>
                  </div>
                  <p style="color: #555; margin-top: 20px;">
                      If you have any questions, please contact the event organizers.
                  </p>
              </div>
              <div style="padding: 15px; text-align: center; background-color: #0078d4; color: #fff;">
                  <p style="font-size: 0.9em; margin: 0;">Need help? Contact us at <a href="mailto:ugadifest@example.com" style="color: #fff; text-decoration: underline;">ugadifest@example.com</a></p>
                  <p style="font-size: 0.8em; color: #ddd;">&copy; ${new Date().getFullYear()} UGADI 2025. All rights reserved.</p>
              </div>
          </div>
      </body>
  </html>
`,
        attachments: [
          {
            filename: "qrcode.png",
            content: qrBuffer,
            cid: contentId, // Content ID referenced in the HTML
          },
        ],
      };
      return await sendWithRetry(mailOptions);
    } catch (error) {
      console.error("Error in sendQrForEmail:", error);
      throw error; // Re-throw to allow caller to handle it
    }
  };

  static retryFailedEmails = async () => {
    if (!fs.existsSync(FAILED_EMAILS_LOG)) {
      console.log("No failed emails to retry");
      return { successful: 0, failed: 0, remaining: 0 };
    }

    try {
      const failedEmails = JSON.parse(
        fs.readFileSync(FAILED_EMAILS_LOG, "utf-8")
      );

      if (failedEmails.length === 0) {
        console.log("No failed emails to retry");
        return { successful: 0, failed: 0, remaining: 0 };
      }

      console.log(`Found ${failedEmails.length} failed emails to retry`);

      const results = {
        successful: 0,
        failed: 0,
        remaining: 0,
      };

      // Process max 20 emails per batch to avoid rate limits
      const batchSize = 20;
      const batch = failedEmails.slice(0, batchSize);
      const remaining = failedEmails.slice(batchSize);

      // Retry each email in the batch
      for (const failedEmail of batch) {
        try {
          if (
            failedEmail.attachments &&
            Array.isArray(failedEmail.attachments)
          ) {
            failedEmail.attachments.forEach((attachment: any) => {
              // Check if content is a serialized buffer object
              if (
                attachment.content &&
                typeof attachment.content === "object" &&
                attachment.content.type === "Buffer" &&
                Array.isArray(attachment.content.data)
              ) {
                // Convert back to actual Buffer
                attachment.content = Buffer.from(attachment.content.data);
              }
            });
          }
          await sendWithRetry(failedEmail);
          results.successful++;
        } catch (error) {
          console.error(`Failed to retry email to ${failedEmail.to}:`, error);
          results.failed++;

          // Keep in the failed emails list with updated retry count
          remaining.push({
            ...failedEmail,
            retryCount: (failedEmail.retryCount || 0) + 1,
            lastRetryAt: new Date().toISOString(),
          });
        }
      }

      // Update the file with remaining emails
      results.remaining = remaining.length;
      fs.writeFileSync(FAILED_EMAILS_LOG, JSON.stringify(remaining, null, 2));

      console.log(
        `Retry results: ${results.successful} successful, ${results.failed} failed, ${results.remaining} remaining`
      );
      return results;
    } catch (error) {
      console.error("Error retrying failed emails:", error);
      throw error;
    }
  };
}
