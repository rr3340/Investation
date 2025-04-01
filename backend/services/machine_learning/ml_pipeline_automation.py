import logging
import uuid
import threading
from datetime import datetime
from backend.services.machine_learning.svm_scale_database import svm_scale_database
from backend.services.machine_learning.lstm_scale_database import lstm_scale_database
from backend.services.machine_learning.svm_update_model import svm_upload_retrained_model_to_database
from backend.services.machine_learning.lstm_update_model import lstm_upload_retrained_model_to_database
from backend.services.machine_learning.svm_create_prediction import svm_upload_predictions_to_database
from backend.services.machine_learning.lstm_create_predictions import lstm_upload_predictions_to_database
from backend.services.stock_pipeline.batch_processor import STOCK_BATCH

#Allow for logging
logger = logging.getLogger('ml_pipeline')

#Use dict to track running m-l processes
#Used for automation and termination.
active_ml_pipelines = {}

def automate_ml_pipeline(stock_list=None, prediction_only=False, max_workers=3):
    """Process ML training and predictions for stocks"""
    #This is the initialized response.
    results = {
        "message": "ML pipeline completed",
        "start_time": datetime.now().isoformat(),
        "stocks_processed": [],
        "errors": []
    }
    
    #Decides what stock is to be processed.
    if stock_list:
        stocks_to_process = [s.upper().strip() for s in stock_list if s]
    else:
        #If there are no stocks, grab it from the STOCK_BATCH.
        stocks_to_process = STOCK_BATCH[:5]#Grabs 5 stocks by default.
    
    results["stocks_processed"] = stocks_to_process
    
    #Generates unique process
    process_id = str(uuid.uuid4())
    
    #Registers process in active_ml_pipelines dict
    #Each stock m-l process gets an entry with the same process_id
    for stock in stocks_to_process:
        active_ml_pipelines[stock] = {
            "process_id": process_id,
            "start_time": datetime.now(),
            "prediction_only": prediction_only,
            "status": "running"
        }
    
    logger.info(f"Starting ML pipeline with process ID {process_id} for stocks: {stocks_to_process}")
    
    #Processes stocks separately for m-l
    processed_stocks = []
    
    #Process stock individually
    for stock in stocks_to_process:
        #Check if a process has been terminated
        if stock not in active_ml_pipelines:
            logger.info(f"ML pipeline for {stock} was terminated before processing. Skipping.")
            continue
        
        #Check if it is terminating
        if stock in active_ml_pipelines and active_ml_pipelines[stock]["status"] == "terminating":
            logger.info(f"ML pipeline for {stock} has terminating status. Skipping processing.")
            continue
        
        stock_result = {"stock": stock, "stages": []}
        
        try:
            #Then, scale the data
            if not prediction_only:
                #Check if it isn't terminated.
                if stock not in active_ml_pipelines:
                    logger.info(f"ML pipeline for {stock} was terminated before SVM scaling. Aborting.")
                    break
                #Check again.
                if stock in active_ml_pipelines and active_ml_pipelines[stock]["status"] == "terminating":
                    logger.info(f"ML pipeline for {stock} is now terminating. Aborting before SVM scaling.")
                    break
                    
                # Then scale svm
                try:
                    svm_scale_database(stock)
                    stock_result["stages"].append({"name": "SVM Data Scaling", "status": "success"})
                except Exception as e: #If there is an error, show so.
                    error_msg = f"Error scaling SVM data for {stock}: {str(e)}"
                    logger.error(error_msg)
                    stock_result["stages"].append({"name": "SVM Data Scaling", "status": "error", "error": str(e)})
                    results["errors"].append({"stock": stock, "stage": "svm_scaling", "error": error_msg})
                
                #Check if terminated before lstm scaling.
                if stock not in active_ml_pipelines:
                    logger.info(f"ML pipeline for {stock} was terminated before LSTM scaling. Aborting.")
                    break
                #Check terminating.
                if stock in active_ml_pipelines and active_ml_pipelines[stock]["status"] == "terminating":
                    logger.info(f"ML pipeline for {stock} is now terminating. Aborting before LSTM scaling.")
                    break
                    
                # LSTM scaling otherwise.
                try:
                    lstm_scale_database(stock)
                    stock_result["stages"].append({"name": "LSTM Data Scaling", "status": "success"})
                except Exception as e:
                    error_msg = f"Error scaling LSTM data for {stock}: {str(e)}"
                    logger.error(error_msg)
                    stock_result["stages"].append({"name": "LSTM Data Scaling", "status": "error", "error": str(e)})
                    results["errors"].append({"stock": stock, "stage": "lstm_scaling", "error": error_msg})
                
                # Check termination.
                if stock not in active_ml_pipelines:
                    logger.info(f"ML pipeline for {stock} was terminated before SVM training. Aborting.")
                    break
                # Check terminating.
                if stock in active_ml_pipelines and active_ml_pipelines[stock]["status"] == "terminating":
                    logger.info(f"ML pipeline for {stock} is now terminating. Aborting before SVM training.")
                    break
                    
                # SVM training model.
                try:
                    svm_upload_retrained_model_to_database(stock)
                    stock_result["stages"].append({"name": "SVM Model Training", "status": "success"})
                except Exception as e:
                    error_msg = f"Error training SVM model for {stock}: {str(e)}"
                    logger.error(error_msg)
                    stock_result["stages"].append({"name": "SVM Model Training", "status": "error", "error": str(e)})
                    results["errors"].append({"stock": stock, "stage": "svm_training", "error": error_msg})
                
                # Check termination.
                if stock not in active_ml_pipelines:
                    logger.info(f"ML pipeline for {stock} was terminated before LSTM training. Aborting.")
                    break
                # Check terminating.
                if stock in active_ml_pipelines and active_ml_pipelines[stock]["status"] == "terminating":
                    logger.info(f"ML pipeline for {stock} is now terminating. Aborting before LSTM training.")
                    break
                    
                # LSTM training model
                try:
                    lstm_upload_retrained_model_to_database(stock)
                    stock_result["stages"].append({"name": "LSTM Model Training", "status": "success"})
                except Exception as e:
                    error_msg = f"Error training LSTM model for {stock}: {str(e)}"
                    logger.error(error_msg)
                    stock_result["stages"].append({"name": "LSTM Model Training", "status": "error", "error": str(e)})
                    results["errors"].append({"stock": stock, "stage": "lstm_training", "error": error_msg})
            
            # Check terminated.
            if stock not in active_ml_pipelines:
                logger.info(f"ML pipeline for {stock} was terminated before SVM prediction. Aborting.")
                break
            # Check terminating.
            if stock in active_ml_pipelines and active_ml_pipelines[stock]["status"] == "terminating":
                logger.info(f"ML pipeline for {stock} is now terminating. Aborting before SVM prediction.")
                break
                
            # Generate the predictions.
            # SVM prediction:
            try:
                svm_upload_predictions_to_database(stock)
                stock_result["stages"].append({"name": "SVM Prediction Generation", "status": "success"})
            except Exception as e:
                error_msg = f"Error generating SVM predictions for {stock}: {str(e)}"
                logger.error(error_msg)
                stock_result["stages"].append({"name": "SVM Prediction Generation", "status": "error", "error": str(e)})
                results["errors"].append({"stock": stock, "stage": "svm_prediction", "error": error_msg})
            
            # Check terminated
            if stock not in active_ml_pipelines:
                logger.info(f"ML pipeline for {stock} was terminated before LSTM prediction. Aborting.")
                break
            # Check terminating
            if stock in active_ml_pipelines and active_ml_pipelines[stock]["status"] == "terminating":
                logger.info(f"ML pipeline for {stock} is now terminating. Aborting before LSTM prediction.")
                break
                
            # LSTM prediction:
            try:
                lstm_upload_predictions_to_database(stock)
                stock_result["stages"].append({"name": "LSTM Prediction Generation", "status": "success"})
            except Exception as e:
                error_msg = f"Error generating LSTM predictions for {stock}: {str(e)}"
                logger.error(error_msg)
                stock_result["stages"].append({"name": "LSTM Prediction Generation", "status": "error", "error": str(e)})
                results["errors"].append({"stock": stock, "stage": "lstm_prediction", "error": error_msg})
            
            # Add the stockto the process stock list.
            processed_stocks.append(stock)
            
        except Exception as e:
            error_msg = f"Error processing stock {stock}: {str(e)}"
            logger.error(error_msg)
            results["errors"].append({"stock": stock, "error": error_msg})
        
        #Add stock result to overall results
        results["stock_results"] = results.get("stock_results", []) + [stock_result]
    
    #Calculate total durations.
    results["end_time"] = datetime.now().isoformat()
    results["total_processed"] = len(processed_stocks)
    results["error_count"] = len(results["errors"])
    
    if not results["errors"]:
        results["status"] = "success"
    else:
        results["status"] = "completed_with_errors" if processed_stocks else "failed"
    
    #Add next step info
    results["next_step"] = "Use /predict_single_stock/{stock_key} for future predictions without retraining"
    
    #Clean up active_ml_pipelines dictionary
    for stock in results["stocks_processed"]:
        if stock in active_ml_pipelines:
            #Get process id for logging
            process_id = active_ml_pipelines[stock].get("process_id", "unknown")
            
            #Mark as completed rather than deleting in case of a termination request
            active_ml_pipelines[stock]["status"] = "completed"
            active_ml_pipelines[stock]["end_time"] = datetime.now()
            
            logger.info(f"ML pipeline for {stock} (Process ID: {process_id}) marked as COMPLETED")
            
            #Keep completed entries for a brief period before removing them, to prevent race conditions with termination requests
            def remove_completed_entry(stock_key):
                if stock_key in active_ml_pipelines and active_ml_pipelines[stock_key]["status"] == "completed":
                    process_id_to_remove = active_ml_pipelines[stock_key].get("process_id", "unknown")
                    del active_ml_pipelines[stock_key]
                    logger.info(f"PIPELINE ELIMINATED: Removed completed ML pipeline entry for {stock_key} (Process ID: {process_id_to_remove})")
                else:
                    logger.warning(f"Could not remove completed ML pipeline for {stock_key} - not found or status changed")
            
            #Schedule removals after a brief delay
            timer = threading.Timer(5.0, remove_completed_entry, args=[stock])
            timer.daemon = True  #Killer timer when the app exits
            timer.start()
            
            logger.info(f"ML pipeline for {stock} (Process ID: {process_id}) completed and will be removed from active pipelines shortly")
    
    return results

