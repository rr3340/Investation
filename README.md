# FinanceApp

<a name="readme-top"></a>

<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->

<!-- PROJECT SHIELDS -->
<div align="center">

[![Contributors][contributors-shield]][contributors-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

<!-- PROJECT LOGO -->
<br />

  <a href="https://github.com/rr3340/Investation">
    <img src="client/public/investation.png" alt="Logo" width="80" height="80">
  </a>

<br />

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-this-project">About This Project</a>
      <ul>
        <li><a href="#features">Features</a></li>
        <li><a href="#built-with">Built With</a></li>
        <li><a href="#demo">Demo</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
  </ol>
</details>

<br />

<!-- ABOUT THIS PROJECT -->
## About This Project

**Investation** is a stock trading app that simulates real-time stock market investing in a risk-free environment. The application combines live market data with our portfolio tracking, allowing users to have an authentic investing experience without the risk. With our intuitive interfaces, our users can create and customize their own profiles, build diversified portfolios, receive price alerts, and develop strategies on the clock intraday.

### Features

<div style="text-align: left; display: inline-block;">
* **Live Stock Market**: Live tracking of stock prices with automatic updates.
* **Interactive Portfolio Management**: Buy, sell, and track investments in a personalized dashboard.
* **AI-Powered Price Predictions**: Machine learning models (SVM and LSTM) to forecast potential stock movements.
* **Customizable Profiles**: Allows users to personalize their profile layout with preferences and interests.
* **Price Alerts**: Customizable notifications when stocks cross specified price thresholds.
* **Track Portfolio Value**: Real-time calculation of asset values, user networth, and investment growth.
* **Secure User Authentication**: Ensures protected access to user information and transactions. 
</div>

<p align="right">(<a href="#readme-top">Back to Top</a>)</p>

<div align="center">
### Built With:

[![React][React]][React-url]
[![Flask][Flask]][Flask-url]
[![Python][Python]][Python-url]
[![JavaScript][JavaScript]][JavaScript-url]
[![AWS][AWS]][AWS-url]
[![SQLite][SQLite]][SQLite-url]
[![yfinance API][yfinance API]][yfinance-url]

### Demo:

## Home Pages
</div>

<div align="center">
  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
    <img src="client/public/demo/image/home/homeabout.png" width="32%">
    <img src="client/public/demo/image/home/homecontact.png" width="32%">
    <img src="client/public/demo/image/home/homecreatenewaccount.png" width="32%">
  </div>
  <div style="display: flex; justify-content: space-between;">
    <img src="client/public/demo/image/home/homeforgetpassword.png" width="32%">
    <img src="client/public/demo/image/home/homelogin.png" width="32%">
    <img src="client/public/demo/image/home/homepage.png" width="32%">
  </div>
</div>

<div align="center">
## Home Pages in Action
</div>

<div align="center">
  <div style="margin-bottom: 20px;">
    <p><strong>Creating an Account</strong></p>
    <img src="client/public/demo/gif/creatingaccount.gif" width="75%">
  </div>
</div>

<div align="center">
## Profile Pages
</div>

<div align="center">
  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
    <img src="client/public/demo/image/profile/profiledashboard.png" width="32%">
    <img src="client/public/demo/image/profile/profileinvestments.png" width="32%">
    <img src="client/public/demo/image/profile/profilesettingsaccountinfo.png" width="32%">
  </div>
  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
    <img src="client/public/demo/image/profile/profilesettingsnotifications.png" width="32%">
    <img src="client/public/demo/image/profile/profilesettingspreferences.png" width="32%">
    <img src="client/public/demo/image/profile/profilesettingssecurity.png" width="32%">
  </div>
  <div>
    <img src="client/public/demo/image/profile/profilewatchlist.png" width="65%">
  </div>
</div>

<div align="center">
## Profile Pages in Action
</div>

<div align="center">
  <div style="margin-bottom: 20px;">
    <p><strong>Customizing Profile Layout</strong></p>
    <img src="client/public/demo/gif/changingprofilelayout.gif" width="75%">
  </div>
  
  <div style="margin-bottom: 20px;">
    <p><strong>Changing Password</strong></p>
    <img src="client/public/demo/gif/changingpw.gif" width="75%">
  </div>
</div>

<div align="center">
## Stock Pages
</div>

<div align="center">
  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
    <img src="client/public/demo/image/stock/stockdashboard.png" width="48%">
    <img src="client/public/demo/image/stock/stockoverview.png" width="48%">
  </div>
  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
    <img src="client/public/demo/image/stock/stockprediction.png" width="48%">
    <img src="client/public/demo/image/stock/stocktransactions.png" width="48%">
  </div>
  <div>
    <img src="client/public/demo/image/stock/stockactivealerts.png" width="65%">
  </div>
</div>

<div align="center">
## Stock Features in Action
</div>

<div align="center">
  <div style="margin-bottom: 20px;">
    <p><strong>Buying and Selling Stock</strong></p>
    <img src="client/public/demo/gif/stockbuyandsell.gif" width="75%">
  </div>
  
  <div style="margin-bottom: 20px;">
    <p><strong>Live Updating Stock</strong></p>
    <img src="client/public/demo/gif/updatedstock.gif" width="75%">
  </div>
  
  <div style="margin-bottom: 20px;">
    <p><strong>Setting Watchlist and Price Alerts</strong></p>
    <img src="client/public/demo/gif/watchlistandpricealert.gif" width="75%">
  </div>

  <div style="margin-bottom: 20px;">
    <p><strong>Profile Updates After Purchasing Stock</strong></p>
    <img src="client/public/demo/gif/profilestockupdate.gif" width="75%">
  </div>
</div>

<p align="right">(<a href="#readme-top">Back to Top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

<div style="text-align: left; display: inline-block;">
For this app, you'll need:

* Python 3.8+
* Node.js and npm
</div>

### Installation

<div style="text-align: left; display: inline-block;">
1. Clone this repository:

   ```sh
   git clone https://github.com/rr3340/Investation.git
   ```
   Open Directory
   
    ```sh
   cd Investation
   ```

2. Establish the Backend:

   ```sh
    cd backend
    python -m venv venv
    source venv/bin/activate # On Windows: venv\Scripts\activate
   ```

   Create an `.env` file into the Backend off of the example:

   ```sh
    SECRET_KEY=your_secret_key_here
    SQLALCHEMY_TRACK_MODIFICATIONS=False
    JWT_SECRET_KEY=your_jwt_secret_key_here

    SERVICE_NAME=s3
    REGION_NAME=your_aws_region
    AWS_ACCESS_KEY_ID=your_aws_access_key_id
    AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key

    PROCESSED_STORAGE=your_processed_bucket_name
    PREDICTION_STORAGE=your_prediction_bucket_name
    MODEL_STORAGE=your_model_bucket_name
   ```

   Note, you also have to initialize the database:

   ```sh
    cd backend
    flask db init
    flask db migrate -m "Initial migration"
    flask db upgrade
   ```

   For resetting:

   ```sh
    rm dev.db

    flask db init
    flask db migrate -m "Initial migration - fresh start"
    flask db upgrade
   ```

   Install the Python packages, then run Backend

   ```sh
   pip install -r requirements.txt
   cd ..
   python -m backend.run
   ```

3. Establish the M-L Services:

   ```sh
    cd backend
    python -m venv venv
    source venv/bin/activate # On Windows: venv\Scripts\activate
   ```

   Create an `.env` file into the Backend off of the example:

   ```sh
    SECRET_KEY=your_secret_key_here
    SQLALCHEMY_TRACK_MODIFICATIONS=False
    JWT_SECRET_KEY=your_jwt_secret_key_here

    SERVICE_NAME=s3
    REGION_NAME=your_aws_region
    AWS_ACCESS_KEY_ID=your_aws_access_key_id
    AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key

    PROCESSED_STORAGE=your_processed_bucket_name
    PREDICTION_STORAGE=your_prediction_bucket_name
    MODEL_STORAGE=your_model_bucket_name
   ```

   Install the Python packages, then run M-L services:

   ```sh
    pip install -r requirements.txt
    cd ..
    python -m ml_services.main
   ```

4. Run the React server:

   Open a new terminal and navigate to the server directory:

   ```sh
   cd client
   ```

   Install NPM packages and start the server:

   ```sh
    cd client
    npm install
    npm start
   ```
</div>

<p align="right">(<a href="#readme-top">Back to Top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/rr3340/Investation.svg?style=for-the-badge
[contributors-url]: https://github.com/rr3340/Investation/graphs/contributors

[stars-shield]: https://img.shields.io/github/stars/rr3340/Investation.svg?style=for-the-badge
[stars-url]: https://github.com/rr3340/Investation/stargazers

[issues-shield]: https://img.shields.io/github/issues/rr3340/Investation.svg?style=for-the-badge
[issues-url]: https://github.com/rr3340/Investation/issues

[license-shield]: https://img.shields.io/github/license/rr3340/Investation.svg?style=for-the-badge
[license-url]: https://github.com/rr3340/Investation/blob/main/LICENSE

[linkedin-shield]: https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white
[linkedin-url]: https://www.linkedin.com/in/rohan-r-7409202b4/

[React]: https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB
[React-url]: https://react.dev/

[Flask]: https://img.shields.io/badge/flask-%23000.svg?style=for-the-badge&logo=flask&logoColor=white
[Flask-url]: https://flask.palletsprojects.com/en/

[Python]: https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54
[Python-url]: https://www.python.org/

[JavaScript]: https://img.shields.io/badge/javascript-000001?style=for-the-badge&logo=javascript
[JavaScript-url]: https://www.javascript.com/

[AWS]: https://img.shields.io/badge/AWS-%23232F3E.svg?style=for-the-badge&logo=amazonwebservices&logoColor=white
[AWS-url]: https://aws.amazon.com/

[yfinance API]: https://img.shields.io/badge/YFinance%20API-%23410093.svg?style=for-the-badge
[yfinance-url]: https://yfinance-python.org/

[SQLite]: https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white
[SQLite-url]: https://www.sqlite.org/
