'use strict';

const constants = require('../../lib/constants');
const QubinoDevice = require('../../lib/QubinoDevice');
const MeshDriverUtil = require('homey-meshdriver').Util;

/**
 * Flush Heat & Cool Thermostat (ZMNHKD)
 * Extended manual: http://qubino.com/download/2054/
 * Regular manual: http://qubino.com/download/1071/
 * NOTE: 11,2,2;12,2,2000 raw config param is needed to make all inputs work
 * NOTE: only when inputs are configured for notifications it seems to work correctly
 * TODO: fix I1/I2
 * TODO: setting 100/101 hint explanation for flow cards
 * TODO: add extra explanation in flow about parameter 100/101/11/12
 * TODO: add extra explanation in flow that inputs need to be toggled once before they work
 * TODO: 100/101 -> 1/9 and 11 -> window sensor and 12 -> 2000 is needed for inputs to work in flow
 *
 * TODO: wait for response from Qubino on the SENSOR_BINARY endpoint issue (report from input 1 and 2 instead of 2 and 3)
 *
 * TODO: test only one input enabled configuration
 */
class ZMNHKD extends QubinoDevice {

	/**
	 * Expose input configuration, two possible inputs (input 1 and input 2).
	 * @returns {*[]}
	 */
	get inputConfiguration() {
		return [
			{
				id: 1,
				parameterIndex: 100,
			},
			{
				id: 2,
				parameterIndex: 101,
			},
		];
	}

	/**
	 * Expose root device class generic.
	 * @returns {string}
	 */
	get rootDeviceClassGeneric() {
		return constants.deviceClassGeneric.thermostat;
	}

	/**
	 * Method that will register capabilities of the device based on its configuration.
	 * @private
	 */
	registerCapabilities() {
		this.registerCapability(constants.capabilities.meterPower, constants.commandClasses.meter);
		this.registerCapability(constants.capabilities.measurePower, constants.commandClasses.meter);
		this.registerCapability(constants.capabilities.targetTemperature, constants.commandClasses.thermostatSetpoint);
		this.registerCapability(constants.capabilities.offAutoThermostatMode, constants.commandClasses.thermostatMode, {
			get: 'THERMOSTAT_MODE_GET',
			getOpts: {
				getOnStart: true,
			},
			set: 'THERMOSTAT_MODE_SET',
			setParser: mode => ({
				Level: {
					Mode: (mode === 'off') ? 'Off' : 'Auto',
				},
			}),
			report: 'THERMOSTAT_MODE_REPORT',
			reportParser: report => {
				if (report && report.hasOwnProperty('Level') &&
					report.Level.hasOwnProperty('Mode') &&
					typeof report.Level.Mode !== 'undefined') {
					return report.Level.Mode.toLowerCase();
				}
				return null;
			},
		});
	}

	/**
	 * Override onSettings to handle combined z-wave settings.
	 * @param oldSettings
	 * @param newSettings
	 * @param changedKeysArr
	 * @returns {Promise<T>}
	 */
	async onSettings(oldSettings, newSettings, changedKeysArr) {

		// If enabled/disabled
		if (changedKeysArr.includes(constants.settings.antifreezeEnabled)) {

			let antifreezeValue = 255;
			if (newSettings[constants.settings.antifreezeEnabled]) {
				// Get value from newSettings if possible, else use stored setting value
				antifreezeValue = newSettings.hasOwnProperty(constants.settings.antifreeze) ? newSettings[constants.settings.antifreeze] : oldSettings[constants.settings.antifreeze];
			}

			if (!(constants.settings.antifreeze in changedKeysArr)) changedKeysArr.push(constants.settings.antifreeze);
			newSettings[constants.settings.antifreeze] = antifreezeValue;
		}

		return await super.onSettings(oldSettings, newSettings, changedKeysArr);
	}

	registerSettings() {
		super.registerSettings();

		this.registerSetting(constants.settings.temperatureHeatingHysteresisOn, value => {
			if (value >= 0) return value * 10;
			return MeshDriverUtil.mapValueRange(-0.1, -25.5, 1001, 1255, value);
		});

		this.registerSetting(constants.settings.temperatureHeatingHysteresisOff, value => {
			if (value >= 0) return value * 10;
			return MeshDriverUtil.mapValueRange(-0.1, -25.5, 1001, 1255, value);
		});


		this.registerSetting(constants.settings.temperatureCoolingHysteresisOn, value => {
			if (value >= 0) return value * 10;
			return MeshDriverUtil.mapValueRange(-0.1, -25.5, 1001, 1255, value);
		});

		this.registerSetting(constants.settings.temperatureCoolingHysteresisOff, value => {
			if (value >= 0) return value * 10;
			return MeshDriverUtil.mapValueRange(-0.1, -25.5, 1001, 1255, value);
		});

		this.registerSetting(constants.settings.antifreeze, value => {
			if (!value || value === 255) return value;
			if (value >= 0) return value * 10;
			return MeshDriverUtil.mapValueRange(-0.1, -12.7, 1001, 1127, value);
		});

		this.registerSetting(constants.settings.tooLowTemperatureLimit, value => {
			if (value >= 0) return value * 10;
			return MeshDriverUtil.mapValueRange(-0.1, -15, 1001, 1150, value);
		});

		this.registerSetting(constants.settings.tooHighTemperatureLimit, value => value * 10);
	}
}

module.exports = ZMNHKD;