import { BleManager } from "react-native-ble-plx";
import { encode as btoa, decode as atob } from "base-64";

class ELM327 {
  constructor() {
    this.manager = new BleManager();
    this.device = null;
    this.writeChar = null;
    this.notifyChar = null;
    this.monitorSubscription = null;

    this.buffer = "";
    this.onRaw = null;
  }

  async connect(deviceId) {
    this.device = await this.manager.connectToDevice(deviceId);
    await this.device.discoverAllServicesAndCharacteristics();

    const services = await this.device.services();
    for (const s of services) {
      const chars = await s.characteristics();
      for (const c of chars) {
        if (c.isWritableWithoutResponse || c.isWritable) {
          this.writeChar = c;
        }
        if (c.isNotifiable) {
          this.notifyChar = c;
        }
      }
    }

    if (!this.writeChar || !this.notifyChar) {
      throw new Error("ELM327 characteristics not found");
    }

    // Monitor notifications
    this.monitorSubscription = this.notifyChar.monitor((error, characteristic) => {
      if (error) return console.log("Notify error:", error);

      const ascii = atob(characteristic.value);
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
    });
  }

  async send(cmd) {
    const base64 = btoa(cmd + "\r");
    return this.writeChar.writeWithoutResponse(base64);
  }

  close() {
    if (this.monitorSubscription) {
      this.monitorSubscription.remove();
      this.monitorSubscription = null;
    }

    if (this.device) {
      try {
        this.device.cancelConnection();
      } catch (e) {
        // ignore
      }
      this.device = null;
    }

    this.writeChar = null;
    this.notifyChar = null;
    this.buffer = "";
    this.onRaw = null;
  }

  // ============================
  // PID PARSER
  // ============================
  parsePID(line) {
    const parts = line.split(" ");
    if (parts.length < 3) return null;

    const pid = parts[1];
    const A = parseInt(parts[2], 16);
    const B = parts[3] ? parseInt(parts[3], 16) : 0;

    switch (pid) {
      case "0C": return { pid, value: ((A * 256) + B) / 4 };
      case "0D": return { pid, value: A };
      case "05": return { pid, value: A - 40 };
      case "04": return { pid, value: (A * 100) / 255 };
      case "11": return { pid, value: (A * 100) / 255 };
      case "2F": return { pid, value: (A * 100) / 255 };
      default: return null;
    }
  }
}

export default new ELM327();