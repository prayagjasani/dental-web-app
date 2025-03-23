# Dental Web App

A web application for managing dental patient records built with Node.js, Express, and PostgreSQL/MySQL.

## Deployment to Render

This application can be easily deployed to Render using the included `render.yaml` configuration file.

### Prerequisites

1. A [Render account](https://render.com/)
2. Git repository for your project

### Deployment Options

#### Option 1: Deploy with PostgreSQL Database (Recommended)

1. **Push your code to a Git repository** (GitHub, GitLab, etc.)

2. **Connect to Render**
   - Log in to your Render account
   - Click on "New" and select "Blueprint"
   - Connect your Git repository
   - Select the repository containing this application

3. **Deploy the Blueprint**
   - Render will automatically detect the `render.yaml` file
   - This will set up both the web service and PostgreSQL database
   - Click "Apply" to start the deployment process

4. **Monitor Deployment**
   - Render will begin deploying your application
   - You can monitor the deployment progress in the Render dashboard

#### Option 2: Deploy with In-Memory Storage (Demo Only)

If you want to quickly deploy a demo version without setting up a database:

1. **Push your code to a Git repository**

2. **Create a Web Service on Render**
   - Log in to your Render account
   - Click on "New" and select "Web Service"
   - Connect your Git repository
   - Configure the service:
     - Name: dental-web-app
     - Environment: Node
     - Build Command: `npm install`
     - Start Command: `node server.js`
   - Click "Create Web Service"

Note: With in-memory storage, all data will be lost when the service restarts or redeploys.

## Adaptive Database Usage

This application is designed to work with multiple database options:

1. **PostgreSQL**: Used when deploying to Render with a database (checks for DATABASE_URL)
2. **MySQL**: Used for local development 
3. **In-Memory Storage**: Automatically used as a fallback when on Render without a database

## Local Development

To run this application locally:

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a local MySQL database
4. Update the database connection details in `server.js` if needed
5. Run the application: `npm run dev`

## Environment Variables

The following environment variables are used by the application:

- `DATABASE_URL`: PostgreSQL connection URL (automatically set by Render when using a database)
- `PORT`: The port on which the application will run (default: 3000)
- `NODE_ENV`: The environment (development, production) 