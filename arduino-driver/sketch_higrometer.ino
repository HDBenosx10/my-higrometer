#include <WiFi.h>
#include <ESPAsyncWebServer.h>

const int pinHigrometer = 36;
const int DEVICE_MAX = 4095;
const int DEVICE_MIN = 2000;
const char* ssid = "Alex 2G";
const char* password = "24435039";
float humidity = 0;
AsyncWebServer server(80);

void routes() {
  server.on("/", HTTP_GET, [](AsyncWebServerRequest* request) { 
     char json[40];
     sprintf(json,"{\"humidity\": %f}", humidity);
       Serial.println("ESP32 Web Server: New request received:");
       Serial.println("GET /");
       request->send(200, "application/json", json);
    });
}

void wifiSetup() {
  Serial.println();
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print("Connecting to WiFi...");
  }

  Serial.println("Connected to WiFi");
  Serial.println("WiFi connected.");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  routes();
  server.begin();
}

void higrometerSetup() {
  pinMode(pinHigrometer, INPUT);
}

void setup() {
  Serial.begin(9600);
  wifiSetup();
  higrometerSetup();
}

void loop() {
  const int pinValue = analogRead(pinHigrometer);
  Serial.println(pinValue);
  humidity = pinValue < 2000 ? 100 : map(pinValue, DEVICE_MIN, DEVICE_MAX, 100, 0);
  delay(1000);
}