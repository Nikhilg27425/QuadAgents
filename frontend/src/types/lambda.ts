/**
 * TypeScript interfaces for Lambda API integration
 */

export interface FarmerProfile {
  land_size?: string;
  crops?: string[];
  location?: string;
  [key: string]: any;
}

export interface LambdaRequest {
  question: string;
  session_id?: string;
}

export interface LambdaResponseBody {
  // Onboarding responses
  onboarding?: boolean;
  onboarding_completed?: boolean;
  question?: string;
  message?: string;
  
  // Regular RAG responses
  detected_language?: string;
  intent?: string;
  farmer_profile?: FarmerProfile;
  similarity_score?: number;
  answer?: string;
  audio_base64?: string;
  audio_url?: string; // Alternative field name for audio
}

export interface LambdaResponse {
  statusCode: number;
  body: LambdaResponseBody;
}

export interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: number;
  audioUrl?: string;
  metadata?: {
    language?: string;
    intent?: string;
    similarityScore?: number;
    farmerProfile?: FarmerProfile;
  };
}
