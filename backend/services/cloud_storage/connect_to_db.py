import os
import boto3
from dotenv import load_dotenv

load_dotenv()

"""CONNECT TO S3"""

def connect_to_db():
    try:
        service_name = os.getenv("SERVICE_NAME")
        region_name = os.getenv("REGION_NAME")
        aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        
        if service_name not in ["s3", "cloudformation", "cloudwatch", "dynamodb", "ec2", "glacier", "iam", "opsworks", "sns", "sqs"]:
            raise ValueError(f"Invalid service name: {service_name}")
        
        s3 = boto3.resource(
            service_name=service_name,
            region_name=region_name,
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key
        )
        
        list(s3.buckets.all())
        return s3
        
    except Exception as e:
        print(f"AWS Connection Error: {str(e)}")
        raise