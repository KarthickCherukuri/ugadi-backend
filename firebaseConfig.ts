import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  where,
  doc,
  limit,
} from "firebase/firestore";
import dotenv from "dotenv";
import { Student } from "./types";

// Load environment variables
dotenv.config();
const {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
  measurementId,
} = process.env;

export const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
  measurementId,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const colref = collection(db, "students");
export const getAllStudents = query(colref);
export const getDocRefById = (id: string) => doc(db, "students", id);
export const getIndiv = (rollNo: string) =>
  query(colref, where("rollNo", "==", rollNo));
export const addStudent = async (data: Student) => {
  try {
    const docRef = await addDoc(colref, data);
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};
