#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include "secrets.h"

#define FAN_PIN    26
#define DHT_PIN    27
#define DHT_TYPE   DHT11

DHT dht(DHT_PIN, DHT_TYPE);

const unsigned long COMMAND_INTERVAL_MS = 1000;
const unsigned long SENSOR_INTERVAL_MS  = 5000;

unsigned long lastCommandMs = 0;
unsigned long lastSensorMs  = 0;

void setup() {
  Serial.begin(115200);
  pinMode(FAN_PIN, OUTPUT);
  digitalWrite(FAN_PIN, LOW);

  dht.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  unsigned long now = millis();

  if (now - lastCommandMs >= COMMAND_INTERVAL_MS) {
    lastCommandMs = now;
    fetchCommand();
  }

  if (now - lastSensorMs >= SENSOR_INTERVAL_MS) {
    lastSensorMs = now;
    postSensor();
  }
}

void fetchCommand() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(String(API_BASE_URL) + "/esp32/command");
  int code = http.GET();

  if (code == 200) {
    JsonDocument doc;
    deserializeJson(doc, http.getString());
    String fan = doc["fan"].as<String>();
    digitalWrite(FAN_PIN, fan == "on" ? HIGH : LOW);
    Serial.println("fan: " + fan);
  } else {
    Serial.println("fetchCommand failed: " + String(code));
  }
  http.end();
}

void postSensor() {
  float humidity    = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("DHT read failed");
    return;
  }

  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(String(API_BASE_URL) + "/esp32/sensor");
  http.addHeader("Content-Type", "application/json");

  JsonDocument doc;
  doc["temperature"] = temperature;
  doc["humidity"]    = humidity;
  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  Serial.printf("postSensor %s -> %d\n", body.c_str(), code);
  http.end();
}
