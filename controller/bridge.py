"""Zero-config local BLE bridge for the Porsche 911 RSR controller."""
import argparse
import asyncio
import json
import time
from protocol import CHAR_UUID, build_cmd, clamp_speed

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

    owner = asyncio.Lock()

    async def handle(ws):
        controller = None
        client = None
        watchdog = None
        acquired = False
        try:
            if owner.locked():
                await ws.close(1008, 'Xe đang được điều khiển bởi phiên khác')
                return
            await owner.acquire()
            acquired = True

            # Use the exact path that is known to work in bluetooth.py:
            # fixed BLE address -> BleakClient -> fixed control characteristic.
            print(f'Web requested vehicle connection -> {ADDRESS}', flush=True)
            client = BleakClient(ADDRESS)
            await client.connect()
            if not client.services.get_characteristic(CHAR_UUID):
                raise ValueError('Không tìm thấy characteristic điều khiển.')

            controller = Controller(client)
            await controller.stop()
            await ws.send(json.dumps(controller.state()))
            print('Vehicle connected.', flush=True)

            async def watch():
                while True:
                    await asyncio.sleep(.025)
                    if not client.is_connected:
                        await ws.send(json.dumps(dict(type='state', connected=False, armed=False, fb=0, lr=0)))
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
                kind = message.get('type')
                # Backward compatible with an older browser tab. Authentication
                # is unnecessary because this server only binds to 127.0.0.1.
                if kind == 'auth':
                    continue
                if kind == 'arm':
                    await controller.arm()
                elif kind == 'drive':
                    await controller.drive(message)
                elif kind == 'stop':
                    await controller.stop()
                else:
                    raise ValueError('Loại lệnh điều khiển không hợp lệ.')
                await ws.send(json.dumps(controller.state()))
        except Exception as error:
            print(f'Controller error: {type(error).__name__}: {error}', flush=True)
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

    print('Porsche local controller ready on ws://127.0.0.1:' + str(args.port), flush=True)
    # Local-machine only: no token, no origin configuration, no BLE scan.
    async with serve(handle, '127.0.0.1', args.port, max_size=2048, max_queue=1, ping_interval=10, ping_timeout=5):
        await asyncio.Future()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    try:
        asyncio.run(main(parser.parse_args()))
    except KeyboardInterrupt:
        pass
