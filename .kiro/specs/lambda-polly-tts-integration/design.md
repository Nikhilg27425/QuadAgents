# Design Document: Lambda Polly TTS Integration

## Overview

This design document specifies the technical architecture for refactoring the AWS Lambda-based RAG system to implement a clear separation of concerns between frontend and backend speech processing. The refactoring removes audio input processing from the Lambda function (moving speech-to-text to the browser using Web Speech API) and adds text-to-speech generation using Amazon Polly.

The Lambda function will transition from a multipart form-data audio processor to a JSON-based text processor that returns both text and base64-encoded audio responses. This architectural change simplifies the backend, improves scalability, and provides a cleaner API contract while maintaining the existing RAG system logic.

### Key Design Goals

1. **Simplified Input Processing**: Accept only JSON text input, removing audio parsing complexity
2. **Enhanced Output**: Return both text and audio responses in a single JSON payload
3. **Graceful Degradation**: Ensure text responses are always available even if Polly fails
4. **Code Maintainability**: Separate concerns into dedicated functions for validation, TTS, and response formatting
5. **Production Readiness**: Implement proper error handling, logging, and timeout management

## Architecture

The refactored system follows a streamlined request-response flow with clear separation between frontend speech recognition and backend text processing with TTS generation.

```mermaid
graph TB
    A[Browser Frontend] -->|JSON: {question: text}| B[API Gateway]
    B --> C[Lambda Handler]
    C --> D[Input Validation]
    D --> E[RAG System]
    E --> F[Embedding Generation]
    F --> G[DynamoDB Query]
    G --> H[Similarity Scoring]
    H --> I[Nova Inference]
    I --> J[Text Response]
    J --> K[Polly TTS Module]
    K --> L[Base64 Encoding]
    L --> M[Response Formatter]
    M -->|JSON: {answer, audio_base64}| B
    B --> A
    
    K -.->|On Failure| N[Error Handler]
    N --> M
    
    subgraph "Lambda Function"
        C
        D
        E
        F
        H
        I
        J
        K
        L
        M
        N
    end
    
    subgraph "AWS Services"
        G
        O[Amazon Polly]
        K --> O
    end
    
    style K fill:#f9f,stroke:#333,stroke-width:2px
    style O fill:#f9f,stroke:#333,stroke-width:2px
```

### Request Flow

1. **Frontend**: User speaks → Web Speech API converts to text → Sends JSON `{"question": "text"}`
2. **API Gateway**: Routes request to Lambda function
3. **Lambda Handler**: Validates input → Processes RAG query → Generates text response
4. **Polly Integration**: Converts text to speech → Encodes as base64 MP3
5. **Response**: Returns JSON `{"statusCode": 200, "body": {"answer": "text", "audio_base64": "base64_string"}}`

### Response Flow on Polly Failure

1. **Polly Error**: TTS generation fails (service outage, timeout, etc.)
2. **Error Handler**: Logs error, continues processing
3. **Response**: Returns JSON `{"statusCode": 200, "body": {"answer": "text"}}` (without audio field)

## Components and Interfaces

### 1. Input Validation Module

**Purpose**: Validate incoming JSON requests and extract the question text

**Function Signature**:
```python
def validate_input(event: dict) -> tuple[str, Optional[dict]]:
    """
    Validates the Lambda event and extracts the question text.
    
    Args:
        event: Lambda event dictionary containing the request
        
    Returns:
        Tuple of (question_text, error_response)
        - If valid: (question_text, None)
        - If invalid: (None, error_response_dict)
    """
```

**Validation Rules**:
- Request body must be valid JSON
- Request body must contain "question" field
- Question field must be a non-empty string
- Question field must not be only whitespace

**Error Responses**:
- Missing body: `{"statusCode": 400, "body": {"error": "Request body is required"}}`
- Invalid JSON: `{"statusCode": 400, "body": {"error": "Invalid JSON in request body"}}`
- Missing question: `{"statusCode": 400, "body": {"error": "Missing required field: question"}}`
- Empty question: `{"statusCode": 400, "body": {"error": "Question field cannot be empty"}}`

### 2. RAG System Module (Preserved)

**Purpose**: Process text questions and generate answers using the existing RAG pipeline

