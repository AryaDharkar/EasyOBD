// Utility to generate realistic dummy OBD data
export const generateDummyOBDRecord = (
  userId,
  vehicleId,
  deviceId,
  baseTime = new Date(),
) => {
  // Simulate varying driving conditions
  const isAccelerating = Math.random() > 0.5;
  const isHighSpeed = Math.random() > 0.6;

  const engineRPM = isAccelerating
    ? Math.floor(Math.random() * 2000) + 2000 // 2000-4000 RPM
    : Math.floor(Math.random() * 1000) + 800; // 800-1800 RPM

  const engineLoad = isAccelerating
    ? Math.random() * 40 + 50 // 50-90%
    : Math.random() * 30 + 20; // 20-50%

  return {
    user: userId,
    vehicle: vehicleId,
    deviceId: deviceId,

    // Timestamps
    gpsTime: new Date(baseTime.getTime() - 2000).toISOString(),
    deviceTime: new Date(baseTime.getTime() - 2500).toISOString(),
    receivedAt: baseTime.toISOString(),

    // Engine Performance
    engineRPM: engineRPM,
    ecuEngineRPM: engineRPM + (Math.random() * 4 - 2), // Slight variance
    engineLoad: engineLoad,
    engineLoadAbsolute: engineLoad + (Math.random() * 4 - 2),
    timingAdvance: Math.random() * 8 + 10, // 10-18 degrees

    // Temperature (°C)
    ambientAirTemp: Math.random() * 5 + 20, // 20-25°C
    intakeAirTemperature: Math.random() * 10 + 40, // 40-50°C
    catalystTempBank1Sensor1: Math.random() * 50 + 600, // 600-650°C

    // Pressure (kPa)
    barometricPressure: Math.random() * 2 + 100, // 100-102 kPa
    intakeManifoldPressure:
      engineLoad > 50 ? Math.random() * 10 + 30 : Math.random() * 10 + 20,
    turboBoostPressure: isAccelerating
      ? Math.random() * 10 + 10
      : Math.random() * 5 + 5,

    // Fuel & Air
    airFuelRatioCommanded: 14.7,
    airFuelRatioMeasured: 14.7 + (Math.random() * 0.2 - 0.1), // ±0.1 variance
    massAirFlowRate:
      engineLoad > 50 ? Math.random() * 5 + 10 : Math.random() * 4 + 5,
    fuelTrimLTFT_Bank1: Math.random() * 2 - 1, // -1 to +1
    fuelTrimSTFT_Bank1: Math.random() * 2 - 1,
    fuelRemaining: Math.random() * 20 + 30, // 30-50%

    // Exhaust / Emissions
    o2SensorWideRangeCurrent: Math.random() * 0.3 + 1.1, // 1.1-1.4
    o2EquivalenceRatio: Math.random() * 0.04 + 0.99, // 0.99-1.03
    o2SensorDownstreamVoltage: Math.random() * 0.1 + 0.8, // 0.8-0.9
    commandedEquivalenceRatio: 1.0,

    // Electrical
    ecuVoltage: Math.random() * 0.4 + 13.6, // 13.6-14.0V
    obdVoltage: Math.random() * 0.3 + 12.5, // 12.5-12.8V

    // Usage & Distance
    runTimeSinceEngineStart: Math.floor(Math.random() * 200) + 1000, // 1000-1200s
    tripDistance: Math.random() * 5 + 40, // 40-45 km
    distanceSinceCodesCleared: Math.random() * 1000 + 12000, // 12000-13000 km
    distanceWithMILOn: 0,

    // Throttle & Pedal
    throttleAbsolute:
      engineLoad > 50 ? Math.random() * 20 + 30 : Math.random() * 15 + 15,
    throttleRelative:
      engineLoad > 50 ? Math.random() * 20 + 35 : Math.random() * 15 + 18,
    throttleManifold:
      engineLoad > 50 ? Math.random() * 15 + 25 : Math.random() * 10 + 15,
    acceleratorPedalD:
      engineLoad > 50 ? Math.random() * 20 + 30 : Math.random() * 15 + 15,
    acceleratorPedalE:
      engineLoad > 50 ? Math.random() * 20 + 30 : Math.random() * 15 + 15,

    // Power & Torque
    enginePowerKW:
      engineLoad > 50 ? Math.random() * 30 + 70 : Math.random() * 30 + 40,
    torqueNm:
      engineLoad > 50 ? Math.random() * 50 + 180 : Math.random() * 50 + 130,
    volumetricEfficiency: Math.random() * 10 + 70, // 70-80%
  };
};

// Generate a batch of records (simulating a trip)
export const generateDummyBatch = (
  userId,
  vehicleId,
  deviceId,
  recordCount = 20,
) => {
  const records = [];
  const startTime = new Date();

  for (let i = 0; i < recordCount; i++) {
    const recordTime = new Date(startTime.getTime() + i * 5000); // 5 second intervals
    records.push(
      generateDummyOBDRecord(userId, vehicleId, deviceId, recordTime),
    );
  }

  return records;
};

// Generate live data for simulation (simplified for UI display)
export const generateLiveData = () => {
  const isAccelerating = Math.random() > 0.5;

  return {
    speed: isAccelerating
      ? Math.floor(Math.random() * 60) + 40 // 40-100 km/h
      : Math.floor(Math.random() * 40) + 20, // 20-60 km/h
    rpm: isAccelerating
      ? Math.floor(Math.random() * 2000) + 2000 // 2000-4000
      : Math.floor(Math.random() * 1000) + 800, // 800-1800
    engineTemp: Math.floor(Math.random() * 20) + 85, // 85-105°C
    fuelLevel: Math.floor(Math.random() * 30) + 30, // 30-60%
    throttle: isAccelerating
      ? Math.floor(Math.random() * 40) + 40
      : Math.floor(Math.random() * 20) + 10,
    engineLoad: isAccelerating
      ? Math.floor(Math.random() * 40) + 50
      : Math.floor(Math.random() * 30) + 20,
  };
};
export default {
  generateDummyOBDRecord,
  generateDummyBatch,
  generateLiveData,
};
