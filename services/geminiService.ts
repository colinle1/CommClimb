import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptSegment } from "../types";

// Helper to convert file to base64
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateTranscript = async (videoFile: File): Promise<TranscriptSegment[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // We strictly define the output schema to get usable JSON
    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          startTime: { type: Type.NUMBER, description: "Start time of the sentence in seconds" },
          endTime: { type: Type.NUMBER, description: "End time of the sentence in seconds" },
          text: { type: Type.STRING, description: "The spoken text" }
        },
        required: ["startTime", "endTime", "text"]
      }
    };

    const filePart = await fileToGenerativePart(videoFile);

    const prompt = `
      Analyze the audio in this video and generate a verbatim transcript.
      Break the transcript down into sentence-level segments.
      For each segment, provide the precise start and end time in seconds.
      Return the result as a JSON array.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [filePart, { text: prompt }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data as TranscriptSegment[];
    }
    
    return [];

  } catch (error) {
    console.error("Transcription failed", error);
    throw error;
  }
};
