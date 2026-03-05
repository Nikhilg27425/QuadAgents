"""
RAG (Retrieval-Augmented Generation) system module.

This module contains the RAG logic for processing questions through
embedding generation, DynamoDB retrieval, similarity scoring, and Nova inference.
"""

import json
import boto3
import numpy as np
from typing import Dict, List, Any, Tuple
from botocore.config import Config

# Configure boto3 clients with ap-south-1 region for Bedrock
bedrock_config = Config(
    region_name='ap-south-1',
    connect_timeout=10,
    read_timeout=60,
    retries={'max_attempts': 3, 'mode': 'standard'}
)

# Initialize AWS clients outside functions for reuse
dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
bedrock_runtime = boto3.client('bedrock-runtime', config=bedrock_config)

# DynamoDB table reference
DYNAMODB_TABLE = 'KrishiVectors'
table = dynamodb.Table(DYNAMODB_TABLE)

# Model identifiers
TITAN_EMBED_MODEL = 'amazon.titan-embed-text-v1'
NOVA_MODEL_ARN = 'us.amazon.nova-lite-v1:0'


def detect_language(text: str) -> str:
    """
    Detects the language of the input text.
    
    Args:
        text: Input text to analyze
        
    Returns:
        Detected language (e.g., "Hindi", "English", "Marathi")
    """
    # Simple heuristic-based language detection
    # Check for Devanagari script (Hindi/Marathi)
    if any('\u0900' <= char <= '\u097F' for char in text):
        return "Hindi"
    # Check for Tamil script
    elif any('\u0B80' <= char <= '\u0BFF' for char in text):
        return "Tamil"
    # Check for Punjabi script
    elif any('\u0A00' <= char <= '\u0A7F' for char in text):
        return "Punjabi"
    else:
        return "English"


def classify_intent(text: str) -> str:
    """
    Classifies the user's intent from the question.
    
    Args:
        text: User's question text
        
    Returns:
        Intent classification (e.g., "scheme_discovery", "eligibility_check", "application_process")
    """
    text_lower = text.lower()
    
    # Intent keywords mapping
    if any(word in text_lower for word in ['scheme', 'yojana', 'योजना', 'subsidy', 'सब्सिडी']):
        return "scheme_discovery"
    elif any(word in text_lower for word in ['eligible', 'qualify', 'पात्र', 'योग्य']):
        return "eligibility_check"
    elif any(word in text_lower for word in ['apply', 'application', 'आवेदन', 'कैसे']):
        return "application_process"
    elif any(word in text_lower for word in ['insurance', 'बीमा', 'fasal bima']):
        return "insurance_inquiry"
    elif any(word in text_lower for word in ['loan', 'ऋण', 'कर्ज', 'credit']):
        return "loan_inquiry"
    elif any(word in text_lower for word in ['msp', 'price', 'मूल्य', 'भाव']):
        return "price_inquiry"
    else:
        return "general_inquiry"


def extract_farmer_profile(text: str) -> Dict[str, Any]:
    """
    Extracts farmer profile information from the question.
    
    Args:
        text: User's question text
        
    Returns:
        Dictionary containing extracted profile information
    """
    profile = {
        "land_size": None,
        "crop_type": None,
        "location": None,
        "farming_type": None
    }
    
    text_lower = text.lower()
    
    # Extract land size hints
    if any(word in text_lower for word in ['small', 'छोटा', 'marginal']):
        profile["land_size"] = "small"
    elif any(word in text_lower for word in ['large', 'बड़ा', 'big']):
        profile["land_size"] = "large"
    
    # Extract crop type hints
    if any(word in text_lower for word in ['wheat', 'गेहूं']):
        profile["crop_type"] = "wheat"
    elif any(word in text_lower for word in ['rice', 'धान', 'चावल']):
        profile["crop_type"] = "rice"
    elif any(word in text_lower for word in ['cotton', 'कपास']):
        profile["crop_type"] = "cotton"
    
    # Extract farming type
    if any(word in text_lower for word in ['organic', 'जैविक']):
        profile["farming_type"] = "organic"
    
    return profile


def generate_embedding(text: str) -> List[float]:
    """
    Generates embeddings for the input text using Amazon Titan.
    
    Args:
        text: Text to generate embeddings for
        
    Returns:
        List of embedding values
        
    Raises:
        Exception: If embedding generation fails
    """
    try:
        # Prepare request body for Titan embeddings
        request_body = json.dumps({
            "inputText": text
        })
        
        # Invoke Bedrock model
        response = bedrock_runtime.invoke_model(
            modelId=TITAN_EMBED_MODEL,
            body=request_body,
            contentType='application/json',
            accept='application/json'
        )
        
        # Parse response
        response_body = json.loads(response['body'].read())
        embedding = response_body.get('embedding', [])
        
        return embedding
        
    except Exception as e:
        raise Exception(f"Failed to generate embedding: {str(e)}")


