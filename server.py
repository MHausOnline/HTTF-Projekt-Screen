import eventlet
import time 
import socketio
import uuid
import random
import json

arrow_events = []
devices = []
role = {}
dimensions = {}

sio = socketio.Server()
app = socketio.WSGIApp(sio, static_files={
    '/': {'content_type': 'text/html', 'filename': 'index.html'}
})



def createRoom(sid):
    roomName = str(random.randint(0,9)) + str(random.randint(0,9))
    enterRoom(sid,roomName)

    return roomName

def enterRoom(sid,roomName):
    sio.enter_room(sid,roomName)
    sio.emit("joined_room",{"room":roomName},to=sid)
    

@sio.event
def connect(sid, environ, auth):
    random_uuid = uuid.uuid4()
    sio.emit("set_uuid",{"uuid":str(random_uuid)},to=sid)
    print("connect")

@sio.event
def set_role(sid, data):
    role[str(sid)] = {"role":data["role"]}

    if data["role"] == "admin":
        createRoom(sid)
        print("roomthere")
        devices.append({"sid":sid,"pos":[0,0],"width":dimensions[sid][0],"height":dimensions[sid][1]})

    if data["role"] == "client":
        print("welcome")


@sio.event
def arrow_pressed(sid, data):
    direction = data.get("dir")

    # Validierung
    if direction not in {"right", "left", "top", "bottom"}:
        print(f"problem whith direction {sid}: {direction}")
        return

    arrow_events.append({
        "sid": sid,
        "dir": direction,
        "timestamp": time.time()
    })

        



@sio.event
def join_room(sid,data):
    enterRoom(sid,data["room"])
    print (f"Welcome in room {data}")

@sio.event
def my_message(sid, data):
    print('message ', data)

@sio.event
def disconnect(sid):
    print('disconnect ', sid)

@sio.event 
def sendAdmin(sid, data):
    for i,value in enumerate(role):
        if value["role"] == "admin":
            sio.emit("messageAdmin",to=i)
            break

@sio.event
def sendAll(sid, data):
    for f, value in enumerate(role):
         if value["role"] == "client":
            sio.emit("messageAll", to=f)
            break

@sio.event
def setDimension(sid,data):
    dimensions[sid] = data.dim

if __name__ == '__main__':
    eventlet.wsgi.server(eventlet.listen(('', 8000)), app)

