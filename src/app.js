import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./modules/auth/auth.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import courseRoutes from "./modules/course/course.routes.js";
import teacherRoutes from './modules/teacher/teacher.routes.js';
const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/student", aiRoutes); 
app.use("/api/student/courses", courseRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/uploads", express.static('uploads'));
export default app;