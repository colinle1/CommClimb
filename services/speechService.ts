import { TranscriptSegment } from "../types";

export class SpeechTracker {
  private recognition: any;
  private isListening: boolean = false;
  private segments: TranscriptSegment[] = [];
  private startTime: number = 0;
  private currentSegmentStart: number = 0;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false; // Capture final results only
      this.recognition.lang = 'en-US';
      
      this.recognition.onresult = (event: any) => {
        // Loop through results to ensure we capture buffered ones
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const text = event.results[i][0].transcript;
            const endTime = (Date.now() - this.startTime) / 1000;
            
            // Avoid adding empty segments
            if (text.trim()) {
              this.segments.push({
                startTime: this.currentSegmentStart,
                endTime: endTime,
                text: text.trim()
              });
              this.currentSegmentStart = endTime;
            }
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn("Speech recognition error", event.error);
      };

      this.recognition.onend = () => {
        // Auto-restart if we are still supposed to be listening
        // This handles cases where the browser stops recognition on silence
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch (e) {
            // Ignore error if already started
          }
        }
      };
    }
  }

  start() {
    if (this.recognition) {
      this.segments = [];
      this.startTime = Date.now();
      this.currentSegmentStart = 0;
      this.isListening = true;
      try {
        this.recognition.start();
      } catch(e) {
        console.error("Failed to start recognition", e);
      }
    }
  }

  stop(): TranscriptSegment[] {
    if (this.recognition) {
      this.isListening = false;
      this.recognition.stop();
    }
    return this.segments;
  }
  
  isSupported(): boolean {
    return !!this.recognition;
  }
}