**Components** (unchanged from current implementation):
- **Embedding Generator**: Converts question text to vector embeddings
- **DynamoDB Query**: Retrieves relevant document chunks from the database
- **Similarity Scorer**: Calculates cosine similarity between question and chunks
- **Prompt Constructor**: Builds the prompt with retrieved context
- **Nova Inference**: Invokes Amazon Bedrock Nova model for answer generation

**Interface**:
```python
def process_rag_query(question: str) -> str:
    """
    Processes a question through the RAG pipeline.
    
    Args:
        question: The user's question text
        
    Returns:
        Generated answer text from the RAG system
        
    Raises:
        Exception: If RAG processing fails
    """
```

### 3. Polly TTS Module

**Purpose**: Convert text responses to speech using Amazon Polly

**Function Signature**:
```python
def generate_speech(text: str, polly_client: Any) -> Optional[str]:
    """
    Generates speech audio from text using Amazon Polly.
    
    Args:
        text: The text to convert to speech
        polly_client: Initialized boto3 Polly client
        
    Returns:
        Base64-encoded MP3 audio string, or None if generation fails
    """
```

**Polly Configuration**:
- **Engine**: Neural (for higher quality, more natural speech)
- **Voice**: Aditi (Hindi neural voice)
- **Output Format**: MP3 (widely supported, good compression)
- **Text Type**: Text (plain text input)

**Implementation Details**:
```python
response = polly_client.synthesize_speech(
    Text=text,
    Engine='neural',
    VoiceId='Aditi',
    OutputFormat='mp3'
)
```

**Error Handling**:
- Wrap Polly invocation in try-except block
- Log errors with appropriate context (text length, error type)
- Return None on failure to allow graceful degradation
- Handle specific exceptions:
  - `BotoCoreError`: Network or service errors
  - `ClientError`: Invalid parameters or service limits
  - `Exception`: Catch-all for unexpected errors

**Audio Processing**:
1. Read audio stream from Polly response: `audio_stream = response['AudioStream'].read()`
2. Encode to base64: `base64.b64encode(audio_stream).decode('utf-8')`
3. Return encoded string for JSON serialization

### 4. Response Formatter Module

**Purpose**: Format successful and error responses with consistent structure

**Function Signatures**:
```python
def format_success_response(answer: str, audio_base64: Optional[str]) -> dict:
    """
    Formats a successful response with text and optional audio.
    
    Args:
        answer: The generated text answer
        audio_base64: Base64-encoded audio (None if TTS failed)
        
    Returns:
        Lambda response dictionary with statusCode and body
    """

def format_error_response(status_code: int, error_message: str) -> dict:
    """
    Formats an error response.
    
    Args:
        status_code: HTTP status code
        error_message: Error description
        
    Returns:
        Lambda response dictionary with statusCode and error body
    """
```

**Response Structures**:

Success with audio:
```json
{
  "statusCode": 200,
  "body": {
    "answer": "Generated text response",
    "audio_base64": "base64_encoded_mp3_data"
  }
}
```

Success without audio (Polly failure):
```json
{
  "statusCode": 200,
  "body": {
    "answer": "Generated text response"
  }
}
```

Error response:
```json
{
  "statusCode": 400,
  "body": {
    "error": "Error description"
  }
}
```

### 5. Lambda Handler

**Purpose**: Orchestrate the request processing flow

**Function Signature**:
```python
def lambda_handler(event: dict, context: Any) -> dict:
    """
    Main Lambda handler function.
    
    Args:
        event: Lambda event containing the API Gateway request
        context: Lambda context object
        
    Returns:
        Response dictionary with statusCode and body
    """
```

**Processing Flow**:
1. Validate input and extract question
2. If validation fails, return error response immediately
3. Process question through RAG system
4. Attempt to generate speech with Polly
5. Format and return response (with or without audio)

**Client Initialization** (outside handler for reuse across invocations):
```python
# Initialize clients outside handler to reuse across warm starts
polly_client = boto3.client('polly', region_name='us-east-1')
# Other AWS clients (DynamoDB, Bedrock, etc.) initialized here
```

## Data Models

### Request Model

