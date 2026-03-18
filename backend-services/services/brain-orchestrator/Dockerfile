# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set environment variables to sane defaults
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PORT 8080

# Set the working directory in the container
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code from the src directory
COPY src/ .

# Run the production web server
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app