/**
 * Lambda API Service Tests
 * 
 * Note: These are example tests. Actual implementation depends on your test setup.
 * Install: npm install --save-dev vitest @testing-library/react
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askLambda, base64ToAudioUrl } from '../lambda';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('Lambda API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('askLambda', () => {
    it('should successfully call Lambda and return response', async () => {
      const mockResponse = {
        data: {
          statusCode: 200,
          body: {
            detected_language: 'Hindi',
            intent: 'scheme_discovery',
            farmer_profile: { land_size: '2 acres' },
            similarity_score: 0.85,
            answer: 'Test answer',
            audio_base64: 'base64data',
          },
        },
      };

      mockedAxios.create.mockReturnValue({
        post: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await askLambda('test question');

      expect(result.answer).toBe('Test answer');
      expect(result.detected_language).toBe('Hindi');
      expect(result.similarity_score).toBe(0.85);
    });

    it('should throw error when question is empty', async () => {
      await expect(askLambda('')).rejects.toThrow('Question cannot be empty');
    });

    it('should throw error when Lambda URL is not configured', async () => {
      // Mock empty env variable
      const originalEnv = import.meta.env.VITE_LAMBDA_API_URL;
      (import.meta.env as any).VITE_LAMBDA_API_URL = '';

      await expect(askLambda('test')).rejects.toThrow('Lambda API URL not configured');

      // Restore
      (import.meta.env as any).VITE_LAMBDA_API_URL = originalEnv;
    });

    it('should handle Lambda error responses', async () => {
      const mockResponse = {
        data: {
          statusCode: 500,
          body: {},
        },
      };

      mockedAxios.create.mockReturnValue({
        post: vi.fn().mockResolvedValue(mockResponse),
      });

      await expect(askLambda('test')).rejects.toThrow('Lambda returned status 500');
    });
  });

  describe('base64ToAudioUrl', () => {
    it('should convert base64 to blob URL', () => {
      // Simple base64 encoded data
      const base64 = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64
      
      const result = base64ToAudioUrl(base64);

      expect(result).toMatch(/^blob:/);
    });

    it('should handle base64 with data URL prefix', () => {
      const base64WithPrefix = 'data:audio/mpeg;base64,SGVsbG8gV29ybGQ=';
      
      const result = base64ToAudioUrl(base64WithPrefix);

      expect(result).toMatch(/^blob:/);
    });

    it('should throw error for invalid base64', () => {
      const invalidBase64 = 'not-valid-base64!!!';

      expect(() => base64ToAudioUrl(invalidBase64)).toThrow('Failed to process audio data');
    });
  });
});
