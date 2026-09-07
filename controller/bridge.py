"""Zero-config local BLE bridge for the Porsche 911 RSR controller."""
import argparse
import asyncio
import hmac
import json
import time
from protocol import CHAR_UUID, build_cmd, clamp_speed

LOCAL_TOKEN = '42096-local'
ADDRESS = '13:12:05:04:93:7B'

class Controller:
    def __init__(self, client, clock=time.monotonic):
        self.client, self.clock = client, clock
        self.armed = False
        self.fb = self.lr = 0
        self.deadline = self.turn_until = 0
        self.turn_id = None
        self.lock = asyncio.Lock()

    def state(self):
        return dict(type='state', connected=self.client.is_connected, armed=self.armed, fb=self.fb, lr=self.lr)

    async def stop(self):
        self.armed = False
        self.fb = self.lr = 0
        self.turn_until = 0
        async with self.lock:
            if self.client.is_connected:
                await asyncio.wait_for(self.client.write_gatt_char(CHAR_UUID, build_cmd(), response=False), 1)

    async def arm(self):
        if not self.client.is_connected:
            raise ValueError('Hub chưa kết nối.')
        await self.stop()
        self.deadline = self.clock() + .35
        self.armed = True

    async def drive(self, message):
        if not self.armed:
            raise ValueError('Cần bật điều khiển trước.')
        fb, turn, pulse, turn_id = (message.get(k) for k in ('fb', 'turn', 'pulse_ms', 'turn_id'))
        if any(type(v) is not int for v in (fb, turn, pulse, turn_id)) or not -100 <= fb <= 100 or turn not in (-1, 0, 1) or not 100 <= pulse <= 500 or not 0 <= turn_id < 2**53:
            await self.stop()
            raise ValueError('Lệnh điều khiển không hợp lệ.')
        now = self.clock()
        if now > self.deadline:
            await self.stop()
            raise ValueError('Hết thời gian giữ kết nối.')
        self.deadline = now + .35
        self.fb = clamp_speed(fb)
        if not turn:
            self.lr = 0
            self.turn_until = 0
        elif turn_id != self.turn_id:
            self.turn_id = turn_id
            self.turn_until = now + pulse / 1000
            self.lr = turn * 100
        elif now >= self.turn_until:
            self.lr = 0
        async with self.lock:
            if self.armed:
                await asyncio.wait_for(self.client.write_gatt_char(CHAR_UUID, build_cmd(self.fb, self.lr), response=False), 1)

    async def tick(self):
        if not self.armed:
            return
        now = self.clock()
        if not self.client.is_connected or now > self.deadline:
            await self.stop()
        elif self.lr and now >= self.turn_until:
            self.lr = 0
            async with self.lock:
                if self.armed:
                    await asyncio.wait_for(self.client.write_gatt_char(CHAR_UUID, build_cmd(self.fb, 0), response=False), 1)

async def main(args):
    from bleak import BleakClient
    from websockets.asyncio.server import serve
    token = LOCAL_TOKEN
    owner = asyncio.Lock()

    async def handle(ws):
        controller = None
        client = None
        watchdog = None
        acquired = False
        try:
            hello = json.loads(await asyncio.wait_for(ws.recv(), 5))
            supplied = hello.get('token')
            if hello.get('type') != 'auth' or not isinstance(supplied, str) or not hmac.compare_digest(supplied, token):
                await ws.close(1008, 'Token không hợp lệ')
                return
            if owner.locked():
                await ws.close(1008, 'Xe đang được điều khiển bởi phiên khác')
                return
            await owner.acquire()
            acquired = True
            await ws.send(json.dumps(dict(type='connecting')))

            # Match the known-good bluetooth.py path exactly: connect straight to
            # the calibrated hub address instead of spending 5 seconds scanning
            # and then filtering on the advertised device name.
            client = BleakClient(ADDRESS)
            await client.connect()
            if not client.services.get_characteristic(CHAR_UUID):
                raise ValueError('Không tìm thấy characteristic điều khiển.')
            controller = Controller(client)
            await controller.stop()
            await ws.send(json.dumps(controller.state()))

            async def watch():
                while True:
                    await asyncio.sleep(.025)
                    if not client.is_connected:
                        await controller.stop()
                        await ws.send(json.dumps(controller.state()))
                        await ws.close(1011, 'Mất kết nối BLE')
                        return
                    before = controller.state()
                    try:
                        await controller.tick()
                    except Exception:
                        await ws.close(1011, 'Không gửi được lệnh dừng tới hub')
                        return
                    if before != controller.state():
                        await ws.send(json.dumps(controller.state()))

            watchdog = asyncio.create_task(watch())
            async for raw in ws:
                message = json.loads(raw)
                if message.get('type') == 'arm':
                    await controller.arm()
                elif message.get('type') == 'drive':
                    await controller.drive(message)
                elif message.get('type') == 'stop':
                    await controller.stop()
                else:
                    raise ValueError('Loại lệnh điều khiển không hợp lệ.')
                await ws.send(json.dumps(controller.state()))
        except Exception as error:
            if controller:
                try:
                    await controller.stop()
                except Exception:
                    pass
            try:
                await ws.send(json.dumps(dict(type='error', message=str(error))))
                await ws.close(1011, 'Phiên điều khiển kết thúc')
            except Exception:
                pass
        finally:
            if watchdog:
                watchdog.cancel()
                await asyncio.gather(watchdog, return_exceptions=True)
            if controller:
                try:
                    await controller.stop()
                except Exception:
                    pass
            try:
                if client and client.is_connected:
                    await client.disconnect()
            finally:
                if acquired:
                    owner.release()

    print('Porsche local controller ready on ws://127.0.0.1:' + str(args.port))
    async with serve(handle, '127.0.0.1', args.port, origins=[args.origin], max_size=2048, max_queue=1, ping_interval=10, ping_timeout=5):
        await asyncio.Future()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--origin', default='http://localhost:3000')
    parser.add_argument('--port', type=int, default=8765)
    try:
        asyncio.run(main(parser.parse_args()))
    except KeyboardInterrupt:
        pass
