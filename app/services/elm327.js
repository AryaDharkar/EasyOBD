import { BleManager } from "react-native-ble-plx";
import { encode as btoa, decode as atob } from "base-64";

const PROFILES = {
  esp: {
    labels: ["esp32", "elm327-esp32", "obd", "elm"],
    channels: [
      {
        serviceUuid: "0000fff0-0000-1000-8000-00805f9b34fb",
        charUuid: "0000fff1-0000-1000-8000-00805f9b34fb",
      },
    ],
  },
  elm: {
    labels: ["elm", "obd", "vlink", "vgate", "obdii", "obd2"],
    channels: [
      {
        serviceUuid: "0000fff0-0000-1000-8000-00805f9b34fb",
        charUuid: "0000fff1-0000-1000-8000-00805f9b34fb",
      },
      {
        serviceUuid: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
        charUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
      },
      {
        serviceUuid: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
        charUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
      },
    ],
  },
};

const normalize = (value = "") => value.toLowerCase();
const canWrite = (characteristic) =>
  !!(characteristic?.isWritableWithResponse || characteristic?.isWritableWithoutResponse);

const canNotify = (characteristic) =>
  !!(characteristic?.isNotifiable || characteristic?.isIndicatable);

const formatBleError = (error) => {
  if (!error) return "Unknown BLE error";
  const reason = error?.reason ? `reason=${error.reason}` : "";
  const code = error?.errorCode !== undefined ? `code=${error.errorCode}` : "";
  const att = error?.attErrorCode !== undefined ? `att=${error.attErrorCode}` : "";
  const msg = error?.message || String(error);
  return [msg, reason, code, att].filter(Boolean).join(" | ");
};

class ELM327 {
  constructor() {
    this.manager = new BleManager();
    this.device = null;
    this.writeChar = null;
    this.notifyChar = null;
    this.monitorSubscription = null;

    this.buffer = "";
    this.onRaw = null;
    this.readFallback = false;
  }

  _consumeAscii(ascii) {
    if (!ascii) return;

    this.buffer += ascii;

    // Process all complete messages (ended by ">")
    let promptIndex;
    while ((promptIndex = this.buffer.indexOf(">")) !== -1) {
      const msg = this.buffer.slice(0, promptIndex).trim();
      this.buffer = this.buffer.slice(promptIndex + 1);

      if (!msg) continue;

      console.log("RAW:", JSON.stringify(msg));
      if (this.onRaw) this.onRaw(msg);
    }
  }

  async scan(timeoutMs = 7000, source = "auto") {
    return new Promise((resolve, reject) => {
      const found = new Map();
      const profile = PROFILES[source] || null;
      const labels = profile?.labels || [...PROFILES.esp.labels, ...PROFILES.elm.labels];

      this.manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (error) {
          this.manager.stopDeviceScan();
          reject(new Error(formatBleError(error)));
          return;
        }

        if (!device) {
          return;
        }

        const name = normalize(device.name || device.localName || "");
        if (labels.some((label) => name.includes(label))) {
          found.set(device.id, device);
        }
      });

      setTimeout(() => {
        this.manager.stopDeviceScan();
        resolve(Array.from(found.values()));
      }, timeoutMs);
    });
  }

  async connect(deviceId, source = "auto") {
    this.close();

    this.device = await this.manager.connectToDevice(deviceId);
    await this.device.discoverAllServicesAndCharacteristics();

    const preferredChannels = [
      ...(PROFILES[source]?.channels || []),
      ...PROFILES.esp.channels,
      ...PROFILES.elm.channels,
    ];

    const services = await this.device.services();
    for (const s of services) {
      const chars = await s.characteristics();
      for (const c of chars) {
        const serviceUuid = normalize(c.serviceUUID);
        const charUuid = normalize(c.uuid);
        const isTarget = preferredChannels.some(
          (channel) =>
            serviceUuid === normalize(channel.serviceUuid) &&
            charUuid === normalize(channel.charUuid),
        );

        if (isTarget && canWrite(c)) {
          this.writeChar = c;
        }
        if (isTarget && canNotify(c)) {
          this.notifyChar = c;
        }

        if (!this.writeChar && canWrite(c)) {
          this.writeChar = c;
        }
        if (!this.notifyChar && canNotify(c)) {
          this.notifyChar = c;
        }
      }
    }

    if (!this.writeChar) {
      throw new Error("ELM327 write characteristic not found");
    }

    // Prefer robust read-back mode to avoid ble-plx monitor/cancelTransaction native crash.
    // If adapter lacks dedicated notify char, fall back to readable write characteristic.
    if (!this.notifyChar && this.writeChar.isReadable) {
      this.notifyChar = this.writeChar;
    }

    this.readFallback = !!this.notifyChar?.isReadable;

    if (!this.readFallback) {
      throw new Error("ELM327 response characteristic is not readable on this adapter");
    }
  }

  async send(cmd) {
    if (!this.writeChar) {
      throw new Error("ELM327 write channel is not available");
    }

    const base64 = btoa(cmd + "\r");
    if (this.writeChar.isWritableWithoutResponse) {
      await this.writeChar.writeWithoutResponse(base64);
    } else {
      await this.writeChar.writeWithResponse(base64);
    }

    if (this.readFallback && this.notifyChar?.isReadable) {
      // Read-back mode for adapters with no notify characteristic.
      await new Promise((resolve) => setTimeout(resolve, 100));
      const responseChar = await this.notifyChar.read();
      if (responseChar?.value) {
        this._consumeAscii(atob(responseChar.value));
      }
    }
  }

  close() {
    // Keep this guarded; some ble-plx versions crash internally on cancelTransaction.
    try {
      if (this.monitorSubscription) {
        this.monitorSubscription.remove();
      }
    } catch {}
    this.monitorSubscription = null;

    if (this.device) {
      // cancelConnection returns a promise; swallow rejections to avoid uncaught errors.
      Promise.resolve(this.device.cancelConnection()).catch(() => {});
      this.device = null;
    }

    this.writeChar = null;
    this.notifyChar = null;
    this.buffer = "";
    this.onRaw = null;
    this.readFallback = false;
  }

  // ============================
  // PID PARSER
  // ============================
  parsePID(line) {
    const parts = line
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length < 3) return null;

    let idx = parts.indexOf("41");
    if (idx === -1 || idx + 2 >= parts.length) {
      return null;
    }

    const pid = parts[idx + 1];
    const A = parseInt(parts[idx + 2], 16);
    const B = parts[idx + 3] ? parseInt(parts[idx + 3], 16) : 0;

    if (Number.isNaN(A) || Number.isNaN(B)) {
      return null;
    }

    switch (pid) {
      case "0C": return { pid, value: ((A * 256) + B) / 4 };
      case "0D": return { pid, value: A };
      case "05": return { pid, value: A - 40 };
      case "04": return { pid, value: (A * 100) / 255 };
      case "11": return { pid, value: (A * 100) / 255 };
      case "0F": return { pid, value: A - 40 };
      case "0B": return { pid, value: A };
      case "42": return { pid, value: ((A * 256) + B) / 1000 };
      case "2F": return { pid, value: (A * 100) / 255 };
      default: return null;
    }
  }
}

export default new ELM327();