```python
class QuestionRequest:
    """
    Incoming request structure.
    """
    question: str  # Required, non-empty text question
```

**JSON Schema**:
```json
{
  "type": "object",
  "required": ["question"],
  "properties": {
    "question": {
      "type": "string",
      "minLength": 1,
      "description": "The user's question text"
    }
  }
}
```

### Response Model

```python
class SuccessResponse:
    """
    Successful response structure.
    """
    statusCode: int = 200
    body: ResponseBody

class ResponseBody:
    """
    Response body structure.
    """
    answer: str  # Required, generated text answer
    audio_base64: Optional[str]  # Optional, base64-encoded MP3
```

**JSON Schema** (with audio):
```json
{
  "type": "object",
  "required": ["statusCode", "body"],
  "properties": {
    "statusCode": {
      "type": "integer",
      "const": 200
    },
    "body": {
      "type": "object",
      "required": ["answer"],
      "properties": {
        "answer": {
          "type": "string",
          "description": "Generated text response"
        },
        "audio_base64": {
          "type": "string",
          "description": "Base64-encoded MP3 audio"
        }
      }
    }
  }
}
```

### Error Response Model

```python
class ErrorResponse:
    """
    Error response structure.
    """
    statusCode: int  # 400, 500, etc.
    body: ErrorBody

class ErrorBody:
    """
    Error body structure.
    """
    error: str  # Error description
```

**JSON Schema**:
```json
{
  "type": "object",
  "required": ["statusCode", "body"],
  "properties": {
    "statusCode": {
      "type": "integer",
      "minimum": 400
    },
    "body": {
      "type": "object",
      "required": ["error"],
      "properties": {
        "error": {
          "type": "string",
          "description": "Error message"
        }
      }
    }
  }
}
```

### Polly Response Model

```python
class PollyResponse:
    """
    Amazon Polly synthesize_speech response structure.
    """
    AudioStream: StreamingBody  # Binary audio stream
    ContentType: str  # 'audio/mpeg'
    RequestCharacters: int  # Number of characters processed
```

## Code Structure and Module Organization

### File Structure

```
lambda_function/
├── lambda_function.py          # Main handler and orchestration
├── validation.py               # Input validation module
├── polly_tts.py               # Polly TTS integration
├── response_formatter.py      # Response formatting utilities
├── rag_system.py              # Existing RAG logic (preserved)
├── requirements.txt           # Python dependencies
└── tests/
    ├── test_validation.py
    ├── test_polly_tts.py
    ├── test_response_formatter.py
    └── test_integration.py
```

### Module Dependencies

```python
# lambda_function.py
import json
import boto3
from validation import validate_input
from polly_tts import generate_speech
from response_formatter import format_success_response, format_error_response
from rag_system import process_rag_query

# polly_tts.py
import base64
import boto3
from botocore.exceptions import BotoCoreError, ClientError

# validation.py
import json
from typing import Optional, Tuple

# response_formatter.py
import json
from typing import Optional
```

### Initialization Pattern

```python
# Initialize AWS clients outside handler for connection reuse
polly_client = boto3.client('polly', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

def lambda_handler(event, context):
    # Handler logic uses pre-initialized clients
    pass
```

This pattern minimizes cold start time and reuses connections across warm invocations.


## Error Handling

### Input Validation Errors

**Missing Request Body**
- Detection: Check if event body is None or empty
- Response: HTTP 400 with error message "Request body is required"
- Logging: Log at WARNING level with request context

**Invalid JSON**
- Detection: JSON parsing exception during body deserialization
- Response: HTTP 400 with error message "Invalid JSON in request body"
- Logging: Log at WARNING level with the malformed input (truncated)

**Missing Question Field**
- Detection: "question" key not present in parsed JSON
- Response: HTTP 400 with error message "Missing required field: question"
- Logging: Log at WARNING level with received fields

**Empty Question**
- Detection: Question field is empty string or only whitespace
- Response: HTTP 400 with error message "Question field cannot be empty"
- Logging: Log at WARNING level

### RAG System Errors

**Embedding Generation Failure**
- Detection: Exception during embedding generation
- Response: HTTP 500 with error message "Failed to process question"
- Logging: Log at ERROR level with full stack trace
- Recovery: None - return error to client

