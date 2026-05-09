# DSCI551-project

Overview:              
The application developed is a stock trading dashboard that simulates user transactions, including buying and selling stocks. The application allows users to search and analyze stock trading data through multiple operations.

Backend: FastAPI        
Database: PostgreSQL       
Frontend: HTML, CSS, JavaScript      

Installation instructions:           
1. For the backend:                      
pip install fastapi               
2. Install PostgreSQL              
Please also install Postgres.app

Instructions to run this project:       
1. Git clone this repository

2. Data to insert into the database:             
The dataset is the `data.csv` file. Please `data.csv` file is generated from the `script.ipynb` file. You need to download `data.csv` file first. 

3. Create a new database called "trading_db" in Postgres.app           
   Open terminal and run:
   psql postgres
   
5. Connect to the trading_db database        
   Inside psql, run the following command:             
   CREATE DATABASE trading_db;
   
   Then connect and run this command:                
   \c trading_db
   
   Create table into the trading_db database.                   
   Please first identify and copy the absolute path of `data.csv` file on your local machine.
   
   Run the following command:                         
   CREATE TABLE transactions (      
    id SERIAL PRIMARY KEY,        
    user_id INT,           
    stock TEXT,         
    price FLOAT,        
    quantity INT,           
    side TEXT,               
    timestamp DATE                 
    );      

   Insert the `data.csv` file into the transactions table.
   Run the following command:
   
   \copy transactions(user_id, stock, price, quantity, side, timestamp)                     
   FROM 'your absolute path of the data.csv file'                  
   DELIMITER ','                 
   CSV HEADER;             

   Please replace the 'your absolute path of the data.csv file' with the actual absolute path of `data.csv` file on your local machine.  


   





