import boto3
import numpy as np
import pandas as pd
import joblib
import tempfile
from io import BytesIO
from tensorflow.keras.models import save_model, load_model
from .connect_to_db import connect_to_db

"""UPLOAD TO S3"""

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