**DynamoDB Query Failure**
- Detection: Exception during DynamoDB query
- Response: HTTP 500 with error message "Failed to retrieve information"
- Logging: Log at ERROR level with query details and error
- Recovery: None - return error to client

**Nova Inference Failure**
- Detection: Exception during Bedrock Nova invocation
- Response: HTTP 500 with error message "Failed to generate response"
- Logging: Log at ERROR level with prompt context and error
- Recovery: None - return error to client

### Polly TTS Errors

**Polly Service Failure**
- Detection: BotoCoreError or ClientError during synthesize_speech
- Response: HTTP 200 with text answer only (no audio_base64 field)
- Logging: Log at WARNING level with error details
- Recovery: Continue processing, return text-only response

**Audio Stream Read Failure**
- Detection: Exception while reading AudioStream
- Response: HTTP 200 with text answer only
- Logging: Log at WARNING level with error details
- Recovery: Continue processing, return text-only response

**Base64 Encoding Failure**
- Detection: Exception during base64 encoding
- Response: HTTP 200 with text answer only
- Logging: Log at WARNING level with error details
- Recovery: Continue processing, return text-only response

**Polly Timeout**
- Detection: Timeout exception during Polly invocation
- Response: HTTP 200 with text answer only
- Logging: Log at WARNING level with timeout duration
- Recovery: Continue processing, return text-only response
- Configuration: Set reasonable timeout (e.g., 5 seconds)

### Error Handling Strategy

**Graceful Degradation Principle**
- Text responses are always prioritized over audio
- Polly failures should never cause request failures
- Users always receive an answer, even if audio is unavailable

**Error Logging Standards**
- All errors include request ID for traceability
- ERROR level: System failures that prevent response generation
- WARNING level: Partial failures (e.g., Polly errors) or invalid input
- INFO level: Successful request processing with metrics

**Error Response Consistency**
- All error responses follow the same JSON structure
- Status codes accurately reflect error types (400 for client errors, 500 for server errors)
- Error messages are clear and actionable (no internal implementation details exposed)

## Testing Strategy

The testing approach combines unit testing for specific scenarios and property-based testing for universal behaviors across all inputs.

### Dual Testing Approach

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- Input validation with various invalid payloads
- Polly configuration parameters (engine, voice, format)
- Error handling scenarios (Polly failures, RAG failures)
- Response formatting for success and error cases
- Integration between modules

**Property Tests**: Verify universal properties across all inputs
- Input validation correctness across all valid/invalid JSON structures
- Response structure consistency across all successful requests
- Base64 encoding correctness across all audio data
- Graceful degradation across all Polly failure scenarios

Both testing approaches are complementary and necessary for comprehensive coverage. Unit tests catch concrete bugs and verify specific behaviors, while property tests verify general correctness across the input space.

### Testing Framework and Configuration

**Framework**: pytest for unit tests, Hypothesis for property-based testing
**Property Test Configuration**: Minimum 100 iterations per property test (due to randomization)
**Mocking Strategy**: Mock AWS services (Polly, DynamoDB, Bedrock) for isolated testing
**Test Environment**: Use moto for AWS service mocking

### Unit Test Focus Areas

1. **Input Validation Tests**
   - Valid JSON with question field → accepted
   - Missing request body → 400 error
   - Invalid JSON → 400 error
   - Missing question field → 400 error
   - Empty string question → 400 error
   - Whitespace-only question → 400 error

2. **Polly Configuration Tests**
   - Verify Engine='neural' parameter
   - Verify VoiceId='Aditi' parameter
   - Verify OutputFormat='mp3' parameter
   - Verify correct boto3 client initialization

3. **Error Handling Tests**
   - Polly BotoCoreError → text-only response with 200 status
   - Polly ClientError → text-only response with 200 status
   - Polly timeout → text-only response with 200 status
   - RAG system failure → 500 error response
   - Audio stream read failure → text-only response

4. **Response Formatting Tests**
   - Success with audio → includes answer and audio_base64
   - Success without audio → includes only answer
   - Error response → includes error message and appropriate status code

5. **Integration Tests**
   - End-to-end flow with mocked AWS services
   - Verify RAG system is called with extracted question
   - Verify Polly is called with RAG response
   - Verify response structure matches specification

