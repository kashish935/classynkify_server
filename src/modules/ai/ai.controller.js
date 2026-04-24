import { askDoubtSolver } from "./ai.service.js";

export const doubtSolver = async (req, res) => {
  try {
    const { question, courseContext } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ message: "Question is required." });
    }

    const answer = await askDoubtSolver(question, courseContext);
    res.json({ answer });
  } catch (err) {
    console.error("AI error:", err.message);
    res.status(500).json({ message: "AI service failed. Please try again." });
  }
};