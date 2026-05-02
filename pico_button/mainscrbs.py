import network
import urequests
import ujson
import time
from machine import Pin
from secrets import WIFI_SSID, WIFI_PASSWORD, WEB_APP_URL

# -----------------------------
# Tag info
# -----------------------------
PERSON_ID = "SCRBS67"

# Demo location.
# Replace with your actual latitude/longitude.
LATITUDE = 44.975
LONGITUDE = -93.228

# -----------------------------
# Hardware setup
# -----------------------------
BUTTON_PIN = 15
button = Pin(BUTTON_PIN, Pin.IN, Pin.PULL_UP)

led = Pin("LED", Pin.OUT)

last_press_time = 0
DEBOUNCE_MS = 300


def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)

    if wlan.isconnected():
        print("Already connected")
        return True

    print("Connecting to Wi-Fi...")
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)

    timeout = 20

    while not wlan.isconnected() and timeout > 0:
        print("Waiting for Wi-Fi...")
        led.toggle()
        time.sleep(1)
        timeout -= 1

    led.value(0)

    if wlan.isconnected():
        print("Connected to Wi-Fi")
        print(wlan.ifconfig())
        return True
    else:
        print("Wi-Fi failed")
        return False


def send_event():
    device_time = str(time.time())

    url = (
        WEB_APP_URL
        + "?person_id=" + PERSON_ID
        + "&latitude=" + str(LATITUDE)
        + "&longitude=" + str(LONGITUDE)
        + "&device_time=" + device_time
    )

    print("Sending event:")
    print(url)

    try:
        response = urequests.get(url)

        print("Status:", response.status_code)
        print("Response:", response.text)

        # If the sheet updates, a 200 should usually come back.
        success = response.status_code == 200

        response.close()
        return success

    except Exception as e:
        print("Send failed:")
        print(e)
        return False


def success_blink():
    for i in range(1):
        led.value(1)
        time.sleep(0.1)
        led.value(0)


def error_blink():
    for i in range(6):
        led.value(1)
        time.sleep(0.08)
        led.value(0)
        time.sleep(0.08)


print("Emergency tag started")

connect_wifi()

while True:
    current_time = time.ticks_ms()

    if button.value() == 0:
        if time.ticks_diff(current_time, last_press_time) > DEBOUNCE_MS:
            last_press_time = current_time

            print("Button pressed")

            if connect_wifi():
                if send_event():
                    print("Event sent successfully")
                    success_blink()
                else:
                    print("Event failed")
                    error_blink()
            else:
                error_blink()

    time.sleep(0.05)