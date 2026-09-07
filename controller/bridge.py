"""Local authenticated BLE bridge. Running the server never starts the motors."""
import argparse
import asyncio
import hmac
import json
import secrets
import time
from protocol import CHAR_UUID, build_cmd, clamp_speed

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
            raise ValueError('Hết thời gian giữ kết nối. Bật điều khiển lại.')
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
    from bleak import BleakClient, BleakScanner
    from websockets.asyncio.server import serve
    token = secrets.token_urlsafe(24)
    owner = asyncio.Lock()
    async def device():
        if args.address:
            return args.address
        devices = await BleakScanner.discover(timeout=5, return_adv=True)
        matches = [d for d, a in devices.values() if (a.local_name or d.name or '').startswith(('QY_', 'CB26'))]
        if not matches:
            raise ValueError('Không tìm thấy hub QY / CB26. Bật hub và tắt app điều khiển khác.')
        if len(matches) > 1:
            raise ValueError('Có nhiều hub. Chạy lại với --address và chọn đúng hub: ' + ', '.join(d.address for d in matches))
        return matches[0]
    if args.discover:
        async with BleakClient(await device()) as client:
            char = client.services.get_characteristic(CHAR_UUID)
            if not char:
                raise ValueError('Hub không có characteristic điều khiển yêu cầu.')
            print('Service UUID cho Web Bluetooth:', char.service_uuid)
        return
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
                await ws.close(1008, 'Một trình điều khiển khác đang kết nối')
                return
            await owner.acquire()
            acquired = True
            await ws.send(json.dumps(dict(type='connecting')))
            client = BleakClient(await device())
            await client.connect()
            if not client.services.get_characteristic(CHAR_UUID):
                raise ValueError('Sai hub: không tìm thấy characteristic điều khiển.')
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
                    raise ValueError('Loại lệnh không hợp lệ.')
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
    print('Bridge: ws://127.0.0.1:' + str(args.port))
    print('Token:', token)
    print('Allowed origin:', args.origin)
    print('Chỉ kết nối hub khi bạn nhấn Kết nối trên web. Ctrl+C để thoát.')
    async with serve(handle, '127.0.0.1', args.port, origins=[args.origin], max_size=2048, max_queue=1, ping_interval=10, ping_timeout=5):
        await asyncio.Future()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--origin', default='http://localhost:3000', help='Exact origin of the web UI, e.g. https://your-site.vercel.app')
    parser.add_argument('--address', help='Optional BLE address; otherwise discover a QY / CB26 hub')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--discover', action='store_true', help='Print the actual GATT service UUID without sending motor commands')
    try:
        asyncio.run(main(parser.parse_args()))
    except KeyboardInterrupt:
        pass
