from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.contrib import admin
from django.urls import path, include
import json

@ensure_csrf_cookie
# Ensure that a cookie is sent back in the JsonResponse in the headers
def csrf_view(request):
    """GET this endpoint to receive the csrftoken cookie."""
    return JsonResponse({"detail": "CSRF cookie set"})

@require_http_methods(["POST"])
def login_view(request):
    # Load the data 
    data = json.loads(request.body)
    user = authenticate(request, username=data["username"], password=data["password"])
    if user is not None:
        login(request, user)
        return JsonResponse({"username": user.username})
    return JsonResponse({"detail": "Invalid credentials"}, status=400)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('chat/', include("chat.urls")),
    path('accounts/', include("django.contrib.auth.urls")),
    path('api/csrf/', csrf_view),
    path('api/login/', login_view),
]