### Property-Based Test Focus Areas

Each property test must reference its design document property using the tag format:
**Feature: lambda-polly-tts-integration, Property {number}: {property_text}**

1. **Property 1: Valid JSON Input Acceptance**
   - *For any* valid JSON object containing a non-empty "question" field, the Lambda function should accept the request and correctly extract the question text
   - **Validates: Requirements 2.1, 2.4**
   - Generator: Random JSON objects with valid question strings
   - Assertion: Extracted question matches input question

2. **Property 2: Empty Question Rejection**
   - *For any* string composed entirely of whitespace characters (spaces, tabs, newlines), the Lambda function should reject it as an invalid question and return a 400 error
   - **Validates: Requirements 2.5**
   - Generator: Random whitespace-only strings
   - Assertion: Response status code is 400

3. **Property 3: Polly Invocation for Successful RAG Responses**
   - *For any* successful RAG response text, the Lambda function should invoke Polly to generate speech and retrieve the audio stream
   - **Validates: Requirements 3.1, 3.5**
   - Generator: Random text responses from RAG system
   - Assertion: Polly client is called with the response text

4. **Property 4: Base64 Audio Encoding Round-Trip**
   - *For any* audio stream returned by Polly, encoding to base64 and then decoding should produce valid audio data that can be decoded back to the original format
   - **Validates: Requirements 3.7**
   - Generator: Random binary audio data (simulating Polly responses)
   - Assertion: base64.b64decode(base64.b64encode(audio)) == audio

5. **Property 5: Success Response Structure Consistency**
   - *For any* successful request processing, the response should have status code 200, a valid JSON body with an "answer" field containing the RAG response, and an "audio_base64" field when Polly succeeds
   - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
   - Generator: Random valid questions and RAG responses
   - Assertion: Response matches schema, contains required fields, is valid JSON

### Test Data Generators

**For Property-Based Tests**:
- **Valid Questions**: Random non-empty strings with various lengths and characters
- **Whitespace Strings**: Random combinations of spaces, tabs, newlines
- **JSON Payloads**: Random valid/invalid JSON structures
- **Audio Data**: Random binary data simulating MP3 streams
- **RAG Responses**: Random text strings of varying lengths

### Test Coverage Goals

- **Line Coverage**: Minimum 90% for all modules
- **Branch Coverage**: Minimum 85% for error handling paths
- **Integration Coverage**: All AWS service integration points tested
- **Property Coverage**: All testable acceptance criteria covered by properties or examples

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid JSON Input Acceptance and Extraction

*For any* valid JSON object containing a non-empty "question" field, the Lambda function should accept the request and correctly extract the question text for processing.

**Validates: Requirements 2.1, 2.4**

### Property 2: Empty Question Rejection

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines, or combinations thereof), the Lambda function should reject it as an invalid question and return HTTP status code 400 with an appropriate error message.

**Validates: Requirements 2.5**

### Property 3: Polly Invocation for Successful RAG Responses

*For any* successful RAG response text, the Lambda function should invoke the Polly client to generate speech and retrieve the audio stream from the response.

**Validates: Requirements 3.1, 3.5**

### Property 4: Base64 Audio Encoding Round-Trip

*For any* audio stream returned by Polly, encoding the binary data to base64 and then decoding it should produce the original audio data without corruption or data loss.

**Validates: Requirements 3.7**

### Property 5: Success Response Structure Consistency

*For any* successful request processing, the Lambda function should return HTTP status code 200 with a valid JSON body containing an "answer" field with the RAG-generated text, and an "audio_base64" field with base64-encoded MP3 data when Polly successfully generates audio.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 6: Graceful Degradation on Polly Failure

*For any* Polly service failure (timeout, service error, or exception), the Lambda function should still return HTTP status code 200 with the text answer in the response body, omitting only the "audio_base64" field, ensuring users always receive the answer text.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 7: Appropriate Error Status Codes

*For any* error condition (invalid input, missing fields, malformed JSON), the Lambda function should return an appropriate HTTP status code (400 for client errors, 500 for server errors) with a clear error message in the response body.

**Validates: Requirements 8.4**

## Implementation Details

