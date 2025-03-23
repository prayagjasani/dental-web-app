# Dental Web App

A web application for managing dental patient records built with Node.js, Express, and PostgreSQL.

## Deployment to Render

This application can be easily deployed to Render using the included `render.yaml` configuration file.

### Prerequisites

1. A [Render account](https://render.com/)
2. Git repository for your project

### Deployment Steps

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

5. **Access Your Application**
   - Once deployment is complete, click on the generated URL to access your application

## Local Development

To run this application locally:

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a local PostgreSQL database
4. Update the database connection details in `server.js`
5. Run the application: `npm run dev`

## Environment Variables

The following environment variables are used by the application:

- `DATABASE_URL`: PostgreSQL connection URL (automatically set by Render)
- `PORT`: The port on which the application will run (default: 3000)
- `NODE_ENV`: The environment (development, production) 