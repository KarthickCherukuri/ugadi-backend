import express from "express";
import { app as firebaseApp, getAllStudents, getIndiv } from "./firebaseConfig";
import { getDocs } from "firebase/firestore";
import dotenv from "dotenv";
import StudentManager from "./StudentManager";
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
dotenv.config();

app.get("/:id", async (req, res) => {
  const id = req.params.id;
  const student = StudentManager.getStudentByRollNumber(id);
  res.json(student);
});

app.get("/", async (req, res) => {
  const students = StudentManager.getAllStudents();
  res.send(students);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
