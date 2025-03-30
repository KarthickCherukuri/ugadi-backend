//read csv
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { addStudent } from "./firebaseConfig";
import { Student } from "./types";
import StudentManager from "./StudentManager";

export const readCSVFile = async (
  filePath: string,
  headers: boolean | string[] = true
): Promise<Student[]> => {
  return new Promise((resolve, reject) => {
    const results: Student[] = [];

    fs.createReadStream(path.resolve(filePath))
      .pipe(
        parse({
          delimiter: ",",
          columns: headers,
          skip_empty_lines: true,
          trim: true,
        })
      )
      .on("data", (data) => {
        // Convert string values to appropriate types
        const student: Student = {
          ...data,
          phoneNumber: Number(data.phoneNumber),
          isUsed: data.isUsed.toLowerCase() === "true",
        };
        results.push(student);
      })
      .on("error", (error) => {
        reject(error);
      })
      .on("end", () => {
        resolve(results);
      });
  });
};

const main = async () => {
  try {
    const data = await readCSVFile("./students.csv");
    await Promise.all(
      data.map((student) => StudentManager.addStudent(student))
    );

    console.log("All students added successfully");
  } catch (error) {
    console.error("Error reading CSV file:", error);
  }
};

main();
