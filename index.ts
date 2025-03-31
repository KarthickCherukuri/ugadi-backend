import express from "express";
import dotenv from "dotenv";
import StudentManager from "./StudentManager";
import Codec from "./Codec";
import { updateDoc } from "firebase/firestore";
import {
  getActivationRef,
  getDocRefById,
  getIndiv,
  getSlotActivation,
} from "./firebaseConfig";
import { Student } from "./types";
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
dotenv.config();

app.get("/all/all2", async (req, res) => {
  const students = await StudentManager.getAllStudents();
  console.log("length2", students.length);
  res.send(students);
});

app.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const decodedID = Codec.decode(id);
    const studentSearchPayload = await StudentManager.getStudentByRollNumber(
      decodedID
    );

    // If student not found
    if (!studentSearchPayload) {
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>UGADI 2025 - Invalid QR Code</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333; }
            .container { max-width: 600px; margin: 50px auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .header { background-color: #0078d4; color: white; padding: 20px; margin: -20px -20px 20px; border-radius: 8px 8px 0 0; }
            .error-icon { font-size: 64px; margin: 20px 0; color: #d9363e; }
            .message { font-size: 18px; margin-bottom: 20px; }
            .details { background-color: #fff2f0; border-left: 4px solid #d9363e; padding: 15px; text-align: left; margin: 20px 0; border-radius: 4px; }
            .contact { margin-top: 30px; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>UGADI 2025</h1>
            </div>
            <div class="error-icon">❌</div>
            <h2>Invalid QR Code</h2>
            <div class="message">
              This QR code doesn't match any registered attendee.
            </div>
            <div class="details">
              <p><strong>Error:</strong> Student not found</p>
              <p>The QR code may be invalid or improperly formatted.</p>
            </div>
            <div class="contact">
              If you believe this is an error, please contact the event organizers or visit the registration desk.
            </div>
          </div>
        </body>
        </html>
      `);
      return;
    }

    // If QR code already used
    if (studentSearchPayload.student?.isUsed) {
      const student = studentSearchPayload.student;
      res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>UGADI 2025 - Already Used</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333; }
            .container { max-width: 600px; margin: 50px auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .header { background-color: #0078d4; color: white; padding: 20px; margin: -20px -20px 20px; border-radius: 8px 8px 0 0; }
            .warning-icon { font-size: 64px; margin: 20px 0; color: #f59e0b; }
            .message { font-size: 18px; margin-bottom: 20px; }
            .attendee-info { background-color: #f0f7ff; border-left: 4px solid #0078d4; padding: 15px; text-align: left; margin: 20px 0; border-radius: 4px; }
            .dinner-info { background-color: #f0fff4; border-left: 4px solid #10b981; padding: 15px; text-align: left; margin: 20px 0; border-radius: 4px; }
            .warning { background-color: #fff2f0; border-left: 4px solid #d9363e; padding: 15px; text-align: left; margin: 20px 0; border-radius: 4px; }
            .contact { margin-top: 30px; font-size: 14px; color: #666; }
            .dinner-time { font-weight: bold; color: #065f46; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>UGADI 2025</h1>
            </div>
            <div class="warning-icon">⚠️</div>
            <h2>QR Code Already Used</h2>
            <div class="message">
              This entrance QR code has already been scanned.
            </div>
            <div class="attendee-info">
              <p><strong>Name:</strong> ${student.name}</p>
              <p><strong>Email:</strong> ${student.email}</p>
              <p><strong>Transaction ID:</strong> ${student.transactionId}</p>
            </div>
            <div class="dinner-info">
              <p><strong>Dinner Time Slot:</strong> <span class="dinner-time">Slot ${student.slot}</span></p>
              <p>Please proceed to the dining area during your assigned time slot.</p>
            </div>
            <div class="warning">
              <p><strong>This QR code has already been used for entry.</strong></p>
              <p>For security reasons, each QR code can only be used once.</p>
            </div>
            <div class="contact">
              If you believe this is an error, please contact the event organizers or visit the help desk.
            </div>
          </div>
        </body>
        </html>
      `);
      return;
    }

    // Valid QR code, update and send success response
    const { student, id: queryId } = studentSearchPayload;
    const docRef = getDocRefById(queryId);
    const updatedPayload: Student = {
      ...student,
      isUsed: true,
    };
    const slotActivationSnapShot = await getSlotActivation(student.slot);
    if (slotActivationSnapShot.docs[0].data().isActive) {
      console.log("Slot is active");
      await updateDoc(docRef, updatedPayload as any);
    }
    console.log("slot inactive");

    // Send success HTML
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>UGADI 2025 - Welcome!</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333; }
          .container { max-width: 600px; margin: 50px auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
          .header { background-color: #0078d4; color: white; padding: 20px; margin: -20px -20px 20px; border-radius: 8px 8px 0 0; }
          .success-icon { font-size: 64px; margin: 20px 0; color: #10b981; }
          .message { font-size: 18px; margin-bottom: 20px; }
          .attendee-info { background-color: #f0f7ff; border-left: 4px solid #0078d4; padding: 15px; text-align: left; margin: 20px 0; border-radius: 4px; }
          .dinner-info { background-color: #f0fff4; border-left: 4px solid #10b981; padding: 15px; text-align: left; margin: 20px 0; border-radius: 4px; }
          .note { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; text-align: left; margin: 20px 0; border-radius: 4px; }
          .dinner-time { font-weight: bold; color: #065f46; }
          .welcome-title { color: #10b981; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>UGADI 2025</h1>
          </div>
          <div class="success-icon">✅</div>
          <h2 class="welcome-title">Welcome, ${student.name}!</h2>
          <div class="message">
            Your entry has been successfully verified.
          </div>
          <div class="attendee-info">
            <p><strong>Name:</strong> ${student.name}</p>
            <p><strong>Email:</strong> ${student.email}</p>
            <p><strong>Transaction ID:</strong> ${student.transactionId}</p>
          </div>
          <div class="dinner-info">
            <p><strong>Dinner Time Slot:</strong> <span class="dinner-time">Slot ${student.slot}</span></p>
            <p>Please arrive at the dining area during your assigned time slot to avoid crowds.</p>
          </div>
          <div class="note">
            <p><strong>Note:</strong> This QR code has now been marked as used and cannot be used again for entry.</p>
            <p>Enjoy the event!</p>
          </div>
        </div>
      </body>
      </html>
    `);
    return;
  } catch (error) {
    console.error("Error processing QR code:", error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>UGADI 2025 - Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333; }
          .container { max-width: 600px; margin: 50px auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
          .header { background-color: #0078d4; color: white; padding: 20px; margin: -20px -20px 20px; border-radius: 8px 8px 0 0; }
          .error-icon { font-size: 64px; margin: 20px 0; color: #d9363e; }
          .message { font-size: 18px; margin-bottom: 20px; }
          .details { background-color: #fff2f0; border-left: 4px solid #d9363e; padding: 15px; text-align: left; margin: 20px 0; border-radius: 4px; }
          .contact { margin-top: 30px; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>UGADI 2025</h1>
          </div>
          <div class="error-icon">❌</div>
          <h2>System Error</h2>
          <div class="message">
            Sorry, we encountered an error processing your request.
          </div>
          <div class="details">
            <p><strong>Error:</strong> Server error</p>
            <p>Please try again or contact the event organizers.</p>
          </div>
          <div class="contact">
            Please contact the event organizers or visit the registration desk for assistance.
          </div>
        </div>
      </body>
      </html>
    `);
  }
});

app.get("/activate-slot/:id", async (req, res) => {
  const id = req.params.id;
  const slotActivationSnapShot = await getSlotActivation(parseInt(id));
  const docRef = getActivationRef(slotActivationSnapShot.docs[0].id);
  const updatedPayload = {
    slot: slotActivationSnapShot.docs[0].data().slot,
    isActive: true,
  };
  await updateDoc(docRef, updatedPayload as any);
  res.send(updatedPayload);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
