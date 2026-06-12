import { useState, useEffect, useCallback, useRef } from 'react';

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface UseVoiceReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  error: string | null;
}

export function useVoice(onResultCallback?: (text: string) => void, onEndCallback?: (text: string) => void): UseVoiceReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const finalTranscriptRef = useRef<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            finalTranscriptRef.current += ' ' + finalTranscript;
          }
          
          const currentText = (finalTranscriptRef.current + ' ' + interimTranscript).trim();
          setTranscript(currentText);
          
          if (onResultCallback) {
            onResultCallback(currentText);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setError(event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          if (onEndCallback && finalTranscriptRef.current.trim()) {
            onEndCallback(finalTranscriptRef.current.trim());
          }
        };
      } else {
        setError('Browser does not support Speech Recognition');
      }

      synthesisRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, [onResultCallback, onEndCallback]);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    finalTranscriptRef.current = '';
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
      }
    } catch (e) {
      console.error(e);
      setError("Could not start listening. Make sure microphone permissions are granted.");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const cleanTextForSpeech = (text: string) => {
    // Remove Markdown formatting like **, *, #, -, etc.
    let cleaned = text.replace(/[*#]/g, '');
    // Remove URLs
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
    // Handle Chart Payloads
    if (cleaned.includes("===CHART_BEGIN===")) {
       const beginIdx = cleaned.indexOf("===CHART_BEGIN===");
       const endIdx = cleaned.indexOf("===CHART_END===") + "===CHART_END===".length;
       cleaned = cleaned.substring(0, beginIdx) + " Here is the chart you requested. " + cleaned.substring(endIdx);
    }
    return cleaned.trim();
  };

  const speak = useCallback((text: string) => {
    if (!synthesisRef.current) return;
    
    synthesisRef.current.cancel();

    const textToSpeak = cleanTextForSpeech(text);
    if (!textToSpeak) return;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'en-US';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error("Speech synthesis error", e);
      setIsSpeaking(false);
    };

    synthesisRef.current.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    isSpeaking,
    error
  };
}
