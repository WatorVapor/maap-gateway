#include <Arduino.h>

#include "painlessMesh.h"
#define   MESH_PREFIX     "pYZviUVDQrjaNsD5"
#define   MESH_PASSWORD   "Fqji4aPp"
#define   MESH_PORT       5555

static Scheduler userScheduler;
static painlessMesh  mesh;
static void sendMessage(void);
static Task taskSendMessage( TASK_SECOND * 1 , TASK_FOREVER, &sendMessage );

void sendMessage(void) {
  String msg = "Hello from node ";
  msg += mesh.getNodeId();
  mesh.sendBroadcast( msg );
  taskSendMessage.setInterval( random( TASK_SECOND * 1, TASK_SECOND * 5 ));
}

void receivedCallback( uint32_t from, String &msg ) {
  Serial.printf("startHere: Received from %u msg=%s\r\n", from, msg.c_str());
}

void newConnectionCallback(uint32_t nodeId) {
    Serial.printf("--> startHere: New Connection, nodeId = %u\r\n", nodeId);
}

void changedConnectionCallback() {
  Serial.printf("Changed connections\r\n");
}

void nodeTimeAdjustedCallback(int32_t offset) {
    Serial.printf("Adjusted time %u. Offset = %d\r\n", mesh.getNodeTime(),offset);
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
    delay(100);
  }
}
