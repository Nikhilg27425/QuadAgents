#!/bin/bash

# AWS Lambda Deployment Script
# This script packages and deploys the Lambda function to AWS

set -e  # Exit on error

# Configuration
FUNCTION_NAME="rag-polly-tts"
RUNTIME="python3.11"
HANDLER="lambda_function.lambda_handler"
MEMORY_SIZE=512
TIMEOUT=30
REGION="us-east-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Lambda deployment process...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if IAM role ARN is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: IAM role ARN is required${NC}"
    echo "Usage: ./deploy.sh <IAM_ROLE_ARN>"
    echo "Example: ./deploy.sh arn:aws:iam::123456789012:role/lambda-execution-role"
    exit 1
fi

ROLE_ARN=$1

# Verify rag_system.py is implemented
if grep -q "NotImplementedError" rag_system.py; then
    echo -e "${YELLOW}Warning: rag_system.py contains NotImplementedError${NC}"
    echo -e "${YELLOW}Please implement the RAG logic before deploying to production${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create temporary directory for packaging
echo -e "${GREEN}Creating deployment package...${NC}"
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy Lambda function files
cp *.py "$TEMP_DIR/"
cp requirements.txt "$TEMP_DIR/"

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
pip install -r requirements.txt -t "$TEMP_DIR/" --quiet

# Create deployment package
cd "$TEMP_DIR"
zip -r lambda_function.zip . -q

# Check if function exists
echo -e "${GREEN}Checking if function exists...${NC}"
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" &> /dev/null; then
    echo -e "${YELLOW}Function exists, updating code...${NC}"
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://lambda_function.zip \
        --region "$REGION"
    
    echo -e "${GREEN}Updating function configuration...${NC}"
    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --runtime "$RUNTIME" \
        --handler "$HANDLER" \
        --memory-size "$MEMORY_SIZE" \
        --timeout "$TIMEOUT" \
        --region "$REGION"
else
    echo -e "${GREEN}Creating new function...${NC}"
    aws lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime "$RUNTIME" \
        --role "$ROLE_ARN" \
        --handler "$HANDLER" \
        --zip-file fileb://lambda_function.zip \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY_SIZE" \
        --region "$REGION"
fi

echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "Function Name: $FUNCTION_NAME"
echo "Region: $REGION"
echo "Runtime: $RUNTIME"
echo "Memory: ${MEMORY_SIZE}MB"
echo "Timeout: ${TIMEOUT}s"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Configure API Gateway to route requests to this function"
echo "2. Test the function with: aws lambda invoke --function-name $FUNCTION_NAME --payload '{\"body\": \"{\\\"question\\\": \\\"Test\\\"}\"}' response.json"
echo "3. Monitor CloudWatch logs for any issues"
