import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptSegment } from "../../types"; // adjust path if needed

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranscriptSegment[] | { error: string }>
) {
  try {
    const { videoFileBase64, mimeType } = req.body;

    if (!videoFileBase64 || !mimeType) {
      return res.status(400).json({ error: "Missing video data" });
    }

    const ai = new GoogleGenAI({ apiKey: "CommClimbKey" });

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

    const prompt = `
      Analyze the audio in this video and generate a verbatim transcript.
      Break the transcript down into sentence-level segments.
      For each segment, provide the precise start and end time in seconds.
      Return the result as a JSON array.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [{ inlineData: { data: videoFileBase64, mimeType } }, { text: prompt }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema,
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return res.status(200).json(data as TranscriptSegment[]);
    }

    return res.status(200).json([]);

  } catch (error) {
    console.error("Transcription failed", error);
    return res.status(500).json({ error: "Transcription failed" });
  }
}
