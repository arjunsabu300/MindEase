const Groq = require("groq-sdk");

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// In-memory store for question sessions
// key: questionSessionId
// value: questions array
const questionStore = new Map();

/**
 * Generate emotion-resolving questions using Groq LLM
 * @param {string[]} emotionCandidates
 * @returns {object} { questionSessionId, questions }
 */
async function generateQuestions(emotionCandidates) {

  try {

    if (!emotionCandidates || emotionCandidates.length === 0) {
      throw new Error("No emotion candidates provided");
    }

    // Prompt for Groq
    const prompt = `
You are an expert psychologist.

The system detected conflicting emotions from face, voice, and text.

Emotion candidates:
${emotionCandidates.join(", ")}

Generate exactly 3 multiple choice questions to determine the user's true emotion.

Each question must have exactly ${emotionCandidates.length} options.

Each option must map to one of the candidate emotions.

Return ONLY valid JSON in this exact format:

{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here",
      "options": [
        {
          "id": "o1",
          "text": "Option text",
          "emotion": "happy",
          "score": 2
        }
      ]
    }
  ]
}

Do NOT include explanation.
Do NOT include markdown.
Return JSON only.
`;

    // Call Groq
    const completion = await groq.chat.completions.create({

      model: "llama-3.3-70b-versatile",

      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],

      temperature: 0.7,

      max_tokens: 1000,

    });

    let text = completion.choices[0].message.content;

    if (!text) {
      throw new Error("Empty response from Groq");
    }

    // Remove markdown wrappers if present
    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Parse JSON safely
    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (err) {

      console.error("Groq raw response:", text);

      throw new Error("Failed to parse Groq JSON response");

    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error("Invalid questions format from Groq");
    }

    // Generate session ID
    const questionSessionId = "qs_" + Date.now();

    // Store questions for later resolution
    questionStore.set(questionSessionId, parsed.questions);

    console.log("LLM Questions generated for session:", questionSessionId);

    return {

      questionSessionId,

      questions: parsed.questions,

    };

  } catch (err) {

    console.error("LLM Question Generation Error:", err.message);

    throw err;

  }

}

/**
 * Retrieve questions for a session
 */
function getQuestions(sessionId) {

  return questionStore.get(sessionId);

}

/**
 * Delete session after resolution
 */
function deleteSession(sessionId) {

  questionStore.delete(sessionId);

}

module.exports = {

  generateQuestions,

  questionStore,

  getQuestions,

  deleteSession,

};
