@echo off
echo Installing dependencies...
npm install

echo.
echo Setting up environment variables...
if not exist .env (
  copy .env.example .env
  echo Created .env file from .env.example
  echo Please update the .env file with your configuration
) else (
  echo .env file already exists
)

echo.
echo Seeding the database...
npm run db:seed

echo.
echo Starting development server...
npm run dev