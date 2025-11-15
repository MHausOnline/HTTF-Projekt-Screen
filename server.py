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
opposite = {"left":"right","right":"left","top":"bottom","bottom":"top"}
vectors = {"left":[-1,0],"left":[1,0],"top":[0,-1],"top":[0,1],}

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

def device_pos_set(sid):
    for i in range(0,len(devices)):
        if devices[i]["sid"] == sid:
            return i
    
    return None

def arrow_check():
    for i arrow_events:
        for y in arrow_events:
            if i["dir"] == opposite[y["dir"]]:
                if device_pos_set(i["sid"]) != None and device_pos_set(y["sid"]):
                    print("the user made a mistake")
                    return

                if device_pos_set(i["sid"]) != None:
                    index = device_pos_set(i["dir"])

                    vec = vectors[i["dir"]]

                    x_p = devices[index]["pos"][0] + vec[0]
                    y_p = devices[index]["pos"][1] + vec[1]

                    devices.append({"sid":y["sid"],"pos":[x_p,y_p]})
                
                if device_pos_set(y["sid"]) != None:
                    index = device_pos_set(y["dir"])

                    vec = vectors[y["dir"]]

                    x_p = devices[index]["pos"][0] + vec[0]
                    y_p = devices[index]["pos"][1] + vec[1]

                    devices.append({"sid":i["sid"],"pos":[x_p,y_p]})




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

    print("arrow pressed in direction",data["dir"])

    if direction not in {"right", "left", "top", "bottom"}:
        print(f"problem whith direction {sid}: {direction}")
        return

    arrow_events.append({
        "sid": sid,
        "dir": direction,
        "timestamp": time.time()
    })

    arrow_check()
        

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
            sio.emit("messageAdmin", data, to=i)
            break

@sio.event
def sendAll(sid, data):
    for f, value in enumerate(role):
         if value["role"] == "client":
            sio.emit("messageAll", data, to=f)
            break

@sio.event
def setDimension(sid,data):
    dimensions[sid] = data.dim

if __name__ == '__main__':
    eventlet.wsgi.server(eventlet.listen(('', 8000)), app)