def retrieve_chunks_from_dynamodb(embedding: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Retrieves relevant document chunks from DynamoDB.
    
    Args:
        embedding: Query embedding vector
        top_k: Number of top chunks to retrieve
        
    Returns:
        List of document chunks with metadata
        
    Raises:
        Exception: If DynamoDB query fails
    """
    try:
        # Scan DynamoDB table (in production, use more efficient retrieval)
        response = table.scan()
        items = response.get('Items', [])
        
        # Handle pagination if needed
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))
        
        return items
        
    except Exception as e:
        raise Exception(f"Failed to retrieve chunks from DynamoDB: {str(e)}")


def calculate_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculates cosine similarity between two vectors.
    
    Args:
        vec1: First vector
        vec2: Second vector
        
    Returns:
        Cosine similarity score (0 to 1)
    """
    # Convert to numpy arrays
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    
    # Calculate cosine similarity
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    
    similarity = dot_product / (norm_v1 * norm_v2)
    return float(similarity)


def score_and_rank_chunks(query_embedding: List[float], chunks: List[Dict[str, Any]], top_k: int = 3) -> List[Tuple[Dict[str, Any], float]]:
    """
    Scores chunks by similarity and returns top-k ranked results.
    
    Args:
        query_embedding: Query embedding vector
        chunks: List of document chunks with embeddings
        top_k: Number of top results to return
        
    Returns:
        List of tuples (chunk, similarity_score) sorted by score
    """
    scored_chunks = []
    
    for chunk in chunks:
        # Extract chunk embedding
        chunk_embedding = chunk.get('embedding', [])
        
        if not chunk_embedding:
            continue
        
        # Calculate similarity
        similarity = calculate_cosine_similarity(query_embedding, chunk_embedding)
        scored_chunks.append((chunk, similarity))
    
    # Sort by similarity score (descending)
    scored_chunks.sort(key=lambda x: x[1], reverse=True)
    
    # Return top-k
    return scored_chunks[:top_k]


def construct_prompt(question: str, context_chunks: List[Tuple[Dict[str, Any], float]], language: str) -> str:
    """
    Constructs the prompt for Nova inference with retrieved context.
    
    Args:
        question: User's question
        context_chunks: List of (chunk, score) tuples
        language: Detected language
        
    Returns:
        Formatted prompt string
    """
    # Extract context text from chunks
    context_texts = []
    for chunk, score in context_chunks:
        text = chunk.get('text', chunk.get('content', ''))
        if text:
            context_texts.append(text)
    
    context = "\n\n".join(context_texts)
    
    # Construct prompt based on language
    if language == "Hindi":
        prompt = f"""आप एक सहायक कृषि सलाहकार हैं। नीचे दिए गए संदर्भ का उपयोग करके किसान के प्रश्न का उत्तर दें।

संदर्भ:
{context}

प्रश्न: {question}

कृपया सटीक और उपयोगी उत्तर दें। यदि संदर्भ में जानकारी नहीं है, तो स्पष्ट रूप से बताएं।

उत्तर:"""
    else:
        prompt = f"""You are a helpful agricultural advisor. Answer the farmer's question using the context provided below.

Context:
{context}

Question: {question}

Please provide an accurate and helpful answer. If the information is not in the context, clearly state that.

Answer:"""
    
    return prompt


def invoke_nova_model(prompt: str) -> str:
    """
    Invokes Amazon Bedrock Nova model for answer generation.
    
    Args:
        prompt: Formatted prompt with context and question
        
    Returns:
        Generated answer text
        
    Raises:
        Exception: If Nova invocation fails
    """
    try:
        # Prepare request body for Nova
        request_body = json.dumps({
            "messages": [
                {
                    "role": "user",
                    "content": [{"text": prompt}]
                }
            ],
            "inferenceConfig": {
                "max_new_tokens": 512,
                "temperature": 0.7,
                "top_p": 0.9
            }
        })
        
        # Invoke Nova model
        response = bedrock_runtime.invoke_model(
            modelId=NOVA_MODEL_ARN,
            body=request_body,
            contentType='application/json',
            accept='application/json'
        )
        
        # Parse response
        response_body = json.loads(response['body'].read())
        
        # Extract answer from Nova response
        output = response_body.get('output', {})
        message = output.get('message', {})
        content = message.get('content', [])
        
        if content and len(content) > 0:
            answer = content[0].get('text', '')
            return answer.strip()
        
        return "I apologize, but I couldn't generate a response. Please try again."
        
    except Exception as e:
        raise Exception(f"Failed to invoke Nova model: {str(e)}")


def process_rag_query(question: str) -> Dict[str, Any]:
    """
    Processes a question through the complete RAG pipeline.
    
    This function implements the full RAG workflow:
    1. Detect language
    2. Classify intent
    3. Extract farmer profile
    4. Generate embeddings for the question
    5. Retrieve relevant chunks from DynamoDB
    6. Calculate cosine similarity scores
    7. Construct prompt with top-k context
    8. Invoke Amazon Bedrock Nova model for answer generation
    
    Args:
        question: The user's question text
        
    Returns:
        Dictionary containing:
        - detected_language: Detected language
        - intent: Classified intent
        - farmer_profile: Extracted profile information
        - similarity_score: Top similarity score
        - answer: Generated answer text
        
    Raises:
        Exception: If RAG processing fails
    """
    try:
        # Step 1: Detect language
        detected_language = detect_language(question)
        
        # Step 2: Classify intent
        intent = classify_intent(question)
        
        # Step 3: Extract farmer profile
        farmer_profile = extract_farmer_profile(question)
        
        # Step 4: Generate embedding for question
        query_embedding = generate_embedding(question)
        
        # Step 5: Retrieve chunks from DynamoDB
        all_chunks = retrieve_chunks_from_dynamodb(query_embedding)
        
        # Step 6: Score and rank chunks
        top_chunks = score_and_rank_chunks(query_embedding, all_chunks, top_k=3)
        
        # Get top similarity score
        similarity_score = top_chunks[0][1] if top_chunks else 0.0
        
        # Step 7: Construct prompt
        prompt = construct_prompt(question, top_chunks, detected_language)
        
        # Step 8: Invoke Nova model
        answer = invoke_nova_model(prompt)
        
        # Return complete response
        return {
            "detected_language": detected_language,
            "intent": intent,
            "farmer_profile": farmer_profile,
            "similarity_score": round(similarity_score, 4),
            "answer": answer
        }
        
    except Exception as e:
        raise Exception(f"RAG processing failed: {str(e)}")
