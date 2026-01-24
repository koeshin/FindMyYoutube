import google.generativeai as genai
import os

# Read API Key from .env.local
api_key = None
try:
    with open('.env.local', 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('GEMINI_API_KEY='):
                api_key = line.strip().split('=', 1)[1]
                break
except FileNotFoundError:
    print("Error: .env.local file not found.")
    exit(1)

if not api_key:
    print("Error: GEMINI_API_KEY not found in .env.local")
    exit(1)

print(f"Using API Key: {api_key[:5]}...{api_key[-5:]}")

# Configure
try:
    genai.configure(api_key=api_key)
except Exception as e:
    print(f"Error configuring API: {e}")
    exit(1)

# List Models
print("\n--- Available Models ---")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"Error listing models: {e}")

# Test Generation with Gemini 1.5 Flash
print("\n--- Testing Generation (gemini-1.5-flash) ---")
try:
    model = genai.GenerativeModel('gemini-3-flash-preview')
    response = model.generate_content("Hello! Are you working?")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error with gemini-1.5-flash: {e}")

# Test Generation with Gemini Pro (fallback check)
print("\n--- Testing Generation (gemini-pro) ---")
try:
    model = genai.GenerativeModel('gemini-3-pro-preview')
    response = model.generate_content("Hello! Are you working?")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error with gemini-pro: {e}")
