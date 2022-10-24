import { Service, PlatformAccessory, CharacteristicValue } from "homebridge"
import TuyAPI from "tuyapi"

import { CeilingFanPlatform } from "./platform"

const DATA_POINTS = {
  "on": "1",
  "speed": "3",
  "direction": "4",
  "light": "9"
}

export class CeilingFanAccessory {
  private fanService: Service
  private lightService: Service
  private tuyaClient
  private dps = {}

  constructor(
    private readonly platform: CeilingFanPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly deviceID,
    private readonly localKey
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, "Brilliant Smart")
      .setCharacteristic(this.platform.Characteristic.Model, "DC Ceiling Fan BAHAMA")
      .setCharacteristic(this.platform.Characteristic.SerialNumber, "20918")

    this.fanService = this.accessory.getService(this.platform.Service.Fan) ||
      this.accessory.addService(this.platform.Service.Fan)

    this.lightService = this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb)

    this.fanService.setCharacteristic(this.platform.Characteristic.Name, "Ceiling Fan")
    this.lightService.setCharacteristic(this.platform.Characteristic.Name, "Ceiling Fan Light")

    this.fanService.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setFanOn.bind(this))

    this.fanService.getCharacteristic(this.platform.Characteristic.RotationDirection)
      .onSet(this.setFanRotationDirection.bind(this))

    this.fanService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .setProps({ minStep: 20 })
      .onSet(this.setFanRotationSpeed.bind(this))

    this.lightService.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setLightOn.bind(this))

    this.tuyaClient = new TuyAPI({
      id: this.deviceID,
      key: this.localKey
    })

    this.tuyaClient.on("connected", () => {
      this.platform.log.debug("Tuya Device Connected ->", this.accessory.displayName)

      this.tuyaClient.get()
    })

    this.tuyaClient.on("disconnected", () => {
      this.platform.log.debug("Tuya Device Disconnected ->", this.accessory.displayName)
    })

    this.tuyaClient.on("error", error => {
      this.platform.log.debug("Tuya Device Error ->", this.accessory.displayName, error)
    })

    this.tuyaClient.on("data", data => {
      this.dps = { ...this.dps, ...data.dps }

      this.updateCharacteristics()

      this.platform.log.debug("Tuya Device Data ->", this.accessory.displayName, data)
    })

    this.tuyaClient.on("dp-refresh", data => {
      this.dps = { ...this.dps, ...data.dps }

      this.updateCharacteristics()

      this.platform.log.debug("Tuya Device Refresh ->", this.accessory.displayName, data)
    })

    this.tuyaClient.find().then(() => {
      this.tuyaClient.connect()
    })
  }

  updateCharacteristics() {
    this.fanService.getCharacteristic(this.platform.Characteristic.On).updateValue(this.currentFanOn())
    this.fanService.getCharacteristic(this.platform.Characteristic.RotationDirection).updateValue(this.currentFanRotationDirection())
    this.fanService.getCharacteristic(this.platform.Characteristic.RotationSpeed).updateValue(this.currentFanRotationSpeed())
    this.lightService.getCharacteristic(this.platform.Characteristic.On).updateValue(this.currentLightOn())
  }

  setFanOn(value: CharacteristicValue) {
    this.platform.log.debug("Set Fan Characteristic On ->", value)

    // Assume success
    this.dps[DATA_POINTS["on"]] = value
    this.updateCharacteristics()

    this.tuyaClient.set({ dps: DATA_POINTS["on"], set: value })
  }

  async getFanOn(): Promise<CharacteristicValue> {
    return this.tuyaClient.get().then(() => this.currentFanOn())
  }

  currentFanOn(): CharacteristicValue {
    return this.dps[DATA_POINTS["on"]]
  }

  setFanRotationDirection(value: CharacteristicValue) {
    this.platform.log.debug("Set Fan Characteristic Rotation Direction ->", value)

    const coercedValue = value === 1 ? "forward" : "reverse"

    // Assume success
    this.dps[DATA_POINTS["direction"]] = coercedValue
    this.updateCharacteristics()

    this.tuyaClient.set({ dps: DATA_POINTS["direction"], set: coercedValue })
  }

  async getFanRotationDirection(): Promise<CharacteristicValue> {
    return this.tuyaClient.get().then(() => this.currentFanRotationDirection())
  }

  currentFanRotationDirection(): CharacteristicValue {
    const value = this.dps[DATA_POINTS["direction"]]

    return value === "forward" ? 1 : 0
  }

  setFanRotationSpeed(value: CharacteristicValue) {
    this.platform.log.debug("Set Fan Characteristic Rotation Speed ->", value)

    const coercedValue = String(Number(value) / 20)

    // Assume success
    this.dps[DATA_POINTS["speed"]] = coercedValue
    this.updateCharacteristics()

    this.tuyaClient.set({ dps: DATA_POINTS["speed"], set: coercedValue })
  }

  async getFanRotationSpeed(): Promise<CharacteristicValue> {
    return this.tuyaClient.get().then(() => this.currentFanRotationSpeed())
  }

  currentFanRotationSpeed(): CharacteristicValue {
    const value = this.dps[DATA_POINTS["speed"]]

    return Number(value) * 20
  }

  setLightOn(value: CharacteristicValue) {
    this.platform.log.debug("Set Lightbulb Characteristic On ->", value)

    // Assume success
    this.dps[DATA_POINTS["on"]] = value
    this.updateCharacteristics()

    this.tuyaClient.set({ dps: DATA_POINTS["light"], set: value })
  }

  async getLightOn(): Promise<CharacteristicValue> {
    return this.tuyaClient.get().then(() => this.currentLightOn())
  }

  currentLightOn(): CharacteristicValue {
    return this.dps[DATA_POINTS["light"]]
  }
}
