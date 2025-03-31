import express from "express";
import dotenv from "dotenv";
import StudentManager from "./StudentManager";
import Codec from "./Codec";
import { updateDoc } from "firebase/firestore";
import { getDocRefById, getIndiv } from "./firebaseConfig";
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
  const id = req.params.id;
  const decodedID = Codec.decode(id);
  console.log(decodedID);
  const studentSearchPayload = await StudentManager.getStudentByRollNumber(
    decodedID
  );
  if (!studentSearchPayload) {
    res.status(404).json({ message: "Student not found" });
    return;
  }
  if (studentSearchPayload.student?.isUsed) {
    res.status(401).json(studentSearchPayload!.student);
    return;
  }
  const { student, id: queryId } = studentSearchPayload;
  const docRef = getDocRefById(queryId);
  const updatedPayload: Student = {
    ...student,
    isUsed: true,
  };
  await updateDoc(docRef, updatedPayload as any);
  res.json(student);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
