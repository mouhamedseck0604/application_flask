FROM python:3.11-slim 
WORKDIR /application_flask
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

EXPOSE 5005
CMD ["python", "run.py"]
