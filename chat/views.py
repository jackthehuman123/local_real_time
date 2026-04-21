from django.shortcuts import render
from django.http import JsonResponse
from .models import Message, Room

def room_history(request, room_name):
    try:
        room = Room.objects.get(name=room_name)
    except Room.DoesNotExist:
        return JsonResponse({"messages": []})
    
    messages = Message.objects.filter(room=room).select_related("sender").order_by("-timestamp")[:50]
    data = [
        {
            "body": m.body,
            "sender": m.sender.username if m.sender else "system",
            "timestamp": m.timestamp.isoformat(),
        }
        for m in reversed(list(messages))
    ]
    return JsonResponse({"messages": data})
# Create your views here.
