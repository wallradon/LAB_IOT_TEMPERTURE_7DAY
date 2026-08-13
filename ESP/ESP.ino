#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// Hardware Pin Definitions
#define ONE_WIRE_BUS 3
#define SENSOR_PIN 6

// DS18B20 Sensor Configurations
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Deep Sleep Duration (5 minutes in microseconds)
const uint64_t DEEP_SLEEP_TIME = 5ULL * 60ULL * 1000000ULL;

// Wi-Fi Credentials
const char* WIFI_SSID = "MIN_WIFI";
const char* WIFI_PASSWORD = "minmin12345678";

// Target API Server URL
const char* SERVER_URL = "https://lab-iot-temperture-7day.onrender.com/api/temp";

/**
 * Initialize sensors and configure hardware pin modes
 */
void initDevices() {
  pinMode(ONE_WIRE_BUS, INPUT);
  pinMode(SENSOR_PIN, OUTPUT);
  
  // Power up the DS18B20 sensor
  digitalWrite(SENSOR_PIN, HIGH);
  delay(100); // Wait for the sensor to stabilize after powering up
  
  sensors.begin();
  sensors.setResolution(9);
}

/**
 * Read temperature from DS18B20 sensor
 * @return temperature in Celsius, or -127.0 if reading fails
 */
float readSensor() {
  sensors.requestTemperatures();
  float temp = sensors.getTempCByIndex(0);
  Serial.print("🌡️ Sensor temperature reading: ");
  Serial.print(temp);
  Serial.println(" °C");
  return temp;
}

/**
 * Connect to local Wi-Fi network with a timeout
 * @return true if successfully connected, false otherwise
 */
bool connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  
  // Attempt connection for up to 20 seconds (40 attempts * 500ms)
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Wi-Fi connected successfully!");
    return true;
  } else {
    Serial.println("\n❌ Failed to connect to Wi-Fi.");
    return false;
  }
}

/**
 * Send temperature reading to the API server via POST request
 * @param temp Temperature value to be sent
 */
void sendData(float temp) {
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  // Construct JSON Payload: {"temperature": 25.5}
  String jsonPayload = "{\"temperature\":" + String(temp, 2) + "}";
  Serial.println("📦 Sending data payload: " + jsonPayload);

  int httpResponseCode = http.POST(jsonPayload);
  if (httpResponseCode > 0) {
    Serial.print("✅ Data sent successfully. Server response code: ");
    Serial.println(httpResponseCode);
    String responseMessage = http.getString();
    Serial.println("💬 Server message: " + responseMessage);
  } else {
    Serial.print("❌ Failed to send data. HTTP Error code: ");
    Serial.println(httpResponseCode);
  }
  http.end();
}

/**
 * Disconnect peripherals and put ESP32 into Deep Sleep
 */
void goToSleep() {
  // Disconnect Wi-Fi to save power
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  
  // Power down the sensor
  digitalWrite(SENSOR_PIN, LOW);

  Serial.println("💤 Entering Deep Sleep mode...");
  Serial.flush(); 

  // Enable timer wakeup and enter sleep
  esp_sleep_enable_timer_wakeup(DEEP_SLEEP_TIME);
  esp_deep_sleep_start();
}

void setup() {
  // Initialize serial communication for debugging
  Serial.begin(115200);

  // 1. Initialize peripherals
  initDevices();

  // 2. Read temperature sensor
  float currentTemp = readSensor();

  // 3. Establish Wi-Fi connection
  bool isConnected = connectWiFi();

  // 4. Submit sensor data to API server if connected
  if (isConnected) {
    sendData(currentTemp);
  }

  // 5. Enter Deep Sleep
  goToSleep();
}

void loop() {
  // Unused because the ESP32 performs a reset and runs setup() again upon waking from Deep Sleep
}