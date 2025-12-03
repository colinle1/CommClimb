import { TranscriptSegment } from "../types";

const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(",")[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateTranscript = async (videoFile: File): Promise<TranscriptSegment[]> => {
  const base64File = await fileToBase64(videoFile);

  const response = await fetch("/api/generateTranscript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoFileBase64: base64File,
      mimeType: videoFile.type,
    }),
  });

  const data = await response.json();
  return data;
};
