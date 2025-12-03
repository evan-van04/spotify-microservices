<!--
  File: README.md
  Author: Mike Tran & Evan Van
  Course: CS4471
-->

# Spotify Microservices – How to Run the Project
This project is a Node.js microservices application that uses Express and npm packages.

---

## 1. Prerequisites
You must have **Docker** (Future uses), **Node.js** and **npm** installed.

Check if they are installed by running:
    
    node -v
    npm -v
    docker --version

If not installed, download and install:

**Node.js (LTS)**: https://nodejs.org/

**Docker**: https://www.docker.com/products/docker-desktop/

Then restart your terminal and try again.

---

## 2. The Repo

Clone the repository:

    git clone https://github.com/evan-van04/spotify-microservices.git

Move into the project folder:

    cd spotify-microservices

---

## 3. Install Dependencies

Inside the project folder (`spotify-microservices`), run:

    npm install
    npm install dotenv
    npm install -D vitest

This will install all required packages (including Express) into the `node_modules` folder. Vitest is used for testing

---

## 4. Create a Spotify Developer App (Required)

4.1 Log in
    a. Go to: https://developer.spotify.com
    b. Log in with your Spotify account
    c. Navigate to Dashboard

4.2 Create a new app
    a. Click Create app
    b. Fill the form:
        - App Name: ex. TrackIQ Local Dev
        - Description: ex. CS4471 project – TrackIQ microservices for Spotify analytics
    c. Scroll to Redirect URLs and add: https://example.com/callback
    d. For “Which API/SDKs are you planning to use?”, select: Web API only
    e. Save the app

4.3 Copy Credentials
On your app's Overview page:
    a. Copy your Client ID
    b. Click Show Client Secret, then copy it

These will be used within your terminal

---

## 5. Set Environment Variables (IMPORTANT)

These must be set in the same terminal where you will run the program

You must set:
    - SPOTIFY_CLIENT_ID
    - SPOTIFY_CLIENT_SECRET
    - SERVICE_REGISTRY_URL (when locally running https://localhost:8082)

Use the correct terminal commands for your OS:

(All commands below are to be executed without the double quotations,
or whatever works with your system)

5.1 macOS/Linux (bash or zsh)
    - export SPOTIFY_CLIENT_ID="YOUR_CLIENT_ID_HERE"
    - export SPOTIFY_CLIENT_SECRET="YOUR_CLIENT_SECRET_HERE"
    - export SERVICE_REGISTRY_URL="http://localhost:8082"

5.2 Windows PowerShell
    - $env:SPOTIFY_CLIENT_ID = "YOUR_CLIENT_ID_HERE"
    - $env:SPOTIFY_CLIENT_SECRET = "YOUR_CLIENT_SECRET_HERE"
    - $env:SERVICE_REGISTRY_URL = "http://localhost:8082"

5.3 Windows Command Prompt (cmd.exe)
    - set SPOTIFY_CLIENT_ID=YOUR_CLIENT_ID_HERE
    - set SPOTIFY_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
    - set SERVICE_REGISTRY_URL=http://localhost:8082

---

## 6. Run the Application

After setting your environment variables, start the application using the following:

    node start-all.js

If successful, the application will automatically launch:

    http://localhost:8080

## 7. Stop the Application

To terminate the application, enter: 

    Ctrl+C (or whatever is appropriate for your system)

To terminate all running processes in the code.

## 8. Testing

To test the application locally, enter: 

    npm test
