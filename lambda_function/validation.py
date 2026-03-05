"""
Input validation module for Lambda function.

This module provides validation for incoming JSON requests,
ensuring they contain valid question text.
"""

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
