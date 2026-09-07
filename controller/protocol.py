"""Protocol and calibrated limits from the user-supplied bluetooth.py."""
CHAR_UUID = '0000ae3b-0000-1000-8000-00805f9b34fb'
SPEED_MIN, SPEED_MAX = 25, 100
TURN_PULSE_MIN_MS, TURN_PULSE_FULL_MS = 100, 500

def clamp_speed(value):
    if not value:
        return 0
    return (1 if value > 0 else -1) * max(SPEED_MIN, min(SPEED_MAX, abs(value)))

def build_cmd(fb=0, lr=0):
    fb, lr = fb & 255, lr & 255
    return bytes([0xAB, 0xCD, 0x01, fb, lr, 0, 0, (fb + lr) & 255])
