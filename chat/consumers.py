from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Message, Room
import json

class EchoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        
    async def receive(self, text_data):
        await self.send(text_data=text_data)

    async def disconnect(self, code):
        return await super().disconnect(code)    
    

class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print(f"[connect] incoming connection")
        user = self.scope['user']
        
        if user.is_anonymous:
            print(f"[disconnect] connection rejected")
            await self.close()
            return 

        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        #? Get room name
        self.room_group_name = f"chat_{self.room_name}"

        #? Get or create the Room in Postgres
        self.room_obj = await database_sync_to_async(
            Room.objects.get_or_create
            )(name=self.room_name)

        #? Add channel to group (self.channel_name belongs to the connection)
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        print(f"[connect] channel_name = {self.channel_name}")
        
        def get_messages():
            return list(
                Message.objects.filter(room=self.room_obj[0])
                .select_related("sender")
                .order_by("timestamp")[:50]
            )

        messages = await database_sync_to_async(get_messages)()

        history = [
            {
                "body": m.body,
                "sender": m.sender.username if m.sender else "system",
                "timestamp": m.timestamp.isoformat(),
            }
            for m in messages
        ]
        
        #? Load pre-existing messages for new consumer
        await self.send(text_data=json.dumps({"type": "history", "messages": history}))


    async def receive(self, text_data):
        #? Send message to the group
        data = json.loads(text_data) # Assume data is sent in JSON
        message = data["message"]
        user = self.scope["user"]

        #* Persist to Postgres (ORM is sync)
        await database_sync_to_async(Message.objects.create) (
            room = self.room_obj[0],
            sender=user,
            body=message,
        )

        #? The event loop is single threaded, if a blocking io operation (writing to a db synchronously) runs
        #? the event loop would be paused, disrupting websocket's behavior.
        # Message.objects.create(room=self.room_name, content=message)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message", #? calls the handler (chat_message)
                #? data to be sent
                "message": message,
                "sender": user.username,
                # "name": "alice",
                # ...
            }
        )

    #? The handler 
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "message": event["message"],
            "sender": event["sender"]
        }))

    async def disconnect(self, code):
        #? remove channel from group
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name,
            )
        await super().disconnect(code)