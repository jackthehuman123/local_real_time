from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Room(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    members = models.ManyToManyField(User, blank=True)

    def __str__(self):
        return self.name
    
class Message(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE,
                             related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.SET_NULL,
                               null=True,
                               blank=True)
    body = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    seq = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["seq", "timestamp"]

    def __str__(self):
        return f"{self.sender} in {self.room}: {self.body[:50]}"