### Boto3 Polly Client Configuration

**Client Initialization** (outside handler function):
```python
import boto3
from botocore.config import Config

# Configure boto3 client with timeout and retry settings
polly_config = Config(
    region_name='us-east-1',
    connect_timeout=5,
    read_timeout=10,
    retries={
        'max_attempts': 2,
        'mode': 'standard'
    }
)

polly_client = boto3.client('polly', config=polly_config)
```

**Polly Invocation**:
```python
def generate_speech(text: str, polly_client) -> Optional[str]:
    """
    Generates speech audio from text using Amazon Polly.
    
    Args:
        text: The text to convert to speech
        polly_client: Initialized boto3 Polly client
        
    Returns:
        Base64-encoded MP3 audio string, or None if generation fails
    """
    try:
        response = polly_client.synthesize_speech(
            Text=text,
            Engine='neural',
            VoiceId='Aditi',
            OutputFormat='mp3',
            TextType='text'
        )
        
        # Read audio stream
        audio_stream = response['AudioStream'].read()
        
        # Encode to base64
        audio_base64 = base64.b64encode(audio_stream).decode('utf-8')
        
        return audio_base64
        
    except (BotoCoreError, ClientError) as error:
        # Log error but don't raise - allow graceful degradation
        print(f"Polly TTS error: {str(error)}")
        return None
    except Exception as error:
        # Catch-all for unexpected errors
        print(f"Unexpected error in TTS generation: {str(error)}")
        return None
```

### Input Validation Implementation

```python
import json
from typing import Tuple, Optional

def validate_input(event: dict) -> Tuple[Optional[str], Optional[dict]]:
    """
    Validates the Lambda event and extracts the question text.
    
    Args:
        event: Lambda event dictionary containing the request
        
    Returns:
        Tuple of (question_text, error_response)
        - If valid: (question_text, None)
        - If invalid: (None, error_response_dict)
    """
    # Check if body exists
    if 'body' not in event or event['body'] is None:
        return None, {
            'statusCode': 400,
            'body': json.dumps({'error': 'Request body is required'})
        }
    
    # Parse JSON
    try:
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
    except json.JSONDecodeError:
        return None, {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    
    # Check for question field
    if 'question' not in body:
        return None, {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required field: question'})
        }
    
    question = body['question']
    
    # Validate non-empty
    if not isinstance(question, str) or not question.strip():
        return None, {
            'statusCode': 400,
            'body': json.dumps({'error': 'Question field cannot be empty'})
        }
    
    return question.strip(), None
```

### Response Formatting Implementation

```python
import json
from typing import Optional

def format_success_response(answer: str, audio_base64: Optional[str]) -> dict:
    """
    Formats a successful response with text and optional audio.
    
    Args:
        answer: The generated text answer
        audio_base64: Base64-encoded audio (None if TTS failed)
        
    Returns:
        Lambda response dictionary with statusCode and body
    """
    response_body = {'answer': answer}
    
    if audio_base64 is not None:
        response_body['audio_base64'] = audio_base64
    
    return {
        'statusCode': 200,
        'body': json.dumps(response_body)
    }

def format_error_response(status_code: int, error_message: str) -> dict:
    """
    Formats an error response.
    
    Args:
        status_code: HTTP status code
        error_message: Error description
        
    Returns:
        Lambda response dictionary with statusCode and error body
    """
    return {
        'statusCode': status_code,
        'body': json.dumps({'error': error_message})
    }
```

### Lambda Handler Implementation

```python
import json
import boto3
from typing import Any

# Initialize clients outside handler for reuse
polly_client = boto3.client('polly', region_name='us-east-1')
# Other AWS clients initialized here (DynamoDB, Bedrock, etc.)

def lambda_handler(event: dict, context: Any) -> dict:
    """
    Main Lambda handler function.
    
    Args:
        event: Lambda event containing the API Gateway request
        context: Lambda context object
        
    Returns:
        Response dictionary with statusCode and body
    """
    # Validate input
    question, error_response = validate_input(event)
    if error_response:
        return error_response
    
    try:
        # Process through RAG system (existing logic preserved)
        answer = process_rag_query(question)
        
        # Generate speech with Polly
        audio_base64 = generate_speech(answer, polly_client)
        
        # Format and return response
        return format_success_response(answer, audio_base64)
        
    except Exception as error:
        # Log error
        print(f"Error processing request: {str(error)}")
        
        # Return error response
        return format_error_response(500, "Failed to process request")
```

