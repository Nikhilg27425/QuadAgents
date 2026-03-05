"""
Response formatting module for Lambda function.

This module provides utilities for formatting successful and error responses
with consistent structure, including enhanced RAG response fields.
"""

import json
from typing import Optional, Dict, Any


def format_enhanced_response(rag_result: Dict[str, Any], audio_base64: Optional[str]) -> dict:
    """
    Formats an enhanced response with RAG fields and optional audio.
    
    Args:
        rag_result: Dictionary containing RAG processing results:
            - detected_language: Detected language
            - intent: Classified intent
            - farmer_profile: Extracted profile information
            - similarity_score: Top similarity score
            - answer: Generated answer text
        audio_base64: Base64-encoded audio (None if TTS failed)
        
    Returns:
        Lambda response dictionary with statusCode, headers, and body containing all fields
    """
    response_body = {
        'detected_language': rag_result.get('detected_language'),
        'intent': rag_result.get('intent'),
        'farmer_profile': rag_result.get('farmer_profile'),
        'similarity_score': rag_result.get('similarity_score'),
        'answer': rag_result.get('answer')
    }
    
    # Add audio if Polly succeeded
    if audio_base64 is not None:
        response_body['audio_base64'] = audio_base64
    
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        'body': json.dumps(response_body)
    }


def format_success_response(answer: str, audio_base64: Optional[str]) -> dict:
    """
    Formats a successful response with text and optional audio.
    
    DEPRECATED: Use format_enhanced_response for new implementations.
    Kept for backward compatibility.
    
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
        Lambda response dictionary with statusCode, headers, and error body
    """
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        'body': json.dumps({'error': error_message})
    }
