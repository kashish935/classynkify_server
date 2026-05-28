import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const askDoubtSolver = async (question, courseContext) => {
  const prompt = courseContext
    ? `Course context: ${courseContext}\n\nStudent question: ${question}`
    : question;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: "You are a helpful academic tutor for an online LMS called Classynkify. Give clear, concise, student-friendly answers.",
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
};