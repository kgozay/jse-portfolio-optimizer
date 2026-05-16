#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Installing backend dependencies..."
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "Installing frontend dependencies..."
cd frontend
npm install --no-fund --no-audit
cd ..

echo "Initializing Git repository..."
git init
git add .
git commit -m "Initial commit: JSE Portfolio Optimizer"

echo "Creating GitHub repository and pushing..."
# This will use the locally authenticated gh cli
gh repo create jse-portfolio-optimizer --public --source=. --remote=origin --push || echo "Repository may already exist or gh is not authenticated."

echo "Deployment to Vercel..."
cd frontend
# Link and deploy using vercel CLI (requires user to be logged in: npx vercel login)
npx vercel --prod --yes

echo "Done! Make sure to set up the backend on Render and add the FRED_API_KEY environment variable."
