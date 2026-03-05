import json
import boto3
import base64
import math

# -----------------------------
# AWS Clients
# -----------------------------
bedrock_runtime = boto3.client("bedrock-runtime", region_name="ap-south-1")
dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
polly = boto3.client("polly", region_name="ap-south-1")

TABLE_NAME = "KrishiVectors"
SESSION_TABLE = "KrishiSessions"
NOVA_MODEL_ARN = "arn:aws:bedrock:ap-south-1:604475637393:inference-profile/apac.amazon.nova-lite-v1:0"
TOP_K = 3
MIN_ACCEPTABLE_SCORE = 0.15

# 🔁 Toggle onboarding here
ENABLE_PROFILE_ONBOARDING = True

PROFILE_QUESTIONS = [
    {"field": "state", "question": "Aap kaunse rajya se hain?"},
    {"field": "land_size", "question": "Aapke paas kitni zameen hai? (kitne acre ya hectare)"},
    {"field": "crop", "question": "Aap kaunsi fasal ugate hain?"},
    {"field": "farmer_type", "question": "Kya aap chhote, madhyam ya bade kisaan hain?"},
    {"field": "irrigation_type", "question": "Kya aap sinchai ka upyog karte hain ya barish par nirbhar hain?"}
]

# -----------------------------
# Cosine Similarity
# -----------------------------
def cosine_similarity(vec1, vec2):
    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))
    if norm1 == 0 or norm2 == 0:
        return 0
    return dot / (norm1 * norm2)

# -----------------------------
# Call Nova Lite
# -----------------------------
def call_nova(prompt, temperature=0.3, max_tokens=400):
    response = bedrock_runtime.invoke_model(
        modelId=NOVA_MODEL_ARN,
        body=json.dumps({
            "messages": [{
                "role": "user",
                "content": [{"text": prompt}]
            }],
            "inferenceConfig": {
                "maxTokens": max_tokens,
                "temperature": temperature
            }
        })
    )
    result = json.loads(response["body"].read())
    return result["output"]["message"]["content"][0]["text"]

# -----------------------------
# Generate Audio with Polly
# -----------------------------
def generate_audio(text):
    """Generate audio using Amazon Polly with Hindi voice"""
    try:
        response = polly.synthesize_speech(
            Text=text,
            Engine='neural',
            VoiceId='Aditi',  # Hindi voice
            OutputFormat='mp3'
        )
        
        # Read audio stream and encode to base64
        audio_stream = response['AudioStream'].read()
        audio_base64 = base64.b64encode(audio_stream).decode('utf-8')
        
        return audio_base64
    except Exception as e:
        print(f"Polly TTS error: {str(e)}")
        return None  # Graceful degradation - return None if Polly fails

# -----------------------------
# Profile Onboarding Handler
# -----------------------------
def handle_profile_onboarding(session_id, session_data, answer):
    session_table = dynamodb.Table(SESSION_TABLE)
    
    # First interaction → start onboarding
    if not session_data or "profile_step" not in session_data:
        session_table.put_item(Item={
            "session_id": session_id,
            "profile_data": {},
            "profile_step": 0,
            "profile_completed": False
        })
        
        question_text = PROFILE_QUESTIONS[0]["question"]
        audio = generate_audio(question_text)
        
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST,OPTIONS"
            },
            "body": json.dumps({
                "onboarding": True,
                "question": question_text,
                "audio_base64": audio
            })
        }
    
    profile_data = session_data.get("profile_data", {})
    # Convert DynamoDB Decimal → int
    profile_step = int(session_data.get("profile_step", 0))
    
    # Save answer for previous question
    if profile_step < len(PROFILE_QUESTIONS):
        field_name = PROFILE_QUESTIONS[profile_step]["field"]
        profile_data[field_name] = answer
        profile_step += 1
    
    # Profile completed
    if profile_step >= len(PROFILE_QUESTIONS):
        session_table.update_item(
            Key={"session_id": session_id},
            UpdateExpression="SET profile_data = :p, profile_step = :s, profile_completed = :c",
            ExpressionAttributeValues={
                ":p": profile_data,
                ":s": profile_step,
                ":c": True
            }
        )
        
        message = "Dhanyavaad! Ab main aapki profile ke hisaab se madad kar sakta hoon."
        audio = generate_audio(message)
        
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST,OPTIONS"
            },
            "body": json.dumps({
                "onboarding_completed": True,
                "message": message,
                "audio_base64": audio
            })
        }
    
    # Ask next question
    next_question = PROFILE_QUESTIONS[profile_step]["question"]
    audio = generate_audio(next_question)
    
    session_table.update_item(
        Key={"session_id": session_id},
        UpdateExpression="SET profile_data = :p, profile_step = :s, profile_completed = :c",
        ExpressionAttributeValues={
            ":p": profile_data,
            ":s": profile_step,
            ":c": False
        }
    )
    
    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST,OPTIONS"
        },
        "body": json.dumps({
            "onboarding": True,
            "question": next_question,
            "audio_base64": audio
        })
    }

