# Requirements Document

## Introduction

This document specifies the requirements for refactoring an AWS Lambda-based AI system to implement a clear separation of concerns: speech-to-text processing moves to the browser frontend using Web Speech API, while text-to-speech generation is added to the Lambda backend using Amazon Polly. The Lambda function will transition from accepting audio input to accepting only JSON text input, and from returning text-only responses to returning both text and base64-encoded audio responses.

## Glossary

- **Lambda_Function**: The AWS Lambda function that processes RAG queries and generates responses
- **API_Gateway**: AWS API Gateway that routes HTTP requests to the Lambda function
- **Polly_Client**: The boto3 client for Amazon Polly text-to-speech service
- **RAG_System**: The Retrieval-Augmented Generation system including embedding generation, similarity scoring, and Nova inference
- **Frontend**: The browser-based user interface that handles speech-to-text conversion
- **Request_Body**: The JSON payload containing the user's text question
- **Response_Body**: The JSON payload containing both text answer and base64-encoded audio
- **Audio_Stream**: The MP3 audio data returned by Amazon Polly
- **Base64_Audio**: The base64-encoded representation of the audio stream for JSON transport

## Requirements

### Requirement 1: Remove Audio Input Processing

**User Story:** As a system architect, I want to remove all audio input processing from the Lambda function, so that the backend focuses solely on text processing and the frontend handles speech recognition.

#### Acceptance Criteria

1. THE Lambda_Function SHALL NOT accept audio files as input
2. THE Lambda_Function SHALL NOT parse multipart form-data requests
3. THE Lambda_Function SHALL NOT invoke Amazon Transcribe service
4. THE Lambda_Function SHALL NOT contain any speech recognition logic
5. THE Lambda_Function SHALL remove all dependencies related to audio input processing

### Requirement 2: Accept JSON Text Input

**User Story:** As a frontend developer, I want to send text questions as JSON, so that I can easily integrate browser-based speech recognition with the backend API.

#### Acceptance Criteria

1. WHEN a request is received, THE Lambda_Function SHALL accept only JSON input with the structure {"question": "string"}
2. IF the "question" field is missing from the request body, THEN THE Lambda_Function SHALL return HTTP status code 400
3. IF the "question" field is missing from the request body, THEN THE Lambda_Function SHALL return an error message indicating the required field
4. THE Lambda_Function SHALL extract the question text from the JSON request body
5. THE Lambda_Function SHALL validate that the question field contains a non-empty string

### Requirement 3: Generate Speech Output with Amazon Polly

**User Story:** As a user, I want to receive audio responses in addition to text, so that I can listen to the AI assistant's answers.

#### Acceptance Criteria

1. WHEN the RAG_System generates a text response, THE Lambda_Function SHALL invoke the Polly_Client to convert the text to speech
2. THE Lambda_Function SHALL configure the Polly_Client to use the neural engine
3. THE Lambda_Function SHALL configure the Polly_Client to use the Hindi voice "Aditi"
4. THE Lambda_Function SHALL configure the Polly_Client to output MP3 format
5. THE Lambda_Function SHALL retrieve the Audio_Stream from the Polly response
6. THE Lambda_Function SHALL NOT store audio files in Amazon S3
7. THE Lambda_Function SHALL encode the Audio_Stream to Base64_Audio for inline response delivery

### Requirement 4: Return Combined Text and Audio Response

**User Story:** As a frontend developer, I want to receive both text and audio in a single response, so that I can display the text immediately while playing the audio.

#### Acceptance Criteria

1. WHEN processing completes successfully, THE Lambda_Function SHALL return HTTP status code 200
2. THE Response_Body SHALL contain an "answer" field with the generated text response
3. THE Response_Body SHALL contain an "audio_base64" field with the Base64_Audio encoded MP3 data
4. THE Lambda_Function SHALL structure the response as {"statusCode": 200, "body": {"answer": "string", "audio_base64": "string"}}
5. THE Lambda_Function SHALL ensure the Response_Body is valid JSON

### Requirement 5: Handle Polly Service Failures Gracefully

**User Story:** As a system operator, I want the system to remain functional even when Polly fails, so that users still receive text responses during service disruptions.

#### Acceptance Criteria

1. IF the Polly_Client fails to generate audio, THEN THE Lambda_Function SHALL log the error
2. IF the Polly_Client fails to generate audio, THEN THE Lambda_Function SHALL return the text answer without the "audio_base64" field
3. IF the Polly_Client fails to generate audio, THEN THE Lambda_Function SHALL return HTTP status code 200
4. IF the Polly_Client fails to generate audio, THEN THE Lambda_Function SHALL NOT fail the entire request
5. THE Lambda_Function SHALL implement try-catch error handling around Polly invocation

### Requirement 6: Preserve RAG System Logic

**User Story:** As a system architect, I want to keep the existing RAG implementation unchanged, so that we maintain proven functionality while refactoring input/output handling.

#### Acceptance Criteria

1. THE Lambda_Function SHALL preserve the existing embedding generation logic
2. THE Lambda_Function SHALL preserve the existing cosine similarity calculation logic
3. THE Lambda_Function SHALL preserve the existing chunk retrieval logic
4. THE Lambda_Function SHALL preserve the existing prompt construction logic
5. THE Lambda_Function SHALL preserve the existing Nova inference profile invocation logic
6. THE Lambda_Function SHALL NOT modify the DynamoDB schema
7. THE Lambda_Function SHALL NOT modify the similarity scoring algorithms

### Requirement 7: Maintain Clean and Scalable Code Structure

**User Story:** As a developer, I want the refactored code to be clean and maintainable, so that future enhancements are easier to implement.

#### Acceptance Criteria

1. THE Lambda_Function SHALL separate input validation logic into a dedicated function
2. THE Lambda_Function SHALL separate Polly integration logic into a dedicated function
3. THE Lambda_Function SHALL separate response formatting logic into a dedicated function
4. THE Lambda_Function SHALL include error handling for all AWS service calls
5. THE Lambda_Function SHALL include logging for debugging and monitoring purposes
6. THE Lambda_Function SHALL follow Python best practices for code organization
7. THE Lambda_Function SHALL include type hints where applicable

### Requirement 8: Ensure Production Readiness

**User Story:** As a DevOps engineer, I want the Lambda function to be production-ready, so that it can handle real-world traffic reliably.

#### Acceptance Criteria

1. THE Lambda_Function SHALL implement appropriate timeout handling for Polly requests
2. THE Lambda_Function SHALL implement appropriate timeout handling for RAG processing
3. THE Lambda_Function SHALL validate all input data before processing
4. THE Lambda_Function SHALL return appropriate HTTP status codes for all error conditions
5. THE Lambda_Function SHALL include structured logging with appropriate log levels
6. THE Lambda_Function SHALL handle boto3 client initialization efficiently
7. THE Lambda_Function SHALL minimize cold start time by initializing clients outside the handler function