### Logging Implementation

```python
import logging
import json

# Configure structured logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def log_request(event: dict, context: Any):
    """Log incoming request details."""
    logger.info(json.dumps({
        'event': 'request_received',
        'request_id': context.request_id,
        'has_body': 'body' in event
    }))

def log_rag_processing(question: str, answer: str, context: Any):
    """Log RAG processing details."""
    logger.info(json.dumps({
        'event': 'rag_processing_complete',
        'request_id': context.request_id,
        'question_length': len(question),
        'answer_length': len(answer)
    }))

def log_polly_success(audio_size: int, context: Any):
    """Log successful Polly TTS generation."""
    logger.info(json.dumps({
        'event': 'polly_tts_success',
        'request_id': context.request_id,
        'audio_size_bytes': audio_size
    }))

def log_polly_failure(error: Exception, context: Any):
    """Log Polly TTS failure."""
    logger.warning(json.dumps({
        'event': 'polly_tts_failure',
        'request_id': context.request_id,
        'error_type': type(error).__name__,
        'error_message': str(error)
    }))
```

## Dependencies

### Python Requirements

```
boto3>=1.28.0
botocore>=1.31.0
```

### AWS Service Dependencies

- **Amazon Polly**: Text-to-speech generation (neural engine)
- **Amazon DynamoDB**: Document chunk storage (existing)
- **Amazon Bedrock**: Nova model for RAG inference (existing)
- **AWS Lambda**: Compute platform
- **Amazon API Gateway**: HTTP API routing

### IAM Permissions Required

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "polly:SynthesizeSpeech"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query",
        "dynamodb:GetItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/YourTableName"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*:*:model/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## Migration Strategy

### Backward Compatibility Considerations

This refactoring introduces breaking changes to the API contract:
- **Input format changes**: From multipart form-data to JSON
- **Output format changes**: From text-only to text + audio

### Migration Steps

1. **Deploy new Lambda function version** with alias (e.g., "v2")
2. **Update API Gateway** to route to new version
3. **Update frontend** to use new JSON input format and handle audio responses
4. **Monitor** both versions during transition period
5. **Deprecate old version** after successful migration
6. **Remove** old audio input processing code

### Rollback Plan

- Keep previous Lambda version available
- API Gateway can route back to old version if issues arise
- Frontend should handle both response formats during transition

## Performance Considerations

### Latency Impact

**Polly TTS Addition**:
- Expected latency: 200-500ms for typical responses (50-200 words)
- Mitigation: Asynchronous processing could be considered for future optimization
- Current approach: Synchronous for simplicity and immediate audio availability

**Base64 Encoding**:
- Minimal overhead: <50ms for typical audio sizes (100-500KB)
- Trade-off: Inline delivery vs. S3 storage complexity

### Cold Start Optimization

- Initialize boto3 clients outside handler function
- Reuse connections across warm invocations
- Expected cold start: 1-2 seconds (similar to current implementation)

### Memory and Timeout Configuration

**Recommended Lambda Configuration**:
- Memory: 512MB (sufficient for RAG + Polly processing)
- Timeout: 30 seconds (allows for RAG processing + Polly generation)
- Concurrent executions: Based on expected traffic patterns

## Future Enhancements

### Potential Improvements

1. **Asynchronous Audio Generation**: Return text immediately, generate audio asynchronously
2. **Audio Caching**: Cache frequently requested responses to reduce Polly costs
3. **Voice Selection**: Allow frontend to specify voice preference
4. **Streaming Responses**: Stream text and audio separately for faster perceived performance
5. **Audio Format Options**: Support additional formats (OGG, PCM) based on client capabilities
6. **SSML Support**: Use SSML for enhanced speech control (emphasis, pauses, pronunciation)

### Scalability Considerations

- Current design scales horizontally with Lambda concurrency
- Polly has service quotas (transactions per second) that may need monitoring
- Consider implementing request throttling if Polly limits are approached
