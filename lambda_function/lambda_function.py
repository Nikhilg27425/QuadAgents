"""
AWS Lambda handler for RAG-based question answering with Polly TTS.

This Lambda function accepts JSON text input, processes questions through
a RAG system with Bedrock Nova, and returns both text and audio responses using Amazon Polly.
"""

import json
import logging
import boto3
from typing import Any
from botocore.config import Config

from validation import validate_input
from polly_tts import generate_speech
from response_formatter import format_enhanced_response, format_error_response
from rag_system import process_rag_query

# Configure structured logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Configure boto3 client with timeout and retry settings
polly_config = Config(
    region_name='ap-south-1',  # Updated to ap-south-1 for Bedrock
    connect_timeout=5,
    read_timeout=10,
    retries={
        'max_attempts': 2,
        'mode': 'standard'
    }
)

# Initialize AWS clients outside handler for connection reuse
polly_client = boto3.client('polly', config=polly_config)


def log_request(event: dict, context: Any):
    """Log incoming request details."""
    logger.info(json.dumps({
        'event': 'request_received',
        'request_id': context.request_id,
        'has_body': 'body' in event
    }))


def log_rag_processing(question: str, rag_result: dict, context: Any):
    """Log RAG processing details."""
    logger.info(json.dumps({
        'event': 'rag_processing_complete',
        'request_id': context.request_id,
        'question_length': len(question),
        'answer_length': len(rag_result.get('answer', '')),
        'detected_language': rag_result.get('detected_language'),
        'intent': rag_result.get('intent'),
        'similarity_score': rag_result.get('similarity_score')
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


def lambda_handler(event: dict, context: Any) -> dict:
    """
    Main Lambda handler function.
    
    Processes JSON text input through RAG system with Bedrock Nova and returns
    enhanced response with language detection, intent, profile, similarity score,
    answer text, and optional Polly-generated audio.
    
    Args:
        event: Lambda event containing the API Gateway request
        context: Lambda context object
        
    Returns:
        Response dictionary with statusCode and body containing:
        - detected_language: Detected language
        - intent: Classified intent
        - farmer_profile: Extracted profile information
        - similarity_score: Top similarity score
        - answer: Generated answer text
        - audio_base64: Base64-encoded MP3 audio (if Polly succeeds)
    """
    # Log incoming request
    log_request(event, context)
    
    # Validate input and extract question
    question, error_response = validate_input(event)
    if error_response:
        logger.warning(f"Input validation failed: {error_response}")
        return error_response
    
    try:
        # Process through RAG system (returns enhanced response with all fields)
        rag_result = process_rag_query(question)
        log_rag_processing(question, rag_result, context)
        
        # Extract answer for Polly TTS
        answer = rag_result.get('answer', '')
        
        # Generate speech with Polly (graceful degradation if fails)
        audio_base64 = None
        try:
            audio_base64 = generate_speech(answer, polly_client)
            
            if audio_base64:
                # Calculate approximate audio size for logging
                audio_size = len(audio_base64) * 3 // 4  # Base64 to bytes approximation
                log_polly_success(audio_size, context)
            else:
                logger.warning("Polly TTS generation returned None, continuing without audio")
        except Exception as polly_error:
            # Log Polly failure but don't fail the entire request
            log_polly_failure(polly_error, context)
            logger.warning(f"Polly TTS failed: {str(polly_error)}, returning text-only response")
        
        # Format and return enhanced response with all RAG fields + audio
        return format_enhanced_response(rag_result, audio_base64)
        
    except Exception as error:
        # Log error with full context
        logger.error(json.dumps({
            'event': 'request_processing_failed',
            'request_id': context.request_id,
            'error_type': type(error).__name__,
            'error_message': str(error)
        }))
        
        # Return error response
        return format_error_response(500, "Failed to process request")
