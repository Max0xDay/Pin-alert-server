# Pin Alert Server
## Description
Pin Alert Server is a Node.js application designed to collect and monitor power status from Raspberry Pi devices through an API. It uses Express for the server, SQLite3 for the database, and serves a web-based dashboard to visualize sensor data.
BSI Pin Alert Server is aimed to be run on a server and let clients (raspberry Pi's) status on 220v voltages. This sever is only limated by hardware and can have multiple Pi's on it. All data is saved into SQLite databases. Each site has there own database which makes it easier to download each database for analysis to help identify issues. 

The project is fully automated. any new client that connects to the server will automatically start being logged and will be visable web interface hosted on port 4000.

#### Project Sturcture 


```
.gitignore
Database/
index.js
package.json
pinSettings.json
public/
    index.html
    scripts.js
    styles.css
README.md
```
## Installation
1. Clone the repository:
    ```sh
    git clone <repository-url>
    cd pin-alert-server
    ```

2. Install dependencies:
    ```sh
    npm install
    ```
## Running the Server

1. Start the server:
    ```sh
    npm start
    ```
       
2. The server will start on port `4000`. You can access the web-based dashboard by navigating to `http://localhost:4000` in your web browser.

## API Endpoints

- **POST /sensors**: Collects sensor data.
- **GET /sensors/top10**: Retrieves the latest 10 sensor records.
- **GET /sensors/history/:limit**: Retrieves the sensor history with a specified limit.
- **POST /system/state**: Updates the system state.
- **GET /system/state**: Retrieves the current system state.
- **GET /pinSettings**: Retrieves the current pin settings.
- **POST /pinSettings**: Updates the pin settings.
- **POST /check**: Updates the last check time.
- **GET /health**: Retrieves the health status of the system.
