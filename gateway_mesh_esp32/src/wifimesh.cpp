#include <Arduino.h>
#include <ArduinoJson.h>
#include <mutex>
#include "painlessMesh.h"
#define   MESH_PREFIX     "pYZviUVDQrjaNsD5"
#define   MESH_PASSWORD   "Fqji4aPp"
#define   MESH_PORT       5555

static Scheduler userScheduler;
static painlessMesh  mesh;
static void sendMessage(void);
static Task taskSendMessage( TASK_MILLISECOND * 10 , TASK_FOREVER, &sendMessage );
static String serial2MeshBuff;
static std::mutex serial2MeshBuffMtx;
static const size_t iConstBufferMax = 512;
static StaticJsonDocument<512> mesh2SerialDoc;
static const size_t iConstMesh2SerialBufferMax = 512 -64;

void sendMessage(void) {
  String msg;
  {
    std::lock_guard<std::mutex> lock(serial2MeshBuffMtx);
    if(serial2MeshBuff.isEmpty()) {
      return;
    } else {
      msg = serial2MeshBuff;
      serial2MeshBuff.clear();
    }
  }
  mesh.sendBroadcast( msg );
  taskSendMessage.setInterval( random( TASK_MILLISECOND * 1, TASK_MILLISECOND * 5 ));
}

void receivedCallback( uint32_t from, String &msg ) {
  mesh2SerialDoc.clear();
  mesh2SerialDoc["from"] = from;
  if(msg.length() < iConstMesh2SerialBufferMax) {
    mesh2SerialDoc["recv"] = msg;
  } else {
    String shortedMsg(msg.c_str(),iConstMesh2SerialBufferMax);
    shortedMsg += "...";
    mesh2SerialDoc["recv"] = shortedMsg;
    mesh2SerialDoc["error"] = "over";
  }
  std::string outStr;
  serializeJson(mesh2SerialDoc, outStr);
  outStr += "\r\n";
  Serial.print(outStr.c_str());
}

void newConnectionCallback(uint32_t nodeId) {
  mesh2SerialDoc.clear();
  mesh2SerialDoc["connect"] = "new";
  mesh2SerialDoc["nodeId"] = nodeId;
  std::string outStr;
  serializeJson(mesh2SerialDoc, outStr);
  outStr += "\r\n";
  Serial.print(outStr.c_str());
}

void changedConnectionCallback() {
  mesh2SerialDoc.clear();
  mesh2SerialDoc["connect"] = "changed";
  std::string outStr;
  serializeJson(mesh2SerialDoc, outStr);
  outStr += "\r\n";
  Serial.print(outStr.c_str());
}

void nodeTimeAdjustedCallback(int32_t offset) {
  mesh2SerialDoc.clear();
  mesh2SerialDoc["connect"] = "Adjusted time";
  mesh2SerialDoc["nodeTime"] = mesh.getNodeTime();
  mesh2SerialDoc["offset"] = offset;
  std::string outStr;
  serializeJson(mesh2SerialDoc, outStr);
  outStr += "\r\n";
  Serial.print(outStr.c_str());
}

void setup_wifi_mesh(void) {
  mesh.setDebugMsgTypes( ERROR );
  mesh.init( MESH_PREFIX, MESH_PASSWORD, &userScheduler, MESH_PORT );
  mesh.onReceive(&receivedCallback);
  mesh.onNewConnection(&newConnectionCallback);
  mesh.onChangedConnections(&changedConnectionCallback);
  mesh.onNodeTimeAdjusted(&nodeTimeAdjustedCallback);
  userScheduler.addTask( taskSendMessage );
  taskSendMessage.enable();
}

void WifiMeshTask( void * parameter) {
  setup_wifi_mesh();
  while(true) {
    mesh.update();
    if (Serial.available()) {
      int inByte = Serial.read();
      String strByte((char)inByte);
      {
        std::lock_guard<std::mutex> lock(serial2MeshBuffMtx);
        serial2MeshBuff += strByte;
        if(serial2MeshBuff.length() > iConstBufferMax) {
          serial2MeshBuff.clear();
        }
      }      
    }
    delay(10);
  }
}
