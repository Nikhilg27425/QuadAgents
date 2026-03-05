"""
Amazon Polly TTS integration module.

This module handles text-to-speech generation using Amazon Polly
with graceful error handling and base64 encoding.
"""

import base64
from typing import Optional, Any
from botocore.exceptions import BotoCoreError, ClientError


def generate_speech(text: str, polly_client: Any) -> Optional[str]:
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
