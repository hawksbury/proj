import network
import urequests
import time
from machine import Pin

# ── Configuration ─────────────────────────────────────────────────────────────
WIFI_SSID     = "cake"
WIFI_PASSWORD = "catsarecool"

SERVER_IP   = "10.145.10.228"
SERVER_PORT = 3001
SIGNAL_URL  = f"http://{SERVER_IP}:{SERVER_PORT}/api/button"

# ── Button wiring ─────────────────────────────────────────────────────────────
BUTTON_PIN  = 15
PULL        = Pin.PULL_UP
PRESSED_VAL = 0

DEBOUNCE_MS = 300

led    = Pin("LED", Pin.OUT)
button = Pin(BUTTON_PIN, Pin.IN, PULL)

_last_press_ms = 0
_pending       = False


def button_isr(_):
    global _last_press_ms, _pending
    now = time.ticks_ms()

    if time.ticks_diff(now, _last_press_ms) > DEBOUNCE_MS:
        _last_press_ms = now
        _pending = True


button.irq(
    trigger=Pin.IRQ_FALLING if PRESSED_VAL == 0 else Pin.IRQ_RISING,
    handler=button_isr
)


def blink(times=1, on_ms=150, off_ms=100):
    for _ in range(times):
        led.on()
        time.sleep_ms(on_ms)
        led.off()
        time.sleep_ms(off_ms)


def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)

    if wlan.isconnected():
        print("Already connected:", wlan.ifconfig()[0])
        return wlan

    print(f"Connecting to {WIFI_SSID}...")

    wlan.connect(WIFI_SSID, WIFI_PASSWORD)

    # Keep trying until connected
    while not wlan.isconnected():
        led.toggle()
        print("Waiting for WiFi...")
        time.sleep(0.5)

    led.off()
    print("Connected:", wlan.ifconfig()[0])
    blink(3)

    return wlan


def send_signal():
    print("Sending signal...")
    led.on()

    try:
        response = urequests.get(SIGNAL_URL)
        body = response.text.strip()
        response.close()

        print("OK:", body)

        led.off()
        blink(2)  # success

    except Exception as e:
        print("Error:", e)

        led.on()
        time.sleep_ms(800)
        led.off()  # failure


# ── Startup diagnostics ───────────────────────────────────────────────────────
print(f"Button on GP{BUTTON_PIN}, pull={'UP' if PULL == Pin.PULL_UP else 'DOWN'}")
print(f"Current pin state: {button.value()}  (expected {1 - PRESSED_VAL} at rest)")

if button.value() == PRESSED_VAL:
    print("WARNING: pin reads PRESSED at startup — check wiring or change PULL/PRESSED_VAL")


# Connect to WiFi immediately on startup
wlan = connect_wifi()

print("Ready. Press the button.")


# ── Main loop ─────────────────────────────────────────────────────────────────
while True:
    # If WiFi drops, reconnect right away
    if not wlan.isconnected():
        print("WiFi lost — reconnecting...")
        wlan = connect_wifi()

    # Send signal when button is pressed
    if _pending:
        _pending = False

        if wlan.isconnected():
            send_signal()
        else:
            print("Not connected — reconnecting...")
            wlan = connect_wifi()

            if wlan.isconnected():
                send_signal()
            else:
                blink(5, on_ms=80, off_ms=80)

    time.sleep_ms(20)
