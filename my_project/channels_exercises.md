# Phase 1 Exercises — WebSockets & Django Channels

## Setup

```bash
pip install django channels daphne
```

Project layout assumed throughout:

```
myproject/
  myproject/
    settings.py
    asgi.py
    urls.py
  chat/
    consumers.py
    routing.py
  manage.py
```

---

## Exercise 1 — The WS Handshake (no Django yet)

**Goal:** See the HTTP→WebSocket upgrade with your own eyes before writing any consumer.

**Tasks:**

1. Open your browser DevTools → Network tab → filter by "WS"
2. Navigate to any site that uses WebSockets (e.g. https://websocket.org/tools/websocket-echo-server/)
3. Find the WebSocket connection in the network panel. Answer in comments:
   - What HTTP status code does the server return to accept the upgrade?
   - What two headers does the request send that signal a WebSocket handshake?
   - After the handshake, does the connection show as one long entry or many?

4. Write a plain Python WebSocket CLIENT (no Django) using the `websockets` library:

```python
# ws_client.py
# pip install websockets
import asyncio
import websockets

async def connect():
    uri = "wss://echo.websocket.org"
    async with websockets.connect(uri) as ws:
        await ws.send("hello from Python")
        response = await ws.recv()
        print(f"Got back: {response}")

asyncio.run(connect())
```

5. Run it. Confirm the echo comes back.
6. **Reflection question (write the answer as a comment):** Why does this use `async with` and `await` instead of a regular function call?

**Expected output:**

```
Got back: hello from Python
```

**Concepts reinforced:** The WS handshake, asyncio basics (`async def`, `await`, `asyncio.run`).

---

## Exercise 2 — ASGI entry point

**Goal:** Replace Django's WSGI entry point with an ASGI one and verify Daphne starts.

**Tasks:**

1. Add to `settings.py`:

```python
INSTALLED_APPS = [
    ...
    "channels",
    "daphne",      # must be FIRST in INSTALLED_APPS, before django.contrib.staticfiles
]
ASGI_APPLICATION = "myproject.asgi.application"
```

2. Replace the contents of `myproject/asgi.py` with:

```python
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    # websocket routes go here in Exercise 3
})
```

3. Run the server with Daphne instead of `runserver`:

```bash
daphne myproject.asgi:application
```

4. Visit `http://localhost:8000/` — you should see your normal Django site.

5. **Answer in a comment:** What does `ProtocolTypeRouter` do? Why is the "http" key necessary even though we haven't added WebSocket support yet?

**Concepts reinforced:** ASGI vs WSGI, `ProtocolTypeRouter`, Daphne as the ASGI server.

---

## Exercise 3 — Synchronous Echo Consumer

**Goal:** Write your first consumer. It should echo every message back to the sender only.

**Tasks:**

1. Create `chat/consumers.py`:

```python
from channels.generic.websocket import WebsocketConsumer
import json

class EchoConsumer(WebsocketConsumer):
    def connect(self):
        print("[connect]", self.scope["client"])
        # YOUR CODE HERE — accept the connection

    def receive(self, text_data):
        data = json.loads(text_data)
        print("[receive]", data)
        # YOUR CODE HERE — send the message back to this sender only

    def disconnect(self, close_code):
        print("[disconnect]", close_code)
```

2. Create `chat/routing.py`:

```python
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/chat/(?P<room_name>\w+)/$", consumers.EchoConsumer.as_asgi()),
]
```

3. Wire it into `asgi.py`:

```python
from channels.routing import ProtocolTypeRouter, URLRouter
from chat.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": URLRouter(websocket_urlpatterns),
})
```

4. Test from the browser console:

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/chat/room1/");
ws.onmessage = (e) => console.log("received:", e.data);
ws.send(JSON.stringify({ message: "hello" }));
```

5. Open a **second tab** and send a message. Does the second tab see the first tab's messages? **Why not?** Write the answer as a comment.

**Expected terminal output:**

```
[connect] ('127.0.0.1', 54321)
[receive] {'message': 'hello'}
[disconnect] 1001
```

**Concepts reinforced:** Consumer lifecycle (`connect`, `receive`, `disconnect`), `self.accept()`, `self.send()`.

---

## Exercise 4 — Async Consumer

**Goal:** Rewrite `EchoConsumer` as `AsyncWebsocketConsumer`. This is the version you'll actually use going forward.

**Tasks:**

1. In `chat/consumers.py`, add a new class:

```python
from channels.generic.websocket import AsyncWebsocketConsumer
import json

class AsyncEchoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # YOUR CODE HERE

    async def receive(self, text_data):
        # YOUR CODE HERE

    async def disconnect(self, close_code):
        pass
```

2. Update `routing.py` to use `AsyncEchoConsumer`.
3. Confirm it still passes the same browser console test from Exercise 3.
4. **Answer in a comment:** What's the practical difference between `WebsocketConsumer` and `AsyncWebsocketConsumer`? When would you use the synchronous version?

**Concepts reinforced:** `async def`, `await`, why async matters for concurrent connections.

---

## Exercise 5 — In-Memory Channel Group (Broadcast)

**Goal:** Make messages broadcast to all clients in the same room — not just the sender.

This requires a channel layer. Use the in-memory one for now (Redis replaces it in Phase 2).

**Tasks:**

1. Add to `settings.py`:

```python
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}
```

2. Update your async consumer to:
   - On `connect`: join a group named after the room (use `self.channel_layer.group_add`)
   - On `receive`: send the message to the group (use `self.channel_layer.group_send`)
   - On `disconnect`: leave the group (use `self.channel_layer.group_discard`)
   - Add a handler method `chat_message` that the channel layer calls on each consumer in the group

```python
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import json

