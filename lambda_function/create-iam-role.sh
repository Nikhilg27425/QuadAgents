#!/bin/bash

# Script to create IAM role for Lambda function
# This creates the execution role with all required permissions

set -e

# Configuration
ROLE_NAME="lambda-rag-polly-execution-role"
POLICY_NAME="lambda-rag-polly-policy"
REGION="us-east-1"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Creating IAM role for Lambda function...${NC}"

# Check if DynamoDB table name is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: DynamoDB table name is required${NC}"
    echo "Usage: ./create-iam-role.sh <DYNAMODB_TABLE_NAME>"
    echo "Example: ./create-iam-role.sh my-rag-documents-table"
    exit 1
fi

TABLE_NAME=$1

# Create trust policy for Lambda
cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the IAM role
echo -e "${GREEN}Creating IAM role: $ROLE_NAME${NC}"
ROLE_ARN=$(aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document file:///tmp/trust-policy.json \
    --query 'Role.Arn' \
    --output text 2>/dev/null || \
    aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)

echo -e "${GREEN}Role ARN: $ROLE_ARN${NC}"

# Update the policy template with actual table name
sed "s/YOUR_TABLE_NAME/$TABLE_NAME/g" iam-policy.json > /tmp/lambda-policy.json

# Create and attach the policy
echo -e "${GREEN}Creating IAM policy: $POLICY_NAME${NC}"
POLICY_ARN=$(aws iam create-policy \
    --policy-name "$POLICY_NAME" \
    --policy-document file:///tmp/lambda-policy.json \
    --query 'Policy.Arn' \
    --output text 2>/dev/null || \
    aws iam list-policies --query "Policies[?PolicyName=='$POLICY_NAME'].Arn" --output text)

echo -e "${GREEN}Policy ARN: $POLICY_ARN${NC}"

# Attach policy to role
echo -e "${GREEN}Attaching policy to role...${NC}"
aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "$POLICY_ARN" 2>/dev/null || echo -e "${YELLOW}Policy already attached${NC}"

# Wait for role to be available
echo -e "${YELLOW}Waiting for IAM role to propagate (10 seconds)...${NC}"
sleep 10

echo -e "${GREEN}IAM role created successfully!${NC}"
echo ""
echo "Role ARN: $ROLE_ARN"
echo ""
echo -e "${GREEN}Next step: Deploy Lambda function${NC}"
echo "./deploy.sh $ROLE_ARN"

# Cleanup
rm -f /tmp/trust-policy.json /tmp/lambda-policy.json
