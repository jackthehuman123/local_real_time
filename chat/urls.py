from django.urls import path
from . import views

urlpatterns = [
    path("<str:room_name>/history/", views.room_history, name="room_history")
]