import { GoogleGenAI, Type, FunctionDeclaration, Modality } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. AI features will be disabled.");
      // Return a dummy instance or throw a handled error later, but for now we just need to not crash on load
      return new GoogleGenAI({ apiKey: 'dummy-key-to-prevent-crash' });
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

const logStrengthExercise: FunctionDeclaration = {
  name: "logStrengthExercise",
  parameters: {
    type: Type.OBJECT,
    description: "Log a strength training exercise set.",
    properties: {
      exercise: {
        type: Type.STRING,
        description: "The name of the exercise (e.g., 'Dumbbell Bench Press').",
      },
      setIndex: {
        type: Type.NUMBER,
        description: "The set number (1-indexed).",
      },
      weight: {
        type: Type.NUMBER,
        description: "The weight used in lbs.",
      },
      reps: {
        type: Type.NUMBER,
        description: "The number of repetitions performed.",
      },
      date: {
        type: Type.STRING,
        description: "The date of the workout in YYYY-MM-DD format.",
      }
    },
    required: ["exercise", "setIndex", "weight", "reps", "date"],
  },
};

const logBjjSession: FunctionDeclaration = {
  name: "logBjjSession",
  parameters: {
    type: Type.OBJECT,
    description: "Log a BJJ training session.",
    properties: {
      rounds: {
        type: Type.NUMBER,
        description: "Number of rounds rolled.",
      },
      attendedClass: {
        type: Type.BOOLEAN,
        description: "Whether a structured class was attended.",
      },
      notes: {
        type: Type.STRING,
        description: "Notes about the session.",
      },
      date: {
        type: Type.STRING,
        description: "The date of the session in YYYY-MM-DD format.",
      }
    },
    required: ["rounds", "attendedClass", "date"],
  },
};

const logWeight: FunctionDeclaration = {
  name: "logWeight",
  parameters: {
    type: Type.OBJECT,
    description: "Log body weight for a specific date.",
    properties: {
      weight: {
        type: Type.NUMBER,
        description: "Body weight in lbs.",
      },
      date: {
        type: Type.STRING,
        description: "The date in YYYY-MM-DD format.",
      }
    },
    required: ["weight", "date"],
  },
};

const getWorkoutLogs: FunctionDeclaration = {
  name: "getWorkoutLogs",
  parameters: {
    type: Type.OBJECT,
    description: "Retrieve workout logs for the user to answer questions about their history.",
    properties: {
      startDate: {
        type: Type.STRING,
        description: "The start date in YYYY-MM-DD format.",
      },
      endDate: {
        type: Type.STRING,
        description: "The end date in YYYY-MM-DD format.",
      },
      type: {
        type: Type.STRING,
        description: "The type of workout to filter by ('strength', 'bjj', or 'weight').",
        enum: ["strength", "bjj", "weight"]
      },
      exercise: {
        type: Type.STRING,
        description: "Optional: Filter by a specific exercise name (e.g., 'Deadlift'). Only applicable for 'strength' type.",
      }
    },
    required: ["startDate", "endDate"],
  },
};

export const chatWithAssistant = async (message: string, history: any[] = []) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not defined in the environment.");
    throw new Error("API Key missing");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [
      ...history,
      { role: "user", parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: `You are "Forge Bot", the elite athletic performance assistant for "MatForge". 
      Your goal is to help the user log workouts and analyze their training history with professional, encouraging, and highly conversational responses.
      
      GUIDELINES:
      - Use Markdown for formatting (bolding, lists, etc.) to make responses scannable.
      - When answering questions about progress or history, be analytical. Compare current stats to past ones.
      - If the data retrieved via "getWorkoutLogs" shows a trend (e.g., weight loss, strength gains), you SHOULD offer to show a chart.
      - To display a chart, include a JSON block in your message with the following structure:
        \`\`\`chart
        {
          "type": "line" | "bar",
          "title": "Chart Title",
          "data": [{"label": "Date/Name", "value": 100}, ...],
          "xAxis": "Date",
          "yAxis": "Weight (lbs)"
        }
        \`\`\`
      - Always assume the current date is ${new Date().toISOString().split('T')[0]} unless specified otherwise.
      - Keep the tone "Elite Coach": disciplined, supportive, and data-driven.
      
      TOOLS:
      - Use logging tools for new data.
      - Use "getWorkoutLogs" for ANY question about history or progress.`,
      tools: [{ functionDeclarations: [logStrengthExercise, logBjjSession, logWeight, getWorkoutLogs] }],
    },
  });

  console.log("Gemini Response:", response);
  return response;
};

export const generateSpeech = async (text: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not defined in the environment.");
    throw new Error("API Key missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say cheerfully: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio;
};
