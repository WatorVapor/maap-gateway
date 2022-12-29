#include <Arduino.h>
#include <FS.h>
#include <SPIFFS.h>
#include "debug.hpp"

void WifiMeshTask( void * parameter);
void BLESettingTask( void * parameter);
void setup(void) {
  Serial.begin(115200);
  Serial.println(__DATE__);
  Serial.println(__TIME__);
  xTaskCreatePinnedToCore(WifiMeshTask, "WifiMeshTask", 1024*10, nullptr, 1, nullptr,  0); 
  xTaskCreatePinnedToCore(BLESettingTask, "BLESettingTask", 1024*10, nullptr, 1, nullptr,  0); 
}

void loop(void) {
}

std::mutex print_mtx_;
