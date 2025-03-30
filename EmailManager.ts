import nodemailer from "nodemailer";
import qrCode from "qrcode";
import Codec from "./Codec";

const POOL_SIZE = 3; // Number of transporters in the pool
const MAX_RETRIES = 3; // Maximum number of retries for failed emails
const RETRY_DELAY = 3000; // 3 seconds between retries
const { gmailCredentials } = process.env;
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
    throw error;
  } finally {
    // Close the transporter
    transporter.close();
  }
};

export class EmailManager {
  static sendQrForEmail = async (
    toName: string,
    to: string,
    subject: string,
    payload: string
  ) => {
    try {
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
}
