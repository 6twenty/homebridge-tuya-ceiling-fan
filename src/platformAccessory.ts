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
      this.dps = data.dps

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
    this.fanService.updateCharacteristic(this.platform.Characteristic.On, this.currentFanOn())
    this.fanService.updateCharacteristic(this.platform.Characteristic.RotationDirection, this.currentFanRotationDirection())
    this.fanService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, this.currentFanRotationSpeed())
    this.lightService.updateCharacteristic(this.platform.Characteristic.On, this.currentLightOn())
  }

  async setFanOn(value: CharacteristicValue) {
    this.platform.log.debug("Set Fan Characteristic On ->", value)

    this.tuyaClient.set({ dps: DATA_POINTS["on"], set: value })
  }

  async getFanOn(): Promise<CharacteristicValue> {
    return this.tuyaClient.get().then(() => this.currentFanOn())
  }

  currentFanOn(): CharacteristicValue {
    return this.dps[DATA_POINTS["on"]]
  }

  async setFanRotationDirection(value: CharacteristicValue) {
    this.platform.log.debug("Set Fan Characteristic Rotation Direction ->", value)

    this.tuyaClient.set({ dps: DATA_POINTS["direction"], set: value === 1 ? "forward" : "reverse" })
  }

  async getFanRotationDirection(): Promise<CharacteristicValue> {
    return this.tuyaClient.get().then(() => this.currentFanRotationDirection())
  }

  currentFanRotationDirection(): CharacteristicValue {
    const value = this.dps[DATA_POINTS["direction"]]

    return value === "forward" ? 1 : 0
  }

  async setFanRotationSpeed(value: CharacteristicValue) {
    this.platform.log.debug("Set Fan Characteristic Rotation Speed ->", value)

    console.log("setFanRotationSpeed", value, String(Number(value) / 20))

    this.tuyaClient.set({ dps: DATA_POINTS["speed"], set: String(Number(value) / 20) })
  }

  async getFanRotationSpeed(): Promise<CharacteristicValue> {
    return this.tuyaClient.get().then(() => this.currentFanRotationSpeed())
  }

  currentFanRotationSpeed(): CharacteristicValue {
    const value = this.dps[DATA_POINTS["speed"]]

    return Number(value) * 20
  }

  async setLightOn(value: CharacteristicValue) {
    this.platform.log.debug("Set Lightbulb Characteristic On ->", value)

    this.tuyaClient.set({ dps: DATA_POINTS["light"], set: value })
  }

  async getLightOn(): Promise<CharacteristicValue> {
    return this.tuyaClient.get().then(() => this.currentLightOn())
  }

  currentLightOn(): CharacteristicValue {
    return this.dps[DATA_POINTS["light"]]
  }
}
