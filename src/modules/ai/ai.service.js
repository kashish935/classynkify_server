import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const askDoubtSolver = async (question, courseContext) => {
  const prompt = courseContext
    ? `Course context: ${courseContext}\n\nStudent question: ${question}`
    : question;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful academic tutor for an online LMS called Classynkify. Give clear, concise, student-friendly answers.",
      },
      { role: "user", content: prompt },
    ],
  });

  return completion.choices[0].message.content;
};