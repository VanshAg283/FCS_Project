class CorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if 'HTTP_ORIGIN' in request.META:
            # Validate the origin before allowing it
            allowed_origins = ['http://localhost:5173', 'http://192.168.2.251', 'https://192.168.2.251']
            origin = request.META['HTTP_ORIGIN']
            if origin in allowed_origins:
                response["Access-Control-Allow-Origin"] = origin
                response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
                response["Access-Control-Allow-Headers"] = "Content-Type, X-Requested-With"
        return response
