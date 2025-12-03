import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptSegment } from "../types";

// --- CONFIGURATION ---
// To use this app outside of AI Studio, replace process.env.API_KEY with your actual API key string.
// Example: const API_KEY = "AIzaSy...";
const API_KEY = process.env.API_KEY; 

const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:video/mp4;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateTranscript = async (videoFile: File): Promise<TranscriptSegment[]> => {
  try {
    const base64Data = await fileToBase64(videoFile);

    // Using gemini-2.5-flash for efficient video processing
    const model = "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: videoFile.type,
              data: base64Data
            }
          },
          {
            text: "Generate a transcript for this video. Break it down into logical segments. For each segment, provide the start time (in seconds), end time (in seconds), and the text spoken. Return the result as a JSON array."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              startTime: { type: Type.NUMBER, description: "Start time of the segment in seconds" },
              endTime: { type: Type.NUMBER, description: "End time of the segment in seconds" },
              text: { type: Type.STRING, description: "The spoken text" }
            },
            required: ["startTime", "endTime", "text"]
          }
        }
      }
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("No response from AI");
    }

    const segments: TranscriptSegment[] = JSON.parse(textResponse);
    return segments;

  } catch (error) {
    console.error("Error generating transcript:", error);
    throw error;
  }
};