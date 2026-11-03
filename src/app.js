import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./modules/auth/auth.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import courseRoutes from "./modules/course/course.routes.js";
import teacherRoutes from './modules/teacher/teacher.routes.js';
import studentRoutes from './modules/student/student.routes.js';
import { teacherAssignmentRoutes, studentAssignmentRoutes } from './modules/assignment/assignment.routes.js';
import quizRoutes from "./modules/quiz/quiz.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(express.json());
app.use(cors());

// Allow the frontend (a different port) to display images served from this server
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/student/quiz", quizRoutes);
app.use("/api/student", aiRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/student", studentAssignmentRoutes);
app.use("/api/student/courses", courseRoutes);
app.use("/api/teacher", teacherAssignmentRoutes);
app.use("/api/teacher", teacherRoutes);

// <server root>/uploads, the same folder the upload code saves into
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

export default app;