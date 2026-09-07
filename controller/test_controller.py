import unittest
from bridge import Controller
from protocol import build_cmd

class FakeClient:
    is_connected = True
    def __init__(self): self.writes = []
    async def write_gatt_char(self, uuid, data, response=False): self.writes.append(bytes(data))

class ControllerTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.now = 0
        self.client = FakeClient()
        self.controller = Controller(self.client, lambda: self.now)
        await self.controller.arm()
    async def send(self, **changes):
        message = dict(fb=30, turn=0, pulse_ms=200, turn_id=1)
        message.update(changes)
        await self.controller.drive(message)
    async def test_watchdog_stops_and_requires_rearm(self):
        await self.send()
        self.now = .36
        await self.controller.tick()
        self.assertFalse(self.controller.armed)
        self.assertEqual(self.client.writes[-1], build_cmd())
        with self.assertRaises(ValueError): await self.send()
    async def test_pulse_does_not_extend_with_heartbeat(self):
        await self.send(turn=-1)
        self.now = .15
        await self.send(turn=-1)
        self.now = .21
        await self.controller.tick()
        self.assertEqual(self.client.writes[-1], build_cmd(30, 0))
    async def test_invalid_command_stops(self):
        await self.send()
        with self.assertRaises(ValueError): await self.send(fb=101)
        self.assertFalse(self.controller.armed)
        self.assertEqual(self.client.writes[-1], build_cmd())
    async def test_dead_zone_is_clamped(self):
        await self.send(fb=-1)
        self.assertEqual(self.client.writes[-1], build_cmd(-25,0))
    async def test_lease_cannot_be_revived_by_late_packet(self):
        self.now = .36
        with self.assertRaises(ValueError): await self.send()
        self.assertFalse(self.controller.armed)
    async def test_link_loss_disarms(self):
        self.client.is_connected = False
        await self.controller.tick()
        self.assertFalse(self.controller.armed)

if __name__ == '__main__': unittest.main()
