from flask_restx import Resource, Namespace, fields
from flask import Flask, request,jsonify
import pandas as pd
import tempfile
import numpy as np
import joblib
from io import BytesIO, StringIO
from tensorflow.keras.models import load_model, save_model
import boto3
from dotenv import load_dotenv

"""
UPLOAD TO S3
"""

def upload_to_s3(object, bucket_name, file_name):
    s3 = connect_to_db() #Connect to the database
    if not file_name.endswith(('.npy', '.pkl', '.csv', '.keras')):
        raise ValueError(f"Unsupported file type: {file_name}")

    try:
        with BytesIO() as buffer:
            
            if file_name.endswith('.keras'):
                with tempfile.NamedTemporaryFile(suffix='.keras') as temp_model_file:
                    save_model(object, temp_model_file.name)
                    temp_model_file.flush()
                    buffer.write(temp_model_file.read())
                
            elif file_name.endswith('.npy'):
                np.save(buffer, object)
                    
            elif file_name.endswith('.pkl'):
                joblib.dump(object, buffer)
                
            else:
                object.to_csv(buffer, index=False)

            buffer.seek(0) #load buffer at end this time to then upload to bucket
            s3.Bucket(bucket_name).put_object(Key=file_name, Body=buffer.getvalue())

    except Exception as e:
        raise RuntimeError(f"Failed to upload {file_name} to {bucket_name}: {e}")

def save_variables_to_s3(file_dict): #Save chain from dictionary items
        for var_name, (object, bucket, filename) in file_dict.items():
            upload_to_s3(object, bucket, filename)
            
"""
DOWNLOAD FROM S3
"""

def load_from_s3(bucket_name, file_name):
    s3 = connect_to_db() #Connect to the database
    if not file_name.endswith(('.npy', '.pkl', '.csv', '.keras')): #If the file is not a valid type
        raise ValueError(f"Unsupported file type: {file_name}")#Raise error
    try:
        with BytesIO() as buffer:#Or else, establish a buffer
            s3.Bucket(bucket_name).download_fileobj(file_name, buffer) #Then, grab the file object from bucket
            buffer.seek(0)
            
            if file_name.endswith('.keras'): #Depending on the ending of file name, load in appropiate manner
                with tempfile.NamedTemporaryFile(suffix='.keras') as temp_model_file:
                    temp_model_file.write(buffer.read())
                    temp_model_file.flush()#Use tempfile to load .keras model
                    loaded_model = load_model(temp_model_file.name)
                return loaded_model

            elif file_name.endswith('.npy'): #Use an np.load for .npy
                return np.load(buffer)
                
            elif file_name.endswith('.pkl'): #Use a joblib for pkl
                return joblib.load(buffer)

            else:
                return pd.read_csv(buffer) #Or else, it must be csv so read csv
                
    except Exception as e:
        raise RuntimeError(f"Failed to load {file_name} from {bucket_name}: {e}") #If none, load this exception as an error


def load_variables_from_s3(file_dict): #Load all from the file dictionary to then call the function above to load in chain
    return {
        var_name: load_from_s3(bucket, filename)
        for var_name, (bucket, filename) in file_dict.items()
    }
    
from dotenv import load_dotenv
import os

load_dotenv()

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