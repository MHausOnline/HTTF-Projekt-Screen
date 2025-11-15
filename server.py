import eventlet
import socketio
import uuid
import random
# Generate a random UUID

random_uuid = uuid.uuid4()


sio = socketio.Server()
app = socketio.WSGIApp(sio, static_files={
    '/': {'content_type': 'text/html', 'filename': 'index.html'}
})

role = {}

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

def createRoom(sid):
    roomName = str(random.randint(0,9)) + str(random.randint(0,9))
    enterRoom(sid,roomName)

    return roomName

def enterRoom(sid,roomName):
    sio.enter_room(sid,roomName)
    sio.emit("joined_room",{"room":roomName},to=sid)

if __name__ == '__main__':
    eventlet.wsgi.server(eventlet.listen(('', 8000)), app)