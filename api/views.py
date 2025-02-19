from django.http import JsonResponse

def hello_world(request):
    response = JsonResponse({"message": "Hello, World!! Welcome to the Social Media Marketplace!"})
    return response
