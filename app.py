from flask import Flask, request, jsonify, render_template
import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY", "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")
app = Flask(__name__)

# Initialize the conversation history
conversation = [{"role": "system", "content": "You are an expert in Computational Fluid Dynamics."}]

def chat_with_gpt(conversation):
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=conversation
        )
        return response.choices[0].message.content.strip()
    except openai.error.OpenAIError:
        return "I'm having trouble reaching the server. Please try again later."

def handle_command(command):
    command = command.lower()
    if command == "help":
        return (
            "Available commands:\n"
            "1. help - Show this help message.\n"
            "2. info - Get information about Computational Fluid Dynamics.\n"
            "3. exit - End the conversation."
        )
    elif command == "info":
        return (
            "Computational Fluid Dynamics (CFD) is a branch of fluid mechanics "
            "that uses numerical analysis and algorithms to solve problems involving fluid flows."
        )
    elif command == "exit":
        return "Ending the conversation. You can start a new one anytime."
    else:
        return "Command not recognized. Type 'help' for a list of commands."

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    global conversation  # Declare 'conversation' as global at the start of the function
    
    data = request.json
    user_input = data.get('prompt', '').strip()

    # Check if the input is a command
    if user_input.startswith('/'):
        command_response = handle_command(user_input[1:])  # Strip the '/' and handle command
        conversation.append({"role": "user", "content": user_input})
        conversation.append({"role": "assistant", "content": command_response})
        return jsonify(command_response)

    # Add the user's input to the conversation
    conversation.append({"role": "user", "content": user_input})
    
    # Get the response from the chatbot
    response = chat_with_gpt(conversation)
    
    # Add the chatbot's response to the conversation history
    conversation.append({"role": "assistant", "content": response})

    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)
