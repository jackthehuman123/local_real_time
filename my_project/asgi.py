"""
ASGI config for my_project project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os
import django

# os.environ.setdefault must be called before any Django imports because Django
# reads the settings module at import time. If DJANGO_SETTINGS_MODULE is not set
# before importing django.setup(), Django won't know which settings file to use
# and will raise an ImproperlyConfigured error. django.setup() must then be called
# before importing any Django models or apps (like chat.routing) because it
# initializes the app registry — without it, model classes can't resolve their
# app_label and will raise AppRegistryNotReady.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'my_project.settings')
django.setup()

from chat.routing import websocket_urlpatterns
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
})

#? ProtocolTypeRouter: Store what kind of connection we want our server to response to using a dictionary.
