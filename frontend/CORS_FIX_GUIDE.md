# CORS Fix Guide for API Gateway

## Problem
Your API Gateway is blocking requests from `http://localhost:8080` due to CORS (Cross-Origin Resource Sharing) policy.

## Error Message
```
Access to XMLHttpRequest at 'https://xv8mjlnyv4.execute-api.ap-south-1.amazonaws.com/prod/ask' from origin 'http://localhost:8080' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution: Fix API Gateway CORS

### Option 1: AWS Console (Recommended)

1. **Go to API Gateway Console**
   - Open AWS Console
   - Navigate to API Gateway
   - Select your API: `krishask`

2. **Enable CORS**
   - Click on your API
   - Select the `/ask` resource
   - Click "Actions" → "Enable CORS"

3. **Configure CORS Settings**
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token
   Access-Control-Allow-Methods: POST,OPTIONS
   ```

4. **Deploy API**
   - Click "Actions" → "Deploy API"
   - Select stage: `prod`
   - Click "Deploy"

5. **Test**
   - Refresh your frontend
   - Try sending a message

### Option 2: AWS CLI

```bash
# Update API Gateway to enable CORS
aws apigateway update-integration-response \
  --rest-api-id xv8mjlnyv4 \
  --resource-id YOUR_RESOURCE_ID \
  --http-method POST \
  --status-code 200 \
  --patch-operations op=add,path=/responseParameters/method.response.header.Access-Control-Allow-Origin,value="'*'"

# Deploy the changes
aws apigateway create-deployment \
  --rest-api-id xv8mjlnyv4 \
  --stage-name prod
```

### Option 3: Update Lambda Function Response

Add CORS headers to your Lambda function response:

```python
# In lambda_function/response_formatter.py

def format_enhanced_response(rag_result: Dict[str, Any], audio_base64: Optional[str]) -> dict:
    response_body = {
        'detected_language': rag_result.get('detected_language'),
        'intent': rag_result.get('intent'),
        'farmer_profile': rag_result.get('farmer_profile'),
        'similarity_score': rag_result.get('similarity_score'),
        'answer': rag_result.get('answer')
    }
    
    if audio_base64 is not None:
        response_body['audio_base64'] = audio_base64
    
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        'body': json.dumps(response_body)
    }
```

## Temporary Workaround: Use CORS Proxy

While you fix the API Gateway, you can use a CORS proxy:

1. Update `frontend/.env`:
   ```env
   VITE_LAMBDA_API_URL=https://corsproxy.io/?https://xv8mjlnyv4.execute-api.ap-south-1.amazonaws.com/prod/ask
   ```

2. Restart the dev server

**Note**: This is only for development. Don't use CORS proxies in production!

## Verification

After fixing CORS, test with curl:

```bash
curl -X OPTIONS https://xv8mjlnyv4.execute-api.ap-south-1.amazonaws.com/prod/ask \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

You should see:
```
< Access-Control-Allow-Origin: *
< Access-Control-Allow-Methods: POST,OPTIONS
< Access-Control-Allow-Headers: Content-Type
```

## Production Considerations

For production, replace `*` with your actual domain:

```
Access-Control-Allow-Origin: https://yourdomain.com
```

This is more secure than allowing all origins.
