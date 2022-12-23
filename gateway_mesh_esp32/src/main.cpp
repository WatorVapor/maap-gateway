#include <Arduino.h>
void WifiMeshTask( void * parameter);
void setup(void) {
  Serial.begin(115200);
  Serial.println(__DATE__);
  Serial.println(__TIME__);
  xTaskCreatePinnedToCore(WifiMeshTask, "WifiMeshTask", 1024*100, nullptr, 1, nullptr,  0); 
}

void loop(void) {
}