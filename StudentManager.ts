import { getDocs } from "firebase/firestore";
import { Student } from "./types";
import { addStudent, getAllStudents, getIndiv } from "./firebaseConfig";
import { EmailManager } from "./EmailManager";

export default class StudentManager {
  static async getAllStudents() {
    const studentsSnap = await getDocs(getAllStudents);
    const payload = studentsSnap.docs.map((each) => each.data());
    return payload as Student[];
  }

  static async getStudentByRollNumber(transactionId: string) {
    const querySnapshot = await getDocs(getIndiv(transactionId));
    if (querySnapshot.empty) {
      return;
    }
    const student = querySnapshot.docs[0].data() as Student;
    return { student, id: querySnapshot.docs[0].id };
  }

  static async addStudent(student: Student) {
    await addStudent(student);
    EmailManager.sendQrForEmail(student.name, student.email, "UGADI 2025", {
      id: student.transactionId,
      slot: student.slot,
    }).catch((error) => {
      console.error("Error sending email:", error);
    });
  }
}