# -----------------------------
# Lambda Handler
# -----------------------------
def lambda_handler(event, context):
    question = None
    session_id = None
    
    if "body" in event:
        body = json.loads(event["body"])
        question = body.get("question")
        session_id = body.get("session_id")
    else:
        question = event.get("question")
        session_id = event.get("session_id")
    
    if not question:
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST,OPTIONS"
            },
            "body": json.dumps({"error": "Question is required"})
        }
    
    session_table = dynamodb.Table(SESSION_TABLE)
    session_data = {}
    
    if session_id:
        response = session_table.get_item(Key={"session_id": session_id})
        session_data = response.get("Item", {})
    
    # -----------------------------
    # PROFILE ONBOARDING CHECK
    # -----------------------------
    if ENABLE_PROFILE_ONBOARDING and session_id:
        profile_completed = session_data.get("profile_completed", False)
        if not profile_completed:
            return handle_profile_onboarding(session_id, session_data, question)
    
    # -----------------------------
    # NORMAL RAG FLOW
    # -----------------------------
    enhanced_question = question + " agriculture government scheme crop insurance PMFBY"
    
    embedding_response = bedrock_runtime.invoke_model(
        modelId="amazon.titan-embed-text-v2:0",
        body=json.dumps({"inputText": enhanced_question})
    )
    embedding_result = json.loads(embedding_response["body"].read())
    question_embedding = [float(x) for x in embedding_result["embedding"]]
    
    table = dynamodb.Table(TABLE_NAME)
    items = []
    response = table.scan()
    items.extend(response.get("Items", []))
    
    while "LastEvaluatedKey" in response:
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
        items.extend(response.get("Items", []))
    
    if not items:
        answer_text = "Abhi system mein jaankari uplabdh nahi hai."
        audio = generate_audio(answer_text)
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST,OPTIONS"
            },
            "body": json.dumps({
                "answer": answer_text,
                "audio_base64": audio
            })
        }
    
    scored_results = []
    for item in items:
        stored_embedding = [float(x) for x in item["embedding"]]
        score = cosine_similarity(question_embedding, stored_embedding)
        scored_results.append({"text": item["text"], "score": score})
    
    scored_results.sort(key=lambda x: x["score"], reverse=True)
    best_score = scored_results[0]["score"]
    top_results = scored_results[:TOP_K]
    
    if best_score < MIN_ACCEPTABLE_SCORE:
        answer_text = "Is sawal se judi jaankari uplabdh nahi hai."
        audio = generate_audio(answer_text)
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST,OPTIONS"
            },
            "body": json.dumps({
                "answer": answer_text,
                "audio_base64": audio
            })
        }
    
    combined_context = "\n\n".join([r["text"] for r in top_results])
    
    profile = session_data.get("profile_data", {})
    profile_text = f"""Farmer Profile:
State: {profile.get("state")}
Land Size: {profile.get("land_size")}
Crop: {profile.get("crop")}
Farmer Type: {profile.get("farmer_type")}
Irrigation: {profile.get("irrigation_type")}
"""
    
    final_prompt = f"""Aap ek anubhavhi Krishi Mitra hain jo phone par kisaan se baat kar rahe hain.

Farmer ki profile yaad rakhiye.
{profile_text}

Agar kisaan pooche ki usne kya bataya tha,
to profile se seedha jawab dijiye.

Context:
{combined_context}

Farmer Question:
{question}

Saral bolchal wali Hindi mein jawab dijiye.
5-6 chhote vakyon mein."""
    
    final_answer = call_nova(final_prompt, temperature=0.5, max_tokens=250)
    audio = generate_audio(final_answer)
    
    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST,OPTIONS"
        },
        "body": json.dumps({
            "similarity_score": best_score,
            "answer": final_answer,
            "audio_base64": audio
        }, ensure_ascii=False)
    }