def terminate_ml_pipeline(stock_key):
    """Terminate ML pipeline process for a specific stock"""
    if not stock_key:
        return {"error": "Missing required parameter: stock_key"}, 400
    #Always convert the stock key to uppercase
    stock_key = stock_key.upper()
    
    logger.info(f"Processing termination request for ML pipeline for stock {stock_key}")
    
    #Check if the stock has an active ML pipeline process
    if stock_key not in active_ml_pipelines:
        logger.warning(f"Termination request for {stock_key} failed: No active ML pipeline found")
        return {
            "message": f"No active ML pipeline found for stock {stock_key}",
            "status": "not_found",
            "reason": "Already terminated or never started",
            "active_pipelines": list(active_ml_pipelines.keys())
        }
    
    #Get the process info.
    process_info = active_ml_pipelines[stock_key]
    process_status = process_info.get("status", "unknown")
    process_id = process_info.get("process_id", "unknown")
    
    logger.info(f"ML pipeline for {stock_key} (Process ID: {process_id}) has current status: {process_status}")
    
    #Handle based on the process status.
    if process_status == "completed" or process_status == "failed":
        # If the process already finished, remove it
        del active_ml_pipelines[stock_key]
        logger.info(f"Removed already {process_status} ML pipeline for {stock_key} (Process ID: {process_id})")
        
        return {
            "message": f"ML pipeline for stock {stock_key} was already {process_status}, removed from tracking",
            "status": "already_" + process_status,
            "stock_key": stock_key,
            "process_info": {
                "status": process_status,
                "start_time": process_info.get("start_time").isoformat() if process_info.get("start_time") else None,
                "end_time": process_info.get("end_time").isoformat() if process_info.get("end_time") else None,
                "process_id": process_id
            },
            "timestamp": datetime.now().isoformat()
        }
    
    #Signal the process to terminate for active processes
    if process_status == "running":
        #Mark as terminating 
        active_ml_pipelines[stock_key]["status"] = "terminating"
        active_ml_pipelines[stock_key]["termination_time"] = datetime.now()
        
        logger.info(f"ML pipeline for {stock_key} (Process ID: {process_id}) marked as TERMINATING")
        
        #Schedule removal after delay
        def remove_terminated_entry(stock_key_to_remove):
            if stock_key_to_remove in active_ml_pipelines and active_ml_pipelines[stock_key_to_remove]["status"] == "terminating":
                process_id_to_remove = active_ml_pipelines[stock_key_to_remove].get("process_id", "unknown")
                del active_ml_pipelines[stock_key_to_remove]
                logger.info(f"PIPELINE ELIMINATED: Removed terminated ML pipeline entry for {stock_key_to_remove} (Process ID: {process_id_to_remove})")
            else:
                logger.warning(f"Could not remove terminated ML pipeline for {stock_key_to_remove} - not found or status changed")
        
        #Schedule removal after brief delay
        timer = threading.Timer(2.0, remove_terminated_entry, args=[stock_key])
        timer.daemon = True
        timer.start()
        
        #Log the termination
        logger.info(f"ML pipeline termination initiated for stock {stock_key} (Process ID: {process_id})")
        
        return {
            "message": f"ML pipeline for stock {stock_key} is being terminated",
            "status": "terminating",
            "stock_key": stock_key,
            "process_info": {
                "start_time": process_info.get("start_time").isoformat() if process_info.get("start_time") else None,
                "process_id": process_id
            },
            "timestamp": datetime.now().isoformat()
        }
    
    #For any other status remove from tracking
    del active_ml_pipelines[stock_key]
    logger.info(f"PIPELINE ELIMINATED: ML pipeline entry removed for stock {stock_key} with status {process_status} (Process ID: {process_id})")
    
    return {
        "message": f"ML pipeline entry for stock {stock_key} removed (status: {process_status})",
        "status": "removed",
        "stock_key": stock_key,
        "timestamp": datetime.now().isoformat()
    }

def get_active_ml_pipelines():
    """Get information about all active ML pipelines"""
    return list(active_ml_pipelines.keys()) 