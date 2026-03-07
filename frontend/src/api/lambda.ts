/**
 * Lambda API Service
 * Handles communication with the AWS Lambda function
 */

import axios, { AxiosInstance } from "axios";
import { LambdaRequest, LambdaResponse, LambdaResponseBody } from "@/types/lambda";

const LAMBDA_API_URL = import.meta.env.VITE_LAMBDA_API_URL || "https://xv8mjlnyv4.execute-api.ap-south-1.amazonaws.com/prod/ask";

// Create a dedicated axios instance for Lambda API
const lambdaClient: AxiosInstance = axios.create({
  baseURL: LAMBDA_API_URL,
  timeout: 30000, // 30 seconds for Lambda processing
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Convert base64 audio string to a playable audio URL
 */
export function base64ToAudioUrl(base64Audio: string): string {
  try {
    // Remove data URL prefix if present
    const base64Data = base64Audio.replace(/^data:audio\/\w+;base64,/, "");
    
    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create blob and object URL
    const blob = new Blob([bytes], { type: "audio/mpeg" });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Error converting base64 to audio URL:", error);
    throw new Error("Failed to process audio data");
  }
}

/**
 * Call Lambda function with a question and session ID
 */
export async function askLambda(question: string, sessionId?: string): Promise<LambdaResponseBody> {
  if (!question.trim()) {
    throw new Error("Question cannot be empty");
  }

  try {
    const request: LambdaRequest = { 
      question: question.trim(),
      session_id: sessionId 
    };
    
    // Get the JWT token from localStorage for Cognito authorization
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      // Check if token is expired
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        
        if (Date.now() >= expirationTime) {
          console.log("🔴 Token has expired, redirecting to login");
          localStorage.removeItem("token");
          window.location.href = "/login";
          throw new Error("Token has expired. Please log in again.");
        }
      } catch (error) {
        console.error("Error checking token expiration:", error);
      }
      
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      throw new Error("No authentication token found. Please log in.");
    }
    
    const response = await lambdaClient.post("", request, { headers });
    
    // API Gateway with payload format 2.0 returns the body directly
    // Check if response has the expected fields
    const data = response.data;
    
    // Handle both wrapped (v1.0) and unwrapped (v2.0) responses
    let body: LambdaResponseBody;
    
    if (data && typeof data === "object" && "statusCode" in data && "body" in data) {
      // Wrapped response (format 1.0)
      const wrapped = data as LambdaResponse;
      const parsedBody =
        typeof wrapped.body === "string" ? JSON.parse(wrapped.body) : wrapped.body;
      body = parsedBody;
    } else {
      // Unwrapped response (format 2.0) - treat response data as the body
      // This covers onboarding-only payloads like: { onboarding: true, question: "..." }
      body = data as LambdaResponseBody;
    }
    
    // Convert base64 audio to URL if present
    if (body.audio_base64) {
      const audioUrl = base64ToAudioUrl(body.audio_base64);
      return {
        ...body,
        audio_base64: audioUrl, // Replace base64 with URL for easier consumption
      };
    }
    
    // If audio_url is already provided (direct URL), use it as-is
    if (body.audio_url) {
      return {
        ...body,
        audio_base64: body.audio_url, // Normalize to audio_base64 field
      };
    }

    return body;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error
        const errorData = error.response.data;
        const errorMessage = errorData?.error || errorData?.message || error.response.statusText;
        throw new Error(`Lambda API error: ${errorMessage}`);
      } else if (error.request) {
        // Request made but no response
        throw new Error("No response from Lambda API. Please check your connection.");
      }
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Health check for Lambda API
 */
export async function checkLambdaHealth(): Promise<boolean> {
  if (!LAMBDA_API_URL) {
    return false;
  }

  try {
    // Try a simple request with a test question
    await askLambda("test");
    return true;
  } catch {
    return false;
  }
}

export default {
  askLambda,
  base64ToAudioUrl,
  checkLambdaHealth,
};
