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
vectors = {"left":[-1,0],"right":[1,0],"top":[0,-1],"bottom":[0,1],}
sid2room = {}


sio = socketio.Server(cors_allowed_origins=['*'])
app = socketio.WSGIApp(sio, static_files={
    '/': {'content_type': 'text/html', 'filename': 'index.html'}
})


def sendToAdmin(event,sid,data):
    for i,value in role.items():
        if value["role"] == "admin":
            if sid2room.get(sid) != None:
                sio.emit(event, data, to=i, room=sid2room[sid])
            else:
                sio.emit(event, data, to=i)
            break
    print("2admin:",event,sid,data)

def createRoom(sid):
    roomName = str(random.randint(0,9)) + str(random.randint(0,9))
    enterRoom(sid,roomName)

    return roomName

def enterRoom(sid,roomName):
    sid2room[sid] = roomName

    sio.enter_room(sid,roomName)

    sio.emit("joined_room",{"room":roomName},to=sid, room=sid2room[sid])

def device_pos_set(sid):
    for i in range(0,len(devices)):
        print("compare:",sid, devices[i]["sid"],"index:",i)
        if devices[i]["sid"] == sid:
            return i
    
    return None

def arrow_check():
    for i in arrow_events:
        for y in arrow_events:
            if i["dir"] == opposite[y["dir"]]:
                print(i["dir"], opposite[y["dir"]])
                if device_pos_set(i["sid"]) != None and device_pos_set(y["sid"]) != None:
                    print("the user made a mistake")
                    return

                    arrow_events.remove(i)
                    arrow_events.remove(y)

                elif device_pos_set(i["sid"]) != None:
                    index = device_pos_set(i["sid"])

                    vec = vectors[i["dir"]]

                    x_p = devices[index]["pos"][0] + vec[0]
                    y_p = devices[index]["pos"][1] + vec[1]

                    devices.append({"sid":y["sid"],"pos":[x_p,y_p], "width":dimensions[y["sid"]][0],"height":dimensions[y["sid"]][1]})

                    arrow_events.remove(i)
                    arrow_events.remove(y)
                
                elif device_pos_set(y["sid"]) != None:
                    index = device_pos_set(y["sid"])

                    vec = vectors[y["dir"]]

                    x_p = devices[index]["pos"][0] + vec[0]
                    y_p = devices[index]["pos"][1] + vec[1]

                    devices.append({"sid":i["sid"],"pos":[x_p,y_p], "width":dimensions[i["sid"]][0],"height":dimensions[i["sid"]][1]})

                    arrow_events.remove(i)
                    arrow_events.remove(y)
                
                else:
                    print("both are not positioned yet")
                    print(i["sid"], y["sid"])
                    arrow_events.remove(i)
                    arrow_events.remove(y)
    print(devices)


@sio.event
def connect(sid, environ, auth):
    print("connect")
    

@sio.event
def set_role(sid, data):
    role[str(sid)] = {"role":data["role"]}

    if data["role"] == "admin":
        createRoom(sid)
        print("roomthere")
        devices.append({"sid":sid,"pos":[0,0],"width":dimensions[sid][0],"height":dimensions[sid][1]})

    if data["role"] == "client":
        sendToAdmin("need_data",sid,{})
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
    sendToAdmin(event,sid,data)
    print("admin:",sid,data)

@sio.event
def sendAll(sid, data):
    for f, value in role.items():
         if value["role"] == "client":
            if sid2room.get(sid) != None:
                sio.emit("messageAll", data, to=f, room=sid2room[sid])
            else:
                sio.emit("messageAll", data, to=f)
            break
    print("all:",sid,data)

@sio.event
def setDimension(sid,data):
    dimensions[sid] = data["dim"]
    print("dimension:",sid,data)

if __name__ == '__main__':
    eventlet.wsgi.server(eventlet.listen(('', 8000)), app)


