from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import openai
import os
import cv2
import numpy as np
from dotenv import load_dotenv
import io

# Load environment variables
load_dotenv()

# Initialize OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

app = Flask(__name__)
# Update CORS for your Vercel frontend
CORS(app, resources={
    r"/*": {
        "origins": ["https://cfd-bot-final.vercel.app", "http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Use environment variables
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///users.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Create uploads folder if it doesn't exist
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Initialize the conversation history
conversation = [{"role": "system", "content": "You are an expert in Computational Fluid Dynamics."}]

def chat_with_gpt(conversation):
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=conversation
        )
        # Add logging for debugging
        print(f"OpenAI Response: {response.choices[0].message.content}")
        return response.choices[0].message.content.strip()
    except openai.error.OpenAIError as e:
        print(f"OpenAI Error: {str(e)}")
        return "I'm having trouble reaching the server. Please try again later."

def analyze_pressure_map(image):
    # Convert image to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Normalize the image
    normalized = cv2.normalize(gray, None, 0, 1.0, cv2.NORM_MINMAX, dtype=cv2.CV_32F)
    
    # Find pressure points
    pressure_points = []
    threshold = 0.3
    
    height, width = normalized.shape
    sample_rate = 10
    
    for y in range(0, height, sample_rate):
        for x in range(0, width, sample_rate):
            pressure = normalized[y, x]
            if pressure > threshold:
                pressure_points.append({
                    'x': int((x / width) * 400),
                    'y': int((y / height) * 300),
                    'pressure': float(pressure)
                })
    
    # Analyze pressure distribution
    if pressure_points:
        pressures = [p['pressure'] for p in pressure_points]
        avg_pressure = np.mean(pressures)
        max_pressure = np.max(pressures)
        
        severity = "high" if max_pressure > 0.8 else "moderate" if max_pressure > 0.5 else "low"
        
        analysis = f"Detected {len(pressure_points)} pressure points with {severity} pressure levels. "
        analysis += f"Average pressure: {avg_pressure:.2f}, Maximum pressure: {max_pressure:.2f}. "
        
        if severity == "high":
            analysis += "Recommendation: Consider reducing load in high-pressure areas."
        elif severity == "moderate":
            analysis += "Recommendation: Monitor these pressure points for potential issues."
        else:
            analysis += "Recommendation: Pressure distribution appears normal."
    else:
        analysis = "No significant pressure points detected."
        
    return {
        'pressureData': pressure_points,
        'analysis': analysis
    }

@app.route('/')
def index():
    return jsonify({"message": "API is running"})

@app.route('/generate', methods=['POST'])
def generate():
    try:
        global conversation
        data = request.json
        user_input = data.get('prompt', '').strip()

        if not user_input:
            return jsonify({'error': 'No prompt provided'}), 400

        conversation.append({"role": "user", "content": user_input})
        response = chat_with_gpt(conversation)
        conversation.append({"role": "assistant", "content": response})

        return jsonify(response)
    except Exception as e:
        print(f"Error in generate: {str(e)}")  # For debugging
        return jsonify({'error': str(e)}), 500

@app.route('/analyze-image', methods=['POST'])
def analyze_image():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read and process the image
        in_memory_file = io.BytesIO()
        file.save(in_memory_file)
        data = np.frombuffer(in_memory_file.getvalue(), dtype=np.uint8)
        image = cv2.imdecode(data, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({'error': 'Invalid image file'}), 400
        
        # Perform both analyses
        pressure_result = analyze_pressure_map(image)
        cfd_result = conduct_cfd_analysis(image)
        
        # Combine results
        combined_result = {
            **pressure_result,
            'cfdAnalysis': cfd_result
        }
        
        return jsonify(combined_result)
    except Exception as e:
        print(f"Image analysis error: {str(e)}")  # For debugging
        return jsonify({'error': str(e)}), 500

def conduct_cfd_analysis(image):
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    rows, cols = 5, 3
    cell_height = gray_image.shape[0] // rows
    cell_width = gray_image.shape[1] // cols
    pressure_map_summary = []
    
    for i in range(rows):
        row = []
        for j in range(cols):
            cell = gray_image[i*cell_height:(i+1)*cell_height, j*cell_width:(j+1)*cell_width]
            mean_pressure = np.mean(cell)
            row.append(mean_pressure)
        pressure_map_summary.append(row)
    
    average_pressure = np.mean(gray_image)

    return {
        "average_pressure": float(average_pressure),
        "pressure_map_summary": pressure_map_summary,
        "message": "CFD analysis completed successfully with summarized pressure values."
    }

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    app.run(host='0.0.0.0', port=port)