class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        # YOUR CODE HERE — join the group
        await self.accept()

    async def receive(self, text_data):
        data = json.loads(text_data)
        # YOUR CODE HERE — send to group with type "chat.message"

    async def disconnect(self, close_code):
        # YOUR CODE HERE — leave the group
        pass

    async def chat_message(self, event):
        # Called by the channel layer for each consumer in the group
        # YOUR CODE HERE — forward the message to the WebSocket
        pass
```

3. Open two browser tabs, both pointed at `ws://localhost:8000/ws/chat/room1/`. Send from one — both should receive it.

4. Open a **third tab** pointed at `ws://localhost:8000/ws/chat/room2/`. Confirm messages in room1 do NOT appear in room2.

5. **Reflection question:** You're running a single Daphne process. What happens if you run two Daphne processes and two clients connect to different processes? Write the answer as a comment. (This is exactly what Phase 2 fixes.)

**Expected behaviour:**

- Tab A sends `{"message": "hi from A"}` → both Tab A and Tab B receive it
- Tab C (room2) receives nothing

**Concepts reinforced:** Channel groups, group_add/group_send/group_discard, the in-memory layer's single-process limitation.

---

## Exercise 6 — Logging Middleware

**Goal:** Add a custom ASGI middleware that logs every WebSocket connection with the room name and timestamp.

**Tasks:**

1. Create `chat/middleware.py`:

```python
from datetime import datetime

class WebSocketLogMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            room = scope.get("url_route", {}).get("kwargs", {}).get("room_name", "unknown")
            print(f"[{datetime.now().isoformat()}] WS connect to room: {room}")
        await self.app(scope, receive, send)
```

2. Wrap your URLRouter with it in `asgi.py`:

```python
from chat.middleware import WebSocketLogMiddleware

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": WebSocketLogMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})
```

3. Connect from the browser and verify the log line appears.

4. **Extension:** Modify the middleware to also log `disconnect` events. Hint: you'll need to inspect the messages flowing through `receive`.

**Concepts reinforced:** ASGI middleware pattern, `scope` dict, the difference between scope-level inspection and message-level inspection.

---

## Exercise 7 — Browser Chat UI (Putting It All Together)

**Goal:** Build a minimal working chat page so Phase 1 is genuinely complete.

**Tasks:**

1. Create a Django view that renders a template at `/chat/<room_name>/`
2. The template should contain:
   - A `<div id="messages">` for displaying incoming messages
   - An `<input id="msg-input">` for typing
   - A `<button>` to send
   - A `<script>` block that:
     - Opens a WebSocket to `ws://localhost:8000/ws/chat/<room_name>/`
     - Sends input text on button click (or Enter key)
     - Appends received messages to `#messages`
     - Displays connect/disconnect status

Minimal working script:

```javascript
const roomName = "{{ room_name }}";
const ws = new WebSocket(`ws://${window.location.host}/ws/chat/${roomName}/`);

ws.onopen = () => console.log("connected");
ws.onclose = () => console.log("disconnected");
ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  const div = document.createElement("div");
  div.textContent = data.message;
  document.getElementById("messages").appendChild(div);
};

document.getElementById("send-btn").onclick = () => {
  const input = document.getElementById("msg-input");
  ws.send(JSON.stringify({ message: input.value }));
  input.value = "";
};
```

3. Open `http://localhost:8000/chat/room1/` in two browser tabs. Send messages between them.

4. Watch the Django terminal. You should see a connect, one or more receive logs, and a disconnect per tab.

**Phase 1 is complete when:** two tabs exchange messages in real time and the terminal shows each lifecycle event.

---

## Phase 1 Checklist

- [ ] Understand the HTTP 101 upgrade response and what headers trigger it
- [ ] Can explain WSGI vs ASGI in one sentence each
- [ ] Daphne starts successfully with your ASGI application
- [ ] Synchronous consumer echoes messages back to the sender
- [ ] Async consumer does the same with `async def` / `await`
- [ ] Two tabs in the same room receive each other's messages via an in-memory channel group
- [ ] You can explain WHY in-memory groups break across multiple processes
- [ ] Browser chat UI works end-to-end

---

## Key Resources

| Topic                               | Link                                                       |
| ----------------------------------- | ---------------------------------------------------------- |
| Django Channels tutorial            | https://channels.readthedocs.io/en/stable/tutorial/        |
| WebSocket API (MDN)                 | https://developer.mozilla.org/en-US/docs/Web/API/WebSocket |
| asyncio coroutines                  | https://docs.python.org/3/library/asyncio-task.html        |
| ASGI spec                           | https://asgi.readthedocs.io/en/latest/                     |
| Daphne                              | https://github.com/django/daphne                           |
| websockets library (for Exercise 1) | https://websockets.readthedocs.io/                         |
