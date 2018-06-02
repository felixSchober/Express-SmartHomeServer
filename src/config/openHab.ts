import {userConfig} from './userConfig';

export const openHab = {
	url: userConfig.openHabIp,
	port: '8080',
	harmonyDeviceButtonPressItems: {
		'onkyo': 'OnkyoAVReceiver_SendButtonPress',
		'tv': 'TV_SendButtonPress ',
		'xbox': 'XboxOne_SendButtonPress',
		'appletv': 'AtlantisAppleTVHarmony_SendButtonPress '
	}
};