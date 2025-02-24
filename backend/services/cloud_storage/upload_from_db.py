import numpy as np
import pandas as pd
import joblib
import tempfile
from io import BytesIO
from tensorflow.keras.models import load_model
from .connect_to_db import connect_to_db

"""DOWNLOAD FROM S3"""

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