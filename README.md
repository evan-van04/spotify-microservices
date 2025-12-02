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

This will install all required packages (including Express) into the `node_modules` folder.

---

## 4. Run the Server

Start the application using one of the following:

    node server.js

OR (if package.json defines a start script):

    npm start

If the server works correctly, you should see a message such as:

    Spotify UI server running at http://localhost:3000


