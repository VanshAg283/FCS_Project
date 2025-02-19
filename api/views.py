from django.http import JsonResponse

def hello_world(request):
    response = JsonResponse({"message": "Hello, World!! Welcome to the Social Media Marketplace!"})
    # response["Access-Control-Allow-Origin"] = "http://localhost:5173"
    # response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    # response["Access-Control-Allow-Headers"] = "Content-Type, X-Requested-With"
    return response
